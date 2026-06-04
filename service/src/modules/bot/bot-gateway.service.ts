import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';
import { OpenAIChatService } from '../aiTool/chat/chat.service';
import { UserService } from '../user/user.service';
import { BotInstanceService } from './bot-instance.service';
import { BotMessageService } from './bot-message.service';
import { BotAdapter } from './interfaces/bot-adapter.interface';
import { UnifiedBotMessage, UnifiedBotReply } from './interfaces/bot-message.interface';
import { WecomAdapter } from './adapters/wecom.adapter';
import { FeishuAdapter } from './adapters/feishu.adapter';
import { DiscordAdapter } from './adapters/discord.adapter';
import { QQAdapter } from './adapters/qq.adapter';
import { BotInstanceEntity, BotPlatform } from './entities/bot-instance.entity';

@Injectable()
export class BotGatewayService implements OnModuleInit {
  private readonly logger = new Logger(BotGatewayService.name);
  private adapters: Map<number, BotAdapter> = new Map();

  constructor(
    private readonly botInstanceService: BotInstanceService,
    private readonly botMessageService: BotMessageService,
    private readonly chatService: ChatService,
    private readonly openAIChatService: OpenAIChatService,
    private readonly userService: UserService,
    private readonly wecomAdapter: WecomAdapter,
    private readonly feishuAdapter: FeishuAdapter,
    private readonly discordAdapter: DiscordAdapter,
    private readonly qqAdapter: QQAdapter,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('初始化 Bot Gateway...');
    const instances = await this.botInstanceService.findAll();
    for (const instance of instances) {
      if (instance.status === 1) {
        await this.registerAdapter(instance);
      }
    }
  }

  async registerAdapter(instance: BotInstanceEntity): Promise<void> {
    const adapter = this.getAdapterByPlatform(instance.platform);
    if (!adapter) {
      this.logger.warn(`不支持的平台: ${instance.platform}`);
      return;
    }

    await adapter.initialize(instance);
    this.adapters.set(instance.id, adapter);
    this.logger.log(`注册 Bot Adapter: ${instance.name} (${instance.platform})`);

    if (instance.platform === 'discord') {
      (adapter as DiscordAdapter).connectGateway(instance.appSecret, payload => {
        this.handleDiscordPayload(instance, payload);
      });
    }
  }

  async unregisterAdapter(instanceId: number): Promise<void> {
    const adapter = this.adapters.get(instanceId);
    if (adapter) {
      await adapter.destroy();
      this.adapters.delete(instanceId);
    }
  }

  async handleWebhook(
    instanceId: number,
    platform: BotPlatform,
    query: any,
    body: any,
  ): Promise<any> {
    const instance = await this.botInstanceService.findById(instanceId);
    if (!instance || instance.status !== 1) {
      throw new HttpException('Bot 实例未找到或已禁用', HttpStatus.NOT_FOUND);
    }

    const adapter = this.adapters.get(instanceId);
    if (!adapter) {
      throw new HttpException('Adapter 未注册', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const verified = await adapter.verifyWebhook(query, body);
    if (!verified) {
      throw new HttpException('验证失败', HttpStatus.FORBIDDEN);
    }

    if (body.challenge) return { challenge: body.challenge };

    const message = await adapter.parseMessage(body);
    if (!message) return 'success';

    await this.botMessageService.logMessage({
      botInstanceId: instance.id,
      platformMsgId: message.platformMsgId,
      platformUserId: message.platformUserId,
      content: message.content,
      msgType: message.msgType,
      direction: 'in',
      platform,
    });

    let userId = await this.botMessageService.findOrCreateUserMapping(
      message.platformUserId,
      platform,
    );

    if (!userId) {
      const guestUser = await this.userService.createUser({
        username: `bot_${platform}_${message.platformUserId.slice(0, 8)}`,
        email: `bot_${platform}_${message.platformUserId.slice(0, 16)}@guest.local`,
        status: 1,
        role: 'viewer',
        client: `bot_${platform}`,
      });
      userId = guestUser.id;
    }

    try {
      let replyContent = '';
      try {
        const chatResult = await this.chatService.chatProcess(
          {
            prompt: message.content,
            model: instance.model,
            appId: instance.appId_ref,
          },
          { user: { id: userId } } as any,
        );
        replyContent = typeof chatResult === 'string' ? chatResult : '处理完成';
      } catch (chatError) {
        this.logger.warn(`chatProcess 失败，降级到 chatFree: ${chatError.message}`);
        replyContent = await this.openAIChatService.chatFree(message.content);
      }

      const reply: UnifiedBotReply = {
        platformUserId: message.platformUserId,
        content: replyContent,
        msgType: 'text',
      };

      await adapter.sendReply(instance, reply);

      await this.botMessageService.logMessage({
        botInstanceId: instance.id,
        platformMsgId: `reply_${Date.now()}`,
        platformUserId: message.platformUserId,
        userId,
        content: replyContent,
        msgType: 'text',
        direction: 'out',
        platform,
      });
    } catch (error) {
      this.logger.error(`处理 Bot 消息失败: ${error.message}`);
      const reply: UnifiedBotReply = {
        platformUserId: message.platformUserId,
        content: '抱歉，处理您的请求时出错了，请稍后重试。',
        msgType: 'text',
      };
      await adapter.sendReply(instance, reply);
    }

    return 'success';
  }

  private async handleDiscordPayload(instance: BotInstanceEntity, payload: any): Promise<void> {
    const adapter = this.adapters.get(instance.id);
    if (!adapter) return;

    const message = await adapter.parseMessage(payload);
    if (!message) return;

    await this.handleWebhook(instance.id, 'discord', {}, payload);
  }

  private getAdapterByPlatform(platform: BotPlatform): BotAdapter | null {
    switch (platform) {
      case 'wecom':
        return this.wecomAdapter;
      case 'feishu':
        return this.feishuAdapter;
      case 'discord':
        return this.discordAdapter;
      case 'qq':
        return this.qqAdapter;
      default:
        return null;
    }
  }
}
