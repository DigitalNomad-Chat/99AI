import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenAI } from 'openai';
import { SkillEntity } from './entities/skill.entity';
import { SkillExecutionEntity } from './entities/skill-execution.entity';
import { AgentService } from '../agent/agent.service';
import { OpenAIChatService } from '../aiTool/chat/chat.service';
import { ModelsService } from '../models/models.service';
import { correctApiBaseUrl } from '@/common/utils/correctApiBaseUrl';
import { getTokenCount } from '@/common/utils/getTokenCount';

/**
 * 技能执行上下文
 */
export interface SkillExecutionContext {
  userId: number;
  groupId?: number;
  apiKey: string;
  model: string;
  proxyUrl: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
  onProgress?: (data: any) => void;
  abortController?: AbortController;
  req?: any;
  res?: any;
}

/**
 * 技能执行结果
 */
export interface SkillExecutionResult {
  content: string;
  reasoningContent?: string;
  toolCalls?: any[];
  executionTime: number;
  tokenUsage?: number;
  error?: string;
}

@Injectable()
export class SkillEngineService {
  private readonly logger = new Logger(SkillEngineService.name);

  constructor(
    @InjectRepository(SkillEntity)
    private readonly skillRepository: Repository<SkillEntity>,
    @InjectRepository(SkillExecutionEntity)
    private readonly skillExecutionRepository: Repository<SkillExecutionEntity>,
    private readonly agentService: AgentService,
    private readonly openAIChatService: OpenAIChatService,
    private readonly modelsService: ModelsService,
  ) {}

  /**
   * 执行技能
   */
  async executeSkill(
    skillId: number,
    inputParams: Record<string, any>,
    context: SkillExecutionContext,
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();
    const skill = await this.skillRepository.findOne({ where: { id: skillId } });

    if (!skill) {
      throw new HttpException('技能不存在', HttpStatus.BAD_REQUEST);
    }

    if (skill.status !== 1) {
      throw new HttpException('技能当前不可用', HttpStatus.BAD_REQUEST);
    }

    // 创建执行记录
    const executionRecord = await this.skillExecutionRepository.save(
      this.skillExecutionRepository.create({
        skillId,
        userId: context.userId,
        groupId: context.groupId || null,
        inputParams: JSON.stringify(inputParams),
        status: 'running',
      }),
    );

    try {
      let result: SkillExecutionResult;

      switch (skill.type) {
        case 'prompt':
          result = await this.executePromptSkill(skill, inputParams, context);
          break;
        case 'agent':
          result = await this.executeAgentSkill(skill, inputParams, context);
          break;
        case 'workflow':
          result = await this.executeWorkflowSkill(skill, inputParams, context);
          break;
        case 'code':
          result = await this.executeCodeSkill(skill, inputParams, context);
          break;
        default:
          throw new HttpException(`不支持的技能类型: ${skill.type}`, HttpStatus.BAD_REQUEST);
      }

      // 更新执行记录
      await this.skillExecutionRepository.update(
        { id: executionRecord.id },
        {
          status: 'completed',
          outputResult: result.content,
          executionTime: Date.now() - startTime,
          tokenUsage: result.tokenUsage || 0,
        },
      );

      // 增加使用次数
      skill.useCount += 1;
      await this.skillRepository.save(skill);

      return result;
    } catch (error) {
      this.logger.error(`技能执行失败 [${skillId}]:`, error);
      await this.skillExecutionRepository.update(
        { id: executionRecord.id },
        {
          status: 'failed',
          errorMessage: error.message,
          executionTime: Date.now() - startTime,
        },
      );
      throw error;
    }
  }

