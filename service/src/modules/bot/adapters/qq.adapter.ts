import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BotAdapter } from '../interfaces/bot-adapter.interface';
import { UnifiedBotMessage, UnifiedBotReply } from '../interfaces/bot-message.interface';
import { BotInstanceEntity } from '../entities/bot-instance.entity';

@Injectable()
export class QQAdapter implements BotAdapter {
  private readonly logger = new Logger(QQAdapter.name);
  private accessToken: string | null = null;
  private tokenExpireAt = 0;

  async initialize(instance: BotInstanceEntity): Promise<void> {
    this.logger.log(`初始化 QQ Adapter: ${instance.name}`);
  }

  async verifyWebhook(query: any, body?: any): Promise<boolean> {
    return true;
  }

  async parseMessage(body: any): Promise<UnifiedBotMessage | null> {
    const event = body;
    if (!event.t) return null;

    const msg = event.d || {};
    const author = msg.author || {};

    if (event.t === 'C2C_MESSAGE_CREATE' || event.t === 'GROUP_AT_MESSAGE_CREATE') {
      return {
        platformUserId: author.id || msg.group_openid,
        content: msg.content || '',
        msgType: 'text',
        platformMsgId: msg.id || `${Date.now()}`,
        rawData: body,
      };
    }

    return null;
  }

  async sendReply(instance: BotInstanceEntity, reply: UnifiedBotReply): Promise<void> {
    const token = await this.getAccessToken(instance);
    const extra = instance.extraConfig ? JSON.parse(instance.extraConfig) : {};
    const url = `https://api.sgroup.qq.com/v2/groups/${reply.platformUserId}/messages`;

    await axios.post(
      url,
      { content: reply.content, msg_type: 0 },
      {
        headers: {
          Authorization: `QQBot ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async destroy(): Promise<void> {
    this.logger.log('销毁 QQ Adapter');
  }

  private async getAccessToken(instance: BotInstanceEntity): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpireAt) {
      return this.accessToken;
    }

    const url = 'https://bots.qq.com/app/getAppAccessToken';
    const res = await axios.post(url, {
      appId: instance.appId,
      clientSecret: instance.appSecret,
    });

    if (res.data.code !== 0) {
      throw new HttpException(`QQ获取token失败`, HttpStatus.BAD_REQUEST);
    }

    this.accessToken = res.data.access_token;
    this.tokenExpireAt = Date.now() + res.data.expires_in * 1000;
    return this.accessToken;
  }
}
