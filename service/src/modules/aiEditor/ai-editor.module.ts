import { Module } from '@nestjs/common';
import { AiEditorController } from './ai-editor.controller';
import { AiEditorService } from './ai-editor.service';
import { GlobalConfigModule } from '../globalConfig/globalConfig.module';

@Module({
  imports: [GlobalConfigModule],
  controllers: [AiEditorController],
  providers: [AiEditorService],
  exports: [AiEditorService],
})
export class AiEditorModule {}
