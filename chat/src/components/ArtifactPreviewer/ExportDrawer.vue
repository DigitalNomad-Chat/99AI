<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Download } from '@icon-park/vue-next'
import type { Artifact } from '@/store/modules/artifact/helper'
import type { ExportFormat } from '@/utils/compiler/exporter'
import { exportArtifact, getRecommendedFilename, triggerDownload, type ExportConfig } from '@/utils/compiler/exporter'

interface Props {
  visible: boolean
  artifact: Artifact | null
}

interface Emits {
  (e: 'update:visible', visible: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 选中的格式
const selectedFormat = ref<ExportFormat>('zip')

// 文件名
const filename = ref('')

// 导出中状态
const isExporting = ref(false)

// 导出格式选项
const exportOptions: { value: ExportFormat; label: string; icon: string; description: string }[] = [
  {
    value: 'zip',
    label: 'ZIP 压缩包',
    icon: '📦',
    description: '所有文件的压缩包，适合保存完整项目',
  },
  {
    value: 'html',
    label: 'HTML 文件',
    icon: '📄',
    description: '单文件或自包含的 HTML',
  },
  {
    value: 'pdf',
    label: 'PDF 文档',
    icon: '📕',
    description: '适合打印和分享的 PDF 格式',
  },
  {
    value: 'png',
    label: 'PNG 图片',
    icon: '🖼️',
    description: '预览截图，高清晰度图片',
  },
]

// 推荐文件名
const recommendedFilename = computed(() => {
  if (!props.artifact) return ''
  return getRecommendedFilename(props.artifact, selectedFormat.value)
})

// 监听 artifact 变化，更新文件名
watch(() => props.artifact, (artifact) => {
  if (artifact && !filename.value) {
    filename.value = recommendedFilename.value
  }
}, { immediate: true })

/**
 * 执行导出
 */
async function handleExport() {
  if (!props.artifact || isExporting.value) return

  isExporting.value = true

  try {
    const config: ExportConfig = {
      format: selectedFormat.value,
      filename: filename.value || recommendedFilename.value,
    }

    const { blob, filename: finalFilename } = await exportArtifact(props.artifact, config)

    triggerDownload(blob, finalFilename)

    // 关闭抽屉
    emit('update:visible', false)
  } catch (error) {
    console.error('Export failed:', error)
    // TODO: 显示错误提示
  } finally {
    isExporting.value = false
  }
}

/**
 * 关闭抽屉
 */
function handleClose() {
  emit('update:visible', false)
}

/**
 * 选择格式时更新推荐文件名
 */
function handleFormatChange(format: ExportFormat) {
  selectedFormat.value = format
  if (props.artifact) {
    filename.value = getRecommendedFilename(props.artifact, format)
  }
}
</script>

<template>
  <teleport to="body">
    <!-- 遮罩层 -->
    <transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="props.visible"
        class="fixed inset-0 bg-black/50 z-50"
        @click="handleClose"
      ></div>
    </transition>

    <!-- 抽屉 -->
    <transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="props.visible"
        class="fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col export-drawer"
      >
        <!-- 标题 -->
        <div class="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <div class="flex items-center space-x-2">
            <Download size="18" class="text-gray-600 dark:text-gray-400" />
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">导出</span>
          </div>
          <button
            @click="handleClose"
            class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg
              class="w-4 h-4 text-gray-600 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <!-- 内容 -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <!-- 导出格式选择 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              导出格式
            </label>
            <div class="space-y-2">
              <button
                v-for="option in exportOptions"
                :key="option.value"
                class="w-full flex items-start space-x-3 p-3 rounded-lg border transition-colors text-left"
                :class="
                  selectedFormat === option.value
                    ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                "
                @click="handleFormatChange(option.value)"
              >
                <span class="text-xl">{{ option.icon }}</span>
                <div class="flex-1 min-w-0">
                  <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ option.label }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {{ option.description }}
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- 文件名输入 -->
          <div>
            <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              文件名
            </label>
            <input
              v-model="filename"
              type="text"
              class="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
              placeholder="输入文件名"
            />
          </div>

          <!-- 文件信息 -->
          <div v-if="props.artifact" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center space-x-2 mb-2">
              <span class="text-gray-500 dark:text-gray-400">📄</span>
              <span class="text-xs font-medium text-gray-700 dark:text-gray-300">
                {{ props.artifact.title }}
              </span>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ props.artifact.files.length }} 个文件
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        <div class="flex items-center space-x-2 p-4 border-t dark:border-gray-700">
          <button
            @click="handleClose"
            class="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            取消
          </button>
          <button
            @click="handleExport"
            :disabled="isExporting"
            class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {{ isExporting ? '导出中...' : '导出' }}
          </button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.export-drawer {
  max-width: calc(100vw - 16px);
}

.export-drawer button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
</style>
