import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { ApiKeyEntity } from './apiKey.entity';
import { GlobalConfigService } from '../globalConfig/globalConfig.service';
import { RedisCacheService } from '../redisCache/redisCache.service';

@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepository: Repository<ApiKeyEntity>,
    private readonly redisCacheService: RedisCacheService,
    private readonly globalConfigService: GlobalConfigService,
  ) {}

  /**
   * 创建 API Key
   * @param userId 用户ID
   * @param name API Key 名称
   * @returns 生成的 API Key
   */
  async create(userId: number, name?: string): Promise<string> {
    // 检查数量限制
    const count = await this.apiKeyRepository.count({
      where: { userId },
    });

    const maxKeys = parseInt(
      (await this.globalConfigService.getConfigs(['api_key_max_per_user']))?.api_key_max_per_user ||
        '5',
      10,
    );

    if (count >= maxKeys) {
      throw new Error(`最多创建 ${maxKeys} 个 API Key`);
    }

    // 生成唯一 API Key
    const randomBytes = crypto.randomBytes(24);
    const apiKey = `sk-${randomBytes.toString('base64url')}`;

    // 创建实体
    const entity = this.apiKeyRepository.create({
      userId,
      apiKey,
      name: name || `API Key ${count + 1}`,
    });

    await this.apiKeyRepository.save(entity);

    // 缓存 API Key (1小时 = 3600秒)
    await this.redisCacheService.set({
      key: `apikey:${apiKey}`,
      val: JSON.stringify(entity),
      exp: 3600,
    });

    return apiKey;
  }

  /**
   * 验证 API Key
   * @param apiKey API Key
   * @returns API Key 实体或 null
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyEntity | null> {
    // 先查缓存
    const cachedStr = await this.redisCacheService.get({ key: `apikey:${apiKey}` });
    if (cachedStr) {
      return JSON.parse(cachedStr as string);
    }

    // 查数据库
    const entity = await this.apiKeyRepository.findOne({
      where: { apiKey, isActive: true },
    });

    if (entity) {
      // 检查过期时间
      if (entity.expiresAt && entity.expiresAt < new Date()) {
        return null;
      }
      // 缓存结果
      await this.redisCacheService.set({
        key: `apikey:${apiKey}`,
        val: JSON.stringify(entity),
        exp: 3600,
      });
    }

    return entity;
  }

  /**
   * 记录 API Key 使用
   * @param apiKey API Key
   * @param ip 客户端IP
   */
  async recordUsage(apiKey: string, ip: string): Promise<void> {
    await this.apiKeyRepository.update(
      { apiKey },
      {
        lastUsedAt: new Date(),
        lastUsedIp: ip,
        totalRequests: () => 'total_requests + 1',
      },
    );
  }

  /**
   * 获取用户的 API Keys
   * @param userId 用户ID
   * @param page 页码
   * @param pageSize 每页数量
   * @returns API Keys 列表
   */
  async getUserApiKeys(userId: number, page = 1, pageSize = 10) {
    const [list, total] = await this.apiKeyRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: [
        'id',
        'apiKey',
        'name',
        'isActive',
        'expiresAt',
        'totalRequests',
        'lastUsedAt',
        'lastUsedIp',
        'createdAt',
      ],
    });

    return {
      data: list.map(item => ({
        ...item,
        // 隐藏完整 API Key，只显示前4位和后4位
        apiKey: `${item.apiKey.substring(0, 7)}****${item.apiKey.substring(
          item.apiKey.length - 4,
        )}`,
        // 用于显示完整 Key 的临时属性（不返回给前端）
        maskKey: item.apiKey,
      })),
      total,
    };
  }

  /**
   * 删除 API Key
   * @param id API Key ID
   * @param userId 用户ID (用于权限验证)
   */
  async deleteApiKey(id: number, userId: number): Promise<void> {
    const entity = await this.apiKeyRepository.findOne({
      where: { id, userId },
    });

    if (!entity) {
      throw new Error('API Key 不存在');
    }

    await this.apiKeyRepository.remove(entity);
  }

  /**
   * 切换 API Key 启用/禁用状态
   * @param id API Key ID
   * @param userId 用户ID (用于权限验证)
   * @returns 新的启用状态
   */
  async toggleApiKeyStatus(id: number, userId: number): Promise<boolean> {
    const entity = await this.apiKeyRepository.findOne({
      where: { id, userId },
    });

    if (!entity) {
      throw new Error('API Key 不存在');
    }

    // 切换状态
    entity.isActive = !entity.isActive;
    await this.apiKeyRepository.save(entity);

    // 清除缓存以确保状态立即生效
    await this.redisCacheService.del({ key: `apikey:${entity.apiKey}` });

    return entity.isActive;
  }

  /**
   * 根据 API Key 获取完整信息（内部使用）
   * @param apiKey API Key
   * @returns API Key 实体
   */
  async getByApiKey(apiKey: string): Promise<ApiKeyEntity | null> {
    return this.apiKeyRepository.findOne({
      where: { apiKey },
    });
  }
}
