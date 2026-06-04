import { get, post } from '@/utils/request'

/* 获取知识库列表 */
export function fetchKnowledgeBaseListAPI<T = any>(): Promise<T> {
  return get<T>({ url: '/knowledge-base' }) as Promise<T>
}

/* 创建知识库 */
export function fetchCreateKnowledgeBaseAPI<T = any>(data: {
  name: string
  description?: string
  embeddingModelId?: number
  chunkMaxSize?: number
  chunkOverlapSize?: number
  chunkMinSize?: number
  isPublic?: boolean
}): Promise<T> {
  return post<T>({ url: '/knowledge-base', data }) as Promise<T>
}

/* 更新知识库 */
export function fetchUpdateKnowledgeBaseAPI<T = any>(
  id: number,
  data: {
    name?: string
    description?: string
    embeddingModelId?: number
    chunkMaxSize?: number
    chunkOverlapSize?: number
    chunkMinSize?: number
    isPublic?: boolean
    isActive?: boolean
  }
): Promise<T> {
  return post<T>({ url: `/knowledge-base/${id}`, data }) as Promise<T>
}

/* 删除知识库 */
export function fetchDeleteKnowledgeBaseAPI<T = any>(id: number): Promise<T> {
  return post<T>({ url: `/knowledge-base/${id}/delete`, data: {} }) as Promise<T>
}

/* 获取知识库详情 */
export function fetchKnowledgeBaseDetailAPI<T = any>(id: number): Promise<T> {
  return get<T>({ url: `/knowledge-base/${id}` }) as Promise<T>
}

/* 上传文件到知识库 */
export function fetchKbUploadFileAPI<T = any>(
  kbId: number,
  data: FormData
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
): Promise<T> {
  return post<T>({
    url: `/knowledge-base/${kbId}/files/upload`,
    data,
    headers: { 'Content-Type': 'multipart/form-data' },
  }) as Promise<T>
}

/* 获取知识库文件列表 */
export function fetchKbFileListAPI<T = any>(kbId: number, parentFolderId?: number): Promise<T> {
  return get<T>({
    url: `/knowledge-base/${kbId}/files`,
    data: parentFolderId !== undefined ? { parentFolderId } : {},
  }) as Promise<T>
}

/* 删除知识库文件 */
export function fetchKbDeleteFileAPI<T = any>(kbId: number, fileId: number): Promise<T> {
  return post<T>({ url: `/knowledge-base/${kbId}/files/${fileId}/delete`, data: {} }) as Promise<T>
}

/* 重新处理文件 */
export function fetchKbRetryFileAPI<T = any>(kbId: number, fileId: number): Promise<T> {
  return post<T>({ url: `/knowledge-base/${kbId}/files/${fileId}/retry`, data: {} }) as Promise<T>
}

/* 混合搜索 */
export function fetchKbHybridSearchAPI<T = any>(
  kbId: number,
  data: {
    query: string
    topK?: number
    semanticWeight?: number
    keywordWeight?: number
    filterFileId?: number
  }
): Promise<T> {
  return post<T>({ url: `/knowledge-base/${kbId}/search`, data }) as Promise<T>
}

/* 语义搜索测试 */
export function fetchKbSemanticSearchTestAPI<T = any>(
  kbId: number,
  query: string,
  topK = 5
): Promise<T> {
  return get<T>({
    url: `/knowledge-base/${kbId}/search/test`,
    data: { query, topK },
  }) as Promise<T>
}
