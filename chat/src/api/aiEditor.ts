import request from '@/api/utils'

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

/**
 * AI改写/扩写/翻译等
 */
export async function fetchAiEditAPI(data: AiEditorRequest): Promise<AiEditorResponse> {
  return request.post('/api/ai/editor', data)
}

/**
 * AI续写
 */
export async function fetchAiContinueAPI(content: string): Promise<AiEditorResponse> {
  return request.post('/api/ai/continue', { content })
}
