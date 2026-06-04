import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as path from 'path';
import * as crypto from 'crypto';
import { KbFileEntity } from './entities/kb-file.entity';
import { KbChunkEntity } from './entities/kb-chunk.entity';
import { KnowledgeBaseEntity } from './entities/knowledge-base.entity';
import { VectorDbService, VectorDocument } from './vector-db.service';
import { FileParserService } from './file-parser.service';
import { ChunkingService } from './chunking.service';
import { EmbeddingService } from './embedding.service';
import { UploadService } from '../upload/upload.service';
import { KnowledgeBaseService } from './knowledge-base.service';

@Injectable()
export class KbFileService implements OnModuleInit {
  private readonly logger = new Logger(KbFileService.name);
  private processingQueue = Promise.resolve();
  private isProcessing = false;

  constructor(
    @InjectRepository(KbFileEntity)
    private readonly fileRepository: Repository<KbFileEntity>,
    @InjectRepository(KbChunkEntity)
    private readonly chunkRepository: Repository<KbChunkEntity>,
    @InjectRepository(KnowledgeBaseEntity)
    private readonly kbRepository: Repository<KnowledgeBaseEntity>,
    private readonly vectorDbService: VectorDbService,
    private readonly fileParserService: FileParserService,
    private readonly chunkingService: ChunkingService,
    private readonly embeddingService: EmbeddingService,
    private readonly uploadService: UploadService,
    private readonly kbService: KnowledgeBaseService,
  ) {}

  async onModuleInit() {
    // 启动时恢复未完成的处理任务
    await this.recoverPendingFiles();
  }

  /**
   * 上传文件到知识库
   */
  async uploadFile(
    knowledgeBaseId: number,
    file: any,
    userId: number,
    relativePath?: string,
  ): Promise<KbFileEntity> {
    const kb = await this.kbRepository.findOne({ where: { id: knowledgeBaseId } });
    if (!kb) {
      throw new Error('知识库不存在');
    }

    if (kb.userId !== userId) {
      throw new Error('无权上传到此知识库');
    }

    // 检测文件类型
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName).toLowerCase().replace(/^\./, '');

    if (!this.fileParserService.isSupported(ext)) {
      throw new Error(`不支持的文件类型: ${ext}`);
    }

    // 计算文件哈希
    const hash = crypto.createHash('md5').update(file.buffer).digest('hex');

    // 保存文件（复用 UploadService）
    const fileUrl = await this.uploadService.uploadFile(file, 'knowledge-base', { id: userId });

    // 提取本地文件路径（如果是本地存储）
    let localFilePath: string | null = null;
    if (fileUrl.includes('/file/') || fileUrl.startsWith('file/')) {
      // 本地存储返回相对路径如 file/knowledge-base/xxx.txt
      const relativePath = fileUrl.includes('/file/')
        ? fileUrl.substring(fileUrl.indexOf('/file/') + 1)
        : fileUrl;
      localFilePath = path.join(process.cwd(), 'public', relativePath);
    } else {
      // 远程存储，需要下载到本地处理
      localFilePath = await this.downloadRemoteFile(fileUrl, originalName);
    }

    // 创建文件记录
    const kbFile = this.fileRepository.create({
      knowledgeBaseId,
      fileName: originalName,
      displayName: originalName,
      fileSize: file.size,
      fileType: file.mimetype,
      fileExtension: ext,
      contentHash: hash,
      filePath: fileUrl,
      relativePath: relativePath || '',
      isDirectory: 0,
      processingStatus: 'pending',
      progressPercentage: 0,
      totalChunks: 0,
      totalTokens: 0,
    });

    const saved = await this.fileRepository.save(kbFile);

    // 更新知识库文件计数
    await this.kbService.updateFileCount(knowledgeBaseId);

    // 启动后台处理
    this.queueFileProcessing(saved.id);

