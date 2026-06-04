import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BotAdapter } from '../interfaces/bot-adapter.interface';
import { UnifiedBotMessage, UnifiedBotReply } from '../interfaces/bot-message.interface';
import { BotInstanceEntity } from '../entities/bot-instance.entity';

@Injectable()
export class DiscordAdapter implements BotAdapter {
  private readonly logger = new Logger(DiscordAdapter.name);
  private ws: any = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;

  async initialize(instance: BotInstanceEntity): Promise<void> {
    this.logger.log(`初始化 Discord Adapter: ${instance.name}`);
  }

  async verifyWebhook(query: any): Promise<boolean> {
    return true;
  }

  async parseMessage(body: any): Promise<UnifiedBotMessage | null> {
    if (body.t !== 'MESSAGE_CREATE') return null;
    const msg = body.d;
    if (msg.author?.bot) return null;

    return {
      platformUserId: msg.author?.id,
      content: msg.content || '',
      msgType: 'text',
      platformMsgId: msg.id,
      rawData: body,
    };
  }

  async sendReply(instance: BotInstanceEntity, reply: UnifiedBotReply): Promise<void> {
    const extra = instance.extraConfig ? JSON.parse(instance.extraConfig) : {};
    const channelId = extra.channelId || reply.platformUserId;

    await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      { content: reply.content },
      {
        headers: {
          Authorization: `Bot ${instance.appSecret}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async destroy(): Promise<void> {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.ws) this.ws.close();
    this.logger.log('销毁 Discord Adapter');
  }

  connectGateway(token: string, onMessage: (data: any) => void): void {
    const ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.logger.log('Discord Gateway 已连接');
    });

    ws.addEventListener('message', (event: MessageEvent) => {
      const payload = JSON.parse(event.data.toString());
      const { op, d, s, t } = payload;

      if (op === 10) {
        const interval = d.heartbeat_interval;
        this.heartbeatInterval = setInterval(() => {
          ws.send(JSON.stringify({ op: 1, d: this.sessionId ? s : null }));
        }, interval);

        ws.send(
          JSON.stringify({
            op: 2,
            d: {
              token,
              intents: 512,
              properties: { os: 'linux', browser: '99AI', device: '99AI' },
            },
          }),
        );
      }

      if (op === 0 && t) {
        if (t === 'READY') this.sessionId = d.session_id;
        onMessage(payload);
      }
    });

    ws.addEventListener('close', () => {
      this.logger.warn('Discord Gateway 连接关闭');
    });

    ws.addEventListener('error', (err: any) => {
      this.logger.error(`Discord Gateway 错误: ${err.message}`);
    });
  }
}
