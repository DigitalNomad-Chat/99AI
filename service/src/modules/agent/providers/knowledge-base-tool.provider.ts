import { Injectable } from '@nestjs/common';
import {
  IToolProvider,
  ToolDefinition,
  ToolCallRequest,
  ToolCallResult,
} from '../interfaces/tool-provider.interface';
import { KbSearchService } from '../../knowledge-base/kb-search.service';

@Injectable()
export class KnowledgeBaseToolProvider implements IToolProvider {
  namespace = 'builtin';

  constructor(private readonly kbSearchService: KbSearchService) {}

  async getTools(): Promise<ToolDefinition[]> {
    return [
      {
        name: 'search_knowledge_base',
        description:
          '在知识库中搜索与用户问题相关的信息。当用户提问可能涉及已上传的文档、资料、知识库内容时使用。',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索查询语句',
            },
            knowledgeBaseId: {
              type: 'number',
              description: '知识库ID，如果未指定则搜索所有可访问知识库',
            },
            topK: {
              type: 'number',
              description: '返回结果数量，默认5条',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    const { query, knowledgeBaseId, topK = 5 } = request.arguments;

    try {
      let results: any[];
      if (knowledgeBaseId) {
        results = await this.kbSearchService.hybridSearch(knowledgeBaseId, { query, topK });
      } else {
        // 搜索所有公开知识库 - 暂不支持跨库搜索，返回提示
        return {
          toolCallId: request.id,
          name: request.name,
          content: '请指定要搜索的知识库ID。',
        };
      }

      const content =
        results.length > 0
          ? `在知识库中找到以下相关信息：\n\n${results
              .map((r, i) => `${i + 1}. [相似度: ${(r.score * 100).toFixed(1)}%] ${r.content}`)
              .join('\n\n')}`
          : '在知识库中未找到相关信息。';

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
        error: `知识库搜索失败: ${error.message}`,
      };
    }
  }
}
