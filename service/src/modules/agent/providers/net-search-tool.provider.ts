import { Injectable } from '@nestjs/common';
import {
  IToolProvider,
  ToolDefinition,
  ToolCallRequest,
  ToolCallResult,
} from '../interfaces/tool-provider.interface';
import { NetSearchService } from '../../aiTool/search/netSearch.service';

@Injectable()
export class NetSearchToolProvider implements IToolProvider {
  namespace = 'builtin';

  constructor(private readonly netSearchService: NetSearchService) {}

  async getTools(): Promise<ToolDefinition[]> {
    return [
      {
        name: 'web_search',
        description:
          '在联网搜索中获取实时信息。当用户询问最新新闻、当前事件、需要验证的事实、实时数据时使用。',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索关键词',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    const { query } = request.arguments;

    try {
      const { searchResults } = await this.netSearchService.processNetSearch(
        query,
        { usingNetwork: true },
        {},
      );

      const content =
        searchResults && searchResults.length > 0
          ? `搜索结果：\n\n${searchResults
              .map((r: any, i: number) => `${i + 1}. ${r.title}\n${r.content}\n链接: ${r.url}`)
              .join('\n\n')}`
          : '未找到相关搜索结果。';

      return {
        toolCallId: request.id,
        name: request.name,
        content,
      };
    } catch (error) {
      return {
        toolCallId: request.id,
        name: request.name,
        content: '',
        error: `联网搜索失败: ${error.message}`,
      };
    }
  }
}
