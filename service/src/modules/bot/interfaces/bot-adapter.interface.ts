import { UnifiedBotMessage, UnifiedBotReply } from './bot-message.interface';
import { BotInstanceEntity } from '../entities/bot-instance.entity';

export interface BotAdapter {
  /** 初始化 Adapter（如连接 WebSocket） */
  initialize(instance: BotInstanceEntity): Promise<void>;

  /** 验证 Webhook 请求合法性 */
  verifyWebhook(query: any, body?: any): Promise<boolean>;

  /** 解析平台消息为统一格式 */
  parseMessage(body: any): Promise<UnifiedBotMessage | null>;

  /** 发送回复消息 */
  sendReply(instance: BotInstanceEntity, reply: UnifiedBotReply): Promise<void>;

  /** 停止 Adapter */
  destroy(): Promise<void>;
}
