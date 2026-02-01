import {
  Inject,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { GlobalConfigService } from '@/modules/globalConfig/globalConfig.service';
import { RedisCacheService } from '@/modules/redisCache/redisCache.service';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(
    private readonly redisCacheService: RedisCacheService,
    private readonly globalConfigService: GlobalConfigService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request['apiKeyValue'];

    // 如果不是 API Key 认证，跳过速率限制
    if (!apiKey) {
      return next.handle();
    }

    try {
      // 获取速率限制配置
      const rateLimitConfig = await this.globalConfigService.getConfigs(['api_key_rate_limit']);
      const limit = parseInt(rateLimitConfig?.api_key_rate_limit || '60', 10);

      // 计算当前分钟的时间窗口 key
      const currentMinute = Math.floor(Date.now() / 60000);
      const key = `ratelimit:apikey:${apiKey}:${currentMinute}`;

      // 获取当前计数
      const cached = await this.redisCacheService.get({ key });
      const current = cached ? parseInt(cached as string, 10) : 0;

      if (current >= limit) {
        // 返回 OpenAI 格式的速率限制错误
        throw new HttpException(
          {
            error: {
              message: 'Rate limit exceeded',
              type: 'rate_limit_error',
              code: 'rate_limit_exceeded',
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // 增加计数
      await this.redisCacheService.set({
        key,
        val: String(current + 1),
        exp: Math.ceil((60 - (Date.now() % 60000)) / 1000),
      });
    } catch (error) {
      // 如果是速率限制错误，直接抛出
      if (error instanceof HttpException) {
        throw error;
      }
      // 其他错误记录日志但不阻止请求
      console.error('Rate limit check failed:', error);
    }

    return next.handle();
  }
}
