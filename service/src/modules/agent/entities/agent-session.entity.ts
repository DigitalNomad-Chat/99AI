import { BaseEntity } from 'src/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'agent_sessions' })
export class AgentSessionEntity extends BaseEntity {
  @Column({ comment: '关联的chat_group ID', nullable: true })
  groupId: number;

  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ comment: '当前迭代次数', default: 0 })
  currentIteration: number;

  @Column({ comment: '最大迭代次数', default: 10 })
  maxIterations: number;

  @Column({ comment: '工具调用历史JSON', nullable: true, type: 'text' })
  toolCallHistory: string;

  @Column({ comment: '会话状态 0:运行中 1:已完成 2:失败', default: 0 })
  status: number;
}
