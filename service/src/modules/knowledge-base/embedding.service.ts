import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import { Repository } from 'typeorm';
import { GlobalConfigService } from '../globalConfig/globalConfig.service';
import { ModelsEntity } from '../models/models.entity';
import { ModelsService } from '../models/models.service';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly globalConfigService: GlobalConfigService,
    private readonly modelsService: ModelsService,
    @InjectRepository(ModelsEntity)
    private readonly modelsEntity: Repository<ModelsEntity>,
  ) {}

  /**
   * 批量生成文本嵌入向量
   * @param texts 文本数组
   * @param modelId 可选的模型ID，不指定则使用默认嵌入模型
   */
  async embedTexts(texts: string[], modelId?: number): Promise<number[][]> {
    if (!texts.length) return [];

    const modelConfig = await this.getEmbeddingModelConfig(modelId);
    if (!modelConfig) {
      throw new Error('未找到可用的嵌入模型配置，请在后台配置嵌入模型');
    }

    const embeddings: number[][] = [];
    const batchSize = 20; // OpenAI 建议每批最多 20 个

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      this.logger.debug(
        `Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          texts.length / batchSize,
        )}, size: ${batch.length}`,
      );

      try {
        const url = modelConfig.baseUrl.endsWith('/')
          ? `${modelConfig.baseUrl}v1/embeddings`
          : `${modelConfig.baseUrl}/v1/embeddings`;

        const response = await axios.post(
          url,
          {
            model: modelConfig.model,
            input: batch,
            encoding_format: 'float',
          },
          {
            headers: {
              Authorization: `Bearer ${modelConfig.key}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000,
          },
        );

        const data = response.data?.data || [];
        for (const item of data) {
          if (item.embedding) {
            embeddings.push(item.embedding);
          }
        }
      } catch (error) {
        this.logger.error(`Embedding batch failed: ${error.message}`);
        throw new Error(`嵌入模型调用失败: ${error.message}`);
      }
    }

    return embeddings;
  }

  /**
   * 生成单个文本的嵌入向量
   */
  async embedText(text: string, modelId?: number): Promise<number[]> {
    const embeddings = await this.embedTexts([text], modelId);
    return embeddings[0];
  }

  /**
   * 获取嵌入模型配置
   */
  private async getEmbeddingModelConfig(
    modelId?: number,
  ): Promise<{ key: string; baseUrl: string; model: string } | null> {
    try {
      let modelConfig: any;

      if (modelId) {
        // 使用指定的模型ID直接查询
        modelConfig = await this.modelsEntity.findOne({ where: { id: modelId } });
      } else {
        // 尝试获取默认嵌入模型（先查 ada-002，再查 3-small）
        const candidates = ['text-embedding-ada-002', 'text-embedding-3-small'];
        for (const candidate of candidates) {
          modelConfig = await this.modelsService.getCurrentModelKeyInfo(candidate);
          if (modelConfig && modelConfig.key && modelConfig.key.length > 10) break;
          modelConfig = null;
        }
      }

      if (modelConfig && modelConfig.key && modelConfig.key.length > 10) {
        return {
          key: modelConfig.key,
          baseUrl: modelConfig.proxyUrl || 'https://api.openai.com',
          model: modelConfig.model || 'text-embedding-3-small',
        };
      }

      // fallback：使用全局 OpenAI 配置（校验 key 有效性）
      const { openaiBaseUrl, openaiBaseKey } = await this.globalConfigService.getConfigs([
        'openaiBaseUrl',
        'openaiBaseKey',
      ]);

      if (openaiBaseKey && openaiBaseKey.length > 10) {
        return {
          key: openaiBaseKey,
          baseUrl: openaiBaseUrl || 'https://api.openai.com',
          model: 'text-embedding-3-small',
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Failed to get embedding model config: ${error.message}`);
      return null;
    }
  }

  /**
   * 获取嵌入向量维度
   */
  getEmbeddingDimensions(modelName?: string): number {
    const dimensionsMap: Record<string, number> = {
      'text-embedding-3-small': 1536,
      'text-embedding-3-large': 3072,
      'text-embedding-ada-002': 1536,
    };
    return dimensionsMap[modelName || 'text-embedding-3-small'] || 1536;
  }
}
