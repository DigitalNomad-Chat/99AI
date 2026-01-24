import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthGuard } from '../../common/auth/adminAuth.guard';
import { JwtAuthGuard } from '../../common/auth/jwtAuth.guard';
import { WorkflowService } from './workflow.service';
import { AppService } from '../app/app.service';

/**
 * 工作流DTO
 */
class CallWorkflowDto {
  appId: number;
  variables: Record<string, any>;
  message: string;
  fileUrl?: string;
  stream?: boolean;
}

class ValidateWorkflowDto {
  appType: number;
  workflowApiUrl: string;
  workflowApiKey: string;
  workflowAppId: string;
}

/**
 * 工作流控制器
 * 提供工作流调用和验证API
 */
@ApiTags('Workflow')
@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly appService: AppService,
  ) {}

  /**
   * 调用工作流
   */
  @Post('call')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '调用工作流' })
  async callWorkflow(@Body() dto: CallWorkflowDto, @Request() req) {
    try {
      // 获取应用信息
      const app = await this.appService.queryOneApp(dto.appId);

      if (!app) {
        return {
          code: 404,
          message: '应用不存在',
          data: null,
        };
      }

      // 检查是否是工作流类型
      if (!this.workflowService.isWorkflowApp(app)) {
        return {
          code: 400,
          message: '该应用不是工作流类型',
          data: null,
        };
      }

      // 格式化消息
      const formatted = this.workflowService.formatMessages(
        dto.variables,
        dto.message,
        dto.fileUrl,
      );

      // 调用工作流
      const result = await this.workflowService.callWorkflow(app, {
        appId: dto.appId,
        variables: formatted.variables,
        message: formatted.message,
        fileUrl: formatted.fileUrl,
        stream: dto.stream || false,
        chatId: `99ai_${req.user.id}_${Date.now()}`,
      });

      return {
        code: 200,
        message: '工作流调用成功',
        data: result,
      };
    } catch (error) {
      return {
        code: 500,
        message: `工作流调用失败: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * 验证工作流配置
   */
  @Post('validate')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '验证工作流配置' })
  async validateWorkflow(@Body() dto: ValidateWorkflowDto) {
    try {
      const isValid = this.workflowService.validateWorkflowConfig(dto);

      return {
        code: 200,
        message: isValid ? '配置验证通过' : '配置验证失败',
        data: { isValid },
      };
    } catch (error) {
      return {
        code: 400,
        message: error.message,
        data: { isValid: false },
      };
    }
  }

  /**
   * 测试工作流连接
   */
  @Post('test')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '测试工作流连接' })
  async testWorkflow(@Body() dto: ValidateWorkflowDto) {
    try {
      const result = await this.workflowService.testWorkflowConnectionByConfig(dto);

      return {
        code: result.success ? 200 : 400,
        message: result.message,
        data: result,
      };
    } catch (error) {
      return {
        code: 500,
        message: `测试失败: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * 通过应用ID测试工作流连接
   */
  @Post('test/:appId')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '通过应用ID测试工作流连接' })
  async testWorkflowByAppId(@Param('appId') appId: number) {
    try {
      const app = await this.appService.queryOneApp(appId);

      if (!app) {
        return {
          code: 404,
          message: '应用不存在',
          data: null,
        };
      }

      const result = await this.workflowService.testWorkflowConnection(app);

      return {
        code: result.success ? 200 : 400,
        message: result.message,
        data: result,
      };
    } catch (error) {
      return {
        code: 500,
        message: `测试失败: ${error.message}`,
        data: null,
      };
    }
  }

  /**
   * 获取工作流类型列表
   */
  @Get('types')
  @ApiOperation({ summary: '获取工作流类型列表' })
  getWorkflowTypes() {
    return {
      code: 200,
      message: '获取成功',
      data: [
        { value: 0, label: '智能体' },
        { value: 1, label: 'FastGPT工作流' },
        { value: 2, label: 'Dify工作流' },
        { value: 3, label: 'n8n工作流' },
      ],
    };
  }
}
