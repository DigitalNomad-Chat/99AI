import { Injectable, Logger } from '@nestjs/common';
import { RedisCacheService } from '../../redisCache/redisCache.service';

@Injectable()
export class ShortTermMemory {
  private readonly logger = new Logger(ShortTermMemory.name);
  private readonly TTL = 3600 * 2; // 2 小时过期

  constructor(private readonly redisCacheService: RedisCacheService) {}

  /**
   * 保存对话摘要到 Redis
   */
  async saveSummary(groupId: number, summary: string): Promise<void> {
    const key = `agent:summary:${groupId}`;
    await this.redisCacheService.set({ key, val: summary }, this.TTL);
  }

  /**
   * 获取对话摘要
   */
  async getSummary(groupId: number): Promise<string | null> {
    const key = `agent:summary:${groupId}`;
    return await this.redisCacheService.get({ key });
  }

  /**
   * 保存最近 N 轮对话的关键信息
   */
  async saveRecentContext(groupId: number, context: string): Promise<void> {
    const key = `agent:context:${groupId}`;
    await this.redisCacheService.set({ key, val: context }, this.TTL);
  }

  /**
   * 获取最近对话上下文
   */
  async getRecentContext(groupId: number): Promise<string | null> {
    const key = `agent:context:${groupId}`;
    return await this.redisCacheService.get({ key });
  }

  /**
   * 清除某个 group 的缓存
   */
  async clearGroup(groupId: number): Promise<void> {
    await this.redisCacheService.del({ key: `agent:summary:${groupId}` });
    await this.redisCacheService.del({ key: `agent:context:${groupId}` });
  }
}
