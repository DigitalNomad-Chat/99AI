import { BaseEntity } from '@/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

@Entity({ name: 'voice_logs' })
export class VoiceLogEntity extends BaseEntity {
  @Column({ comment: '用户ID', nullable: true })
  userId: number;

  @Column({ comment: '操作类型: tts/asr', length: 10 })
  type: string;

  @Column({ comment: '输入文本/音频文件名', type: 'text', nullable: true })
  input: string;

  @Column({ comment: '输出音频URL/识别文本', type: 'text', nullable: true })
  output: string;

  @Column({ comment: '使用的模型', length: 50, nullable: true })
  model: string;

  @Column({ comment: '音色/语言', length: 50, nullable: true })
  voice: string;

  @Column({ comment: '耗时(ms)', nullable: true })
  duration: number;

  @Column({ comment: '状态: success/failed', length: 20, default: 'success' })
  status: string;
}
