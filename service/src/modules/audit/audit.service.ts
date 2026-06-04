import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLogEntity } from './entities/audit-log.entity';

export interface AuditLogQueryDto {
  page?: number;
  size?: number;
  module?: string;
  action?: string;
  userId?: number;
  startTime?: string;
  endTime?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogRepository: Repository<AuditLogEntity>,
  ) {}

  async save(log: Partial<AuditLogEntity>): Promise<AuditLogEntity> {
    try {
      const entity = this.auditLogRepository.create(log);
      return await this.auditLogRepository.save(entity);
    } catch (error) {
      this.logger.warn(`审计日志保存失败: ${error.message}`);
      return null;
    }
  }

  async query(dto: AuditLogQueryDto) {
    const { page = 1, size = 15, module, action, userId, startTime, endTime } = dto;
    const where: any = {};

    if (module) where.module = module;
    if (action) where.action = action;
    if (userId) where.userId = userId;

    if (startTime && endTime) {
      where.createdAt = {
        $between: [new Date(startTime), new Date(endTime)],
      };
    } else if (startTime) {
      where.createdAt = { $gte: new Date(startTime) };
    } else if (endTime) {
      where.createdAt = { $lte: new Date(endTime) };
    }

    const [rows, count] = await this.auditLogRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });

    return { rows, count };
  }

  async cleanup(days = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await this.auditLogRepository.delete({
      createdAt: LessThan(cutoff),
    });

    return result.affected || 0;
  }
}
