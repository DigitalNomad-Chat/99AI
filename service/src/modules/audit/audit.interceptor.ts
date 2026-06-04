import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { Request } from 'express';

/**
 * 路径到模块的映射
 */
const MODULE_MAP: Record<string, string> = {
  '/api/auth': '认证',
  '/api/user': '用户',
  '/api/chat': '对话',
  '/api/group': '对话组',
  '/api/app': '应用',
  '/api/skills': '技能',
  '/api/knowledge-base': '知识库',
  '/api/order': '订单',
  '/api/pay': '支付',
  '/api/crami': '卡密',
  '/api/upload': '上传',
  '/api/models': '模型',
  '/api/share': '分享',
  '/api/official': '公众号',
  '/api/signin': '签到',
  '/api/global/config': '配置',
  '/api/badwords': '敏感词',
  '/api/autoReply': '自动回复',
  '/api/verification': '验证码',
  '/api/statistic': '统计',
  '/api/task': '任务',
  '/api/v1': 'OpenAI API',
  '/api/user/api-keys': 'API Key',
  '/api/bot-gateway': 'Bot 网关',
  '/api/voice': '语音',
  '/api/audit': '审计日志',
};

/**
 * 方法到操作类型的映射
 */
const ACTION_MAP: Record<string, string> = {
  GET: 'query',
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

/**
 * 排除的路径前缀（不记录审计日志）
 */
const EXCLUDE_PATHS = ['/api/share', '/file/', '/admin', '/favicon'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query, headers } = request;

    // 排除静态资源和公开接口
    if (this.shouldSkip(url)) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = (request as any).user;
    const userId = user?.id || null;
    const ip = this.getClientIp(request);
    const userAgent = headers['user-agent'] || '';
    const module = this.detectModule(url);
    const action = ACTION_MAP[method] || 'unknown';

    // 收集请求参数（过滤敏感字段）
    const params = { ...query, ...body };
    const safeParams = this.filterSensitiveFields(params);
    const requestParams = Object.keys(safeParams).length > 0 ? JSON.stringify(safeParams) : null;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode || 200;

          this.auditService.save({
            userId,
            action,
            module,
            method,
            path: url,
            requestParams,
            statusCode,
            ip,
            userAgent,
            duration,
          });
        },
        error: err => {
          const duration = Date.now() - startTime;
          const statusCode = err.status || 500;

          this.auditService.save({
            userId,
            action,
            module,
            method,
            path: url,
            requestParams,
            statusCode,
            ip,
            userAgent,
            duration,
            description: err.message?.substring(0, 255) || '请求失败',
          });
        },
      }),
    );
  }

  private shouldSkip(url: string): boolean {
    // 精确排除路径
    for (const prefix of EXCLUDE_PATHS) {
      if (url.startsWith(prefix)) return true;
    }
    // Swagger 文档
    if (url.startsWith('/api/docs') || url.startsWith('/api-json')) return true;
    // 健康检查
    if (url === '/api' || url === '/') return true;
    return false;
  }

  private detectModule(url: string): string {
    for (const [prefix, moduleName] of Object.entries(MODULE_MAP)) {
      if (url.startsWith(prefix)) {
        return moduleName;
      }
    }
    return '其他';
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress || '';
  }

  private filterSensitiveFields(params: Record<string, any>): Record<string, any> {
    const sensitive = ['password', 'pass', 'secret', 'token', 'key', 'authorization', 'code'];
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(params)) {
      const lowerK = k.toLowerCase();
      if (sensitive.some(s => lowerK.includes(s))) {
        result[k] = '***';
      } else if (typeof v === 'object' && v !== null) {
        result[k] = this.filterSensitiveFields(v);
      } else {
        result[k] = v;
      }
    }
    return result;
  }
}
