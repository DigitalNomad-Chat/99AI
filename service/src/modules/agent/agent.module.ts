import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentSessionEntity } from './entities/agent-session.entity';
import { TimeToolProvider } from './providers/time-tool.provider';
import { KnowledgeBaseToolProvider } from './providers/knowledge-base-tool.provider';
import { NetSearchToolProvider } from './providers/net-search-tool.provider';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { NetSearchService } from '../aiTool/search/netSearch.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AgentSessionEntity]), KnowledgeBaseModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    TimeToolProvider,
    KnowledgeBaseToolProvider,
    NetSearchToolProvider,
    NetSearchService,
  ],
  exports: [AgentService],
})
export class AgentModule {}
