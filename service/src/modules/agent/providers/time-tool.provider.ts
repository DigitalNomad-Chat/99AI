import { Injectable } from '@nestjs/common';
import {
  IToolProvider,
  ToolDefinition,
  ToolCallRequest,
  ToolCallResult,
} from '../interfaces/tool-provider.interface';

@Injectable()
export class TimeToolProvider implements IToolProvider {
  namespace = 'builtin';

  async getTools(): Promise<ToolDefinition[]> {
    return [
      {
        name: 'get_current_time',
        description:
          '获取当前日期和时间，包括时区信息。当用户询问时间、日期、当前是几号、星期几等问题时使用。',
        parameters: {
          type: 'object',
          properties: {
            timezone: {
              type: 'string',
              description: '时区，如 "Asia/Shanghai"、"UTC"，默认为 "Asia/Shanghai"',
            },
            format: {
              type: 'string',
              description:
                '时间格式，如 "full"（完整）、"date"（仅日期）、"time"（仅时间），默认为 "full"',
            },
          },
          required: [],
        },
      },
    ];
  }

  async execute(request: ToolCallRequest): Promise<ToolCallResult> {
    const { timezone = 'Asia/Shanghai', format = 'full' } = request.arguments;
    const now = new Date();

    let content: string;
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      };

      if (format === 'date') {
        delete options.hour;
        delete options.minute;
        delete options.second;
      } else if (format === 'time') {
        delete options.year;
        delete options.month;
        delete options.day;
      }

      content = new Intl.DateTimeFormat('zh-CN', options).format(now);
    } catch (error) {
      content = `获取时间失败: ${error.message}`;
    }

    return {
      toolCallId: request.id,
      name: request.name,
      content,
    };
  }
}
