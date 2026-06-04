import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '@/common/auth/jwtAuth.guard';

@ApiTags('Voice')
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('tts')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'TTS 语音合成' })
  async tts(@Body() body: { text: string; model?: string; voice?: string }, @Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new HttpException('未登录', HttpStatus.UNAUTHORIZED);
    }
    const result = await this.voiceService.tts(body, userId, req);
    return { code: 200, data: result, success: true, message: '合成成功' };
  }

  @Post('asr')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'ASR 语音识别' })
  async asr(
    @Body() body: { fileUrl?: string; language?: string },
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new HttpException('未登录', HttpStatus.UNAUTHORIZED);
    }
    const result = await this.voiceService.asr(body, userId, file);
    return { code: 200, data: result, success: true, message: '识别成功' };
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '查询语音调用记录' })
  async logs(
    @Query('page') page: number,
    @Query('size') size: number,
    @Query('type') type: string,
    @Req() req: Request,
  ) {
    const userId = (req as any).user?.id;
    const result = await this.voiceService.queryLogs(userId, page || 1, size || 20, type);
    return { code: 200, data: result, success: true, message: '请求成功' };
  }
}
