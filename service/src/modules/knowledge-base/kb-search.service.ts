import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBaseEntity } from './entities/knowledge-base.entity';
import { VectorDbService, SearchResult } from './vector-db.service';
import { EmbeddingService } from './embedding.service';

export interface HybridSearchDto {
  query: string;
  topK?: number;
  semanticWeight?: number;
  keywordWeight?: number;
  filterFileId?: number;
}

@Injectable()
export class KbSearchService {
  private readonly logger = new Logger(KbSearchService.name);

  constructor(
    @InjectRepository(KnowledgeBaseEntity)
    private readonly kbRepository: Repository<KnowledgeBaseEntity>,
    private readonly vectorDbService: VectorDbService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  /**
   * 混合检索
   */
  async hybridSearch(knowledgeBaseId: number, dto: HybridSearchDto): Promise<SearchResult[]> {
    const kb = await this.kbRepository.findOne({ where: { id: knowledgeBaseId } });
    if (!kb) {
      throw new Error('知识库不存在');
    }

    // 生成查询文本的嵌入向量
    const queryEmbedding = await this.embeddingService.embedText(
      dto.query,
      kb.embeddingModelId || undefined,
    );

    const results = this.vectorDbService.hybridSearch(
      knowledgeBaseId,
      queryEmbedding,
      dto.query,
      dto.topK || 5,
      dto.semanticWeight ?? 0.6,
      dto.keywordWeight ?? 0.4,
      dto.filterFileId ? String(dto.filterFileId) : undefined,
    );

    return results;
  }

  /**
   * 语义搜索测试
   */
  async semanticSearchTest(
    knowledgeBaseId: number,
    query: string,
    topK = 5,
  ): Promise<SearchResult[]> {
    const kb = await this.kbRepository.findOne({ where: { id: knowledgeBaseId } });
    if (!kb) {
      throw new Error('知识库不存在');
    }

    const queryEmbedding = await this.embeddingService.embedText(
      query,
      kb.embeddingModelId || undefined,
    );

    // 只返回语义搜索结果
    const results = this.vectorDbService.hybridSearch(
      knowledgeBaseId,
      queryEmbedding,
      query,
      topK,
      1, // 纯语义
      0,
    );

    return results;
  }
}
