import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';

interface MulterFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OpenAI } from 'openai';
import { VoiceLogEntity } from './entities/voice-log.entity';
import { formatUrl } from '@/common/utils';
import { correctApiBaseUrl } from '@/common/utils/correctApiBaseUrl';
import { GlobalConfigService } from '../globalConfig/globalConfig.service';
import { UploadService } from '../upload/upload.service';
import { UserBalanceService } from '../userBalance/userBalance.service';

export interface TtsDto {
  text: string;
  model?: string;
  voice?: string;
}

export interface AsrDto {
  fileUrl?: string;
  language?: string;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    @InjectRepository(VoiceLogEntity)
    private readonly voiceLogRepository: Repository<VoiceLogEntity>,
    private readonly globalConfigService: GlobalConfigService,
    private readonly uploadService: UploadService,
    private readonly userBalanceService: UserBalanceService,
  ) {}

  /**
   * TTS 语音合成
   */
  async tts(body: TtsDto, userId: number, req: any): Promise<{ url: string }> {
    const startTime = Date.now();
    const { text, model = 'tts-1', voice = 'alloy' } = body;

    if (!text || text.trim().length === 0) {
      throw new HttpException('文本不能为空', HttpStatus.BAD_REQUEST);
    }
    if (text.length > 4096) {
      throw new HttpException('文本长度不能超过 4096 字符', HttpStatus.BAD_REQUEST);
    }

    try {
      const { openaiBaseUrl, openaiBaseKey } = await this.globalConfigService.getConfigs([
        'openaiBaseUrl',
        'openaiBaseKey',
      ]);

      const formattedUrl = formatUrl(openaiBaseUrl);
      const correctedProxyUrl = await correctApiBaseUrl(formattedUrl);
      const openai = new OpenAI({
        apiKey: openaiBaseKey,
        baseURL: correctedProxyUrl,
        timeout: 60000,
      });

      const response = await openai.audio.speech.create({
        model,
        input: text,
        voice: voice as any,
      });

      const buffer = Buffer.from(await response.arrayBuffer());

      // 上传音频文件
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const currentDate = `${year}${month}/${day}`;

      const url = await this.uploadService.uploadFile(
        { buffer, mimetype: 'audio/mpeg' },
        `audio/tts/${currentDate}`,
      );

      // 记录日志
      const duration = Date.now() - startTime;
      await this.voiceLogRepository.save(
        this.voiceLogRepository.create({
          userId,
          type: 'tts',
          input: text.substring(0, 500),
          output: url,
          model,
          voice,
          duration,
          status: 'success',
        }),
      );

      return { url };
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.voiceLogRepository.save(
        this.voiceLogRepository.create({
          userId,
          type: 'tts',
          input: text.substring(0, 500),
          model,
          voice,
          duration,
          status: 'failed',
        }),
      );
      this.logger.error(`TTS 失败: ${error.message}`);
      throw new HttpException(`TTS 合成失败: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * ASR 语音识别
   */
  async asr(body: AsrDto, userId: number, file?: MulterFile): Promise<{ text: string }> {
    const startTime = Date.now();
    const { fileUrl, language = 'zh' } = body;

    if (!file && !fileUrl) {
      throw new HttpException('请上传音频文件或提供音频 URL', HttpStatus.BAD_REQUEST);
    }

    try {
      const { openaiBaseUrl, openaiBaseKey } = await this.globalConfigService.getConfigs([
        'openaiBaseUrl',
        'openaiBaseKey',
      ]);

      const formattedUrl = formatUrl(openaiBaseUrl);
      const correctedProxyUrl = await correctApiBaseUrl(formattedUrl);
      const openai = new OpenAI({
        apiKey: openaiBaseKey,
        baseURL: correctedProxyUrl,
        timeout: 120000,
      });

      let audioFile: any;
      if (file) {
        audioFile = await this.toFile(file);
      } else {
        // 从 URL 下载
        const axios = (await import('axios')).default;
        const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
        audioFile = await this.toFileFromBuffer(
          Buffer.from(response.data),
          'audio.mp3',
          response.headers['content-type'] || 'audio/mpeg',
        );
      }

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: language === 'zh' ? 'zh' : language,
      });

      const text = transcription.text || '';
      const duration = Date.now() - startTime;

      await this.voiceLogRepository.save(
        this.voiceLogRepository.create({
          userId,
          type: 'asr',
          input: fileUrl || file?.originalname || '',
          output: text.substring(0, 1000),
          model: 'whisper-1',
          voice: language,
          duration,
          status: 'success',
        }),
      );

      return { text };
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.voiceLogRepository.save(
        this.voiceLogRepository.create({
          userId,
          type: 'asr',
          input: fileUrl || file?.originalname || '',
          model: 'whisper-1',
          voice: language,
          duration,
          status: 'failed',
        }),
      );
      this.logger.error(`ASR 失败: ${error.message}`);
      throw new HttpException(`语音识别失败: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * 查询语音调用记录
   */
  async queryLogs(userId: number, page = 1, size = 20, type?: string) {
    const where: any = { userId };
    if (type) where.type = type;

    const [rows, count] = await this.voiceLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    return { rows, count };
  }

  private async toFile(file: MulterFile): Promise<any> {
    const { toFile } = await import('openai/uploads');
    return toFile(file.buffer, file.originalname);
  }

  private async toFileFromBuffer(buffer: Buffer, name: string, type: string): Promise<any> {
    const { toFile } = await import('openai/uploads');
    return toFile(buffer, name);
  }
}
