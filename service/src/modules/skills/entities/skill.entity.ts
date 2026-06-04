import { BaseEntity } from 'src/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

/**
 * 技能类型枚举
 * prompt: 预设Prompt技能（增强版App）
 * agent: Agent技能（调用Agent循环+特定工具组合）
 * workflow: 内部工作流技能（多步骤编排）
 * code: 代码执行技能（Python/JS沙箱）
 */
export type SkillType = 'prompt' | 'agent' | 'workflow' | 'code';

@Entity({ name: 'skills' })
export class SkillEntity extends BaseEntity {
  @Column({ comment: '技能名称' })
  name: string;

  @Column({ comment: '技能描述', nullable: true, type: 'text' })
  description: string;

  @Column({ comment: '技能封面图', nullable: true, type: 'text' })
  coverImg: string;

  @Column({ comment: '技能分类ID列表，多个以逗号分隔', type: 'text' })
  catId: string;

  @Column({ comment: '技能类型: prompt/agent/workflow/code', default: 'prompt' })
  type: string;

  @Column({ comment: '技能标签，逗号分隔', nullable: true })
  tags: string;

  @Column({ comment: '技能预设system prompt', nullable: true, type: 'text' })
  systemPrompt: string;

  @Column({ comment: '输入参数模板JSON', nullable: true, type: 'text' })
  inputSchema: string;

  @Column({ comment: '输出格式定义JSON', nullable: true, type: 'text' })
  outputSchema: string;

  @Column({ comment: '执行配置JSON', nullable: true, type: 'text' })
  executionConfig: string;

  @Column({ comment: '关联的模型配置key', nullable: true })
  modelKey: string;

  @Column({ comment: '是否内置技能 0：否 1：是', default: 0 })
  isBuiltIn: number;

  @Column({ comment: '内置技能标识符（用于代码调用）', nullable: true })
  builtInKey: string;

  @Column({ comment: '是否启用 0：禁用 1：启用', default: 1 })
  status: number;

  @Column({ comment: '排序值、数字越大越靠前', default: 100 })
  order: number;

  @Column({ comment: '是否公开到技能广场 0：否 1：是', default: false })
  isPublic: boolean;

  @Column({ comment: '用户ID（用户创建的技能）', nullable: true })
  userId: number;

  @Column({ comment: '使用次数统计', default: 0 })
  useCount: number;

  @Column({ comment: '点赞数', default: 0 })
  likes: number;
}
