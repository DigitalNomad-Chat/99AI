import { BaseEntity } from 'src/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'agent_memories' })
export class AgentMemoryEntity extends BaseEntity {
  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ comment: '记忆类型: fact/preference/summary', default: 'fact' })
  memoryType: string;

  @Column({ comment: '记忆内容', type: 'text' })
  content: string;

  @Column({ comment: '关联的groupId', nullable: true })
  groupId: number;

  @Column({ comment: '重要性评分 1-10', default: 5 })
  importance: number;

  @Column({ comment: '访问次数', default: 0 })
  accessCount: number;
}
