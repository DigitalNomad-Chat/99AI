import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwtAuth.guard';
import { AiEditorService } from './ai-editor.service';
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AiEditDto } from './dto/ai-edit.dto';
import { AiContinueDto } from './dto/ai-continue.dto';
import { GenerateArticleDto } from './dto/generate-article.dto';

@ApiTags('AI编辑器')
@Controller('ai/editor')
export class AiEditorController {
  constructor(private readonly aiEditorService: AiEditorService) {}

  @Post('edit')
  @ApiOperation({ summary: 'AI编辑（改写、扩写、总结、翻译、润色）' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async aiEdit(@Body() dto: AiEditDto, @Req() req: Request) {
    const result = await this.aiEditorService.aiEdit(dto, req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  @Post('continue')
  @ApiOperation({ summary: 'AI续写' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async aiContinue(@Body() dto: AiContinueDto, @Req() req: Request) {
    const result = await this.aiEditorService.aiContinue(dto, req.user.id);
    return {
      success: true,
      data: result,
    };
  }
}

@ApiTags('AI文章生成')
@Controller('ai')
export class AiArticleController {
  constructor(private readonly aiEditorService: AiEditorService) {}

  @Post('generate-article')
  @ApiOperation({ summary: 'AI生成文章' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async generateArticle(@Body() dto: GenerateArticleDto, @Req() req: Request) {
    const result = await this.aiEditorService.generateArticle(dto, req.user.id);
    return {
      success: true,
      data: result,
    };
  }
}
