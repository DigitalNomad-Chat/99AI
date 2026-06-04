import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotInstanceEntity, BotPlatform } from './entities/bot-instance.entity';

@Injectable()
export class BotInstanceService {
  private readonly logger = new Logger(BotInstanceService.name);

  constructor(
    @InjectRepository(BotInstanceEntity)
    private readonly botInstanceRepository: Repository<BotInstanceEntity>,
  ) {}

  async findAll(): Promise<BotInstanceEntity[]> {
    return this.botInstanceRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: number): Promise<BotInstanceEntity | null> {
    return this.botInstanceRepository.findOne({ where: { id } });
  }

  async findByPlatform(platform: BotPlatform): Promise<BotInstanceEntity[]> {
    return this.botInstanceRepository.find({ where: { platform, status: 1 } });
  }

  async create(data: Partial<BotInstanceEntity>): Promise<BotInstanceEntity> {
    const instance = this.botInstanceRepository.create(data);
    return this.botInstanceRepository.save(instance);
  }

  async update(id: number, data: Partial<BotInstanceEntity>): Promise<void> {
    await this.botInstanceRepository.update(id, data);
  }

  async delete(id: number): Promise<void> {
    await this.botInstanceRepository.delete(id);
  }
}
