<script setup lang="ts">
import {
  fetchExecuteOfficeToolAPI,
  fetchQueryOfficeToolCatsAPI,
  fetchQueryOfficeToolsAPI,
} from '@/api/officeTools'
import type { ResData } from '@/api/types'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useChatStore, useGlobalStoreWithOut } from '@/store'
import { message } from '@/utils/message'
import { Search } from '@icon-park/vue-next'
import { computed, onMounted, reactive, ref } from 'vue'

const emit = defineEmits(['close', 'run-tool'])

const { isMobile } = useBasicLayout()
const globalStore = useGlobalStoreWithOut()
const chatStore = useChatStore()
const ms = message()

// 数据状态
const keyword = ref('')
const catList = ref<any[]>([])
const toolList = ref<any[]>([])
const activeCatId = ref(0)
const loading = ref(false)

// 执行面板状态
const showExecutePanel = ref(false)
const currentTool = ref<any>(null)
const inputSchema = ref<any>({ fields: [] })
const inputValues = reactive<Record<string, any>>({})
const executing = ref(false)
const executeResult = ref('')

// 过滤后的工具列表
const filteredTools = computed(() => {
  let list = toolList.value
  if (activeCatId.value > 0) {
    list = list.filter((t: any) => {
      const catIds = t.catId?.split(',').map(Number) || []
      return catIds.includes(activeCatId.value)
    })
  }
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter((t: any) => t.name?.toLowerCase().includes(kw))
  }
  return list
})

// 查询分类
async function queryCategories() {
  try {
    const res: ResData = await fetchQueryOfficeToolCatsAPI()
    catList.value = res?.data?.rows || []
  } catch (error) {
    catList.value = []
  }
  // fallback mock
  if (catList.value.length === 0) {
    catList.value = [
      { id: 1, name: '保单管理' },
      { id: 2, name: '文档解析' },
      { id: 3, name: '数据报表' },
    ]
  }
}

// 查询工具列表
async function queryTools() {
  try {
    loading.value = true
    const res: ResData = await fetchQueryOfficeToolsAPI()
    toolList.value = res?.data?.rows || []
    loading.value = false
  } catch (error) {
    loading.value = false
  }
  // fallback mock
  if (toolList.value.length === 0) {
    toolList.value = [
      {
        id: 1,
        name: '保单信息查询',
        des: '快速查询保单详细信息、缴费记录、保障内容等',
        catId: '1',
        inputSchema: {
          fields: [
            { id: 'policyNo', type: 'input', title: '保单号', placeholder: '请输入保单号', required: true },
          ],
        },
      },
      {
        id: 2,
        name: '分红实现率计算',
        des: '计算历史分红实现率，评估保单收益情况',
        catId: '1',
        inputSchema: {
          fields: [
            { id: 'policyNo', type: 'input', title: '保单号', placeholder: '请输入保单号', required: true },
            { id: 'year', type: 'select', title: '查询年份', placeholder: '请选择年份', options: ['2023', '2024', '2025'], required: false },
          ],
        },
      },
      {
        id: 3,
        name: 'PDF 文档解析',
        des: '上传 PDF 文档，自动提取关键信息并生成摘要',
        catId: '2',
        inputSchema: {
          fields: [
            { id: 'file', type: 'file', title: '上传文件', placeholder: '请选择PDF文件', required: true },
          ],
        },
      },
      {
        id: 4,
        name: 'Excel 数据透视',
        des: '上传 Excel 文件，智能生成数据透视分析',
        catId: '3',
        inputSchema: {
          fields: [
            { id: 'file', type: 'file', title: '上传文件', placeholder: '请选择Excel文件', required: true },
            { id: 'dimension', type: 'input', title: '分析维度', placeholder: '例如：按月份、按地区', required: false },
          ],
        },
      },
    ]
  }
}

function handleSelectCategory(catId: number) {
  activeCatId.value = catId
}

async function handleSelectTool(tool: any) {
  currentTool.value = tool
  executeResult.value = ''
  Object.keys(inputValues).forEach(key => delete inputValues[key])

  if (tool.inputSchema?.fields?.length > 0) {
    inputSchema.value = tool.inputSchema
    tool.inputSchema.fields.forEach((field: any) => {
      if (field.defaultValue !== undefined) {
        inputValues[field.id] = field.defaultValue
      }
    })
    showExecutePanel.value = true
  } else {
    inputSchema.value = { fields: [] }
    showExecutePanel.value = true
  }
}

