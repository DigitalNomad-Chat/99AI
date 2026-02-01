import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * 自定义装饰器 - 获取当前请求的 API Key 实体
 * 使用方式: @CurrentApiKey() apiKey: ApiKeyEntity
 */
export const CurrentApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ApiKeyEntity | null => {
    const request = ctx.switchToHttp().getRequest();
    return request['apiKey'] || null;
  },
);

/**
 * 自定义装饰器 - 获取当前请求的 API Key 字符串
 * 使用方式: @CurrentApiKeyValue() apiKey: string
 */
export const CurrentApiKeyValue = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return request['apiKeyValue'] || null;
  },
);

// 导出 ApiKeyEntity 类型以便其他模块使用
import { ApiKeyEntity } from '@/modules/apiKey/apiKey.entity';