  /**
   * 执行 Prompt 类型技能
   * 直接调用 LLM，使用 systemPrompt + 用户输入
   */
  private async executePromptSkill(
    skill: SkillEntity,
    inputParams: Record<string, any>,
    context: SkillExecutionContext,
  ): Promise<SkillExecutionResult> {
    const { systemPrompt } = skill;
    const userPrompt = this.buildUserPrompt(skill, inputParams);

    const messages = [
      { role: 'system', content: systemPrompt || '你是一位专业的AI助手。' },
      { role: 'user', content: userPrompt },
    ];

    let content = '';
    let reasoningContent = '';
    let tokenUsage = 0;

    const result = await this.openAIChatService.chat(messages, {
      chatId: null,
      apiKey: context.apiKey,
      model: context.model,
      modelName: context.model,
      temperature: context.temperature,
      max_tokens: context.max_tokens,
      timeout: context.timeout,
      proxyUrl: context.proxyUrl,
      isFileUpload: false,
      abortController: context.abortController || new AbortController(),
      onProgress: (data: any) => {
        if (data.content) {
          content += data.content;
        }
        if (data.reasoning_content) {
          reasoningContent += data.reasoning_content;
        }
        context.onProgress?.(data);
      },
    });

    // 计算 token 消耗
    try {
      tokenUsage = (await getTokenCount(messages)) + (await getTokenCount([{ content }]));
    } catch {
      tokenUsage = 0;
    }

    return {
      content: result || content,
      reasoningContent,
      tokenUsage,
      executionTime: 0,
    };
  }

  /**
   * 执行 Agent 类型技能
   * 调用 AgentService，使用特定工具组合
   */
  private async executeAgentSkill(
    skill: SkillEntity,
    inputParams: Record<string, any>,
    context: SkillExecutionContext,
  ): Promise<SkillExecutionResult> {
    const { systemPrompt } = skill;
    const userPrompt = this.buildUserPrompt(skill, inputParams);

    let execConfig: any = {};
    try {
      execConfig = skill.executionConfig ? JSON.parse(skill.executionConfig) : {};
    } catch {
      execConfig = {};
    }

    const messagesHistory = [
      { role: 'system', content: systemPrompt || '你是一位专业的AI助手，可以使用工具来完成任务。' },
      { role: 'user', content: userPrompt },
    ];

    const abortController = context.abortController || new AbortController();
    let content = '';
    let reasoningContent = '';

    const result = await this.agentService.chatProcess(
      { options: { groupId: context.groupId } },
      context.req,
      context.res,
      {
        messagesHistory,
        apiKey: context.apiKey,
        model: context.model,
        proxyUrl: context.proxyUrl,
        temperature: context.temperature,
        max_tokens: context.max_tokens,
        timeout: context.timeout,
        assistantLogId: 0,
        onProgress: (data: any) => {
          if (data.content) {
            content +=
              typeof data.content === 'string'
                ? data.content
                : data.content.map((c: any) => c.text).join('');
          }
          if (data.reasoning_content) {
            reasoningContent +=
              typeof data.reasoning_content === 'string'
                ? data.reasoning_content
                : data.reasoning_content.map((c: any) => c.text).join('');
          }
          context.onProgress?.(data);
        },
        abortController,
      },
    );

    return {
      content: result.full_content || content,
      reasoningContent: result.full_reasoning_content || reasoningContent,
      toolCalls: result.tool_calls ? JSON.parse(result.tool_calls) : undefined,
      executionTime: 0,
    };
  }

