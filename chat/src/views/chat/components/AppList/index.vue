<script setup lang="ts">
import { fetchCollectAppAPI, fetchQueryAppCatsAPI, fetchQueryAppsAPI } from '@/api/appStore'
// import { fetchQueryMenuAPI } from '@/api/config';
import type { ResData } from '@/api/types'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useAppCatStore, useAuthStoreWithout, useChatStore, useGlobalStoreWithOut } from '@/store'
import { DIALOG_TABS } from '@/store/modules/global'
import { message } from '@/utils/message'
import { Left, Right, Search, Star, VipOne } from '@icon-park/vue-next'
import PinyinMatch from 'pinyin-match'
import { computed, inject, onMounted, ref, watch } from 'vue'
import WorkflowConfigModal from '@/components/WorkflowConfigModal/index.vue'

// 接口定义
interface FormField {
  id: string
  type: 'input' | 'select' | 'file' | 'image'
  title: string
  placeholder: string
  options?: string[]
  isVariable?: boolean
  variableName?: string
  required?: boolean
}

interface App {
  id: number
  name: string
  des: string
  coverImg: string
  catId: string
  appCount: number
  demoData: string
  loading?: boolean
  createdAt: string
  updatedAt: string
  catName?: string
  backgroundImg?: string
  prompt?: string
  appType?: number
}

interface AppCat {
  id: number
  name: string
  coverImg: string
  des: string
  isMember?: number
}

const authStore = useAuthStoreWithout()
const userBalance = computed(() => authStore.userBalance)

const { isMobile } = useBasicLayout()
const useGlobalStore = useGlobalStoreWithOut()

const ms = message()
const appCatStore = useAppCatStore()
const keyword = ref('')
const chatStore = useChatStore()

const catId = computed(() => appCatStore.catId)
const appList = ref<App[]>([])
const activeList = ref<App[]>([])
const mineApps = computed(() => appCatStore.mineApps)
const catList = ref<AppCat[]>([])
const activeCatId = ref(0)

// 从chatBase inject弹窗相关方法
const showAppConfigModal = inject('showAppConfigModal') as
  | ((app: any, formSchema: FormField[]) => void)
  | undefined
const tryParseJson = inject('tryParseJson') as
  | ((jsonString: string | undefined | null) => FormField[] | null)
  | undefined

// 工作流配置弹窗状态
const showWorkflowModal = ref(false)
const currentWorkflowApp = ref<App | null>(null)
const workflowFormSchema = ref<FormField[]>([])

// Define emits
const emit = defineEmits(['run-app', 'show-member-dialog', 'run-app-with-data'])

function isMineApp(app: App): boolean {
  return mineApps.value.some((item: any) => item.appId === app.id)
}

async function queryApps() {
  const res: ResData = await fetchQueryAppsAPI()
  appList.value = res?.data?.rows.map((item: App) => {
    item.loading = false
    return item
  })
  activeList.value = appList.value
}

const list = computed(() => {
  if (keyword.value) {
    const keywordLower = keyword.value.toLowerCase()
    return appList.value.filter(item => PinyinMatch.match(item.name, keywordLower))
  }
  if (activeCatId.value === 0) return appList.value

  return appList.value.filter(item => {
    if (!item.catId) return false
    const catIds = item.catId.split(',').map(id => Number(id.trim()))
    return catIds.includes(activeCatId.value)
  })
})

async function handleCollect(app: App) {
  app.loading = true
  try {
    const res: ResData = await fetchCollectAppAPI({ appId: app.id })
    ms.success(res.data)
    await appCatStore.queryMineApps()
    app.loading = false
  } catch (error) {
    app.loading = false
  }
}

