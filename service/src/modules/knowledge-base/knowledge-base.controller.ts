import { JwtAuthGuard } from '@/common/auth/jwtAuth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { KnowledgeBaseService } from './knowledge-base.service';

@ApiTags('knowledge-base')
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get()
  @ApiOperation({ summary: '获取知识库列表' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findAll(@Req() req: Request, @Query('page') page = 1, @Query('size') size = 20) {
    const { id: userId, role } = req.user as any;
    return this.kbService.findAll(userId, role, Number(page), Number(size));
  }

  @Get('accessible')
  @ApiOperation({ summary: '获取用户可访问的知识库列表（包含公开）' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findAccessible(@Req() req: Request) {
    const { id: userId } = req.user as any;
    return this.kbService.findUserAccessible(userId);
  }

  @Post()
  @ApiOperation({ summary: '创建知识库' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async create(@Req() req: Request, @Body() body: any) {
    const { id: userId } = req.user as any;
    return this.kbService.create(userId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取知识库详情' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findById(@Param('id') id: string) {
    return this.kbService.findById(Number(id));
  }

  @Put(':id')
  @ApiOperation({ summary: '更新知识库' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async update(@Req() req: Request, @Param('id') id: string, @Body() body: any) {
    const { id: userId, role } = req.user as any;
    return this.kbService.update(Number(id), userId, role, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除知识库' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async delete(@Req() req: Request, @Param('id') id: string) {
    const { id: userId, role } = req.user as any;
    return this.kbService.delete(Number(id), userId, role);
  }
}
