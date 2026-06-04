import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '@/common/auth/jwtAuth.guard';
import { KbSearchService } from './kb-search.service';

@ApiTags('knowledge-base')
@Controller('knowledge-base/:kbId/search')
export class KbSearchController {
  constructor(private readonly kbSearchService: KbSearchService) {}

  @Post()
  @ApiOperation({ summary: '混合搜索' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async hybridSearch(
    @Param('kbId') kbId: string,
    @Body()
    body: {
      query: string;
      topK?: number;
      semanticWeight?: number;
      keywordWeight?: number;
      filterFileId?: number;
    },
  ) {
    return this.kbSearchService.hybridSearch(Number(kbId), body);
  }

  @Get('test')
  @ApiOperation({ summary: '语义搜索测试' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async semanticSearchTest(
    @Param('kbId') kbId: string,
    @Query('query') query: string,
    @Query('topK') topK = 5,
  ) {
    return this.kbSearchService.semanticSearchTest(Number(kbId), query, Number(topK));
  }
}
