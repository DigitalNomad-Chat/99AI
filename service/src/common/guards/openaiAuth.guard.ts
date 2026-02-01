import { Injectable } from '@nestjs/common';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyService } from '@/modules/apiKey/apiKey.service';
import { getClientIp } from '@/common/utils';

@Injectable()
export class OpenAIAuthGuard {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException({
        error: {
          message: 'Missing Authorization header',
          type: 'invalid_request_error',
          code: 'missing_authorization',
        },
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException({
        error: {
          message: 'Invalid Authorization format. Use: Bearer sk-...',
          type: 'invalid_request_error',
          code: 'invalid_authorization',
        },
      });
    }

    const token = parts[1];

    // 判断是 JWT 还是 API Key (API Key 以 sk- 开头)
    if (token.startsWith('sk-')) {
      const apiKey = await this.apiKeyService.validateApiKey(token);
      if (!apiKey) {
        throw new UnauthorizedException({
          error: {
            message: 'Invalid API Key',
            type: 'invalid_request_error',
            code: 'invalid_api_key',
          },
        });
      }

      // 将用户信息和 API Key 注入请求
      request['user'] = { id: apiKey.userId };
      request['apiKey'] = apiKey;
      request['apiKeyValue'] = token;

      // 记录使用
      const ip = getClientIp(request);
      await this.apiKeyService.recordUsage(token, ip).catch(err => {
        // 记录失败不影响请求
        console.error('Failed to record API key usage:', err);
      });

      return true;
    }

    // 非 API Key，返回 false 让其他守卫处理（如 JWT）
    throw new UnauthorizedException({
      error: {
        message: 'Invalid token format. API Key must start with sk-',
        type: 'invalid_request_error',
        code: 'invalid_token_format',
      },
    });
  }
}
