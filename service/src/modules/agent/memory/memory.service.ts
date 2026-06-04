import { Injectable, Logger } from '@nestjs/common';
import { ShortTermMemory } from './short-term-memory';
import { LongTermMemory } from './long-term-memory';
import { ContextCompressor } from './context-compressor';
import { OpenAI } from 'openai';

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);

  constructor(
    private readonly shortTermMemory: ShortTermMemory,
    private readonly longTermMemory: LongTermMemory,
    private readonly contextCompressor: ContextCompressor,
  ) {}

  /**
   * 构建包含记忆上下文的消息历史
   * 在 Agent 循环开始前调用，注入长期记忆
   */
  async buildMemoryAwareMessages(messages: any[], userId: number, groupId: number): Promise<any[]> {
    const memories = await this.longTermMemory.recall(userId, 5);
    if (memories.length === 0) return messages;

    // 将记忆注入到 system 消息后面
    const memoryContent = `[用户记忆]\n${memories.join('\n')}\n请在回答时参考以上用户记忆信息。`;
    const memoryMessage = { role: 'system', content: memoryContent };

    // 找到第一个非 system 消息的位置，在其前面插入
    const firstNonSystem = messages.findIndex(m => m.role !== 'system');
    if (firstNonSystem === -1) {
      return [...messages, memoryMessage];
    }
    return [...messages.slice(0, firstNonSystem), memoryMessage, ...messages.slice(firstNonSystem)];
  }

  /**
   * 在 Agent 循环中执行上下文压缩
   */
  async compressIfNeeded(
    messages: any[],
    maxTokens: number,
    apiKey: string,
    model: string,
    proxyUrl: string,
  ): Promise<any[]> {
    return this.contextCompressor.compress(messages, maxTokens, apiKey, model, proxyUrl);
  }

  /**
   * 对话完成后提取记忆并存储
   */
  async extractAndStoreMemories(
    userId: number,
    groupId: number,
    conversation: string,
    apiKey: string,
    model: string,
    proxyUrl: string,
  ): Promise<void> {
    try {
      const facts = await this.extractFacts(conversation, apiKey, model, proxyUrl);
      for (const fact of facts) {
        await this.longTermMemory.store(userId, fact, 'fact', groupId);
      }

      // 保存摘要到 Redis 短期记忆
      const summary = await this.generateConversationSummary(conversation, apiKey, model, proxyUrl);
      if (summary) {
        await this.shortTermMemory.saveSummary(groupId, summary);
      }

      this.logger.debug(`提取并存储了 ${facts.length} 条记忆`);
    } catch (error) {
      this.logger.warn(`记忆提取失败: ${error.message}`);
    }
  }

  private async extractFacts(
    conversation: string,
    apiKey: string,
    model: string,
    proxyUrl: string,
  ): Promise<string[]> {
    try {
      const { correctApiBaseUrl } = await import('@/common/utils/correctApiBaseUrl');
      const openai = new OpenAI({
        apiKey,
        baseURL: await correctApiBaseUrl(proxyUrl),
        timeout: 30000,
      });

      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `从以下对话中提取用户的关键信息（如姓名、偏好、需求、重要事实）。每条信息一行，使用 JSON 数组格式返回。只提取确实重要的、可能在后续对话中有用的信息。不要提取对话中的临时性内容。示例: ["用户名叫张三", "用户偏好使用 Python"]`,
          },
          { role: 'user', content: conversation.substring(0, 2000) },
        ],
        temperature: 0.1,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return [];
    } catch (error) {
      this.logger.warn(`事实提取失败: ${error.message}`);
      return [];
    }
  }

  private async generateConversationSummary(
    conversation: string,
    apiKey: string,
    model: string,
    proxyUrl: string,
  ): Promise<string> {
    try {
      const { correctApiBaseUrl } = await import('@/common/utils/correctApiBaseUrl');
      const openai = new OpenAI({
        apiKey,
        baseURL: await correctApiBaseUrl(proxyUrl),
        timeout: 30000,
      });

      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: '用一句话总结以下对话的核心内容和结论。控制在100字以内。',
          },
          { role: 'user', content: conversation.substring(0, 1500) },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      this.logger.warn(`摘要生成失败: ${error.message}`);
      return '';
    }
  }
}
