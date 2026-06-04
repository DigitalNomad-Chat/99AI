import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentMemoryEntity } from '../entities/agent-memory.entity';

@Injectable()
export class LongTermMemory {
  private readonly logger = new Logger(LongTermMemory.name);

  constructor(
    @InjectRepository(AgentMemoryEntity)
    private readonly memoryRepository: Repository<AgentMemoryEntity>,
  ) {}

  /**
   * 存储记忆
   */
  async store(
    userId: number,
    content: string,
    type: string = 'fact',
    groupId?: number,
  ): Promise<void> {
    // 去重：检查是否已有相似记忆
    const existing = await this.memoryRepository.findOne({
      where: { userId, content },
    });
    if (existing) {
      existing.accessCount += 1;
      await this.memoryRepository.save(existing);
      return;
    }

    await this.memoryRepository.save(
      this.memoryRepository.create({
        userId,
        content,
        memoryType: type,
        groupId: groupId || null,
        importance: 5,
      }),
    );
  }

  /**
   * 检索用户相关记忆
   */
  async recall(userId: number, limit: number = 10): Promise<string[]> {
    const memories = await this.memoryRepository.find({
      where: { userId },
      order: { importance: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
    return memories.map(m => m.content);
  }

  /**
   * 清理过期记忆（重要性低且长期未访问）
   */
  async cleanup(userId: number, maxCount: number = 100): Promise<number> {
    const count = await this.memoryRepository.count({ where: { userId } });
    if (count <= maxCount) return 0;

    const toDelete = await this.memoryRepository.find({
      where: { userId },
      order: { importance: 'ASC', accessCount: 'ASC' },
      take: count - maxCount,
    });

    const ids = toDelete.map(m => m.id);
    await this.memoryRepository.delete(ids);
    return ids.length;
  }
}
