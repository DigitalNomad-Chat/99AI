import { BaseEntity } from 'src/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

/**
 * 技能执行状态
 */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

@Entity({ name: 'skill_executions' })
export class SkillExecutionEntity extends BaseEntity {
  @Column({ comment: '技能ID' })
  skillId: number;

  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ comment: '对话组ID', nullable: true })
  groupId: number;

  @Column({ comment: '执行状态: pending/running/completed/failed/cancelled', default: 'pending' })
  status: string;

  @Column({ comment: '输入参数JSON', nullable: true, type: 'text' })
  inputParams: string;

  @Column({ comment: '执行结果', nullable: true, type: 'mediumtext' })
  outputResult: string;

  @Column({ comment: '错误信息', nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ comment: '执行耗时(ms)', nullable: true })
  executionTime: number;

  @Column({ comment: 'Token消耗', nullable: true })
  tokenUsage: number;

  @Column({ comment: '执行步骤记录JSON', nullable: true, type: 'text' })
  stepLogs: string;

  @Column({ comment: '是否收藏 0：否 1：是', default: 0 })
  isFavorite: number;
}
