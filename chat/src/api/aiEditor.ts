import { post } from '@/utils/request'

export interface AiEditorRequest {
  content: string
  command: string
  prompt?: string
}

export interface AiEditorResponse {
  success: boolean
  data: {
    result: string
  }
}

export interface GenerateArticleRequest {
  prompt: string
}

export interface GenerateArticleResponse {
  success: boolean
  data: {
    title: string
    content: string
    htmlContent: string
  }
}

/**
 * AI改写/扩写/翻译等
 */
export async function fetchAiEditAPI(data: AiEditorRequest): Promise<AiEditorResponse> {
  return post({ url: '/ai/editor/edit', data }) as Promise<AiEditorResponse>
}

/**
 * AI续写
 */
export async function fetchAiContinueAPI(content: string): Promise<AiEditorResponse> {
  return post({ url: '/ai/editor/continue', data: { content } }) as Promise<AiEditorResponse>
}

/**
 * AI生成文章
 */
export async function fetchGenerateArticleAPI(
  data: GenerateArticleRequest
): Promise<GenerateArticleResponse> {
  return post({ url: '/ai/generate-article', data }) as Promise<GenerateArticleResponse>
}
