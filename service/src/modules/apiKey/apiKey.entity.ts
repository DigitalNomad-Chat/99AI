import { BaseEntity } from '@/common/entity/baseEntity';
import { Column, Entity, Index } from 'typeorm';

@Entity({ name: 'api_keys' })
export class ApiKeyEntity extends BaseEntity {
  @Column({ name: 'user_id', comment: '用户ID' })
  @Index()
  userId: number;

  @Column({ name: 'api_key', type: 'varchar', length: 48, unique: true, comment: 'API Key (sk-前缀)' })
  apiKey: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'API Key 名称/备注' })
  name: string;

  @Column({ name: 'expires_at', type: 'datetime', nullable: true, comment: '过期时间 (NULL=永不过期)' })
  expiresAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true, comment: '是否启用' })
  @Index()
  isActive: boolean;

  @Column({ name: 'total_requests', type: 'int', default: 0, comment: '总调用次数' })
  totalRequests: number;

  @Column({ name: 'last_used_at', type: 'datetime', nullable: true, comment: '最后使用时间' })
  lastUsedAt: Date;

  @Column({ name: 'last_used_ip', type: 'varchar', length: 20, nullable: true, comment: '最后使用IP' })
  lastUsedIp: string;
}
