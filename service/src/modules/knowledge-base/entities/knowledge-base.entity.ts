import { BaseEntity } from '@/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'knowledge_bases' })
export class KnowledgeBaseEntity extends BaseEntity {
  @Column({ comment: '知识库名称' })
  name: string;

  @Column({ comment: '知识库描述', nullable: true, type: 'text' })
  description: string;

  @Column({ comment: '创建者用户Id', nullable: true })
  userId: number;

  @Column({ comment: '嵌入模型Id', nullable: true })
  embeddingModelId: number;

  @Column({ comment: '分块最大Token数', default: 1000 })
  chunkMaxSize: number;

  @Column({ comment: '分块重叠Token数', default: 100 })
  chunkOverlapSize: number;

  @Column({ comment: '分块最小Token数', default: 50 })
  chunkMinSize: number;

  @Column({ comment: '是否启用 0:禁用 1:启用', default: 1 })
  isActive: number;

  @Column({ comment: '是否公开 0:私有 1:公开', default: 0 })
  isPublic: number;

  @Column({ comment: '元数据配置(JSON)', nullable: true, type: 'text' })
  metadataConfig: string;

  @Column({ comment: '文件数量', default: 0 })
  fileCount: number;

  @Column({ comment: '分块数量', default: 0 })
  chunkCount: number;
}