async function handleRunApp(app: App) {
  const appIdAsNumber = Number(app.id)

  const appCats = app.catName?.split(',').map(cat => cat.trim()) || []
  const isMemberApp = appCats.some(catName => isMemberCategory(catName))

  if (isMemberApp) {
    const isMember =
      (userBalance.value as any).packageId > 0 ||
      (userBalance.value.expirationTime && new Date(userBalance.value.expirationTime) > new Date())

    if (!isMember) {
      ms.info('当前应用是会员专属应用，请开通会员后使用！')
      if (isMobile.value) {
        useGlobalStore.settingsActiveTab = DIALOG_TABS.MEMBER
        useGlobalStore.updateMobileSettingsDialog(true)
      } else {
        useGlobalStore.updateSettingsDialog(true, DIALOG_TABS.MEMBER)
      }
      return
    }
  }

  // 优先检查是否是工作流应用
  if (isWorkflowApp(app)) {
    console.log('检测到工作流应用:', app.name, 'appType:', app.appType)

    // 解析配置模板
    const formSchema = tryParseJson ? tryParseJson(app.prompt) : null

    // 工作流应用必须有配置模板
    if (formSchema && formSchema.length > 0) {
      console.log('显示工作流配置弹窗，表单字段:', formSchema)
      currentWorkflowApp.value = app
      workflowFormSchema.value = formSchema
      showWorkflowModal.value = true
      return
    } else if (formSchema && formSchema.length === 0) {
      // 无需配置的工作流，直接运行
      console.log('工作流无需配置，直接运行')
      emit('run-app', app)
      return
    } else {
      // 工作流应用但没有配置模板，提示管理员
      ms.warning('此工作流应用配置不完整，请联系管理员')
      return
    }
  }

  // 检查是否有配置弹窗功能（智能体应用）
  console.log('=== AppList应用启动调试 ===')
  console.log('点击的应用数据:', app)
  console.log('应用prompt字段:', app.prompt)
  console.log(
    '弹窗方法可用性 - tryParseJson:',
    !!tryParseJson,
    'showAppConfigModal:',
    !!showAppConfigModal
  )

  if (tryParseJson && showAppConfigModal) {
    const formSchema = tryParseJson(app.prompt)
    console.log('AppList解析的表单结构:', formSchema)

    if (formSchema) {
      // 显示配置弹窗
      console.log('AppList即将显示配置弹窗')
      showAppConfigModal(app, formSchema)
      return
    }
  }

  // 如果没有配置或没有inject到方法，直接运行应用
  console.log('AppList直接运行应用，没有配置弹窗')
  emit('run-app', app)
}

// 处理工作流配置提交
function handleWorkflowSubmit(data: Record<string, string | File>) {
  console.log('[工作流调试-AppList] handleWorkflowSubmit 开始')
  console.log('[工作流调试-AppList] 接收到的原始data keys:', Object.keys(data))
  console.log('[工作流调试-AppList] 接收到的原始data:', data)
  console.log('[工作流调试-AppList] workflowFormSchema:', workflowFormSchema.value)

  // ⚠️ 修复：WorkflowConfigModal 传递的 data 参数实际上包含了 { schema, data } 结构
  // 需要提取真正的用户填写数据
  let actualFormData: Record<string, string | File>
  if ('schema' in data && 'data' in data) {
    // 新格式：data 包含 { schema, data }
    actualFormData = (data as any).data
    console.log('[工作流调试-AppList] 检测到嵌套格式，提取 actualFormData:', actualFormData)
  } else {
    // 旧格式：data 直接是表单数据
    actualFormData = data
    console.log('[工作流调试-AppList] 使用直接格式')
  }

  console.log('[工作流调试-AppList] 最终使用的formData keys:', Object.keys(actualFormData))
  console.log('[工作流调试-AppList] 最终使用的formData:', actualFormData)

  const configData = {
    schema: workflowFormSchema.value, // 添加 schema 信息
    data: actualFormData, // 用户填写的数据
  }
  console.log('[工作流调试-AppList] 发送的完整config:', JSON.stringify(configData, null, 2))

  // 关闭弹窗
  showWorkflowModal.value = false

  // 发送运行事件，附带配置数据（包含 schema）
  emit('run-app-with-data', {
    app: currentWorkflowApp.value,
    config: configData,
  })

  // 重置状态
  currentWorkflowApp.value = null
  workflowFormSchema.value = []
}

// 关闭工作流弹窗
function handleWorkflowClose() {
  showWorkflowModal.value = false
  currentWorkflowApp.value = null
  workflowFormSchema.value = []
}

