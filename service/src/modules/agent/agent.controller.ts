import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/auth/jwtAuth.guard';
import { AgentService } from './agent.service';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Get('tools')
  @ApiOperation({ summary: '获取可用的 Agent 工具列表' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getTools() {
    // TODO: 实现获取工具列表
    return { tools: [] };
  }
}
