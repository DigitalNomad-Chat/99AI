import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenAI } from 'openai';
import { AgentSessionEntity } from './entities/agent-session.entity';
import { IToolProvider, ToolCallResult } from './interfaces/tool-provider.interface';
import { TimeToolProvider } from './providers/time-tool.provider';
import { KnowledgeBaseToolProvider } from './providers/knowledge-base-tool.provider';
import { NetSearchToolProvider } from './providers/net-search-tool.provider';
import { correctApiBaseUrl } from '@/common/utils/correctApiBaseUrl';
import { MemoryService } from './memory/memory.service';

interface AgentProgressEvent {
  content?: any;
  reasoning_content?: any;
  tool_calls?: string;
  tool_calls_response?: string;
  finishReason?: string;
  chatId?: number;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(
    @InjectRepository(AgentSessionEntity)
    private readonly agentSessionRepository: Repository<AgentSessionEntity>,
    private readonly timeToolProvider: TimeToolProvider,
    private readonly knowledgeBaseToolProvider: KnowledgeBaseToolProvider,
    private readonly netSearchToolProvider: NetSearchToolProvider,
    private readonly memoryService: MemoryService,
  ) {}

  /**
   * Agent 对话处理入口
   */
  async chatProcess(
    body: any,
    req: any,
    res: any,
    options: {
      messagesHistory: any[];
      apiKey: string;
      model: string;
      proxyUrl: string;
      temperature: number;
      max_tokens: number;
      timeout: number;
      assistantLogId: number;
      onProgress?: (data: AgentProgressEvent) => void;
      abortController: AbortController;
    },
  ): Promise<{
    full_content: string;
    full_reasoning_content: string;
    tool_calls?: string;
    errMsg?: string;
  }> {
    const {
      messagesHistory,
      apiKey,
      model,
      proxyUrl,
      temperature,
      max_tokens,
      timeout,
      assistantLogId,
      onProgress,
      abortController,
    } = options;

    const tools = await this.getAllToolDefinitions();
    let currentIteration = 0;
    const maxIterations = 10;
    const allToolResults: ToolCallResult[] = [];
    let currentMessages = JSON.parse(JSON.stringify(messagesHistory));
    let finalContent = '';
    let finalReasoningContent = '';

    // 查找或创建 AgentSession 记录
    const groupId = body?.options?.groupId || null;
    const userId = req?.user?.id || 0;
    let agentSession: AgentSessionEntity | null = null;

    try {
      if (groupId) {
        agentSession = await this.agentSessionRepository.findOne({
          where: { groupId },
          order: { createdAt: 'DESC' },
        });
      }

      if (!agentSession) {
        agentSession = this.agentSessionRepository.create({
          groupId,
          userId,
          currentIteration: 0,
          maxIterations,
          toolCallHistory: '[]',
          status: 0,
        });
        agentSession = await this.agentSessionRepository.save(agentSession);
        this.logger.debug(`创建 AgentSession: id=${agentSession.id}, groupId=${groupId}`);
      } else {
        // 复用已有 session，重置状态
        agentSession.currentIteration = 0;
        agentSession.status = 0;
        agentSession.toolCallHistory = '[]';
        agentSession = await this.agentSessionRepository.save(agentSession);
        this.logger.debug(`复用 AgentSession: id=${agentSession.id}`);
      }
    } catch (sessionError) {
      this.logger.warn(`AgentSession 操作失败: ${sessionError.message}`);
    }

    // 注入长期记忆上下文
    if (groupId && userId) {
      try {
        currentMessages = await this.memoryService.buildMemoryAwareMessages(
          currentMessages,
          userId,
          groupId,
        );
      } catch (e) {
        this.logger.warn(`构建记忆上下文失败: ${e.message}`);
      }
    }

    try {
      while (currentIteration < maxIterations && !abortController.signal.aborted) {
        currentIteration++;

        // 上下文压缩检查
        try {
          currentMessages = await this.memoryService.compressIfNeeded(
            currentMessages,
            max_tokens - 1000,
            apiKey,
            model,
            proxyUrl,
          );
        } catch (e) {
          this.logger.warn(`上下文压缩失败: ${e.message}`);
        }
        this.logger.debug(`Agent 循环迭代 ${currentIteration}/${maxIterations}`);

        // 更新 session 迭代次数
        if (agentSession) {
          agentSession.currentIteration = currentIteration;
          await this.agentSessionRepository.save(agentSession).catch(e => {
            this.logger.warn(`更新 AgentSession 迭代次数失败: ${e.message}`);
          });
        }

        const streamResult = await this.callLLMWithTools({
          messages: currentMessages,
          tools,
          apiKey,
          model,
          proxyUrl,
          temperature,
          max_tokens,
          timeout,
          abortController,
          onProgress,
        });

        finalContent = streamResult.content || finalContent;
        finalReasoningContent = streamResult.reasoningContent || finalReasoningContent;

        if (streamResult.toolCalls && streamResult.toolCalls.length > 0) {
          this.logger.debug(`检测到 ${streamResult.toolCalls.length} 个工具调用`);

          onProgress?.({
            tool_calls: JSON.stringify(streamResult.toolCalls),
          });

          const results = await this.executeToolCalls(streamResult.toolCalls);
          allToolResults.push(...results);

          // 更新 session 工具调用历史
          if (agentSession) {
            try {
              const history = JSON.parse(agentSession.toolCallHistory || '[]');
              history.push({
                iteration: currentIteration,
                toolCalls: streamResult.toolCalls,
                results,
                timestamp: new Date().toISOString(),
              });
              agentSession.toolCallHistory = JSON.stringify(history);
              await this.agentSessionRepository.save(agentSession).catch(e => {
                this.logger.warn(`更新 AgentSession 工具历史失败: ${e.message}`);
              });
            } catch (e) {
              this.logger.warn(`序列化工具调用历史失败: ${e.message}`);
            }
          }

          onProgress?.({
            tool_calls_response: JSON.stringify(results),
          });

          currentMessages.push({
            role: 'assistant',
            content: streamResult.content || '',
            tool_calls: streamResult.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          });

          for (const result of results) {
            currentMessages.push({
              role: 'tool',
              tool_call_id: result.toolCallId,
              content: result.error || result.content,
            });
          }

          continue;
        }

        this.logger.debug('Agent 循环完成，无更多工具调用');
        break;
      }

      // 提取并存储记忆
      if (groupId && userId) {
        try {
          const fullConversation = currentMessages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => (typeof m.content === 'string' ? m.content : JSON.stringify(m.content)))
            .join('\n');
          await this.memoryService.extractAndStoreMemories(
            userId,
            groupId,
            fullConversation,
            apiKey,
            model,
            proxyUrl,
          );
        } catch (e) {
          this.logger.warn(`记忆提取存储失败: ${e.message}`);
        }
      }

      // 标记 session 为已完成
      if (agentSession) {
        agentSession.status = 1;
        await this.agentSessionRepository.save(agentSession).catch(e => {
          this.logger.warn(`更新 AgentSession 完成状态失败: ${e.message}`);
        });
      }

      onProgress?.({
        finishReason: 'stop',
        chatId: assistantLogId,
      });

      return {
        full_content: finalContent,
        full_reasoning_content: finalReasoningContent,
        tool_calls: allToolResults.length > 0 ? JSON.stringify(allToolResults) : undefined,
      };
    } catch (error) {
      this.logger.error('Agent 循环出错:', error);

      // 标记 session 为失败
      if (agentSession) {
        agentSession.status = 2;
        await this.agentSessionRepository.save(agentSession).catch(e => {
          this.logger.warn(`更新 AgentSession 失败状态失败: ${e.message}`);
        });
      }

      onProgress?.({
        content: [{ type: 'text', text: `Agent 执行出错: ${error.message}` }],
        finishReason: 'error',
        chatId: assistantLogId,
      });
      return {
        full_content: finalContent,
        full_reasoning_content: finalReasoningContent,
        errMsg: `Agent 执行出错: ${error.message}`,
      };
    }
  }

  private async getAllToolDefinitions(): Promise<any[]> {
    const providers = [
      this.timeToolProvider,
      this.knowledgeBaseToolProvider,
      this.netSearchToolProvider,
    ];

    const tools: any[] = [];
    for (const provider of providers) {
      const defs = await provider.getTools();
      for (const def of defs) {
        tools.push({
          type: 'function',
          function: {
            name: `${provider.namespace}__${def.name}`,
            description: def.description,
            parameters: def.parameters,
          },
        });
      }
    }

    return tools;
  }

  private async callLLMWithTools(options: {
    messages: any[];
    tools: any[];
    apiKey: string;
    model: string;
    proxyUrl: string;
    temperature: number;
    max_tokens: number;
    timeout: number;
    abortController: AbortController;
    onProgress?: (data: AgentProgressEvent) => void;
  }): Promise<{ content: string; reasoningContent: string; toolCalls: any[] }> {
    const {
      messages,
      tools,
      apiKey,
      model,
      proxyUrl,
      temperature,
      max_tokens,
      timeout,
      abortController,
      onProgress,
    } = options;

    const openai = new OpenAI({
      apiKey,
      baseURL: await correctApiBaseUrl(proxyUrl),
      timeout,
    });

    const requestConfig: any = {
      model,
      messages,
      stream: true,
      temperature,
      max_tokens,
      tools,
      tool_choice: 'auto',
    };

    this.logger.debug(`Agent LLM 请求: ${JSON.stringify({ model, toolsCount: tools.length })}`);

    const stream = (await openai.chat.completions.create(requestConfig, {
      signal: abortController.signal,
    })) as any;

    let content = '';
    let reasoningContent = '';
    const toolCalls: any[] = [];
    const toolCallBuffer: Record<string, any> = {};

    for await (const chunk of stream) {
      if (abortController.signal.aborted) break;

      const delta = chunk.choices[0]?.delta;

      if (delta?.reasoning_content) {
        reasoningContent += delta.reasoning_content;
        onProgress?.({
          reasoning_content: [{ type: 'text', text: delta.reasoning_content }],
        });
      }

      if (delta?.content) {
        content += delta.content;
        onProgress?.({
          content: [{ type: 'text', text: delta.content }],
        });
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const index = tc.index;
          if (!toolCallBuffer[index]) {
            toolCallBuffer[index] = { id: tc.id || '', name: '', arguments: '' };
          }
          if (tc.id) toolCallBuffer[index].id = tc.id;
          if (tc.function?.name) toolCallBuffer[index].name += tc.function.name;
          if (tc.function?.arguments) toolCallBuffer[index].arguments += tc.function.arguments;
        }
      }

      if (chunk.choices[0]?.finish_reason === 'tool_calls') {
        for (const key of Object.keys(toolCallBuffer)) {
          const tc = toolCallBuffer[key];
          if (tc.name) {
            toolCalls.push({
              id: tc.id,
              name: tc.name,
              arguments: this.safeJsonParse(tc.arguments),
            });
          }
        }
      }
    }

    // 如果流结束时 finish_reason 不是 tool_calls，但 buffer 中有数据，也组装 toolCalls
    if (toolCalls.length === 0 && Object.keys(toolCallBuffer).length > 0) {
      for (const key of Object.keys(toolCallBuffer)) {
        const tc = toolCallBuffer[key];
        if (tc.name) {
          toolCalls.push({
            id: tc.id,
            name: tc.name,
            arguments: this.safeJsonParse(tc.arguments),
          });
        }
      }
    }

    return { content, reasoningContent, toolCalls };
  }

  private async executeToolCalls(toolCalls: any[]): Promise<ToolCallResult[]> {
    const results: ToolCallResult[] = [];

    for (const tc of toolCalls) {
      const [namespace, toolName] = tc.name.split('__');
      const provider = this.getProviderByNamespace(namespace);

      if (!provider) {
        results.push({
          toolCallId: tc.id,
          name: tc.name,
          content: '',
          error: `未找到工具 Provider: ${namespace}`,
        });
        continue;
      }

      try {
        const result = await provider.execute({
          id: tc.id,
          name: toolName,
          arguments: tc.arguments,
        });
        results.push(result);
      } catch (error) {
        results.push({
          toolCallId: tc.id,
          name: tc.name,
          content: '',
          error: `工具执行失败: ${error.message}`,
        });
      }
    }

    return results;
  }

  private getProviderByNamespace(namespace: string): IToolProvider | undefined {
    const providers = [
      this.timeToolProvider,
      this.knowledgeBaseToolProvider,
      this.netSearchToolProvider,
    ];
    return providers.find(p => p.namespace === namespace);
  }

  private safeJsonParse(str: string): any {
    if (!str || typeof str !== 'string') return {};
    try {
      return JSON.parse(str);
    } catch {
      try {
        const fixed = str.replace(/'/g, '"');
        return JSON.parse(fixed);
      } catch {
        return {};
      }
    }
  }
}
