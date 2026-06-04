import { JwtAuthGuard } from '@/common/auth/jwtAuth.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Request,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiKeyService } from './apiKey.service';
import { ModelsService } from '../models/models.service';
import { CreateApiKeyDto } from './dto/createApiKey.dto';
import { QueryApiKeyDto } from './dto/queryApiKey.dto';

@ApiTags('apiKey')
@Controller('user/api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly modelsService: ModelsService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取用户的 API Keys 列表' })
  async getApiKeys(@Query() query: QueryApiKeyDto, @Req() req: Request) {
    // [DEBUG] 添加调试日志
    console.log('[ApiKeyController] getApiKeys called');
    console.log('[ApiKeyController] req.user:', (req as any).user);
    console.log('[ApiKeyController] req.user?.id:', (req as any).user?.id);
    console.log('[ApiKeyController] query:', query);

    const userId = (req as any).user?.id;
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;

    console.log('[ApiKeyController] Calling getUserApiKeys with:', { userId, page, pageSize });

    try {
      const result = await this.apiKeyService.getUserApiKeys(userId, page, pageSize);
      console.log('[ApiKeyController] getUserApiKeys result:', {
        total: result.total,
        dataCount: result.data?.length,
      });
      return result;
    } catch (error) {
      console.log('[ApiKeyController] getUserApiKeys error:', error.message);
      console.log('[ApiKeyController] Error stack:', error.stack);
      throw error;
    }
  }

  @Post()
  @ApiOperation({ summary: '创建新的 API Key' })
  async createApiKey(@Body() dto: CreateApiKeyDto, @Req() req: any) {
    const userId = (req as any).user?.id;

    try {
      const apiKey = await this.apiKeyService.create(userId, dto.name);

      return {
        data: { apiKey },
        message: '创建成功，请妥善保存 API Key',
      };
    } catch (error) {
      // 抛出HTTP异常，返回正确的状态码和错误消息
      const message = error?.message || '创建 API Key 失败';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除 API Key' })
  async deleteApiKey(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.id;
    await this.apiKeyService.deleteApiKey(parseInt(id), userId);

    return {
      message: '删除成功',
    };
  }

  @Post(':id')
  @ApiOperation({ summary: '删除 API Key (POST 方法兼容)' })
  async deleteApiKeyPost(@Param('id') id: string, @Req() req: Request) {
    return this.deleteApiKey(id, req);
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: '切换 API Key 启用/禁用状态' })
  async toggleApiKeyStatus(@Param('id') id: string, @Req() req: Request) {
    const userId = (req as any).user?.id;
    const newStatus = await this.apiKeyService.toggleApiKeyStatus(parseInt(id), userId);

    return {
      data: { isActive: newStatus },
      message: newStatus ? '已启用' : '已停用',
    };
  }

  @Get('available-models')
  @ApiOperation({ summary: '获取可用于开放API的模型列表' })
  async getAvailableModels() {
    const models = await this.modelsService.getApiAvailableModels();

    return {
      data: models,
    };
  }
}