function handleBackToList() {
  showExecutePanel.value = false
  currentTool.value = null
  executeResult.value = ''
}

async function handleExecute() {
  if (!currentTool.value) return

  const requiredFields = inputSchema.value.fields?.filter((f: any) => f.required) || []
  for (const field of requiredFields) {
    if (!inputValues[field.id] || inputValues[field.id].toString().trim() === '') {
      ms.warning(`请填写 ${field.title}`)
      return
    }
  }

  executing.value = true
  executeResult.value = ''

  try {
    const res: ResData = await fetchExecuteOfficeToolAPI({
      toolId: currentTool.value.id,
      inputParams: { ...inputValues },
      groupId: chatStore.activeGroupId,
    })

    if (res.data?.content) {
      executeResult.value = res.data.content
    } else if (typeof res.data === 'string') {
      executeResult.value = res.data
    } else {
      executeResult.value = JSON.stringify(res.data, null, 2)
    }

    ms.success('执行成功')
  } catch (error: any) {
    ms.error(error.message || '执行失败')
  } finally {
    executing.value = false
  }
}

function handleInsertToChat() {
  if (!executeResult.value) return
  emit('run-tool', {
    tool: currentTool.value,
    result: executeResult.value,
  })
  handleBackToList()
  emit('close')
}

function handleClose() {
  showExecutePanel.value = false
  currentTool.value = null
  emit('close')
}

function bgRandomColor() {
  const hues = [
    'bg-blue-300',
    'bg-red-300',
    'bg-green-300',
    'bg-yellow-300',
    'bg-purple-300',
    'bg-pink-300',
  ]
  return hues[Math.floor(Math.random() * hues.length)]
}

onMounted(() => {
  queryCategories()
  queryTools()
})
</script>

