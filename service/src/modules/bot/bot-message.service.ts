import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotMessageEntity } from './entities/bot-message.entity';

@Injectable()
export class BotMessageService {
  private readonly logger = new Logger(BotMessageService.name);

  constructor(
    @InjectRepository(BotMessageEntity)
    private readonly botMessageRepository: Repository<BotMessageEntity>,
  ) {}

  async logMessage(data: Partial<BotMessageEntity>): Promise<BotMessageEntity> {
    const msg = this.botMessageRepository.create(data);
    return this.botMessageRepository.save(msg);
  }

  async findByBotInstance(
    botInstanceId: number,
    page = 1,
    size = 20,
  ): Promise<{ rows: BotMessageEntity[]; count: number }> {
    const [rows, count] = await this.botMessageRepository.findAndCount({
      where: { botInstanceId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });
    return { rows, count };
  }

  async findOrCreateUserMapping(platformUserId: string, platform: string): Promise<number | null> {
    const existing = await this.botMessageRepository.findOne({
      where: { platformUserId, platform },
      order: { createdAt: 'DESC' },
    });
    if (existing?.userId) return existing.userId;
    return null;
  }
}
