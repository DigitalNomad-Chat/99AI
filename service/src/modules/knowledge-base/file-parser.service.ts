import { Injectable, Logger } from '@nestjs/common';
import * as iconv from 'iconv-lite';
import * as jschardet from 'jschardet';
import * as fs from 'fs';
import * as path from 'path';

// 动态导入 pdf-parse 和 mammoth，避免启动时加载失败影响整体服务
let pdfParse: any;
let mammoth: any;

try {
  pdfParse = require('pdf-parse');
} catch {
  Logger.warn('pdf-parse not available, PDF parsing will be disabled', 'FileParserService');
}

try {
  mammoth = require('mammoth');
} catch {
  Logger.warn('mammoth not available, DOCX parsing will be disabled', 'FileParserService');
}

export interface ParsedFile {
  content: string;
  fileType: string;
  fileExtension: string;
}

@Injectable()
export class FileParserService {
  private readonly logger = new Logger(FileParserService.name);

  // 支持的文本/代码文件类型
  private readonly textExtensions = new Set([
    'txt',
    'md',
    'py',
    'js',
    'ts',
    'jsx',
    'tsx',
    'java',
    'cpp',
    'c',
    'h',
    'hpp',
    'go',
    'rs',
    'rb',
    'php',
    'json',
    'xml',
    'yaml',
    'yml',
    'toml',
    'html',
    'htm',
    'css',
    'scss',
    'less',
    'csv',
    'tsv',
    'sql',
    'sh',
    'bat',
    'ps1',
    'log',
  ]);

  // 文件大小限制（字节）
  private readonly sizeLimits: Record<string, number> = {
    text: 10 * 1024 * 1024, // 10MB
    pdf: 50 * 1024 * 1024, // 50MB
    docx: 20 * 1024 * 1024, // 20MB
  };

  async parseFile(filePath: string, fileExtension: string): Promise<ParsedFile> {
    const ext = fileExtension.toLowerCase().replace(/^\./, '');

    // 检查文件大小
    const stats = fs.statSync(filePath);
    const limit = this.getSizeLimit(ext);
    if (stats.size > limit) {
      throw new Error(`文件大小超过限制: ${stats.size} > ${limit} bytes`);
    }

    if (ext === 'pdf') {
      return this.parsePdf(filePath);
    }

    if (ext === 'docx') {
      return this.parseDocx(filePath);
    }

    if (this.textExtensions.has(ext) || ext === 'txt') {
      return this.parseText(filePath, ext);
    }

    // 默认作为文本处理
    return this.parseText(filePath, ext);
  }

  private async parsePdf(filePath: string): Promise<ParsedFile> {
    if (!pdfParse) {
      throw new Error('pdf-parse 模块未安装，无法解析 PDF 文件');
    }

    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);

    return {
      content: this.cleanText(data.text),
      fileType: 'application/pdf',
      fileExtension: 'pdf',
    };
  }

  private async parseDocx(filePath: string): Promise<ParsedFile> {
    if (!mammoth) {
      throw new Error('mammoth 模块未安装，无法解析 DOCX 文件');
    }

    const result = await mammoth.extractRawText({ path: filePath });

    return {
      content: this.cleanText(result.value),
      fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileExtension: 'docx',
    };
  }

  private parseText(filePath: string, ext: string): Promise<ParsedFile> {
    const buffer = fs.readFileSync(filePath);

    // 尝试检测编码
    let encoding = 'utf-8';
    const detected = jschardet.detect(buffer);
    if (detected && detected.encoding && detected.confidence > 0.7) {
      encoding = detected.encoding.toLowerCase();
      // 兼容一些常见编码别名
      if (encoding === 'ascii') encoding = 'utf-8';
      if (encoding === 'gb2312' || encoding === 'gbk') encoding = 'gbk';
    }

    let content: string;
    try {
      content = iconv.decode(buffer, encoding);
    } catch {
      // 解码失败，尝试 utf-8
      content = buffer.toString('utf-8');
    }

    return Promise.resolve({
      content: this.cleanText(content),
      fileType: this.getMimeType(ext),
      fileExtension: ext,
    });
  }

  private getSizeLimit(ext: string): number {
    if (ext === 'pdf') return this.sizeLimits.pdf;
    if (ext === 'docx') return this.sizeLimits.docx;
    return this.sizeLimits.text;
  }

  private getMimeType(ext: string): string {
    const mimeMap: Record<string, string> = {
      txt: 'text/plain',
      md: 'text/markdown',
      py: 'text/x-python',
      js: 'application/javascript',
      ts: 'application/typescript',
      json: 'application/json',
      csv: 'text/csv',
      html: 'text/html',
      xml: 'application/xml',
      yaml: 'application/yaml',
      yml: 'application/yaml',
    };
    return mimeMap[ext] || 'text/plain';
  }

  private cleanText(text: string): string {
    return text
      .replace(/\r\n/g, '\n') // 统一换行符
      .replace(/\r/g, '\n')
      .replace(/\t/g, ' ') // Tab 转空格
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // 移除控制字符
      .replace(/\n{3,}/g, '\n\n') // 多余空行压缩
      .replace(/ {2,}/g, ' ') // 多余空格压缩
      .trim();
  }

  /**
   * 检测文件类型是否支持
   */
  isSupported(fileExtension: string): boolean {
    const ext = fileExtension.toLowerCase().replace(/^\./, '');
    return ext === 'pdf' || ext === 'docx' || this.textExtensions.has(ext) || ext === 'txt';
  }
}
