import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService, AuditLogQueryDto } from './audit.service';
import { SuperAuthGuard } from '@/common/auth/superAuth.guard';
import { JwtAuthGuard } from '@/common/auth/jwtAuth.guard';

@ApiTags('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('list')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '查询审计日志列表' })
  async list(@Query() query: AuditLogQueryDto) {
    return this.auditService.query(query);
  }

  @Post('cleanup')
  @UseGuards(SuperAuthGuard)
  @ApiOperation({ summary: '清理过期审计日志' })
  async cleanup(@Body('days') days?: number) {
    const count = await this.auditService.cleanup(days || 90);
    return { message: `已清理 ${count} 条过期日志` };
  }
}
