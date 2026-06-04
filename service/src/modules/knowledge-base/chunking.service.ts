import { Injectable, Logger } from '@nestjs/common';
import { encode } from 'gpt-tokenizer';

export interface ChunkResult {
  content: string;
  cleanContent: string;
  chunkIndex: number;
  tokenCount: number;
  metadata: {
    overlapLength: number;
    chunkSize: number;
    cleanSize: number;
    strategy: string;
  };
}

@Injectable()
export class ChunkingService {
  private readonly logger = new Logger(ChunkingService.name);

  /**
   * 智能文本分块
   * @param text 原始文本
   * @param maxTokens 每块最大Token数
   * @param overlapTokens 重叠Token数
   * @param minTokens 最小Token数（低于此值会合并到前一块）
   */
  chunkText(text: string, maxTokens = 1000, overlapTokens = 100, minTokens = 50): ChunkResult[] {
    // 文本预处理
    const cleanedText = this.preprocessText(text);

    // 按句子分割
    const sentences = this.splitIntoSentences(cleanedText);

    const chunks: ChunkResult[] = [];
    let currentChunkSentences: string[] = [];
    let currentTokenCount = 0;
    let chunkIndex = 0;

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const sentenceTokens = encode(sentence).length;

      // 如果单句就超过 maxTokens，需要强制截断
      if (sentenceTokens > maxTokens) {
        // 先保存当前累积的块
        if (currentChunkSentences.length > 0) {
          this.addChunk(chunks, currentChunkSentences, chunkIndex++, overlapTokens, maxTokens);
          currentChunkSentences = [];
          currentTokenCount = 0;
        }

        // 强制截断长句
        const subChunks = this.forceSplitSentence(sentence, maxTokens);
        for (const sub of subChunks) {
          const subTokens = encode(sub).length;
          if (subTokens >= minTokens) {
            chunks.push({
              content: sub,
              cleanContent: sub,
              chunkIndex: chunkIndex++,
              tokenCount: subTokens,
              metadata: {
                overlapLength: 0,
                chunkSize: sub.length,
                cleanSize: sub.length,
                strategy: 'force_split',
              },
            });
          }
        }
        continue;
      }

      // 如果加入当前句子后超过 maxTokens，保存当前块
      if (currentTokenCount + sentenceTokens > maxTokens && currentChunkSentences.length > 0) {
        this.addChunk(chunks, currentChunkSentences, chunkIndex++, overlapTokens, maxTokens);
        currentChunkSentences = [];
        currentTokenCount = 0;
      }

      currentChunkSentences.push(sentence);
      currentTokenCount += sentenceTokens;
    }

    // 处理剩余的句子
    if (currentChunkSentences.length > 0) {
      const lastChunkTokens = encode(currentChunkSentences.join('')).length;
      if (lastChunkTokens >= minTokens || chunks.length === 0) {
        this.addChunk(chunks, currentChunkSentences, chunkIndex++, overlapTokens, maxTokens);
      } else {
        // 合并到前一块
        this.mergeToPreviousChunk(chunks, currentChunkSentences);
      }
    }

