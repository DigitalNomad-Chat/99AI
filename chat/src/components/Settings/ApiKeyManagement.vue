<script setup lang="ts">
import {
  fetchCreateApiKeyAPI,
  fetchDeleteApiKeyAPI,
  fetchQueryApiKeysAPI,
  fetchToggleApiKeyAPI,
  fetchGetAvailableModelsAPI,
} from '@/api/apiKey'
import type { ResData } from '@/api/types'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAuthStore } from '@/store'
import { message } from '@/utils/message'
import { Copy, Delete, Key, Plus, Refresh } from '@icon-park/vue-next'
import { computed, onMounted, ref, watch } from 'vue'

interface Props {
  visible: boolean
}

const props = defineProps<Props>()

const authStore = useAuthStore()
const { isMobile } = useBasicLayout()
const ms = message()
const loading = ref(false)

// 获取后端地址（用于显示给用户的 API 请求地址）
const apiUrl = computed(() => {
  const apiBaseUrl = import.meta.env.VITE_GLOB_API_URL || '/api'

  // 如果是相对路径（生产环境使用 /api），使用当前域名
  if (apiBaseUrl.startsWith('/')) {
    return window.location.origin
  }

  // 如果是绝对 URL（开发环境），去掉 /api 后缀
  // 例如：http://127.0.0.1:9520/api → http://127.0.0.1:9520
  return apiBaseUrl.replace(/\/api$/, '')
})

// API Keys 列表数据
interface ApiKeyItem {
  id: number
  apiKey: string // 脱敏显示的 key
  name: string
  isActive: boolean
  totalRequests: number
  lastUsedAt: string | null
  createdAt: string
}

const apiKeysList = ref<ApiKeyItem[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 可用模型列表数据
interface ModelItem {
  id: string // model 名称
  model: string
  modelName: string
}

const availableModels = ref<ModelItem[]>([])
const modelsLoading = ref(false)

// 创建 API Key 相关
const showCreateDialog = ref(false)
const newKeyName = ref('')
const isCreating = ref(false)
const createdKey = ref('') // 创建成功后显示的完整 key

// 登录检测
const isLogin = computed(() => authStore.isLogin)

function checkLoginStatus() {
  if (!isLogin.value) {
    ms.warning('请登录后使用 API Key 管理')
    return false
  }
  return true
}

// 获取 API Keys 列表
async function getApiKeysList() {
  if (!checkLoginStatus()) return

  try {
    loading.value = true
    const res: ResData = await fetchQueryApiKeysAPI({
      page: currentPage.value,
      pageSize: pageSize.value,
    })

    if (res.success) {
      apiKeysList.value = res.data.data || []
      total.value = res.data.total || 0
    } else if (res.code === 401) {
      ms.error(res.message || '请登录后使用 API Keys 管理功能')
    } else {
      ms.error(res.message || '获取 API Keys 失败')
    }
  } catch (error) {
    console.error('获取 API Keys 失败:', error)
    ms.error('获取 API Keys 失败')
  } finally {
    loading.value = false
  }
}

// 切换 API Key 状态
async function toggleApiKeyStatus(id: number, currentStatus: boolean) {
  try {
    const res: ResData = await fetchToggleApiKeyAPI({ id })
    if (res.success) {
      const newStatus = res.data.isActive
      ms.success(newStatus ? '已启用' : '已停用')
      await getApiKeysList()
    } else {
      ms.error(res.message || '操作失败')
    }
  } catch (error) {
    console.error('切换状态失败:', error)
    ms.error('操作失败')
  }
}

// 获取可用模型列表
async function getAvailableModels() {
  if (!checkLoginStatus()) return

  try {
    modelsLoading.value = true
    const res: ResData = await fetchGetAvailableModelsAPI()

    if (res.success) {
      availableModels.value = res.data.data || []
    }
  } catch (error) {
    console.error('获取模型列表失败:', error)
  } finally {
    modelsLoading.value = false
  }
}

// 创建 API Key
async function createApiKey() {
  if (!newKeyName.value.trim()) {
    ms.warning('请输入 API Key 名称')
    return
  }

  try {
    isCreating.value = true

    const res: ResData = await fetchCreateApiKeyAPI({
      name: newKeyName.value.trim(),
    })

    if (res.success) {
      // 尝试多种可能的路径获取apiKey
      createdKey.value = res.data?.data?.apiKey || res.data?.apiKey || res.data

      if (!createdKey.value) {
        console.error('无法从响应中获取apiKey:', res.data)
        ms.error('创建成功但无法获取API Key，请联系管理员')
        return
      }

      ms.success('API Key 创建成功，请妥善保存')
      // 刷新列表
      await getApiKeysList()
    } else {
      ms.error(res.message || '创建 API Key 失败')
    }
  } catch (error: any) {
    // 错误已由 failHandler 统一处理并显示，此处无需重复提示
    console.error('创建 API Key 失败:', error?.message)
  } finally {
    isCreating.value = false
  }
}

// 删除 API Key
async function deleteApiKey(id: number, name: string) {
  const confirmed = confirm(`确定要删除 API Key "${name}" 吗？此操作不可恢复。`)
  if (!confirmed) return

  try {
    loading.value = true
    const res: ResData = await fetchDeleteApiKeyAPI({ id })

    if (res.success) {
      ms.success('删除成功')
      await getApiKeysList()
    } else {
      ms.error(res.message || '删除失败')
    }
  } catch (error) {
    console.error('删除 API Key 失败:', error)
    ms.error('删除失败')
  } finally {
    loading.value = false
  }
}

// 复制到剪贴板
async function copyToClipboard(text: string, isMasked = false) {
  try {
    await navigator.clipboard.writeText(text)
    if (isMasked) {
      ms.warning('已复制脱敏Key（仅供识别），完整Key仅在创建时显示')
    } else {
      ms.success('已复制到剪贴板')
    }
  } catch (error) {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      if (isMasked) {
        ms.warning('已复制脱敏Key（仅供识别），完整Key仅在创建时显示')
      } else {
        ms.success('已复制到剪贴板')
      }
    } catch (err) {
      ms.error('复制失败，请手动复制')
    }
    document.body.removeChild(textarea)
  }
}

