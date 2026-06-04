import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBaseEntity } from './entities/knowledge-base.entity';
import { KbFileEntity } from './entities/kb-file.entity';
import { KbChunkEntity } from './entities/kb-chunk.entity';
import { ModelsEntity } from '../models/models.entity';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KbFileController } from './kb-file.controller';
import { KbFileService } from './kb-file.service';
import { KbSearchController } from './kb-search.controller';
import { KbSearchService } from './kb-search.service';
import { VectorDbService } from './vector-db.service';
import { FileParserService } from './file-parser.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([KnowledgeBaseEntity, KbFileEntity, KbChunkEntity, ModelsEntity]),
  ],
  controllers: [KnowledgeBaseController, KbFileController, KbSearchController],
  providers: [
    KnowledgeBaseService,
    KbFileService,
    KbSearchService,
    VectorDbService,
    FileParserService,
    ChunkingService,
    EmbeddingService,
  ],
  exports: [
    KnowledgeBaseService,
    KbFileService,
    KbSearchService,
    VectorDbService,
    EmbeddingService,
  ],
})
export class KnowledgeBaseModule {}
