import { BaseEntity } from 'src/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

export type BotPlatform = 'wecom' | 'feishu' | 'discord' | 'qq';

@Entity({ name: 'bot_instances' })
export class BotInstanceEntity extends BaseEntity {
  @Column({ comment: 'Bot名称' })
  name: string;

  @Column({ comment: '平台类型: wecom/feishu/discord/qq', type: 'varchar', length: 20 })
  platform: BotPlatform;

  @Column({ comment: '平台AppID/BotID', type: 'varchar', length: 255 })
  appId: string;

  @Column({ comment: '平台Secret/Token', type: 'text' })
  appSecret: string;

  @Column({ comment: '附加配置JSON', type: 'text', nullable: true })
  extraConfig: string;

  @Column({ comment: '状态: 0禁用 1启用', default: 1 })
  status: number;

  @Column({ comment: '绑定的应用ID', nullable: true })
  appId_ref: number;

  @Column({ comment: '使用的模型名称', nullable: true, type: 'varchar', length: 100 })
  model: string;

  @Column({ comment: '欢迎语', type: 'text', nullable: true })
  welcomeMessage: string;

  @Column({ comment: '回调URL验证令牌', nullable: true, type: 'varchar', length: 255 })
  verifyToken: string;

  @Column({ comment: '加密密钥', nullable: true, type: 'varchar', length: 255 })
  encodingAesKey: string;
}
