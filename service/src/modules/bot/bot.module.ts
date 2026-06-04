import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatModule } from '../chat/chat.module';
import { UserModule } from '../user/user.module';
import { BotInstanceEntity } from './entities/bot-instance.entity';
import { BotMessageEntity } from './entities/bot-message.entity';
import { BotInstanceService } from './bot-instance.service';
import { BotMessageService } from './bot-message.service';
import { BotGatewayService } from './bot-gateway.service';
import { BotController } from './bot.controller';
import { WecomAdapter } from './adapters/wecom.adapter';
import { FeishuAdapter } from './adapters/feishu.adapter';
import { DiscordAdapter } from './adapters/discord.adapter';
import { QQAdapter } from './adapters/qq.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotInstanceEntity, BotMessageEntity]),
    ChatModule,
    UserModule,
  ],
  controllers: [BotController],
  providers: [
    BotInstanceService,
    BotMessageService,
    BotGatewayService,
    WecomAdapter,
    FeishuAdapter,
    DiscordAdapter,
    QQAdapter,
  ],
  exports: [BotInstanceService, BotMessageService],
})
export class BotModule {}
