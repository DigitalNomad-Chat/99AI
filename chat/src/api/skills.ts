import { get, post } from '@/utils/request'

/* 查询技能分类 */
export function fetchQuerySkillCatsAPI<T>(): Promise<T> {
  return get<T>({ url: '/skills/category/list' })
}

/* 查询技能广场列表 */
export function fetchQuerySkillsAPI<T>(params?: any): Promise<T> {
  return get<T>({ url: '/skills/front/list', params })
}

/* 查询技能详情 */
export function fetchQuerySkillDetailAPI<T>(id: number): Promise<T> {
  return get<T>({ url: '/skills/front/detail', params: { id } })
}

/* 获取技能输入参数模板 */
export function fetchSkillInputSchemaAPI<T>(skillId: number): Promise<T> {
  return get<T>({ url: '/skills/input-schema', params: { skillId } })
}

/* 执行技能 */
export function fetchExecuteSkillAPI<T>(data: {
  skillId: number
  inputParams: Record<string, any>
  groupId?: number
}): Promise<T> {
  return post<T>({
    url: '/skills/execute',
    data,
  })
}

/* 查询技能执行记录 */
export function fetchSkillExecutionListAPI<T>(params?: any): Promise<T> {
  return get<T>({ url: '/skills/execution/list', params })
}
