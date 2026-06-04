import { BaseEntity } from 'src/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

export type MessageDirection = 'in' | 'out';

@Entity({ name: 'bot_messages' })
export class BotMessageEntity extends BaseEntity {
  @Column({ comment: 'Bot实例ID' })
  botInstanceId: number;

  @Column({ comment: '平台消息ID', type: 'varchar', length: 255 })
  platformMsgId: string;

  @Column({ comment: '平台用户ID', type: 'varchar', length: 255 })
  platformUserId: string;

  @Column({ comment: '映射的系统用户ID', nullable: true })
  userId: number;

  @Column({ comment: '消息方向: in/out', type: 'varchar', length: 10 })
  direction: MessageDirection;

  @Column({ comment: '消息内容', type: 'text' })
  content: string;

  @Column({ comment: '消息类型: text/image/file/event', type: 'varchar', length: 20 })
  msgType: string;

  @Column({ comment: '平台类型', type: 'varchar', length: 20 })
  platform: string;
}
