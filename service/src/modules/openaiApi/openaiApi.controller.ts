import { OpenaiApiService } from './openaiApi.service';
import { ChatCompletionDto } from './dto/chatCompletion.dto';
import { ChatService } from '../chat/chat.service';
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { OpenAIAuthGuard } from '@/common/guards/openaiAuth.guard';
import { RateLimitInterceptor } from '@/common/interceptors/rateLimit.interceptor';

@ApiTags('OpenAI API')
@Controller('v1')
export class OpenaiApiController {
  private readonly logger = new Logger(OpenaiApiController.name);

  constructor(
    private readonly openaiApiService: OpenaiApiService,
    private readonly chatService: ChatService,
  ) {}

  @Post('chat/completions')
  @ApiOperation({ summary: 'OpenAI 兼容聊天接口' })
  @UseGuards(OpenAIAuthGuard)
  @UseInterceptors(RateLimitInterceptor)
  async chatCompletions(@Body() dto: ChatCompletionDto, @Req() req: Request, @Res() res: Response) {
    this.logger.log(
      `[OpenAI API] 收到请求: model=${dto.model}, messages=${dto.messages?.length}, stream=${dto.stream}`,
    );

    // OpenAI 格式转换 → 内部格式
    const internalRequest = await this.openaiApiService.toInternalFormat(dto, req);

    this.logger.log(`[OpenAI API] 内部格式转换完成`);

    // 如果是非流式请求，需要收集完整响应并转换为 OpenAI 格式
    if (dto.stream === false) {
      return this.handleNonStreamingRequest(internalRequest, req, res, dto.model);
    }

    // 流式请求直接返回
    return this.chatService.chatProcess(internalRequest, req, res);
  }

  /**
   * 处理非流式请求
   */
  private async handleNonStreamingRequest(
    internalRequest: any,
    req: Request,
    res: Response,
    model: string,
  ) {
    this.logger.log(`[OpenAI API] 处理非流式请求...`);

    // 创建一个 mock Response 对象来收集流式数据
    let fullContent = '';
    let fullReasoningContent = '';
    let finishReason = '';
    let chatId = '';
    let statusCode = 200;
    const headers: Record<string, string> = {};
    let closed = false;

    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return mockRes;
      },
      write: (data: any) => {
        this.logger.log(`[OpenAI API] 收到数据块: ${data?.toString()?.substring(0, 100)}...`);
        try {
          const dataStr = data.toString();
          // 可能是多个 JSON 对象用换行分隔
          const lines = dataStr.split('\n').filter((line: string) => line.trim());
          for (const line of lines) {
            try {
              const chunk = JSON.parse(line);
              // 收集内容
              if (chunk.content) {
                const text = chunk.content[0]?.text || '';
                fullContent += text;
              }
              if (chunk.reasoning_content) {
                const text = chunk.reasoning_content[0]?.text || '';
                fullReasoningContent += text;
              }
              if (chunk.chatId && !chatId) {
                chatId = String(chunk.chatId);
              }
              if (chunk.finishReason) {
                finishReason = chunk.finishReason;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        } catch (e) {
          this.logger.error(`[OpenAI API] 解析数据块失败: ${e.message}`);
        }
      },
      end: () => {
        this.logger.log(`[OpenAI API] 数据流结束`);
        closed = true;
      },
      on: () => mockRes,
      setHeader: (name: string, value: string) => {
        headers[name] = value;
      },
      header: (name: string, value: string) => {
        headers[name] = value;
      },
      get: (name: string) => headers[name],
    } as any;

    try {
      // 调用 chatProcess
      await this.chatService.chatProcess(internalRequest, req, mockRes);

      this.logger.log(
        `[OpenAI API] 非流式响应收集完成: content=${fullContent.length} chars, chatId=${chatId}`,
      );

      // 转换为 OpenAI 格式
      const openaiResponse = {
        id: `chatcmpl-${chatId || Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: fullContent,
            },
            finish_reason: finishReason || 'stop',
          },
        ],
        usage: {
          prompt_tokens: 0, // TODO: 从 token 统计获取
          completion_tokens: 0,
          total_tokens: 0,
        },
      };

      this.logger.log(`[OpenAI API] 返回 OpenAI 格式响应`);

      // 设置响应头
      res.status(statusCode);
      res.setHeader('Content-Type', 'application/json');
      res.json(openaiResponse);
    } catch (error) {
      this.logger.error(`[OpenAI API] 非流式请求处理失败: ${error.message}`, error.stack);
      res.status(500).json({
        error: {
          message: error.message,
          type: 'internal_server_error',
        },
      });
    }
  }

  @Get('models')
  @ApiOperation({ summary: '获取可用模型列表' })
  @UseGuards(OpenAIAuthGuard)
  async getModels(@Req() req: Request) {
    return this.openaiApiService.getAvailableModels();
  }
}
