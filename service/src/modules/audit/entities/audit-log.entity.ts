import { BaseEntity } from '@/common/entity/baseEntity';
import { Column, Entity, Index } from 'typeorm';

@Entity({ name: 'audit_logs' })
export class AuditLogEntity extends BaseEntity {
  @Column({ comment: '操作用户ID', nullable: true })
  userId: number;

  @Column({ comment: '操作类型: login/logout/create/update/delete/query/execute', length: 50 })
  @Index('IDX_audit_action')
  action: string;

  @Column({ comment: '操作模块', length: 50 })
  @Index('IDX_audit_module')
  module: string;

  @Column({ comment: '请求方法', length: 10, nullable: true })
  method: string;

  @Column({ comment: '请求路径', length: 255, nullable: true })
  path: string;

  @Column({ comment: '请求参数 JSON', type: 'text', nullable: true })
  requestParams: string;

  @Column({ comment: '响应状态码', nullable: true })
  statusCode: number;

  @Column({ comment: 'IP 地址', length: 50, nullable: true })
  ip: string;

  @Column({ comment: 'User-Agent', length: 500, nullable: true })
  userAgent: string;

  @Column({ comment: '执行耗时(ms)', nullable: true })
  duration: number;

  @Column({ comment: '操作描述', length: 255, nullable: true })
  description: string;
}
