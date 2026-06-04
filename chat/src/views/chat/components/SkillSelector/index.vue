<script setup lang="ts">
import {
  fetchExecuteSkillAPI,
  fetchQuerySkillCatsAPI,
  fetchQuerySkillsAPI,
  fetchSkillInputSchemaAPI,
} from '@/api/skills'
import type { ResData } from '@/api/types'
import { useChatStore, useGlobalStoreWithOut } from '@/store'
import { message } from '@/utils/message'
import { computed, onMounted, reactive, ref } from 'vue'

const emit = defineEmits(['close', 'run-skill'])

const chatStore = useChatStore()
const globalStore = useGlobalStoreWithOut()
const ms = message()

const keyword = ref('')
const catList = ref<any[]>([])
const skillList = ref<any[]>([])
const activeCatId = ref(0)
const loading = ref(false)

// 执行状态
const showExecutePanel = ref(false)
const currentSkill = ref<any>(null)
const inputSchema = ref<any>({ fields: [] })
const inputValues = reactive<Record<string, any>>({})
const executing = ref(false)
const executeResult = ref('')

const filteredSkills = computed(() => {
  let list = skillList.value
  if (activeCatId.value > 0) {
    list = list.filter(s => {
      const catIds = s.catId?.split(',').map(Number) || []
      return catIds.includes(activeCatId.value)
    })
  }
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(s => s.name.toLowerCase().includes(kw))
  }
  return list
})

async function queryCategories() {
  try {
    const res: ResData = await fetchQuerySkillCatsAPI()
    catList.value = res?.data?.rows || []
  } catch (error) {
    catList.value = []
  }
}

async function querySkills() {
  try {
    loading.value = true
    const res: ResData = await fetchQuerySkillsAPI()
    skillList.value = res?.data?.rows || []
    loading.value = false
  } catch (error) {
    loading.value = false
  }
}

function handleSelectCategory(catId: number) {
  activeCatId.value = catId
}

async function handleSelectSkill(skill: any) {
  currentSkill.value = skill
  executeResult.value = ''
  // 重置输入值
  Object.keys(inputValues).forEach(key => delete inputValues[key])

  try {
    const res: ResData = await fetchSkillInputSchemaAPI(skill.id)
    inputSchema.value = res?.data || { fields: [] }
    // 设置默认值
    inputSchema.value.fields?.forEach((field: any) => {
      if (field.defaultValue !== undefined) {
        inputValues[field.id] = field.defaultValue
      }
    })
  } catch (error) {
    inputSchema.value = { fields: [] }
  }
  showExecutePanel.value = true
}

function handleBackToList() {
  showExecutePanel.value = false
  currentSkill.value = null
  executeResult.value = ''
}

async function handleExecute() {
  if (!currentSkill.value) return

  // 验证必填项
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
    const res: ResData = await fetchExecuteSkillAPI({
      skillId: currentSkill.value.id,
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

    ms.success('技能执行成功')
  } catch (error: any) {
    ms.error(error.message || '执行失败')
  } finally {
    executing.value = false
  }
}

function handleInsertToChat() {
  if (!executeResult.value) return
  emit('run-skill', {
    skill: currentSkill.value,
    result: executeResult.value,
  })
  handleBackToList()
  emit('close')
}

function handleClose() {
  showExecutePanel.value = false
  currentSkill.value = null
  emit('close')
}

onMounted(() => {
  queryCategories()
  querySkills()
})
</script>

<template>
  <div class="skill-selector flex flex-col h-full bg-white dark:bg-gray-800">
    <!-- 头部 -->
    <div class="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
      <h3 class="text-lg font-semibold dark:text-gray-100">
        {{ showExecutePanel ? currentSkill?.name : '技能广场' }}
      </h3>
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

    <!-- 技能列表 -->
    <div v-if="!showExecutePanel" class="flex-1 flex flex-col overflow-hidden">
      <!-- 搜索和分类 -->
      <div class="px-4 py-3 border-b dark:border-gray-700">
        <div class="flex gap-2 mb-3 overflow-x-auto pb-1">
          <button
            class="px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors"
            :class="
              activeCatId === 0
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            "
            @click="handleSelectCategory(0)"
          >
            全部
          </button>
          <button
            v-for="cat in catList"
            :key="cat.id"
            class="px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors"
            :class="
              activeCatId === cat.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'
            "
            @click="handleSelectCategory(cat.id)"
          >
            {{ cat.name }}
          </button>
        </div>
        <div class="relative">
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索技能..."
            class="w-full px-4 py-2 text-sm rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      <!-- 技能卡片列表 -->
      <div class="flex-1 overflow-y-auto p-4">
        <div v-if="loading" class="flex justify-center py-10">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
        <div
          v-else-if="filteredSkills.length === 0"
          class="text-center py-10 text-gray-500 dark:text-gray-400"
        >
          暂无技能
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div
            v-for="skill in filteredSkills"
            :key="skill.id"
            class="group p-4 rounded-xl border dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer transition-all hover:shadow-md bg-white dark:bg-gray-800"
            @click="handleSelectSkill(skill)"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0"
              >
                <span class="text-lg">{{ skill.name?.charAt(0) }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {{ skill.name }}
                </h4>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {{ skill.description }}
                </p>
                <div class="flex items-center gap-2 mt-2">
                  <span
                    class="px-2 py-0.5 text-xs rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {{
                      skill.type === 'prompt'
                        ? 'Prompt'
                        : skill.type === 'agent'
                          ? 'Agent'
                          : skill.type === 'workflow'
                            ? '工作流'
                            : '代码'
                    }}
                  </span>
                  <span
                    v-if="skill.isBuiltIn"
                    class="px-2 py-0.5 text-xs rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                  >
                    内置
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 执行面板 -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto p-4">
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">{{ currentSkill?.description }}</p>

        <!-- 参数表单 -->
        <div class="space-y-4">
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
              class="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              v-else-if="field.type === 'textarea'"
              v-model="inputValues[field.id]"
              :placeholder="field.placeholder"
              rows="4"
              class="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <select
              v-else-if="field.type === 'select'"
              v-model="inputValues[field.id]"
              class="w-full px-3 py-2 text-sm rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">请选择</option>
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
        </div>

        <!-- 执行按钮 -->
        <button
          class="mt-6 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          :disabled="executing"
          @click="handleExecute"
        >
          <div
            v-if="executing"
            class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
          />
          {{ executing ? '执行中...' : '执行技能' }}
        </button>

        <!-- 执行结果 -->
        <div v-if="executeResult" class="mt-6">
          <div class="flex items-center justify-between mb-2">
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">执行结果</h4>
            <button
              class="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
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
