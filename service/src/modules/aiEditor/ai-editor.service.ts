import { Injectable, Logger } from '@nestjs/common';
import { OpenAIChatService } from '../aiTool/chat/chat.service';
import { GlobalConfigService } from '../globalConfig/globalConfig.service';
import { AiEditDto, AiCommand } from './dto/ai-edit.dto';
import { AiContinueDto } from './dto/ai-continue.dto';
import { GenerateArticleDto } from './dto/generate-article.dto';

@Injectable()
export class AiEditorService {
  private readonly logger = new Logger(AiEditorService.name);

  constructor(
    private readonly globalConfigService: GlobalConfigService,
    private readonly openAIChatService: OpenAIChatService,
  ) {}

  /**
   * AI编辑（改写、扩写、总结、翻译、润色）
   */
  async aiEdit(dto: AiEditDto, userId: number): Promise<{ result: string }> {
    const { content, command, prompt: customPrompt } = dto;

    this.logger.log(`用户 ${userId} 请求AI编辑: ${command}`);

    // 构建AI请求prompt
    const systemPrompt = this.buildPrompt(command, content, customPrompt);

    // 构建消息历史
    const messagesHistory = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content },
    ];

    try {
      // 构建请求参数
      const inputs = await this.buildChatInputs();

      // 添加进度回调
      let fullResponse = '';
      inputs.onProgress = data => {
        if (data.text || data.content) {
          const chunk = data.text || (Array.isArray(data.content) ? data.content.join('') : '');
          fullResponse += chunk;
        }
      };

      // 调用OpenAIChatService
      await this.openAIChatService.chat(messagesHistory, inputs);

      return { result: fullResponse || '处理完成' };
    } catch (error) {
      this.logger.error(`AI编辑失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * AI续写
   */
  async aiContinue(dto: AiContinueDto, userId: number): Promise<{ result: string }> {
    const { content } = dto;

    this.logger.log(`用户 ${userId} 请求AI续写`);

    const systemPrompt = `你是一个专业的写作助手。请根据以下内容进行续写，保持相同的风格和语调。续写内容应该自然、连贯，并且符合上下文逻辑。`;

    const messagesHistory = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请续写以下内容：\n\n${content}` },
    ];

    try {
      const inputs = await this.buildChatInputs();

      let fullResponse = '';
      inputs.onProgress = data => {
        if (data.text || data.content) {
          const chunk = data.text || (Array.isArray(data.content) ? data.content.join('') : '');
          fullResponse += chunk;
        }
      };

      await this.openAIChatService.chat(messagesHistory, inputs);

      return { result: fullResponse || '续写完成' };
    } catch (error) {
      this.logger.error(`AI续写失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成文章
   */
  async generateArticle(
    dto: GenerateArticleDto,
    userId: number,
  ): Promise<{
    title: string;
    content: string;
    htmlContent: string;
  }> {
    const { prompt } = dto;

    this.logger.log(`用户 ${userId} 请求生成文章: ${prompt}`);

    const systemPrompt = `你是一个专业的写作助手。用户将提出写作需求，你需要：

1. 理解用户的写作主题和要求
2. 生成结构化的文章内容
3. 返回JSON格式（必须是有效的JSON，不要包含markdown代码块标记）：
{
  "title": "文章标题",
  "content": "文章正文（支持Markdown格式）",
  "outline": ["要点1", "要点2"],
  "tags": ["标签1", "标签2"]
}

请确保返回的是纯JSON格式，不要用markdown代码块包裹。`;

    const messagesHistory = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    try {
      const inputs = await this.buildChatInputs();

      let fullResponse = '';
      inputs.onProgress = data => {
        if (data.text || data.content) {
          const chunk = data.text || (Array.isArray(data.content) ? data.content.join('') : '');
          fullResponse += chunk;
        }
      };

      await this.openAIChatService.chat(messagesHistory, inputs);

      // 解析JSON响应
      const result = this.parseArticleResponse(fullResponse);
      return result;
    } catch (error) {
      this.logger.error(`生成文章失败: ${error.message}`);
      // 如果解析失败，返回原始内容
      return {
        title: '生成的文章',
        content: fullResponse,
        htmlContent: fullResponse,
      };
    }
  }

  /**
   * 根据命令构建prompt
   */
  private buildPrompt(command: AiCommand, content: string, customPrompt?: string): string {
    if (customPrompt) {
      return customPrompt;
    }

    const prompts: Record<AiCommand, string> = {
      [AiCommand.REWRITE]: `你是一个专业的编辑助手。请改写以下内容，保持原意但改善表达方式，使文字更加流畅、准确、生动。

原文：
${content}`,
      [AiCommand.EXPAND]: `你是一个专业的写作助手。请对以下内容进行详细扩写，添加更多细节、例子和说明，使内容更加丰富和完整。

原文：
${content}`,
      [AiCommand.SUMMARIZE]: `你是一个专业的编辑助手。请用一句话简明扼要地总结以下内容的核心要点。

原文：
${content}`,
      [AiCommand.TRANSLATE]: `你是一个专业的翻译助手。请将以下内容翻译成英文，确保翻译准确、流畅、符合英文表达习惯。

原文：
${content}`,
      [AiCommand.POLISH]: `你是一个专业的编辑助手。请对以下内容进行润色优化，改善语言表达，提升文字的质量和专业性。

原文：
${content}`,
    };

    return prompts[command] || content;
  }

  /**
   * 解析文章响应
   */
  private parseArticleResponse(response: string): {
    title: string;
    content: string;
    htmlContent: string;
  } {
    try {
      // 尝试提取JSON（处理markdown代码块）
      const jsonMatch =
        response.match(/```json\s*([\s\S]*?)\s*```/) ||
        response.match(/```\s*([\s\S]*?)\s*```/) ||
        response.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const articleData = JSON.parse(jsonStr);

        return {
          title: articleData.title || '未命名文章',
          content: articleData.content || response,
          htmlContent: articleData.content || response,
        };
      }

      // 如果没有找到JSON，返回原始内容
      return {
        title: '生成的文章',
        content: response,
        htmlContent: response,
      };
    } catch (error) {
      this.logger.warn(`解析文章响应失败: ${error.message}`);
      return {
        title: '生成的文章',
        content: response,
        htmlContent: response,
      };
    }
  }

  /**
   * 构建聊天请求参数
   */
  private async buildChatInputs(): Promise<any> {
    // 获取全局配置
    const { openaiBaseUrl, openaiBaseKey, openaiBaseModel } =
      await this.globalConfigService.getConfigs([
        'openaiBaseUrl',
        'openaiBaseKey',
        'openaiBaseModel',
      ]);

    return {
      chatId: `ai_editor_${Date.now()}`,
      apiKey: openaiBaseKey,
      model: openaiBaseModel,
      modelName: openaiBaseModel,
      temperature: 0.7,
      timeout: 60000,
      proxyUrl: openaiBaseUrl,
      abortController: new AbortController(),
    };
  }
}