    return saved;
  }

  /**
   * 创建文件夹
   */
  async createFolder(
    knowledgeBaseId: number,
    folderName: string,
    parentFolderId?: number,
    userId?: number,
  ): Promise<KbFileEntity> {
    const kb = await this.kbRepository.findOne({ where: { id: knowledgeBaseId } });
    if (!kb) throw new Error('知识库不存在');
    if (userId && kb.userId !== userId) throw new Error('无权操作');

    const folder = this.fileRepository.create({
      knowledgeBaseId,
      fileName: folderName,
      displayName: folderName,
      fileSize: 0,
      fileType: 'directory',
      fileExtension: '',
      parentFolderId: parentFolderId || null,
      isDirectory: 1,
      processingStatus: 'completed',
      progressPercentage: 100,
    });

    return this.fileRepository.save(folder);
  }

  /**
   * 列出知识库文件
   */
  async findFiles(knowledgeBaseId: number, parentFolderId?: number): Promise<KbFileEntity[]> {
    const where: any = { knowledgeBaseId, isDirectory: 0 };
    if (parentFolderId !== undefined) {
      where.parentFolderId = parentFolderId || null;
    }

    return this.fileRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 列出文件夹
   */
  async findFolders(knowledgeBaseId: number, parentFolderId?: number): Promise<KbFileEntity[]> {
    const where: any = { knowledgeBaseId, isDirectory: 1 };
    if (parentFolderId !== undefined) {
      where.parentFolderId = parentFolderId || null;
    }

    return this.fileRepository.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId: number, userId: number, role: string): Promise<boolean> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) return false;

    const kb = await this.kbRepository.findOne({ where: { id: file.knowledgeBaseId } });
    if (!kb) return false;

    if (kb.userId !== userId && role !== 'super' && role !== 'admin') {
      return false;
    }

    // 删除向量库中的文档
    this.vectorDbService.deleteDocumentChunks(file.knowledgeBaseId, String(fileId));

    // 删除分块记录
    await this.chunkRepository.delete({ fileId });

    // 删除文件记录
    const res = await this.fileRepository.delete({ id: fileId });

    // 更新计数
    await this.kbService.updateFileCount(file.knowledgeBaseId);
    await this.kbService.updateChunkCount(file.knowledgeBaseId);

    return res.affected > 0;
  }

  /**
   * 重新处理文件
   */
  async retryFile(fileId: number, userId: number, role: string): Promise<boolean> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file) return false;

    const kb = await this.kbRepository.findOne({ where: { id: file.knowledgeBaseId } });
    if (!kb) return false;

    if (kb.userId !== userId && role !== 'super' && role !== 'admin') {
      return false;
    }

    // 重置状态
    await this.fileRepository.update(
      { id: fileId },
      {
        processingStatus: 'pending',
        progressPercentage: 0,
        currentStep: null,
        errorMessage: null,
      },
    );

    // 删除旧数据
    this.vectorDbService.deleteDocumentChunks(file.knowledgeBaseId, String(fileId));
    await this.chunkRepository.delete({ fileId });

    // 重新排队处理
    this.queueFileProcessing(fileId);

    return true;
  }

  /**
   * 获取文件处理状态
   */
  async getFileStatus(fileId: number): Promise<KbFileEntity | null> {
    return this.fileRepository.findOne({ where: { id: fileId } });
  }

  /**
   * 获取文件分块内容
   */
  async getFileChunks(
    fileId: number,
    page = 1,
    size = 20,
  ): Promise<{ rows: KbChunkEntity[]; count: number }> {
    const [rows, count] = await this.chunkRepository.findAndCount({
      where: { fileId },
      order: { chunkIndex: 'ASC' },
      skip: (page - 1) * size,
      take: size,
    });

    return { rows, count };
  }

  /**
   * 将文件加入处理队列（信号量控制串行）
   */
  private queueFileProcessing(fileId: number): void {
    this.processingQueue = this.processingQueue
      .then(async () => {
        await this.processFile(fileId);
      })
      .catch(error => {
        this.logger.error(`File processing queue error for file ${fileId}: ${error.message}`);
      });
  }

  /**
   * 处理单个文件（解析 → 分块 → 嵌入 → 存储）
   */
  private async processFile(fileId: number): Promise<void> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } });
    if (!file || file.isDirectory === 1) return;

    const kb = await this.kbRepository.findOne({ where: { id: file.knowledgeBaseId } });
    if (!kb) return;

    this.logger.log(`Starting processing file: ${file.fileName} (id: ${fileId})`);

    try {
      // 更新状态为 processing
      await this.fileRepository.update(
        { id: fileId },
        {
          processingStatus: 'processing',
          progressPercentage: 10,
          currentStep: '解析文件',
        },
      );

      // Step 1: 解析文件
      let localFilePath = file.filePath;
      if (localFilePath.startsWith('http')) {
        // 需要下载到本地
        const tempPath = path.join(process.cwd(), 'data', 'temp', `${Date.now()}_${file.fileName}`);
        localFilePath = await this.downloadFile(localFilePath, tempPath);
      } else {
        // 本地路径，转换URL为实际路径
        if (localFilePath.includes('/file/') || localFilePath.startsWith('file/')) {
          const relativePath = localFilePath.includes('/file/')
            ? localFilePath.substring(localFilePath.indexOf('/file/') + 1)
            : localFilePath;
          localFilePath = path.join(process.cwd(), 'public', relativePath);
        }
      }

      const parsed = await this.fileParserService.parseFile(localFilePath, file.fileExtension);

      // 保存解析后的内容
      await this.fileRepository.update(
        { id: fileId },
        {
          content: parsed.content,
          progressPercentage: 30,
          currentStep: '文本分块',
        },
      );

      // Step 2: 分块
      const chunks = this.chunkingService.chunkText(
        parsed.content,
        kb.chunkMaxSize || 1000,
        kb.chunkOverlapSize || 100,
        kb.chunkMinSize || 50,
      );

      await this.fileRepository.update(
        { id: fileId },
        {
          totalChunks: chunks.length,
          totalTokens: chunks.reduce((sum, c) => sum + c.tokenCount, 0),
          progressPercentage: 50,
          currentStep: '向量嵌入',
        },
      );

      // Step 3: 向量化
      const chunkContents = chunks.map(c => c.cleanContent);
      const embeddings = await this.embeddingService.embedTexts(
        chunkContents,
        kb.embeddingModelId || undefined,
      );

      // Step 4: 清理旧数据
      this.vectorDbService.deleteDocumentChunks(file.knowledgeBaseId, String(fileId));
      await this.chunkRepository.delete({ fileId });

      await this.fileRepository.update(
        { id: fileId },
        {
          progressPercentage: 70,
          currentStep: '存储向量',
        },
      );

      // Step 5: 存储到向量库和 MySQL
      const vectorDocs: VectorDocument[] = [];
      const chunkEntities: KbChunkEntity[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];
        const vectorId = `chunk_${fileId}_${i}`;

        vectorDocs.push({
          id: vectorId,
          chunkId: vectorId,
          documentId: String(fileId),
          content: chunk.content,
          embedding,
          metadata: {
            chunkIndex: chunk.chunkIndex,
            tokenCount: chunk.tokenCount,
            cleanSize: chunk.metadata.cleanSize,
            overlapLength: chunk.metadata.overlapLength,
          },
        });

        chunkEntities.push(
          this.chunkRepository.create({
            fileId,
            knowledgeBaseId: file.knowledgeBaseId,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex,
            vectorId,
            embeddingDimensions: embedding.length,
            tokenCount: chunk.tokenCount,
            metadata: JSON.stringify(chunk.metadata),
          }),
        );
      }

      // 批量插入向量库
      if (vectorDocs.length > 0) {
        this.vectorDbService.insertDocuments(file.knowledgeBaseId, vectorDocs);
      }

      // 批量插入 MySQL
      if (chunkEntities.length > 0) {
        await this.chunkRepository.save(chunkEntities);
      }

      // Step 6: 完成
      await this.fileRepository.update(
        { id: fileId },
        {
          processingStatus: 'completed',
          progressPercentage: 100,
          currentStep: null,
        },
      );

      // 更新知识库分块计数
      await this.kbService.updateChunkCount(file.knowledgeBaseId);

      this.logger.log(
        `File processing completed: ${file.fileName} (id: ${fileId}), ${chunks.length} chunks`,
      );

      // 清理临时文件
      this.cleanupTempFile(localFilePath);
    } catch (error) {
      this.logger.error(
        `File processing failed: ${file.fileName} (id: ${fileId}): ${error.message}`,
        error.stack,
      );

      await this.fileRepository.update(
        { id: fileId },
        {
          processingStatus: 'failed',
          progressPercentage: 0,
          errorMessage: error.message,
        },
      );
    }
  }

  /**
   * 启动恢复：处理所有 pending/processing 状态的文件
   */
  private async recoverPendingFiles(): Promise<void> {
    const pendingFiles = await this.fileRepository.find({
      where: [{ processingStatus: 'pending' }, { processingStatus: 'processing' }],
    });

    this.logger.log(`Recovering ${pendingFiles.length} pending/processing files`);

    for (const file of pendingFiles) {
      // 检查物理文件是否存在
      const localPath = file.filePath;
      if (localPath.startsWith('http')) {
        // 远程文件，直接重试
        this.queueFileProcessing(file.id);
      } else {
        // 检查本地文件
        const realPath = path.join(
          process.cwd(),
          'public',
          localPath.substring(localPath.indexOf('/file/') + 1),
        );
        if (require('fs').existsSync(realPath)) {
          this.queueFileProcessing(file.id);
        } else {
          // 文件不存在，标记失败
          await this.fileRepository.update(
            { id: file.id },
            {
              processingStatus: 'failed',
              errorMessage: '源文件已丢失',
            },
          );
        }
      }
    }
  }

  /**
   * 下载远程文件到本地
   */
  private async downloadRemoteFile(url: string, fileName: string): Promise<string> {
    const tempDir = path.join(process.cwd(), 'data', 'temp');
    if (!require('fs').existsSync(tempDir)) {
      require('fs').mkdirSync(tempDir, { recursive: true });
    }

    const tempPath = path.join(tempDir, `${Date.now()}_${fileName}`);
    return this.downloadFile(url, tempPath);
  }

  private async downloadFile(url: string, destPath: string): Promise<string> {
    const axios = require('axios');
    const fs = require('fs');
    const writer = fs.createWriteStream(destPath);

    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream',
    });

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(destPath));
      writer.on('error', reject);
    });
  }

  private cleanupTempFile(filePath: string): void {
    if (filePath.includes('/data/temp/')) {
      try {
        require('fs').unlinkSync(filePath);
      } catch {
        // 忽略清理错误
      }
    }
  }
}
