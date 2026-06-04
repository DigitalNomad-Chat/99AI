import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BotAdapter } from '../interfaces/bot-adapter.interface';
import { UnifiedBotMessage, UnifiedBotReply } from '../interfaces/bot-message.interface';
import { BotInstanceEntity } from '../entities/bot-instance.entity';

@Injectable()
export class FeishuAdapter implements BotAdapter {
  private readonly logger = new Logger(FeishuAdapter.name);
  private tenantToken: string | null = null;
  private tokenExpireAt = 0;

  async initialize(instance: BotInstanceEntity): Promise<void> {
    this.logger.log(`初始化飞书 Adapter: ${instance.name}`);
  }

  async verifyWebhook(query: any, body?: any): Promise<boolean> {
    // 飞书事件订阅验证：challenge 模式
    return true;
  }

  async parseMessage(body: any): Promise<UnifiedBotMessage | null> {
    // 飞书事件回调结构
    const event = body.event || body;
    const message = event.message || event;

    if (!message) return null;

    const userId = event.sender?.sender_id?.open_id || message.chat_id;
    const content = message.content || '{}';
    let text = '';
    try {
      const parsed = JSON.parse(content);
      text = parsed.text || '';
    } catch {
      text = content;
    }

    return {
      platformUserId: userId,
      content: text,
      msgType: message.msg_type === 'text' ? 'text' : 'event',
      platformMsgId: message.message_id || `${Date.now()}`,
      rawData: body,
    };
  }

  async sendReply(instance: BotInstanceEntity, reply: UnifiedBotReply): Promise<void> {
    const token = await this.getTenantToken(instance);
    const url = 'https://open.feishu.cn/open-apis/im/v1/messages';

    await axios.post(
      url,
      {
        receive_id: reply.platformUserId,
        msg_type: 'text',
        content: JSON.stringify({ text: reply.content }),
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { receive_id_type: 'open_id' },
      },
    );
  }

  async destroy(): Promise<void> {
    this.logger.log('销毁飞书 Adapter');
  }

  private async getTenantToken(instance: BotInstanceEntity): Promise<string> {
    if (this.tenantToken && Date.now() < this.tokenExpireAt) {
      return this.tenantToken;
    }

    const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
    const res = await axios.post(url, {
      app_id: instance.appId,
      app_secret: instance.appSecret,
    });

    if (res.data.code !== 0) {
      throw new HttpException(`飞书获取token失败: ${res.data.msg}`, HttpStatus.BAD_REQUEST);
    }

    this.tenantToken = res.data.tenant_access_token;
    this.tokenExpireAt = Date.now() + (res.data.expire - 300) * 1000;
    return this.tenantToken;
  }
}