    return chunks;
  }

  /**
   * 添加一个分块，包含重叠内容
   */
  private addChunk(
    chunks: ChunkResult[],
    sentences: string[],
    chunkIndex: number,
    overlapTokens: number,
    maxTokens: number,
  ): void {
    const cleanContent = sentences.join('');
    const cleanTokens = encode(cleanContent).length;

    // 计算重叠内容（从前面的句子中取）
    let overlapContent = '';
    if (chunkIndex > 0 && overlapTokens > 0) {
      const prevChunk = chunks[chunks.length - 1];
      if (prevChunk) {
        // 从上一个块的 cleanContent 末尾取 overlapTokens
        const prevText = prevChunk.cleanContent;
        const prevSentences = this.splitIntoSentences(prevText);
        let overlapTokenCount = 0;
        const overlapSentences: string[] = [];

        // 从后往前取句子，直到达到 overlapTokens
        for (let i = prevSentences.length - 1; i >= 0; i--) {
          const s = prevSentences[i];
          const sTokens = encode(s).length;
          if (overlapTokenCount + sTokens > overlapTokens && overlapSentences.length > 0) {
            break;
          }
          overlapSentences.unshift(s);
          overlapTokenCount += sTokens;
        }

        overlapContent = overlapSentences.join('');
      }
    }

    const fullContent = overlapContent + cleanContent;
    const fullTokens = encode(fullContent).length;

    // 如果加上重叠后超过 maxTokens，裁剪
    let finalContent = fullContent;
    let finalTokens = fullTokens;
    if (fullTokens > maxTokens) {
      finalContent = this.truncateToTokens(fullContent, maxTokens);
      finalTokens = encode(finalContent).length;
    }

    chunks.push({
      content: finalContent,
      cleanContent,
      chunkIndex,
      tokenCount: finalTokens,
      metadata: {
        overlapLength: overlapContent.length,
        chunkSize: finalContent.length,
        cleanSize: cleanContent.length,
        strategy: 'sentence_boundary',
      },
    });
  }

  /**
   * 将剩余内容合并到前一个分块
   */
  private mergeToPreviousChunk(chunks: ChunkResult[], sentences: string[]): void {
    if (chunks.length === 0) return;

    const lastChunk = chunks[chunks.length - 1];
    const extraContent = sentences.join('');
    lastChunk.cleanContent += extraContent;
    lastChunk.content += extraContent;
    lastChunk.tokenCount = encode(lastChunk.content).length;
    lastChunk.metadata.cleanSize = lastChunk.cleanContent.length;
    lastChunk.metadata.chunkSize = lastChunk.content.length;
  }

  /**
   * 强制截断超长句子（按字符数大致估计）
   */
  private forceSplitSentence(sentence: string, maxTokens: number): string[] {
    const results: string[] = [];
    let remaining = sentence;

    while (remaining.length > 0) {
      // 大致估算：1 token ≈ 0.75 个英文字符 或 0.4 个中文字符
      // 保守估计，按 maxTokens * 2 个字符截取
      const charLimit = maxTokens * 2;
      let chunk = remaining.slice(0, charLimit);

      // 尝试在标点处截断
      const punctuationMatch = chunk.match(/[。！？.!?;；,，]/g);
      if (punctuationMatch && chunk.length > 50) {
        const lastPunctIndex = Math.max(
          chunk.lastIndexOf('。'),
          chunk.lastIndexOf('.'),
          chunk.lastIndexOf('！'),
          chunk.lastIndexOf('!'),
          chunk.lastIndexOf('？'),
          chunk.lastIndexOf('?'),
          chunk.lastIndexOf('；'),
          chunk.lastIndexOf(';'),
        );
        if (lastPunctIndex > chunk.length * 0.5) {
          chunk = chunk.slice(0, lastPunctIndex + 1);
        }
      }

      results.push(chunk);
      remaining = remaining.slice(chunk.length);
    }

    return results;
  }

  /**
   * 按 Token 数截断文本
   */
  private truncateToTokens(text: string, maxTokens: number): string {
    const tokens = encode(text);
    if (tokens.length <= maxTokens) return text;

    // 二分查找合适的截断位置
    let left = 0;
    let right = text.length;
    let result = text;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const subText = text.slice(0, mid);
      const subTokens = encode(subText).length;

      if (subTokens <= maxTokens) {
        result = subText;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return result;
  }

  /**
   * 将文本分割成句子
   */
  private splitIntoSentences(text: string): string[] {
    // 保留分隔符的分割：先替换再分割
    const withMarkers = text
      .replace(/([。！？.!?])/g, '$1\u0000')
      .replace(/([;；])/g, '$1\u0000')
      .replace(/(\n\n)/g, '\u0000')
      .replace(/(\n)/g, '\u0000');

    return withMarkers
      .split('\u0000')
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + ' ');
  }

  /**
   * 文本预处理
   */
  private preprocessText(text: string): string {
    return text
      .normalize('NFKC') // Unicode 规范化
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // 移除控制字符
      .replace(/\n{3,}/g, '\n\n') // 压缩多余换行
      .replace(/ {2,}/g, ' ') // 压缩多余空格
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // 移除零宽字符
      .trim();
  }

  /**
   * 计算文本 Token 数
   */
  countTokens(text: string): number {
    return encode(text).length;
  }
}
