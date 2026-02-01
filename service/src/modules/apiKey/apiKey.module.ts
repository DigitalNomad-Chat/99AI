import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeyController } from './apiKey.controller';
import { ApiKeyService } from './apiKey.service';
import { ApiKeyEntity } from './apiKey.entity';
import { GlobalConfigModule } from '../globalConfig/globalConfig.module';
import { ModelsModule } from '../models/models.module';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKeyEntity]), GlobalConfigModule, ModelsModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
