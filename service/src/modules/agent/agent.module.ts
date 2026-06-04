import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentSessionEntity } from './entities/agent-session.entity';
import { AgentMemoryEntity } from './entities/agent-memory.entity';
import { TimeToolProvider } from './providers/time-tool.provider';
import { KnowledgeBaseToolProvider } from './providers/knowledge-base-tool.provider';
import { NetSearchToolProvider } from './providers/net-search-tool.provider';
import { KnowledgeBaseModule } from '../knowledge-base/knowledge-base.module';
import { NetSearchService } from '../aiTool/search/netSearch.service';
import { MemoryService } from './memory/memory.service';
import { ShortTermMemory } from './memory/short-term-memory';
import { LongTermMemory } from './memory/long-term-memory';
import { ContextCompressor } from './memory/context-compressor';
import { RedisCacheService } from '../redisCache/redisCache.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([AgentSessionEntity, AgentMemoryEntity]), KnowledgeBaseModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    TimeToolProvider,
    KnowledgeBaseToolProvider,
    NetSearchToolProvider,
    NetSearchService,
    MemoryService,
    ShortTermMemory,
    LongTermMemory,
    ContextCompressor,
  ],
  exports: [AgentService],
})
export class AgentModule {}