// 格式化时间
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '未使用'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-CN')
}

// 打开创建对话框
function openCreateDialog() {
  newKeyName.value = ''
  createdKey.value = ''
  showCreateDialog.value = true
}

// 监听 visible 变化
watch(
  () => props.visible,
  isVisible => {
    if (isVisible && checkLoginStatus()) {
      getApiKeysList()
      getAvailableModels()
    }
  }
)

onMounted(() => {
  if (props.visible && checkLoginStatus()) {
    getApiKeysList()
    getAvailableModels()
  }
})
</script>

<template>
  <div class="w-full">
    <!-- 主内容区 -->
    <div class="overflow-y-auto custom-scrollbar p-1" :class="{ 'max-h-[70vh]': !isMobile }">
      <!-- API Keys 管理卡片 -->
      <div
        class="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <!-- 标题栏 -->
        <div
          class="flex justify-between items-center mb-4 pb-2 border-b border-gray-200 dark:border-gray-700"
        >
          <div class="flex items-center">
            <Key theme="outline" size="20" class="text-primary-600 mr-2" />
            <span class="text-base font-semibold text-gray-900 dark:text-gray-100">
              API Keys 管理
            </span>
          </div>
          <button @click="getApiKeysList" class="btn-icon btn-sm" title="刷新列表">
            <Refresh theme="outline" size="18" />
          </button>
        </div>

        <!-- 说明文字 -->
        <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            <strong>API Key 使用说明：</strong>
          </p>
          <ul class="text-xs text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
            <li>API Key 用于调用 OpenAI 兼容接口</li>
            <li>请求地址：<code class="bg-gray-200 dark:bg-gray-800 px-1 rounded"
              >{{ apiUrl }}/api/v1/chat/completions</code>
          </li>
            <li>认证方式：<code class="bg-gray-200 dark:bg-gray-800 px-1 rounded">Authorization: Bearer sk-xxxxx</code>
          </li>
            <li>最多可创建 5 个 API Key,完整Key仅在创建时显示,请妥善保管.如key丢失请新建.</li>
          </ul>
        </div>

        <!-- 创建按钮 -->
        <div class="mb-4">
          <button @click="openCreateDialog" class="btn btn-primary btn-sm">
            <Plus theme="outline" size="16" class="mr-1" />
            创建新的 API Key
          </button>
        </div>

        <!-- API Keys 列表 -->
        <div v-if="loading && apiKeysList.length === 0" class="text-center py-8">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-primary-400 mx-auto"
          ></div>
          <p class="text-gray-500 dark:text-gray-400 mt-2">加载中...</p>
        </div>

        <div v-else-if="apiKeysList.length === 0" class="text-center py-8">
          <Key theme="outline" size="48" class="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p class="text-gray-500 dark:text-gray-400">暂无 API Key，请点击上方按钮创建</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="item in apiKeysList"
            :key="item.id"
            class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1 min-w-0">
                <div class="flex items-center mb-2">
                  <span class="font-medium text-gray-900 dark:text-gray-100 mr-2">
                    {{ item.name || '未命名 Key' }}
                  </span>
                  <span
                    v-if="item.isActive"
                    class="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded"
                  >
                    启用
                  </span>
                  <span
                    v-else
                    class="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded"
                  >
                    禁用
                  </span>
                  <!-- 切换按钮 -->
                  <button
                    @click="toggleApiKeyStatus(item.id, item.isActive)"
                    class="ml-2 px-2 py-0.5 text-xs rounded border transition-colors"
                    :class="item.isActive
                      ? 'border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20'
                      : 'border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20'"
                    :title="item.isActive ? '点击停用' : '点击启用'"
                  >
                    {{ item.isActive ? '停用' : '启用' }}
                  </button>
                </div>
                <div class="space-y-1 text-sm">
                  <div class="flex items-center">
                    <code class="flex-1 text-xs bg-white dark:bg-gray-900 px-2 py-1 rounded border border-gray-200 dark:border-gray-600 font-mono break-all">
                      {{ item.apiKey }}
                    </code>
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    创建时间：{{ formatDate(item.createdAt) }} |
                    使用次数：{{ item.totalRequests }} |
                    最后使用：{{ formatDate(item.lastUsedAt) }}
                  </div>
                </div>
              </div>
              <button
                @click="deleteApiKey(item.id, item.name || '未命名 Key')"
                class="btn-icon btn-sm text-red-500 hover:text-red-600"
                title="删除"
              >
                <Delete theme="outline" size="16" />
              </button>
            </div>
          </div>
        </div>

        <!-- 分页信息 -->
        <div v-if="total > pageSize" class="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          共 {{ total }} 个 API Key，当前第 {{ currentPage }} 页
        </div>

        <!-- 可用模型列表 -->
        <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div class="flex items-center mb-3">
            <span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
              🤖 可用模型列表（点击模型名称复制）
            </span>
          </div>

          <div v-if="modelsLoading" class="text-center py-4">
            <div
              class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 dark:border-primary-400 mx-auto"
            ></div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">加载中...</p>
          </div>

          <div v-else-if="availableModels.length === 0" class="text-center py-4">
            <p class="text-xs text-gray-500 dark:text-gray-400">暂无可用模型</p>
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              v-for="model in availableModels"
              :key="model.id"
              class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-700 transition-colors"
            >
              <div class="flex-1 min-w-0">
                <code
                  @click="copyToClipboard(model.model)"
                  class="text-xs font-mono text-gray-900 dark:text-gray-100 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 truncate"
                  :title="`点击复制: ${model.model}`"
                >
                  {{ model.model }}
                </code>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {{ model.modelName || model.model }}
                </p>
              </div>
              <button
                @click="copyToClipboard(model.model)"
                class="btn-icon btn-sm ml-2 flex-shrink-0"
                title="复制模型名称"
              >
                <Copy theme="outline" size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建 API Key 对话框 -->
    <div v-if="showCreateDialog" class="fixed inset-0 z-[10000] flex items-center justify-center bg-gray-900 bg-opacity-50">
      <div class="bg-white dark:bg-gray-750 rounded-lg shadow-lg p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          创建新的 API Key
        </h3>

        <!-- 创建成功显示 -->
        <div v-if="createdKey">
          <div class="mb-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p class="text-sm text-green-800 dark:text-green-200 mb-2">
              ✓ API Key 创建成功！
            </p>
            <div class="flex items-center">
              <code class="flex-1 text-xs bg-white dark:bg-gray-900 px-3 py-2 rounded border border-green-200 dark:border-green-800 font-mono break-all text-green-700 dark:text-green-300">
                {{ createdKey }}
              </code>
              <button
                @click="copyToClipboard(createdKey)"
                class="btn-icon btn-sm ml-2 text-green-600 dark:text-green-400"
                title="复制"
              >
                <Copy theme="outline" size="18" />
              </button>
            </div>
            <p class="text-xs text-green-700 dark:text-green-300 mt-2">
              请立即复制保存，关闭后将无法再次查看完整 Key
            </p>
          </div>
          <button @click="showCreateDialog = false" class="btn btn-primary btn-md w-full">
            我已保存
          </button>
        </div>

        <!-- 创建表单 -->
        <div v-else>
          <div class="mb-4">
            <label class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              API Key 名称 <span class="text-red-500">*</span>
            </label>
            <input
              v-model="newKeyName"
              type="text"
              class="input input-md w-full"
              placeholder="例如：飞书多维表、测试环境等"
              maxlength="50"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              给 API Key 起个名字，方便后续管理
            </p>
          </div>

          <div class="flex space-x-3">
            <button
              @click="showCreateDialog = false"
              class="btn btn-secondary btn-md flex-1"
            >
              取消
            </button>
            <button
              @click="createApiKey"
              class="btn btn-primary btn-md flex-1"
              :disabled="isCreating || !newKeyName.trim()"
            >
              <span v-if="isCreating">创建中...</span>
              <span v-else>确认创建</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(155, 155, 155, 0.5);
  border-radius: 20px;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(100, 100, 100, 0.5);
}

.dark .custom-scrollbar {
  scrollbar-color: rgba(100, 100, 100, 0.5) transparent;
}
</style>