async function queryCats() {
  const res: ResData = await fetchQueryAppCatsAPI()
  const defaultCat = {
    id: 0,
    name: t('app.allCategories'),
    coverImg: '',
    des: '',
  }
  catList.value = [defaultCat, ...res?.data?.rows]
}

function handleChangeCatId(id: number) {
  activeCatId.value = id
}

watch(catId, val => {
  if (!val) activeList.value = appList.value
  else {
    activeList.value = appList.value.filter(item => {
      if (!item.catId) return false
      const catIds = item.catId.split(',').map(id => Number(id.trim()))
      return catIds.includes(Number(val))
    })
  }
})

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

const scrollContainer = ref<HTMLElement | null>(null)

function scrollLeft() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: -100, behavior: 'smooth' })
  }
}

function scrollRight() {
  if (scrollContainer.value) {
    scrollContainer.value.scrollBy({ left: 100, behavior: 'smooth' })
  }
}

function handleClickCategoryTag(catName: string) {
  const category = catList.value.find(cat => cat.name === catName)
  if (category) {
    handleChangeCatId(category.id)
    if (isMobile.value && scrollContainer.value) {
      scrollContainer.value.scrollIntoView({ behavior: 'smooth' })
    }
  }
}

function isMemberCategory(catName: string): boolean {
  const category = catList.value.find(cat => cat.name === catName)
  return category ? category.isMember === 1 : false
}

function getWorkflowTypeName(appType: number): string {
  const typeMap: Record<number, string> = {
    0: '',
    1: 'FastGPT',
    2: 'Dify',
    3: 'n8n',
  }
  return typeMap[appType] || ''
}

function isWorkflowApp(app: App): boolean {
  return (app.appType || 0) > 0
}

onMounted(() => {
  queryCats()
  queryApps()
})
</script>