<template>
  <div class="flex flex-col h-full w-full bg-white dark:bg-gray-900">
    <!-- 头部 -->
    <div
      class="flex justify-between items-center mb-2 flex-shrink-0 mx-auto w-full"
      :class="[isMobile ? 'w-full px-2 py-2' : 'px-20 pt-4 pb-2']"
    >
      <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100">
        {{ showExecutePanel ? currentTool?.name : '办公神器' }}
      </h2>
      <div class="flex items-center gap-2">
        <button
          v-if="showExecutePanel"
          class="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200"
          @click="handleBackToList"
        >
          返回列表
        </button>
        <button
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          @click="handleClose"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- 工具列表视图 -->
    <div v-if="!showExecutePanel" class="flex-1 flex flex-col overflow-hidden">
      <!-- 搜索和分类 -->
      <div
        class="flex justify-between items-center mb-2 flex-shrink-0 mx-auto w-full"
        :class="[isMobile ? 'w-full px-2' : 'px-20']"
      >
        <div
          v-if="!isMobile"
          class="relative flex-grow mx-1 overflow-hidden"
          style="max-width: 65%"
        >
          <div class="flex items-center overflow-x-auto w-full scrollbar-hide">
            <div
              class="btn-pill btn-md flex-none mx-1"
              :class="{ 'btn-pill-active': activeCatId === 0 }"
              @click="handleSelectCategory(0)"
            >
              <span>全部</span>
            </div>
            <div
              v-for="cat in catList"
              :key="cat.id"
              class="btn-pill btn-md flex-none mx-1"
              :class="{ 'btn-pill-active': activeCatId === cat.id }"
              @click="handleSelectCategory(cat.id)"
            >
              <span>{{ cat.name }}</span>
            </div>
          </div>
        </div>
        <div class="ml-1 flex relative" :class="[isMobile ? 'w-full mr-2' : 'w-[35%]']">
          <div class="relative flex flex-1 w-full items-center">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search theme="outline" size="18" class="text-gray-400" />
            </div>
            <input
              v-model="keyword"
              class="input input-md w-full pl-10"
              placeholder="搜索办公工具..."
              type="search"
            />
          </div>
        </div>
      </div>

      <!-- 移动端分类 -->
      <div v-if="isMobile" class="flex justify-between items-center flex-shrink-0 px-2">
        <div class="flex items-center overflow-x-auto scrollbar-hide">
          <div
            class="btn-pill flex-none mx-1"
            :class="{ 'btn-pill-active': activeCatId === 0 }"
            @click="handleSelectCategory(0)"
          >
            <span>全部</span>
          </div>
          <div
            v-for="cat in catList"
            :key="cat.id"
            class="btn-pill flex-none mx-1"
            :class="{ 'btn-pill-active': activeCatId === cat.id }"
            @click="handleSelectCategory(cat.id)"
          >
            <span>{{ cat.name }}</span>
          </div>
        </div>
      </div>

      <!-- 工具卡片网格 -->
      <div class="w-full flex-grow items-start overflow-hidden">
        <div
          class="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar grid p-1 mt-4 pb-5"
          :class="[
            isMobile
              ? 'grid-cols-1 gap-2 px-2'
              : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mx-auto px-20',
          ]"
          style="align-content: start"
        >
          <div v-if="loading" class="flex justify-center py-10 col-span-full">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
          <div
            v-else-if="filteredTools.length === 0"
            class="text-center py-10 text-gray-500 dark:text-gray-400 col-span-full"
          >
            暂无办公工具
          </div>
          <div
            v-for="tool in filteredTools"
            :key="tool.id"
            @click="handleSelectTool(tool)"
            class="group cursor-pointer flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-200 bg-gray-50 dark:bg-gray-750 ring-1 ring-gray-100 dark:ring-gray-750 hover:shadow-md"
            style="min-height: 7rem"
          >
            <div v-if="tool.coverImg" class="flex-shrink-0">
              <img
                :src="tool.coverImg"
                class="rounded-full w-12 h-12 shadow-sm"
                alt="tool-image"
              />
            </div>
            <div
              v-else
              :class="[
                bgRandomColor(),
                'flex-shrink-0 rounded-full w-12 h-12 flex items-center justify-center shadow-sm',
              ]"
            >
              <span class="text-white text-lg font-semibold tracking-wider">
                {{ tool.name?.slice(0, 1) }}
              </span>
            </div>
            <div class="flex-grow flex flex-col overflow-hidden">
              <div
                class="flex items-center justify-between font-semibold text-sm text-gray-800 dark:text-gray-200 mb-0.5"
              >
                <span class="line-clamp-1 overflow-hidden text-ellipsis block whitespace-nowrap">
                  {{ tool.name }}
                </span>
              </div>
              <span class="text-xs line-clamp-2 text-gray-500/90 dark:text-gray-400/80">
                {{ tool.des }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具执行面板 -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto p-4" :class="[isMobile ? '' : 'px-20']">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {{ currentTool?.description || currentTool?.des }}
        </p>

        <!-- 参数表单 -->
        <div v-if="inputSchema.fields?.length > 0" class="space-y-4">
          <div v-for="field in inputSchema.fields" :key="field.id">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {{ field.title }}
              <span v-if="field.required" class="text-red-500">*</span>
            </label>
            <input
              v-if="field.type === 'input'"
              v-model="inputValues[field.id]"
              type="text"
              :placeholder="field.placeholder"
              class="input input-md w-full"
            />
            <textarea
              v-else-if="field.type === 'textarea'"
              v-model="inputValues[field.id]"
              :placeholder="field.placeholder"
              rows="4"
              class="input input-md w-full resize-none"
            />
            <select
              v-else-if="field.type === 'select'"
              v-model="inputValues[field.id]"
              class="input input-md w-full"
            >
              <option value="">请选择</option>
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
            <input
              v-else-if="field.type === 'file'"
              type="file"
              @change="e => (inputValues[field.id] = (e.target as HTMLInputElement).files?.[0])"
              class="input input-md w-full"
            />
          </div>
        </div>

        <!-- 执行按钮 -->
        <button
          class="mt-6 w-full py-2.5 px-4 btn btn-primary btn-md flex items-center justify-center gap-2 disabled:opacity-50"
          :disabled="executing"
          @click="handleExecute"
        >
          <div
            v-if="executing"
            class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
          />
          {{ executing ? '执行中...' : '执行' }}
        </button>

        <!-- 执行结果 -->
        <div v-if="executeResult" class="mt-6">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">执行结果</h4>
            <button
              class="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
              @click="handleInsertToChat"
            >
              插入到对话
            </button>
          </div>
          <div class="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border dark:border-gray-700">
            <pre class="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">{{
              executeResult
            }}</pre>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
