import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeBaseEntity } from './entities/knowledge-base.entity';
import { KbFileEntity } from './entities/kb-file.entity';
import { KbChunkEntity } from './entities/kb-chunk.entity';
import { VectorDbService } from './vector-db.service';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);

  constructor(
    @InjectRepository(KnowledgeBaseEntity)
    private readonly kbRepository: Repository<KnowledgeBaseEntity>,
    @InjectRepository(KbFileEntity)
    private readonly fileRepository: Repository<KbFileEntity>,
    @InjectRepository(KbChunkEntity)
    private readonly chunkRepository: Repository<KbChunkEntity>,
    private readonly vectorDbService: VectorDbService,
  ) {}

  async create(userId: number, data: Partial<KnowledgeBaseEntity>): Promise<KnowledgeBaseEntity> {
    const kb = this.kbRepository.create({
      ...data,
      userId,
      fileCount: 0,
      chunkCount: 0,
    });
    const saved = await this.kbRepository.save(kb);

    // 创建向量库集合
    this.vectorDbService.createCollection(saved.id);
    this.logger.log(`Knowledge base created: ${saved.id} - ${saved.name}`);

    return saved;
  }

  async findAll(
    userId: number,
    role: string,
    page = 1,
    size = 20,
  ): Promise<{ rows: KnowledgeBaseEntity[]; count: number }> {
    const where: any = {};
    // 非管理员只能看到自己创建的和公开的
    if (role !== 'super' && role !== 'admin') {
      where.userId = userId;
    }

    const [rows, count] = await this.kbRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    return { rows, count };
  }

  async findUserAccessible(userId: number): Promise<KnowledgeBaseEntity[]> {
    return this.kbRepository.find({
      where: [
        { userId, isActive: 1 },
        { isPublic: 1, isActive: 1 },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<KnowledgeBaseEntity | null> {
    return this.kbRepository.findOne({ where: { id } });
  }

  async update(
    id: number,
    userId: number,
    role: string,
    data: Partial<KnowledgeBaseEntity>,
  ): Promise<boolean> {
    const kb = await this.kbRepository.findOne({ where: { id } });
    if (!kb) {
      return false;
    }

    // 权限检查
    if (kb.userId !== userId && role !== 'super' && role !== 'admin') {
      return false;
    }

    // 不允许修改的字段
    delete (data as any).id;
    delete (data as any).userId;
    delete (data as any).createdAt;

    const res = await this.kbRepository.update({ id }, data);
    return res.affected > 0;
  }

  async delete(id: number, userId: number, role: string): Promise<boolean> {
    const kb = await this.kbRepository.findOne({ where: { id } });
    if (!kb) {
      return false;
    }

    // 权限检查
    if (kb.userId !== userId && role !== 'super' && role !== 'admin') {
      return false;
    }

    // 删除向量库集合
    this.vectorDbService.dropCollection(id);

    // 删除关联的分块和文件
    await this.chunkRepository.delete({ knowledgeBaseId: id });
    await this.fileRepository.delete({ knowledgeBaseId: id });

    // 删除知识库
    const res = await this.kbRepository.delete({ id });
    this.logger.log(`Knowledge base deleted: ${id}`);

    return res.affected > 0;
  }

  async updateFileCount(knowledgeBaseId: number): Promise<void> {
    const count = await this.fileRepository.count({ where: { knowledgeBaseId } });
    await this.kbRepository.update({ id: knowledgeBaseId }, { fileCount: count });
  }

  async updateChunkCount(knowledgeBaseId: number): Promise<void> {
    const count = await this.chunkRepository.count({ where: { knowledgeBaseId } });
    await this.kbRepository.update({ id: knowledgeBaseId }, { chunkCount: count });
  }

  /**
   * 检查用户是否有权限访问知识库
   */
  async checkPermission(kbId: number, userId: number, role: string): Promise<boolean> {
    if (role === 'super' || role === 'admin') {
      return true;
    }
    const kb = await this.kbRepository.findOne({ where: { id: kbId } });
    if (!kb) return false;
    return kb.userId === userId || kb.isPublic === 1;
  }
}
