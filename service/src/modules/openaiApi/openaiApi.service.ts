import { Injectable, Logger } from '@nestjs/common';
import { ChatCompletionDto } from './dto/chatCompletion.dto';
import { ModelsService } from '../models/models.service';
import { ChatProcessDto } from '../chat/dto/chatProcess.dto';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class OpenaiApiService {
  private readonly logger = new Logger(OpenaiApiService.name);

  constructor(
    private readonly modelsService: ModelsService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * 将 OpenAI 格式请求转换为内部格式
   * @param dto OpenAI ChatCompletionDto
   * @param req Request
   * @returns 内部 ChatProcessDto
   */
  async toInternalFormat(dto: ChatCompletionDto, req: any): Promise<any> {
    const { model, messages, max_tokens, temperature, stream } = dto;

    this.logger.log(
      `[OpenAI API Service] toInternalFormat: model=${model}, messages=${messages?.length}`,
    );

    // 验证模型是否可用
    const modelEntity = await this.modelsService.getModelByName(model);
    this.logger.log(`[OpenAI API Service] 模型查询结果: ${JSON.stringify(modelEntity?.id)}`);

    if (!modelEntity || !modelEntity.isApiAvailable) {
      throw new Error(`模型 ${model} 不存在或不可用`);
    }

    // 获取最后一条用户消息作为 prompt
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user') {
      throw new Error('最后一条消息必须来自用户');
    }

    const systemMsg = this.buildSystemMessage(messages);

    // 构建 messagesHistory - 直接从 OpenAI 格式转换
    const messagesHistory = this.convertMessagesToInternalFormat(messages, systemMsg);

    this.logger.log(
      `[OpenAI API Service] 转换后的 messagesHistory: ${messagesHistory.length} 条消息`,
    );

    // 构建内部格式请求
    const result = {
      prompt: lastMessage.content,
      model: model,
      appId: null,
      options: {
        parentMessageId: 0,
      },
      systemMessage: systemMsg,
      messagesHistory: messagesHistory, // 添加预构建的消息历史
    };

    this.logger.log(`[OpenAI API Service] 转换结果: ${JSON.stringify(result)}`);

    return result;
  }

  /**
   * 将 OpenAI 格式的消息数组转换为内部格式
   * @param openaiMessages OpenAI 格式消息数组
   * @param systemMessage 系统消息
   * @returns 内部格式消息数组
   */
  private convertMessagesToInternalFormat(openaiMessages: any[], systemMessage: string): any[] {
    const messages = [];

    // 添加系统消息
    if (systemMessage) {
      messages.push({
        role: 'system',
        content: systemMessage,
      });
    }

    // 转换其他消息
    for (const msg of openaiMessages) {
      if (msg.role === 'system') {
        // 跳过系统消息，因为已经合并到 systemMessage 中
        continue;
      }
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return messages;
  }

  /**
   * 从消息数组中提取系统消息
   * @param messages 消息数组
   * @returns 系统消息字符串
   */
  private buildSystemMessage(messages: any[]): string {
    const systemMessages = messages.filter(m => m.role === 'system');
    if (systemMessages.length === 0) {
      return '';
    }
    return systemMessages.map(m => m.content).join('\n');
  }

  /**
   * 获取可用的模型列表
   * @returns 模型列表
   */
  async getAvailableModels() {
    return this.modelsService.getApiAvailableModels();
  }
}
