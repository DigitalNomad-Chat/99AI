import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@/common/auth/jwtAuth.guard';
import { SuperAuthGuard } from '@/common/auth/superAuth.guard';
import { BotInstanceService } from './bot-instance.service';
import { BotMessageService } from './bot-message.service';
import { BotGatewayService } from './bot-gateway.service';

@ApiTags('Bot')
@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(
    private readonly botInstanceService: BotInstanceService,
    private readonly botMessageService: BotMessageService,
    private readonly botGatewayService: BotGatewayService,
  ) {}

  // ==================== 管理后台 API ====================

  @Get('instances')
  @UseGuards(SuperAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 Bot 实例列表' })
  async getInstances() {
    return this.botInstanceService.findAll();
  }

  @Post('instances')
  @UseGuards(SuperAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 Bot 实例' })
  async createInstance(@Body() body: any) {
    const instance = await this.botInstanceService.create(body);
    await this.botGatewayService.registerAdapter(instance);
    return instance;
  }

  @Put('instances/:id')
  @UseGuards(SuperAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新 Bot 实例' })
  async updateInstance(@Param('id') id: number, @Body() body: any) {
    await this.botGatewayService.unregisterAdapter(id);
    await this.botInstanceService.update(id, body);
    const instance = await this.botInstanceService.findById(id);
    if (instance && instance.status === 1) {
      await this.botGatewayService.registerAdapter(instance);
    }
    return { success: true };
  }

  @Delete('instances/:id')
  @UseGuards(SuperAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除 Bot 实例' })
  async deleteInstance(@Param('id') id: number) {
    await this.botGatewayService.unregisterAdapter(id);
    await this.botInstanceService.delete(id);
    return { success: true };
  }

  @Get('instances/:id/messages')
  @UseGuards(SuperAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 Bot 消息记录' })
  async getMessages(
    @Param('id') id: number,
    @Query('page') page: number,
    @Query('size') size: number,
  ) {
    return this.botMessageService.findByBotInstance(id, page || 1, size || 20);
  }

  // ==================== Webhook 入口 ====================

  @Post('webhook/:platform/:instanceId')
  @ApiOperation({ summary: 'Bot Webhook 接收端点' })
  async webhook(
    @Param('platform') platform: any,
    @Param('instanceId') instanceId: number,
    @Query() query: any,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.botGatewayService.handleWebhook(instanceId, platform, query, body);
      if (result && typeof result === 'object' && result.challenge) {
        return res.status(200).json(result);
      }
      return res.status(200).send(result);
    } catch (error) {
      this.logger.error(`Webhook 处理失败: ${error.message}`);
      return res.status(200).send('success');
    }
  }

  @Get('webhook/:platform/:instanceId')
  @ApiOperation({ summary: 'Bot Webhook GET 验证' })
  async webhookGet(
    @Param('platform') platform: any,
    @Param('instanceId') instanceId: number,
    @Query() query: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.botGatewayService.handleWebhook(instanceId, platform, query, {});
      return res.status(200).send(result);
    } catch (error) {
      return res.status(200).send('success');
    }
  }
}
