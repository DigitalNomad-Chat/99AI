import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export interface SearchResult {
  id: string;
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  metadata?: any;
}

export interface VectorDocument {
  id: string;
  chunkId: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata?: any;
}

@Injectable()
export class VectorDbService implements OnModuleInit {
  private db: Database.Database;
  private readonly logger = new Logger(VectorDbService.name);
  private readonly dbPath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'vector_db.sqlite');
  }

  onModuleInit() {
    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.logger.log(`Vector database initialized at: ${this.dbPath}`);
  }

  /**
   * 为知识库创建集合（表 + FTS5 虚拟表）
   */
  createCollection(knowledgeBaseId: number): void {
    const tableName = `kb_${knowledgeBaseId}`;
    const ftsTableName = `kb_${knowledgeBaseId}_fts`;

    // 主表：存储向量、内容、元数据
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS "${tableName}" (
        id TEXT PRIMARY KEY,
        chunk_id TEXT,
        document_id TEXT,
        content TEXT,
        embedding BLOB,
        metadata_json TEXT
      )
    `);

    // FTS5 全文检索虚拟表
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS "${ftsTableName}" USING fts5(
        content,
        content_rowid='rowid'
      )
    `);

    // 触发器：主表插入时同步到 FTS5
    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS "${tableName}_fts_insert"
      AFTER INSERT ON "${tableName}"
      BEGIN
        INSERT INTO "${ftsTableName}"(rowid, content) VALUES (NEW.rowid, NEW.content);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS "${tableName}_fts_delete"
      AFTER DELETE ON "${tableName}"
      BEGIN
        INSERT INTO "${ftsTableName}"("${ftsTableName}", rowid, content) VALUES ('delete', OLD.rowid, OLD.content);
      END
    `);

    this.db.exec(`
      CREATE TRIGGER IF NOT EXISTS "${tableName}_fts_update"
      AFTER UPDATE ON "${tableName}"
      BEGIN
        INSERT INTO "${ftsTableName}"("${ftsTableName}", rowid, content) VALUES ('delete', OLD.rowid, OLD.content);
        INSERT INTO "${ftsTableName}"(rowid, content) VALUES (NEW.rowid, NEW.content);
      END
    `);

    this.logger.log(`Collection created: ${tableName}`);
  }

  /**
   * 删除知识库集合
   */
  dropCollection(knowledgeBaseId: number): void {
    const tableName = `kb_${knowledgeBaseId}`;
    const ftsTableName = `kb_${knowledgeBaseId}_fts`;

    this.db.exec(`DROP TABLE IF EXISTS "${tableName}"`);
    this.db.exec(`DROP TABLE IF EXISTS "${ftsTableName}"`);
    this.logger.log(`Collection dropped: ${tableName}`);
  }

  /**
   * 插入文档（向量 + 内容）
   */
  insertDocuments(knowledgeBaseId: number, documents: VectorDocument[]): void {
    const tableName = `kb_${knowledgeBaseId}`;
    const stmt = this.db.prepare(
      `INSERT INTO "${tableName}" (id, chunk_id, document_id, content, embedding, metadata_json) VALUES (?, ?, ?, ?, ?, ?)`,
    );

    const insertMany = this.db.transaction((docs: VectorDocument[]) => {
      for (const doc of docs) {
        const embeddingBuffer = Buffer.from(new Float32Array(doc.embedding).buffer);
        stmt.run(
          doc.id,
          doc.chunkId,
          doc.documentId,
          doc.content,
          embeddingBuffer,
          doc.metadata ? JSON.stringify(doc.metadata) : null,
        );
      }
    });

    insertMany(documents);
  }

  /**
   * 删除某文档的所有分块
   */
  deleteDocumentChunks(knowledgeBaseId: number, documentId: string): void {
    const tableName = `kb_${knowledgeBaseId}`;
    const stmt = this.db.prepare(`DELETE FROM "${tableName}" WHERE document_id = ?`);
    stmt.run(documentId);
  }

  /**
   * 混合检索：语义搜索 + FTS5 关键词搜索 + RRF 融合
   */
  hybridSearch(
    knowledgeBaseId: number,
    queryEmbedding: number[],
    queryText: string,
    topK = 5,
    semanticWeight = 0.6,
    keywordWeight = 0.4,
    filterDocumentId?: string,
  ): SearchResult[] {
    const recallCount = topK * 4;

    // Step 1: 语义搜索召回
    const semanticResults = this.semanticSearch(
      knowledgeBaseId,
      queryEmbedding,
      recallCount,
      filterDocumentId,
    );

    // Step 2: 关键词搜索召回
    const keywordResults = this.keywordSearch(
      knowledgeBaseId,
      queryText,
      recallCount,
      filterDocumentId,
    );

    // Step 3: BM25 重排（简化版，使用已有分数）
    const bm25Scores = keywordResults.map(r => r.score);
    const bm25Mean = bm25Scores.reduce((a, b) => a + b, 0) / (bm25Scores.length || 1);
    const bm25Std = Math.sqrt(
      bm25Scores.reduce((sq, n) => sq + Math.pow(n - bm25Mean, 2), 0) / (bm25Scores.length || 1),
    );
    const cv = bm25Mean > 0 ? bm25Std / bm25Mean : 0;

    // 动态权重调整：如果 BM25 分数区分度低，降低关键词权重
    let adjustedKeywordWeight = keywordWeight;
    if (cv < 0.1 || bm25Mean < 0.001) {
      adjustedKeywordWeight = Math.max(0.1, keywordWeight / 3);
      this.logger.debug(
        `BM25 CV=${cv.toFixed(3)}, mean=${bm25Mean.toFixed(
          6,
        )}, reducing keywordWeight to ${adjustedKeywordWeight}`,
      );
    }
    const adjustedSemanticWeight = 1 - adjustedKeywordWeight;

    // Step 4: RRF 融合
    const rrfK = 60;
    const scoreMap = new Map<
      string,
      { semanticRRF: number; keywordRRF: number; result: SearchResult }
    >();

    // 语义搜索 RRF
    semanticResults.forEach((r, index) => {
      const rank = index + 1;
      const existing = scoreMap.get(r.id);
      if (existing) {
        existing.semanticRRF = 1 / (rrfK + rank);
      } else {
        scoreMap.set(r.id, {
          semanticRRF: 1 / (rrfK + rank),
          keywordRRF: 0,
          result: r,
        });
      }
    });

    // 关键词搜索 RRF
    keywordResults.forEach((r, index) => {
      const rank = index + 1;
      const existing = scoreMap.get(r.id);
      if (existing) {
        existing.keywordRRF = 1 / (rrfK + rank);
      } else {
        scoreMap.set(r.id, {
          semanticRRF: 0,
          keywordRRF: 1 / (rrfK + rank),
          result: r,
        });
      }
    });

    // Step 5: 加权融合 + Min-Max 归一化
    const fusedResults: SearchResult[] = [];
    for (const [, data] of scoreMap) {
      const finalScore =
        adjustedSemanticWeight * data.semanticRRF + adjustedKeywordWeight * data.keywordRRF;
      fusedResults.push({
        ...data.result,
        score: finalScore,
      });
    }

    // Min-Max 归一化
    const scores = fusedResults.map(r => r.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    const range = maxScore - minScore;

    const normalizedResults = fusedResults.map(r => ({
      ...r,
      score: range > 0 ? (r.score - minScore) / range : 0,
    }));

    // 按分数降序排序，取 topK
    return normalizedResults.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * 语义搜索：纯 JS 计算余弦相似度
   */
  private semanticSearch(
    knowledgeBaseId: number,
    queryEmbedding: number[],
    topK: number,
    filterDocumentId?: string,
  ): SearchResult[] {
    const tableName = `kb_${knowledgeBaseId}`;
    let sql = `SELECT id, chunk_id, document_id, content, embedding, metadata_json FROM "${tableName}"`;
    if (filterDocumentId) {
      sql += ` WHERE document_id = '${filterDocumentId}'`;
    }

    const rows = this.db.prepare(sql).all() as any[];
    const results: SearchResult[] = [];

    for (const row of rows) {
      const embedding = this.bufferToFloatArray(row.embedding);
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      results.push({
        id: row.id,
        chunkId: row.chunk_id,
        documentId: row.document_id,
        content: row.content,
        score: similarity,
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
      });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  /**
   * 关键词搜索：FTS5
   */
  private keywordSearch(
    knowledgeBaseId: number,
    queryText: string,
    topK: number,
    filterDocumentId?: string,
  ): SearchResult[] {
    const tableName = `kb_${knowledgeBaseId}`;
    const ftsTableName = `kb_${knowledgeBaseId}_fts`;

    // 构建 FTS5 查询
    const ftsQuery = this.buildFtsQuery(queryText);
    if (!ftsQuery) {
      return [];
    }

    let sql = `
      SELECT t.id, t.chunk_id, t.document_id, t.content, t.metadata_json,
             rank as score
      FROM "${ftsTableName}" fts
      JOIN "${tableName}" t ON t.rowid = fts.rowid
      WHERE "${ftsTableName}" MATCH ?
    `;

    if (filterDocumentId) {
      sql += ` AND t.document_id = '${filterDocumentId}'`;
    }

    sql += ` ORDER BY rank LIMIT ${topK}`;

    try {
      const rows = this.db.prepare(sql).all(ftsQuery) as any[];
      return rows.map(row => ({
        id: row.id,
        chunkId: row.chunk_id,
        documentId: row.document_id,
        content: row.content,
        score: Math.abs(row.score) < 1 ? Math.abs(row.score) : 1 / Math.abs(row.score),
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
      }));
    } catch (error) {
      this.logger.warn(`FTS5 search failed for query "${ftsQuery}": ${error.message}`);
      return [];
    }
  }

  /**
   * 构建 FTS5 查询字符串（纯 JS 实现，无需外部中文分词库）
   * 策略：提取中文字符序列、英文/数字/型号代码作为独立 token，用 OR 连接提高召回率
   */
  private buildFtsQuery(queryText: string): string {
    const trimmed = queryText.trim();
    if (!trimmed) return '';

    // 提取 token：中文字符序列、英文单词、数字、带连字符的型号
    const matches = trimmed.match(/[\u4e00-\u9fa5]+|[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*/g) || [];

    const allTokens: string[] = [];
    for (const token of matches) {
      if (!token) continue;

      // 连字符处理：DV430FBM-N20 -> "DV430FBM-N20" OR "DV430FBM" OR "N20"
      if (token.includes('-') && /^[a-zA-Z0-9\-]+$/.test(token)) {
        allTokens.push(`"${token}"`);
        const parts = token.split('-');
        for (const part of parts) {
          if (part) allTokens.push(`"${part}"`);
        }
      }
      // 纯英文/数字使用精确匹配
      else if (/^[a-zA-Z0-9]+$/.test(token)) {
        allTokens.push(`"${token}"`);
      }
      // 中文序列保留整词
      else {
        allTokens.push(token);
      }
    }

    // 去重并用 OR 连接提高召回率
    const uniqueTokens = [...new Set(allTokens)];
    return uniqueTokens.join(' OR ');
  }

  /**
   * Buffer 转 Float32Array
   */
  private bufferToFloatArray(buffer: Buffer): number[] {
    const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    return Array.from(floatArray);
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * 获取知识库文档数量
   */
  getDocumentCount(knowledgeBaseId: number): number {
    const tableName = `kb_${knowledgeBaseId}`;
    const row = this.db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).get() as any;
    return row?.count || 0;
  }
}
