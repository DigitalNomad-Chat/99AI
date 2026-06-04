import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';
import { VoiceLogEntity } from './entities/voice-log.entity';
import { UploadService } from '../upload/upload.service';
import { UserBalanceService } from '../userBalance/userBalance.service';
import { GlobalConfigService } from '../globalConfig/globalConfig.service';

@Module({
  imports: [TypeOrmModule.forFeature([VoiceLogEntity])],
  controllers: [VoiceController],
  providers: [VoiceService, UploadService, UserBalanceService, GlobalConfigService],
  exports: [VoiceService],
})
export class VoiceModule {}
