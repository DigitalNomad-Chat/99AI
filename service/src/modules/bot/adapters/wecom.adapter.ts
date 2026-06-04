import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BotAdapter } from '../interfaces/bot-adapter.interface';
import { UnifiedBotMessage, UnifiedBotReply } from '../interfaces/bot-message.interface';
import { BotInstanceEntity } from '../entities/bot-instance.entity';

@Injectable()
export class WecomAdapter implements BotAdapter {
  private readonly logger = new Logger(WecomAdapter.name);
  private accessToken: string | null = null;
  private tokenExpireAt = 0;

  async initialize(instance: BotInstanceEntity): Promise<void> {
    this.logger.log(`初始化企业微信 Adapter: ${instance.name}`);
    await this.refreshAccessToken(instance);
  }

  async verifyWebhook(query: any): Promise<boolean> {
    const { msg_signature, timestamp, nonce, echostr } = query;
    // 企业微信回调验证逻辑
    // TODO: 实现签名验证（使用 encodingAesKey 解密）
    return true;
  }

  async parseMessage(body: any): Promise<UnifiedBotMessage | null> {
    // 企业微信 XML 消息解析
    const xml = body.xml || body;
    const getVal = (field: string) => {
      const v = xml[field] || xml[field.toLowerCase()];
      return Array.isArray(v) ? v[0] : v;
    };

    const msgType = getVal('MsgType');
    const userId = getVal('FromUserName');
    const content = getVal('Content');

    if (!userId) return null;

    return {
      platformUserId: userId,
      content: content || '',
      msgType: msgType === 'text' ? 'text' : 'event',
      platformMsgId: getVal('MsgId') || `${Date.now()}`,
      rawData: body,
    };
  }

  async sendReply(instance: BotInstanceEntity, reply: UnifiedBotReply): Promise<void> {
    const token = await this.getAccessToken(instance);
    const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`;

    const extra = instance.extraConfig ? JSON.parse(instance.extraConfig) : {};
    const agentId = extra.agentId;

    await axios.post(url, {
      touser: reply.platformUserId,
      msgtype: 'text',
      agentid: agentId,
      text: { content: reply.content },
    });
  }

  async destroy(): Promise<void> {
    this.logger.log('销毁企业微信 Adapter');
  }

  private async getAccessToken(instance: BotInstanceEntity): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpireAt) {
      return this.accessToken;
    }
    return this.refreshAccessToken(instance);
  }

  private async refreshAccessToken(instance: BotInstanceEntity): Promise<string> {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${instance.appId}&corpsecret=${instance.appSecret}`;
    const res = await axios.get(url);
    if (res.data.errcode !== 0) {
      throw new HttpException(`企业微信获取token失败: ${res.data.errmsg}`, HttpStatus.BAD_REQUEST);
    }
    this.accessToken = res.data.access_token;
    this.tokenExpireAt = Date.now() + (res.data.expires_in - 300) * 1000;
    return this.accessToken;
  }
}
