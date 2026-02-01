import { Module } from '@nestjs/common';
import { OpenaiApiController } from './openaiApi.controller';
import { OpenaiApiService } from './openaiApi.service';
import { ChatModule } from '../chat/chat.module';
import { ModelsModule } from '../models/models.module';
import { ApiKeyModule } from '../apiKey/apiKey.module';
import { GlobalConfigModule } from '../globalConfig/globalConfig.module';

@Module({
  imports: [ChatModule, ModelsModule, ApiKeyModule, GlobalConfigModule],
  controllers: [OpenaiApiController],
  providers: [OpenaiApiService],
  exports: [OpenaiApiService],
})
export class OpenaiApiModule {}
