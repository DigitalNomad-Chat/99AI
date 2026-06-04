import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SkillsController } from './skills.controller';
import { SkillsService } from './skills.service';
import { SkillEngineService } from './skill-engine.service';
import { BuiltInSkillsService } from './built-in-skills.service';
import { SkillEntity } from './entities/skill.entity';
import { SkillCategoryEntity } from './entities/skill-category.entity';
import { SkillExecutionEntity } from './entities/skill-execution.entity';
import { AgentModule } from '../agent/agent.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SkillEntity, SkillCategoryEntity, SkillExecutionEntity]),
    AgentModule,
  ],
  controllers: [SkillsController],
  providers: [SkillsService, SkillEngineService, BuiltInSkillsService],
  exports: [SkillsService, SkillEngineService, BuiltInSkillsService],
})
export class SkillsModule {}
