import { BaseEntity } from '@/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'kb_files' })
export class KbFileEntity extends BaseEntity {
  @Column({ comment: '知识库Id' })
  knowledgeBaseId: number;

  @Column({ comment: '文件名' })
  fileName: string;

  @Column({ comment: '展示名称' })
  displayName: string;

  @Column({ comment: '文件大小(字节)', default: 0 })
  fileSize: number;

  @Column({ comment: '文件MIME类型', nullable: true })
  fileType: string;

  @Column({ comment: '文件扩展名', nullable: true })
  fileExtension: string;

  @Column({ comment: '内容MD5哈希', nullable: true })
  contentHash: string;

  @Column({ comment: '文件存储路径', nullable: true, type: 'text' })
  filePath: string;

  @Column({ comment: '文件内容', nullable: true, type: 'longtext' })
  content: string;

  @Column({ comment: '相对路径', nullable: true })
  relativePath: string;

  @Column({ comment: '父文件夹Id', nullable: true })
  parentFolderId: number;

  @Column({ comment: '是否是文件夹 0:文件 1:文件夹', default: 0 })
  isDirectory: number;

  @Column({ comment: '处理状态 pending/processing/completed/failed', default: 'pending' })
  processingStatus: string;

  @Column({ comment: '处理进度百分比', default: 0 })
  progressPercentage: number;

  @Column({ comment: '当前处理步骤', nullable: true })
  currentStep: string;

  @Column({ comment: '错误信息', nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ comment: '总分块数', default: 0 })
  totalChunks: number;

  @Column({ comment: '总Token数', default: 0 })
  totalTokens: number;
}
