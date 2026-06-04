import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { SkillsService } from './skills.service';
import { SkillEngineService } from './skill-engine.service';
import { BuiltInSkillsService } from './built-in-skills.service';
import { JwtAuthGuard } from '@/common/auth/jwtAuth.guard';

@ApiTags('Skills')
@Controller('skills')
export class SkillsController {
  constructor(
    private readonly skillsService: SkillsService,
    private readonly skillEngineService: SkillEngineService,
    private readonly builtInSkillsService: BuiltInSkillsService,
  ) {}

  // ==================== 分类管理 ====================

  @Post('category/create')
  @ApiOperation({ summary: '创建技能分类' })
  async createCategory(@Body() body: any) {
    return this.skillsService.createCategory(body);
  }

  @Post('category/update')
  @ApiOperation({ summary: '更新技能分类' })
  async updateCategory(@Body() body: any) {
    return this.skillsService.updateCategory(body);
  }

  @Post('category/delete')
  @ApiOperation({ summary: '删除技能分类' })
  async deleteCategory(@Body() body: any) {
    return this.skillsService.deleteCategory(body);
  }

  @Get('category/list')
  @ApiOperation({ summary: '获取技能分类列表' })
  async categoryList(@Query() query: any) {
    return this.skillsService.categoryList(query);
  }

  // ==================== 技能管理 ====================

  @Post('create')
  @ApiOperation({ summary: '创建技能' })
  async createSkill(@Body() body: any) {
    return this.skillsService.createSkill(body);
  }

  @Post('update')
  @ApiOperation({ summary: '更新技能' })
  async updateSkill(@Body() body: any) {
    return this.skillsService.updateSkill(body);
  }

  @Post('delete')
  @ApiOperation({ summary: '删除技能' })
  async deleteSkill(@Body() body: any) {
    return this.skillsService.deleteSkill(body);
  }

  @Get('list')
  @ApiOperation({ summary: '获取技能列表（管理端）' })
  async skillList(@Query() query: any) {
    return this.skillsService.skillList(query);
  }

  @Get('detail')
  @ApiOperation({ summary: '获取技能详情' })
  async getSkillDetail(@Query('id') id: number) {
    return this.skillsService.getSkillDetail(Number(id));
  }

  // ==================== 前端 API ====================

  @Get('front/list')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取技能广场列表' })
  async frontSkillList(@Query() query: any, @Req() req: Request) {
    return this.skillsService.frontSkillList(query, req);
  }

  @Get('front/detail')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取技能详情（前端）' })
  async frontSkillDetail(@Query('id') id: number) {
    return this.skillsService.getSkillDetail(Number(id));
  }

  // ==================== 技能执行 ====================

  @Post('execute')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '执行技能' })
  async executeSkill(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const { skillId, inputParams, groupId } = body;
    const userId = req.user.id;

    if (!skillId) {
      throw new HttpException('缺少技能ID', HttpStatus.BAD_REQUEST);
    }

    // 获取模型配置
    const modelsService = (this.skillEngineService as any).modelsService;
    const modelConfig = await modelsService.getCurrentModelKeyInfo('gpt-4');

    const result = await this.skillEngineService.executeSkill(Number(skillId), inputParams || {}, {
      userId,
      groupId,
      apiKey: modelConfig.key,
      model: modelConfig.model || 'gpt-4',
      proxyUrl: modelConfig.proxyUrl || '',
      temperature: modelConfig.temperature || 0.7,
      max_tokens: modelConfig.max_tokens || 4096,
      timeout: modelConfig.timeout || 60000,
      req,
      res,
    });

    return {
      status: 'success',
      data: result,
    };
  }

  @Get('input-schema')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取技能的输入参数模板' })
  async getInputSchema(@Query('skillId') skillId: number) {
    return this.skillEngineService.getSkillInputSchema(Number(skillId));
  }

  // ==================== 执行记录 ====================

  @Get('execution/list')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取技能执行记录' })
  async executionList(@Query() query: any, @Req() req: Request) {
    return this.skillsService.executionList(query, req);
  }

  // ==================== 内置技能初始化 ====================

  @Post('init-built-in')
  @ApiOperation({ summary: '初始化内置技能（管理员）' })
  async initBuiltInSkills() {
    await this.builtInSkillsService.initBuiltInSkills();
    return { message: '内置技能初始化完成' };
  }

  @Get('built-in/definitions')
  @ApiOperation({ summary: '获取内置技能定义列表' })
  async getBuiltInDefinitions() {
    return {
      definitions: this.builtInSkillsService.getBuiltInSkillDefinitions(),
    };
  }
}
