import { get, post } from '@/utils/request'
import type { ResData } from './types'

// 查询办公工具分类列表
export function fetchQueryOfficeToolCatsAPI(): Promise<ResData> {
  return get({ url: '/office-tool/cats' })
}

// 查询办公工具列表
export function fetchQueryOfficeToolsAPI(): Promise<ResData> {
  return get({ url: '/office-tools' })
}

// 执行办公工具
export function fetchExecuteOfficeToolAPI(data: {
  toolId: number
  inputParams: Record<string, any>
  groupId?: number
}): Promise<ResData> {
  return post({ url: '/office-tool/execute', data })
}