<template>
  <!-- 应用列表 -->
  <div
    class="bg-white dark:bg-gray-900 flex flex-col h-full w-full"
    :class="[isMobile ? 'px-2 py-2' : 'pb-3']"
  >
    <div
      class="flex justify-between items-center mb-2 flex-shrink-0 mx-auto w-full"
      :class="[isMobile ? 'w-full' : 'px-20']"
    >
      <Left
        v-if="!isMobile"
        size="20"
        class="btn-icon btn-md flex-shrink-0 mr-1"
        @click="scrollLeft"
      />

      <div v-if="!isMobile" class="relative flex-grow mx-1 overflow-hidden" style="max-width: 65%">
        <div
          ref="scrollContainer"
          class="flex items-center overflow-x-auto w-full scrollbar-hide"
          style="margin: auto; scrollbar-width: none; -ms-overflow-style: none"
        >
          <div
            v-for="(item, index) in catList"
            :key="index"
            @click="handleChangeCatId(item.id)"
            class="btn-pill btn-md flex-none mx-1"
            :class="{ 'btn-pill-active': activeCatId === item.id }"
          >
            <span>{{ item.name }}</span>
            <span v-if="item.isMember === 1" class="ml-1 text-yellow-500 inline-flex items-center">
              <VipOne size="14" />
            </span>
          </div>
        </div>
      </div>
      <Right
        v-if="!isMobile"
        size="20"
        class="btn-icon btn-md flex-shrink-0 mx-1"
        @click="scrollRight"
      />
      <div class="ml-1 flex relative" :class="[isMobile ? 'w-full mr-2' : 'w-[35%]']">
        <div class="relative flex flex-1 w-full items-center">
          <label for="app-search-field" class="sr-only">
            {{ t('app.searchAppNameQuickFind') }}
          </label>
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search theme="outline" size="18" class="text-gray-400" />
          </div>
          <input
            id="app-search-field"
            v-model="keyword"
            class="input input-md w-full pl-10"
            :placeholder="t('app.searchAppNameQuickFind')"
            type="search"
            name="app-search"
          />
        </div>
      </div>
    </div>

    <div
      v-if="isMobile"
      class="flex justify-between items-center flex-shrink-0"
      style="max-width: 100%"
    >
      <div
        ref="scrollContainer"
        class="flex items-center overflow-x-auto scrollbar-hide"
        style="scrollbar-width: none; -ms-overflow-style: none"
      >
        <div
          v-for="(item, index) in catList"
          :key="index"
          @click="handleChangeCatId(item.id)"
          class="btn-pill flex-none mx-1"
          :class="{ 'btn-pill-active': activeCatId === item.id }"
        >
          <span>{{ item.name }}</span>
          <span v-if="item.isMember === 1" class="ml-1 text-yellow-500 inline-flex items-center">
            <VipOne size="14" />
          </span>
        </div>
      </div>
    </div>

    <div class="w-full flex-grow items-start overflow-hidden">
      <transition-group
        name="list"
        tag="div"
        class="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar grid p-1 mt-4 pb-5"
        :class="[
          isMobile
            ? 'grid-cols-1 gap-2'
            : ' grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 mx-auto px-20',
        ]"
        style="align-content: start"
      >
        <div
          v-for="item in list"
          :key="item.id"
          @click="handleRunApp(item)"
          class="group cursor-pointer flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-200 bg-gray-50 dark:bg-gray-750 ring-1 ring-gray-100 dark:ring-gray-750 hover:shadow-md"
          style="min-height: 7rem"
        >
          <div v-if="item.coverImg" class="flex-shrink-0">
            <img :src="item.coverImg" class="rounded-full w-12 h-12 shadow-sm" alt="app-image" />
          </div>
          <div
            v-else
            :class="[
              bgRandomColor(),
              'flex-shrink-0 rounded-full w-12 h-12 flex items-center justify-center shadow-sm',
            ]"
          >
            <span class="text-white text-lg font-semibold tracking-wider">{{
              item.name.slice(0, 1)
            }}</span>
          </div>
          <div class="flex-grow flex flex-col overflow-hidden">
            <div
              class="flex items-center justify-between font-semibold text-sm text-gray-800 dark:text-gray-200 mb-0.5"
            >
              <div class="flex items-center gap-2 flex-grow mr-2">
                <span class="line-clamp-1 overflow-hidden text-ellipsis block whitespace-nowrap">
                  {{ item.name }}
                </span>
                <!-- 工作流类型标识 -->
                <span
                  v-if="isWorkflowApp(item)"
                  class="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300 flex-shrink-0"
                >
                  {{ getWorkflowTypeName(item.appType || 0) }}
                </span>
              </div>
              <Star
                :theme="isMineApp(item) ? 'filled' : 'outline'"
                size="16"
                :fill="isMineApp(item) ? '#facc15' : 'currentColor'"
                class="btn-icon-action cursor-pointer flex-shrink-0 group-hover:text-yellow-400 dark:group-hover:text-yellow-500"
                @click.stop="handleCollect(item)"
              />
            </div>

            <!-- Display category names -->
            <div
              v-if="item.catName"
              class="flex flex-nowrap items-center mb-1.5 overflow-x-auto scrollbar-hide"
              style="gap: 4px"
            >
              <span
                v-for="(catName, index) in item.catName.split(',')"
                :key="index"
                class="text-xs px-2 py-0.5 border rounded-md cursor-pointer flex items-center whitespace-nowrap transition-colors duration-150 bg-white border-gray-100 text-gray-500 hover:bg-primary-50 hover:text-primary-600 dark:bg-gray-700 dark:border-gray-750 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-300"
                @click.stop="handleClickCategoryTag(catName.trim())"
              >
                <span>{{ catName.trim() }}</span>
                <span
                  v-if="isMemberCategory(catName.trim())"
                  class="ml-0.5 text-yellow-500 inline-flex items-center"
                  ><VipOne size="12"
                /></span>
              </span>
            </div>

            <span class="text-xs line-clamp-2 text-gray-500/90 dark:text-gray-400/80">
              {{ item.des }}
            </span>
          </div>
        </div>
      </transition-group>
    </div>

    <!-- 工作流配置弹窗 -->
    <WorkflowConfigModal
      v-if="showWorkflowModal && currentWorkflowApp"
      :app="currentWorkflowApp"
      :formSchema="workflowFormSchema"
      @submit="handleWorkflowSubmit"
      @close="handleWorkflowClose"
    />
  </div>
</template>

<style scoped>
/* Hide scrollbar for Chrome, Safari and Opera */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Hide scrollbar for IE, Edge and Firefox */
.scrollbar-hide {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
</style>
