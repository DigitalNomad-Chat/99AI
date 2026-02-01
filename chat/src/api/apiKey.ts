import type { Response } from '@/utils/request'
import { get, post } from '@/utils/request'

/* 获取用户的 API Keys 列表 */
export function fetchQueryApiKeysAPI<T>(data: {
  page?: number
  pageSize?: number
}): Promise<Response<T>> {
  return get<T>({
    url: '/user/api-keys',
    data,
  })
}

/* 创建新的 API Key */
export function fetchCreateApiKeyAPI<T>(data: {
  name?: string
}): Promise<Response<T>> {
  return post<T>({
    url: '/user/api-keys',
    data,
  })
}

/* 删除 API Key */
export function fetchDeleteApiKeyAPI<T>(data: {
  id: number
}): Promise<Response<T>> {
  return post<T>({
    url: `/user/api-keys/${data.id}`,
    data: {},
  })
}

/* 切换 API Key 启用/禁用状态 */
export function fetchToggleApiKeyAPI<T>(data: {
  id: number
}): Promise<Response<T>> {
  return post<T>({
    url: `/user/api-keys/${data.id}/toggle`,
    data: {},
  })
}

/* 获取可用模型列表 */
export function fetchGetAvailableModelsAPI<T>(): Promise<Response<T>> {
  return get<T>({
    url: '/user/api-keys/available-models',
  })
}
