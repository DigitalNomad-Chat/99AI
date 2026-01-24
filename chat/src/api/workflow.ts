import { request } from '@/utils/request'

export interface CallWorkflowOptions {
  appId: number
  variables: Record<string, any>
  message: string
  fileUrl?: string
  stream?: boolean
}

export interface WorkflowResponse {
  code: number
  message: string
  data: {
    content: string
    usage?: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
  }
}

/**
 * 调用工作流API
 */
export async function callWorkflowAPI(options: CallWorkflowOptions): Promise<WorkflowResponse> {
  return await request<WorkflowResponse>({
    url: '/workflow/call',
    method: 'POST',
    data: options,
  })
}

/**
 * 验证工作流配置
 */
export async function validateWorkflowAPI(config: {
  appType: number
  workflowApiUrl: string
  workflowApiKey: string
  workflowAppId: string
}) {
  return await request({
    url: '/workflow/validate',
    method: 'POST',
    data: config,
  })
}

/**
 * 测试工作流连接
 */
export async function testWorkflowAPI(appId: number) {
  return await request({
    url: `/workflow/test/${appId}`,
    method: 'POST',
  })
}

/**
 * 获取工作流类型列表
 */
export async function getWorkflowTypesAPI() {
  return await request({
    url: '/workflow/types',
    method: 'GET',
  })
}