  /**
   * 执行 Workflow 类型技能
   * 多步骤编排执行
   */
  private async executeWorkflowSkill(
    skill: SkillEntity,
    inputParams: Record<string, any>,
    context: SkillExecutionContext,
  ): Promise<SkillExecutionResult> {
    let execConfig: any = {};
    try {
      execConfig = skill.executionConfig ? JSON.parse(skill.executionConfig) : {};
    } catch {
      execConfig = {};
    }

    const steps = execConfig.steps || [];
    if (steps.length === 0) {
      // 没有配置步骤，降级为 prompt 执行
      return this.executePromptSkill(skill, inputParams, context);
    }

    const stepLogs: any[] = [];
    let lastOutput = '';
    const variables: Record<string, any> = { ...inputParams };

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStart = Date.now();

      try {
        let stepResult = '';

        if (step.type === 'llm') {
          stepResult = await this.executeWorkflowLLMStep(step, variables, context);
        } else if (step.type === 'tool') {
          stepResult = await this.executeWorkflowToolStep(step, variables, context);
        } else if (step.type === 'condition') {
          const conditionResult = this.evaluateCondition(step.condition, variables);
          stepResult = conditionResult ? 'true' : 'false';
          if (conditionResult && step.then) {
            // 执行 then 分支（简化版：只支持单步骤）
            stepResult = await this.executeWorkflowLLMStep(step.then, variables, context);
          } else if (!conditionResult && step.else) {
            stepResult = await this.executeWorkflowLLMStep(step.else, variables, context);
          }
        } else {
          stepResult = `未知的步骤类型: ${step.type}`;
        }

        variables[`step${i + 1}`] = stepResult;
        lastOutput = stepResult;

        stepLogs.push({
          step: i + 1,
          type: step.type,
          result: stepResult.substring(0, 500),
          executionTime: Date.now() - stepStart,
          status: 'success',
        });
      } catch (stepError) {
        stepLogs.push({
          step: i + 1,
          type: step.type,
          error: stepError.message,
          executionTime: Date.now() - stepStart,
          status: 'failed',
        });
        throw new HttpException(
          `工作流步骤 ${i + 1} 执行失败: ${stepError.message}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

    return {
      content: lastOutput,
      executionTime: 0,
    };
  }

  /**
   * 执行工作流的 LLM 步骤
   */
  private async executeWorkflowLLMStep(
    step: any,
    variables: Record<string, any>,
    context: SkillExecutionContext,
  ): Promise<string> {
    const prompt = this.renderTemplate(step.prompt || step.content || '', variables);
    const messages = [
      { role: 'system', content: step.systemPrompt || '你是一位AI助手。' },
      { role: 'user', content: prompt },
    ];

    let content = '';
    await this.openAIChatService.chat(messages, {
      chatId: null,
      apiKey: context.apiKey,
      model: step.model || context.model,
      modelName: step.model || context.model,
      temperature: step.temperature ?? context.temperature,
      max_tokens: step.max_tokens ?? context.max_tokens,
      timeout: context.timeout,
      proxyUrl: context.proxyUrl,
      isFileUpload: false,
      abortController: context.abortController || new AbortController(),
      onProgress: (data: any) => {
        if (data.content) {
          content += data.content;
        }
      },
    });

    return content;
  }

  /**
   * 执行工作流的工具步骤
   */
  private async executeWorkflowToolStep(
    step: any,
    variables: Record<string, any>,
    context: SkillExecutionContext,
  ): Promise<string> {
    // 工具步骤：目前简化实现，通过 Agent 调用
    // 后续可以扩展为直接调用特定工具
    const toolName = step.tool || 'net_search';
    const input = this.renderTemplate(step.input || '', variables);

    this.logger.debug(`执行工具步骤: ${toolName}, 输入: ${input}`);

    // 简化：返回提示信息
    return `[工具执行: ${toolName}]\n输入: ${input}\n(工作流工具步骤需要与 Agent 工具链集成)`;
  }

  /**
   * 执行 Code 类型技能
   * 目前为占位实现
   */
  private async executeCodeSkill(
    skill: SkillEntity,
    inputParams: Record<string, any>,
    context: SkillExecutionContext,
  ): Promise<SkillExecutionResult> {
    return {
      content: '代码执行功能即将上线。目前支持 prompt 和 agent 类型的技能执行。',
      executionTime: 0,
    };
  }

  /**
   * 构建用户提示词
   * 根据 inputSchema 和 inputParams 生成结构化的用户输入
   */
  private buildUserPrompt(skill: SkillEntity, inputParams: Record<string, any>): string {
    let schema: any = {};
    try {
      schema = skill.inputSchema ? JSON.parse(skill.inputSchema) : {};
    } catch {
      schema = {};
    }

    const fields = schema.fields || [];
    if (fields.length === 0) {
      // 没有定义 inputSchema，直接将所有参数拼接
      return Object.entries(inputParams)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
    }

    const parts: string[] = [];
    for (const field of fields) {
      const value = inputParams[field.id];
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${field.title}: ${value}`);
      }
    }

    return parts.join('\n');
  }

  /**
   * 渲染模板
   * 将 {{variable}} 替换为实际值
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    try {
      // 简单的条件评估：检查变量是否存在且为真值
      const value = variables[condition];
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') return value.length > 0;
      if (typeof value === 'number') return value > 0;
      return !!value;
    } catch {
      return false;
    }
  }

  /**
   * 获取技能的输入参数模板
   */
  async getSkillInputSchema(skillId: number): Promise<any> {
    const skill = await this.skillRepository.findOne({ where: { id: skillId } });
    if (!skill) {
      throw new HttpException('技能不存在', HttpStatus.BAD_REQUEST);
    }

    try {
      return skill.inputSchema ? JSON.parse(skill.inputSchema) : { fields: [] };
    } catch {
      return { fields: [] };
    }
  }
}
