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
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  detail?: any;
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

    return {
      method: 'POST',
      url: `${app.workflowApiUrl}/api/v1/chat/completions`,
      headers: {
        Authorization: `Bearer ${app.workflowApiKey}`,
        'Content-Type': 'application/json',
      },
      data: {
        chatId: chatId || `99ai_${Date.now()}`,
        stream: stream,
        detail: false,
        variables: variables,
        messages: messages,
      },
    };
  }

  /**
   * 解析FastGPT响应
   */
  parseResponse(response: any): WorkflowResult {
    if (response.choices && response.choices.length > 0) {
      const choice = response.choices[0];
      return {
        content: choice.message?.content || choice.delta?.content || '',
        usage: response.usage
          ? {
              promptTokens: response.usage.prompt_tokens || 0,
              completionTokens: response.usage.completion_tokens || 0,
              totalTokens: response.usage.total_tokens || 0,
            }
          : undefined,
        detail: response.responseData,
      };
    }

    return {
      content: '',
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
