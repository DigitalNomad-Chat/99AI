import { BaseEntity } from '@/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'kb_chunks' })
export class KbChunkEntity extends BaseEntity {
  @Column({ comment: '文件Id' })
  fileId: number;

  @Column({ comment: '知识库Id' })
  knowledgeBaseId: number;

  @Column({ comment: '分块内容', type: 'longtext' })
  content: string;

  @Column({ comment: '分块索引', default: 0 })
  chunkIndex: number;

  @Column({ comment: '向量库中的Id', nullable: true })
  vectorId: string;

  @Column({ comment: '向量维度', nullable: true })
  embeddingDimensions: number;

  @Column({ comment: 'Token数量', default: 0 })
  tokenCount: number;

  @Column({ comment: '元数据(JSON)', nullable: true, type: 'text' })
  metadata: string;
}
