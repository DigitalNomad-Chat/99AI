import { Injectable, Logger } from '@nestjs/common';
import { AxiosRequestConfig } from 'axios';
import { AppEntity } from '../app/app.entity';

/**
 * 工作流消息内容类型
 */
export interface MessageContent {
  type: 'text' | 'image_url' | 'file_url';
  text?: string;
  image_url?: { url: string };
  file_url?: { name: string; url: string };
}

/**
 * 工作流调用选项
 */
export interface WorkflowCallOptions {
  appId: number;
  variables: Record<string, any>;
  message: string;
  fileUrl?: string;
  stream?: boolean;
  chatId?: string;
}

/**
 * 工作流响应结果
 */
export interface WorkflowResult {
  content: string;
  reasoning_content?: string; // 深度思考内容（完整）
  full_reasoning_content?: string; // 深度思考内容完整累积
  full_content?: string; // 回答内容完整累积
  tool_calls?: any; // 工具调用
  imageUrl?: string; // 响应中的图片URL
  fileUrl?: string; // 响应中的文件URL
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  detail?: any;
  error?: string; // 错误信息
}

/**
 * 工作流适配器接口
 * 用于适配不同的工作流平台（FastGPT、Dify、n8n等）
 */
export interface IWorkflowAdapter {
  /**
   * 平台名称
   */
  name: string;

  /**
   * 构建API请求配置
   */
  buildRequest(app: AppEntity, options: WorkflowCallOptions): AxiosRequestConfig;

  /**
   * 解析API响应
   */
  parseResponse(response: any): WorkflowResult;

  /**
   * 将99AI的fileUrl格式转换为工作流平台的messages格式
   */
  transformFileUrl(fileUrl: string, message: string): any[];
}

/**
 * FastGPT工作流适配器
 * 将99AI的文件格式转换为FastGPT所需的格式
 */
@Injectable()
export class FastGPTAdapter implements IWorkflowAdapter {
  private readonly logger = new Logger(FastGPTAdapter.name);
  readonly name = 'fastgpt';

  /**
   * 构建FastGPT API请求
   */
  buildRequest(app: AppEntity, options: WorkflowCallOptions): AxiosRequestConfig {
    const { variables, message, fileUrl, stream = false, chatId } = options;

    // 构建messages数组
    let messages: any[];
    if (fileUrl) {
      messages = this.transformFileUrl(fileUrl, message);
    } else {
      messages = [{ role: 'user', content: message }];
    }

    // 构建请求数据，按FastGPT规范：
    // - chatId: 可选，为空时不使用上下文功能
    // - variables: 可选，根据模板内容决定是否发送
    const data: Record<string, any> = {
      stream: stream,
      detail: false,
      messages: messages,
    };

    // 只有在明确提供chatId时才添加（允许为空以不使用上下文）
    if (chatId) {
      data.chatId = chatId;
    }

    // 只有在variables非空时才添加（取决于提问模板是否有内容）
    if (variables && Object.keys(variables).length > 0) {
      data.variables = variables;
    }

    return {
      method: 'POST',
      url: `${app.workflowApiUrl}/v1/chat/completions`,
      headers: {
        Authorization: `Bearer ${app.workflowApiKey}`,
        'Content-Type': 'application/json',
      },
      data: data,
    };
  }

