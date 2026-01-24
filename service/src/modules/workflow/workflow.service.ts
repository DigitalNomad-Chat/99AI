import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { AppEntity } from '../app/app.entity';
import {
  FastGPTAdapter,
  WorkflowCallOptions,
  WorkflowResult,
  WorkflowAdapterManager,
} from './workflow.adapter';

/**
 * 工作流配置验证DTO
 */
export interface WorkflowConfigDto {
  appType: number;
  workflowApiUrl: string;
  workflowApiKey: string;
  workflowAppId: string;
}

/**
 * 工作流服务
 * 负责调用各种工作流平台（FastGPT、Dify、n8n等）
 */
@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(private readonly adapterManager: WorkflowAdapterManager) {}

  /**
   * 验证工作流配置是否完整
   */
  validateWorkflowConfig(config: WorkflowConfigDto): boolean {
    const { appType, workflowApiUrl, workflowApiKey } = config;

    if (!appType || appType === 0) {
      // 不是工作流类型
      return false;
    }

    if (!workflowApiUrl) {
      throw new Error('工作流API地址不能为空');
    }

    if (!workflowApiKey) {
      throw new Error('工作流API Key不能为空');
    }

    // workflowAppId 仅用于管理后台标识，非必填项

    // 验证API地址格式
    try {
      new URL(workflowApiUrl);
    } catch (error) {
      throw new Error('工作流API地址格式不正确');
    }

    return true;
  }

  /**
   * 调用FastGPT工作流
   * @param app 应用实体（包含工作流配置）
   * @param options 调用选项
   * @returns 工作流执行结果
   */
  async callFastGPT(app: AppEntity, options: WorkflowCallOptions): Promise<WorkflowResult> {
    try {
      // 验证应用配置
      this.validateWorkflowConfig({
        appType: app.appType,
        workflowApiUrl: app.workflowApiUrl,
        workflowApiKey: app.workflowApiKey,
        workflowAppId: app.workflowAppId,
      });

      // 获取FastGPT适配器
      const adapter = this.adapterManager.getAdapter(app.appType);

      if (adapter.name !== 'fastgpt') {
        throw new Error('应用类型与FastGPT不匹配');
      }

      // 构建请求
      const requestConfig = adapter.buildRequest(app, options);

      this.logger.log(`调用FastGPT工作流: ${app.name} (${app.workflowAppId})`);

      // 发送请求
      const response: AxiosResponse = await axios(requestConfig);

      // 解析响应
      const result = adapter.parseResponse(response.data);

      this.logger.log(
        `FastGPT工作流调用成功: ${app.name}, Token使用: ${result.usage?.totalTokens || 0}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`调用FastGPT工作流失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 通用工作流调用方法
   * 根据appType自动选择对应的适配器
   */
  async callWorkflow(app: AppEntity, options: WorkflowCallOptions): Promise<WorkflowResult> {
    // 获取适配器
    const adapter = this.adapterManager.getAdapter(app.appType);

    // 验证配置
    this.validateWorkflowConfig({
      appType: app.appType,
      workflowApiUrl: app.workflowApiUrl,
      workflowApiKey: app.workflowApiKey,
      workflowAppId: app.workflowAppId,
    });

    // 构建请求
    const requestConfig = adapter.buildRequest(app, options);

    this.logger.log(`调用工作流: ${adapter.name} - ${app.name}`);

    // 发送请求
    const response: AxiosResponse = await axios(requestConfig);

    // 解析响应
    const result = adapter.parseResponse(response.data);

    this.logger.log(`工作流调用成功: ${adapter.name} - ${app.name}`);

    return result;
  }

  /**
   * 测试工作流连接
   * 用于管理员验证工作流配置是否正确
   */
  async testWorkflowConnection(app: AppEntity): Promise<{
    success: boolean;
    message: string;
    response?: any;
  }> {
    try {
      const result = await this.callWorkflow(app, {
        appId: app.id,
        variables: {},
        message: '测试连接',
        stream: false,
      });

      return {
        success: true,
        message: '工作流连接测试成功',
        response: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `工作流连接测试失败: ${error.message}`,
      };
    }
  }

  /**
   * 通过配置测试工作流连接
   * 用于新建应用时测试配置（尚未保存到数据库）
   */
  async testWorkflowConnectionByConfig(config: WorkflowConfigDto): Promise<{
    success: boolean;
    message: string;
    response?: any;
  }> {
    try {
      // 验证配置
      this.validateWorkflowConfig(config);

      // 创建临时应用对象用于测试（包含所有必填字段）
      const tempApp: AppEntity = {
        id: 0, // 测试时使用临时ID
        name: '测试工作流',
        catId: '', // 测试时不需要
        appType: config.appType,
        workflowApiUrl: config.workflowApiUrl,
        workflowApiKey: config.workflowApiKey,
        workflowAppId: config.workflowAppId,
        status: 1,
        order: 0,
        isGPTs: 0,
        isFixedModel: 0,
        isFlowith: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any; // 使用 any 绕过其他必填字段的检查

      const result = await this.callWorkflow(tempApp, {
        appId: 0,
        variables: {},
        message: '测试连接',
        stream: false,
      });

      return {
        success: true,
        message: '工作流连接测试成功',
        response: result,
      };
    } catch (error) {
      return {
        success: false,
        message: `工作流连接测试失败: ${error.message}`,
      };
    }
  }

  /**
   * 格式化消息（变量+文件）
   * 将用户输入的变量和文件转换为工作流所需的格式
   */
  formatMessages(
    variables: Record<string, any>,
    message: string,
    fileUrl?: string,
  ): { variables: Record<string, any>; message: string; fileUrl?: string } {
    // 变量清理：移除空值
    const cleanedVariables: Record<string, any> = {};
    for (const [key, value] of Object.entries(variables)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanedVariables[key] = value;
      }
    }

    return {
      variables: cleanedVariables,
      message,
      fileUrl,
    };
  }

  /**
   * 获取工作流类型名称
   */
  getWorkflowTypeName(appType: number): string {
    const typeMap: Record<number, string> = {
      0: '智能体',
      1: 'FastGPT工作流',
      2: 'Dify工作流',
      3: 'n8n工作流',
    };
    return typeMap[appType] || '未知类型';
  }

  /**
   * 检查应用是否是工作流类型
   */
  isWorkflowApp(app: AppEntity): boolean {
    return app.appType > 0;
  }
}
