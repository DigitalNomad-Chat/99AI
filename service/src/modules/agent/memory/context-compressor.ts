import { Injectable, Logger } from '@nestjs/common';
import { getTokenCount } from '@/common/utils/getTokenCount';
import { OpenAI } from 'openai';

@Injectable()
export class ContextCompressor {
  private readonly logger = new Logger(ContextCompressor.name);

  /**
   * 压缩消息历史，使其 Token 数不超过限制
   * 策略：保留 system + 摘要 + 最近 N 轮，中间部分用 LLM 摘要替代
   * @param messages 当前消息数组
   * @param maxTokens 最大允许 Token 数（不含 completion 预留）
   * @param apiKey API Key（用于调用 LLM 生成摘要）
   * @param model 模型名称
   * @param proxyUrl 代理 URL
   */
  async compress(
    messages: any[],
    maxTokens: number,
    apiKey: string,
    model: string,
    proxyUrl: string,
  ): Promise<any[]> {
    const currentTokens = await getTokenCount(messages);
    if (currentTokens <= maxTokens) return messages;

    this.logger.debug(`上下文压缩触发: ${currentTokens} tokens > ${maxTokens} tokens`);

    // 保留 system 消息（index 0）和最近 4 条消息（最后 2 轮对话）
    const systemMessages = messages.filter(m => m.role === 'system');
    const recentCount = Math.min(4, messages.length);
    const recentMessages = messages.slice(-recentCount);
    const middleMessages = messages.slice(systemMessages.length, messages.length - recentCount);

    if (middleMessages.length === 0) {
      // 没有中间消息可压缩，只能截断
      this.logger.warn('无中间消息可压缩，仅保留最近消息');
      return [...systemMessages, ...recentMessages];
    }

    // 生成中间消息的摘要
    const summary = await this.generateSummary(middleMessages, apiKey, model, proxyUrl);

    // 构建压缩后的消息数组
    const summaryMessage = {
      role: 'system',
      content: `[对话历史摘要]\n${summary}\n\n以下是最近的对话内容，请基于以上历史摘要和当前对话继续回答。`,
    };

    const compressed = [...systemMessages, summaryMessage, ...recentMessages];
    const newTokens = await getTokenCount(compressed);
    this.logger.debug(`上下文压缩完成: ${currentTokens} -> ${newTokens} tokens`);

    return compressed;
  }

  private async generateSummary(
    messages: any[],
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

      const conversationText = messages
        .map(m => {
          const role = m.role === 'user' ? '用户' : m.role === 'assistant' ? '助手' : '系统';
          let content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
          if (m.tool_calls) {
            content += `\n[调用了工具: ${m.tool_calls.map(tc => tc.function?.name).join(', ')}]`;
          }
          return `${role}: ${content}`;
        })
        .join('\n');

      const response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              '你是一个对话摘要助手。请将以下对话历史压缩为简洁的摘要，保留关键信息、用户需求、已完成的操作和重要结论。摘要应控制在200字以内。',
          },
          { role: 'user', content: conversationText },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return response.choices[0]?.message?.content || '对话历史摘要不可用';
    } catch (error) {
      this.logger.warn(`生成摘要失败: ${error.message}`);
      // 降级：返回简单的消息计数摘要
      const userCount = messages.filter(m => m.role === 'user').length;
      return `此前对话了约 ${userCount} 轮，摘要生成失败。`;
    }
  }
}