  /**
   * 解析FastGPT响应
   * 支持深度思考内容和多模态响应
   */
  parseResponse(response: any): WorkflowResult {
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      const message = choice.message || {};
      const delta = choice.delta || {};

      // 提取内容和深度思考内容
      const content = message.content || delta.content || '';
      const reasoningContent = delta.reasoning_content || message.reasoning_content || '';

      // 检测并提取 </think>... 标签中的思考内容
      let extractedReasoning = '';
      if (content && content.includes('...')) {
        const thinkRegex = /([\s\S]*?)<\/think>/;
        const match = content.match(thinkRegex);
        if (match) {
          extractedReasoning = match[1];
        }
      }

      // 提取工具调用
      const toolCalls = message.tool_calls || delta.tool_calls;

      // 提取图片URL（Markdown格式：![alt](url)）
      let imageUrl: string | undefined;
      const imageRegex = /!\[.*?\]\(([^)]+)\)/g;
      const imageMatches = content.match(imageRegex);
      if (imageMatches && imageMatches.length > 0) {
        // 提取第一个图片URL
        const urlMatch = imageMatches[0].match(/!\[.*?\]\(([^)]+)\)/);
        if (urlMatch) {
          imageUrl = urlMatch[1];
        }
      }

      // 提取文件URL（通常在响应数据中）
      let fileUrl: string | undefined;
      if (response.responseData?.fileUrl) {
        fileUrl = response.responseData.fileUrl;
      }

      // 解析usage
      const usage = response.usage
        ? {
            promptTokens: response.usage.prompt_tokens || 0,
            completionTokens: response.usage.completion_tokens || 0,
            totalTokens: response.usage.total_tokens || 0,
          }
        : undefined;

      return {
        content: content,
        reasoning_content: reasoningContent || extractedReasoning || undefined,
        full_reasoning_content: reasoningContent || extractedReasoning || '',
        full_content: content,
        tool_calls: toolCalls,
        imageUrl: imageUrl,
        fileUrl: fileUrl,
        usage: usage,
        detail: response.responseData,
      };
    }

    return {
      content: '',
      full_content: '',
      full_reasoning_content: '',
    };
  }

  /**
   * 将99AI的fileUrl格式转换为FastGPT messages格式
   *
   * 99AI格式: [{"name": "文件名", "url": "链接", "type": "document|image"}]
   * FastGPT格式: [
   *   {type: "text", text: "用户消息"},
   *   {type: "image_url", image_url: {url: "图片链接"}},
   *   {type: "file_url", name: "文件名", url: "文件链接"}
   * ]
   */
  transformFileUrl(fileUrl: string, message: string): any[] {
    const content: MessageContent[] = [{ type: 'text', text: message }];

    try {
      const files = JSON.parse(fileUrl);
      if (!Array.isArray(files)) {
        this.logger.warn('fileUrl不是数组格式');
        return [{ role: 'user', content: message }];
      }

      for (const file of files) {
        if (!file || !file.type) continue;

        if (file.type === 'image' && file.url) {
          content.push({
            type: 'image_url',
            image_url: { url: file.url },
          });
        } else if (file.type === 'document' && file.url) {
          content.push({
            type: 'file_url',
            file_url: {
              name: file.name || 'document',
              url: file.url,
            },
          });
        }
      }
    } catch (error) {
      this.logger.error(`解析fileUrl失败: ${error.message}`);
      return [{ role: 'user', content: message }];
    }

    return [{ role: 'user', content: content }];
  }
}

/**
 * 工作流适配器管理器
 * 负责根据appType选择合适的适配器
 */
@Injectable()
export class WorkflowAdapterManager {
  private readonly logger = new Logger(WorkflowAdapterManager.name);
  private adapters: Map<number, IWorkflowAdapter> = new Map();

  constructor(private readonly fastGPTAdapter: FastGPTAdapter) {
    // 注册适配器
    this.adapters.set(1, this.fastGPTAdapter); // 1 = FastGPT
    // 未来可以注册更多适配器:
    // this.adapters.set(2, new DifyAdapter());
    // this.adapters.set(3, new N8nAdapter());
  }

  /**
   * 根据appType获取对应的适配器
   */
  getAdapter(appType: number): IWorkflowAdapter {
    const adapter = this.adapters.get(appType);
    if (!adapter) {
      throw new Error(`不支持的工作流类型: ${appType}`);
    }
    return adapter;
  }

  /**
   * 获取所有已注册的适配器
   */
  getRegisteredAdapters(): Map<number, IWorkflowAdapter> {
    return this.adapters;
  }
}
