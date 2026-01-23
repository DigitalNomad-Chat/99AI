<script setup lang="ts">
import { useGlobalStoreWithOut } from '@/store'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { createReactPreview } from '@/utils/compiler/reactRuntime'
import { createVuePreview } from '@/utils/compiler/vueRuntime'
import { createMermaidPreview } from '@/utils/compiler/mermaidRuntime'
import { ChevronLeft, ChevronRight, Download } from '@icon-park/vue-next'
import FileTree from './FileTree.vue'
import ExportDrawer from './ExportDrawer.vue'
import type { VirtualFile } from '@/utils/compiler/virtualFS'

const globalStore = useGlobalStoreWithOut()
const iframeRef = ref<HTMLIFrameElement | null>(null)

// 文件树折叠状态
const isTreeCollapsed = ref(false)

// 导出抽屉状态
const showExportDrawer = ref(false)

// 当前内容
const currentContent = computed(() => globalStore.htmlContent)
const currentContentType = computed(() => globalStore.contentType)

// 当前 Artifact（用于导出）
const currentArtifact = computed(() => {
  if (!currentContent.value) return null
  return {
    id: 'current',
    title: `${currentContentType.value.toUpperCase()} 预览`,
    type: currentContentType.value,
    files: [
      {
        id: 'main',
        name: `main.${currentContentType.value === 'html' ? 'html' : currentContentType.value}`,
        type: currentContentType.value as any,
        content: currentContent.value,
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
})

// 是否可见
const isVisible = computed(
  () => globalStore.showHtmlPreviewer && globalStore.previewDisplayMode === 'sidebar'
)

// iframe sandbox 属性
const sandboxAttribute = computed(() => {
  const mode = globalStore.previewerConfig.sandboxMode
  if (mode === 'strict') {
    return 'allow-scripts allow-forms allow-same-origin'
  }
  return 'allow-scripts allow-forms allow-same-origin allow-popups allow-modals'
})

/**
 * 生成预览 HTML
 */
const generatePreviewHtml = (): string => {
  const content = currentContent.value
  const contentType = currentContentType.value

  if (!content) {
    return '<!DOCTYPE html><html><body><div style="padding:20px;color:#999">No content</div></body></html>'
  }

  switch (contentType) {
    case 'react': {
      return createReactPreview(content)
    }

    case 'vue': {
      return createVuePreview(content)
    }

    case 'mermaid': {
      return createMermaidPreview(content)
    }

    case 'html':
    case 'markmap':
    default:
      // HTML 和其他类型直接使用原始内容
      return content
  }
}

/**
 * 更新预览内容
 */
const updatePreview = () => {
  if (iframeRef.value && currentContent.value) {
    const previewHtml = generatePreviewHtml()
    iframeRef.value.srcdoc = previewHtml
  }
}

/**
 * 关闭侧边栏
 */
const handleClose = () => {
  globalStore.updateHtmlPreviewer(false)
  globalStore.setPreviewMode('sidebar')
}

/**
 * 切换到专注模式（全屏模态框）
 */
const switchToFocusMode = () => {
  globalStore.setPreviewMode('modal')
  // 确保 showHtmlPreviewer 保持 true，这样 HtmlDialog 会显示
  nextTick(() => {
    if (!globalStore.showHtmlPreviewer) {
      globalStore.updateHtmlPreviewer(true)
    }
  })
}

/**
 * 切换文件树折叠状态
 */
const toggleTree = () => {
  isTreeCollapsed.value = !isTreeCollapsed.value
}

/**
 * 处理文件选择
 */
const handleFileSelect = (file: VirtualFile) => {
  if (file.content !== undefined) {
    globalStore.updateHtmlContent(file.content, file.language || 'html')
  }
}

/**
 * 处理文件夹切换
 */
const handleToggleFolder = (file: VirtualFile) => {
  // FileTree 组件内部处理展开/折叠
  // 这里可以添加额外逻辑，如记录用户偏好
}

/**
 * 打开导出抽屉
 */
const openExportDrawer = () => {
  showExportDrawer.value = true
}

/**
 * 关闭导出抽屉
 */
const closeExportDrawer = () => {
  showExportDrawer.value = false
}

// 监听内容变化，更新预览
watch(
  () => [currentContent.value, isVisible.value],
  () => {
    if (isVisible.value) {
      nextTick(updatePreview)
    }
  },
  { flush: 'post' }
)

// 组件挂载后初始化
onMounted(() => {
  if (isVisible.value) {
    nextTick(updatePreview)
  }
})
</script>

<template>
  <teleport to="body">
    <!-- 遮罩层（仅移动端显示） -->
    <transition
      enter-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isVisible" class="fixed inset-0 bg-black/50 z-40" @click="handleClose"></div>
    </transition>

    <!-- 侧边栏容器 -->
    <transition
      enter-active-class="transition-transform duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition-transform duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="isVisible"
        class="fixed top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col artifact-sidebar-container"
        :class="{ 'mobile-full': isMobile }"
        :style="{ width: isMobile ? '100%' : '50%' }"
      >
        <!-- 工具栏 -->
        <div class="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <div class="flex items-center space-x-2">
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
              {{
                currentContentType === 'mermaid'
                  ? 'Mermaid 预览'
                  : currentContentType === 'markmap'
                    ? 'Markmap 预览'
                    : currentContentType === 'react'
                      ? 'React 组件预览'
                      : currentContentType === 'vue'
                        ? 'Vue 组件预览'
                        : 'HTML 预览'
              }}
            </span>
          </div>

          <div class="flex items-center space-x-2">
            <!-- 导出按钮 -->
            <button
              v-if="!isMobile"
              @click="openExportDrawer"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="导出"
            >
              <Download :size="16" class="text-gray-600 dark:text-gray-400" />
            </button>

            <!-- 切换到专注模式 -->
            <button
              v-if="!isMobile"
              @click="switchToFocusMode"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="切换到专注模式"
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
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 4l-5 5M4 16v4m0 0h4m-4 0l5 5m11 5l-5 5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>

            <!-- 关闭按钮 -->
            <button
              @click="handleClose"
              class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="关闭"
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
        </div>

        <!-- 主内容区域 -->
        <div class="flex-1 flex overflow-hidden">
          <!-- 文件树面板 -->
          <div
            class="file-tree-panel border-r dark:border-gray-700 flex flex-col transition-all duration-300"
            :class="{ 'collapsed': isTreeCollapsed }"
          >
            <!-- 面板标题 -->
            <div
              class="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              @click="toggleTree"
            >
              <span class="text-xs font-medium text-gray-600 dark:text-gray-400">
                📁 文件
              </span>
              <component
                :is="isTreeCollapsed ? ChevronLeft : ChevronRight"
                :size="14"
                class="text-gray-500 dark:text-gray-400"
              />
            </div>

            <!-- 文件树内容 -->
            <div v-show="!isTreeCollapsed" class="flex-1 overflow-y-auto py-2">
              <FileTree
                :files="[]"
                @select-file="handleFileSelect"
                @toggle-folder="handleToggleFolder"
              />
            </div>
          </div>

          <!-- 预览区域 -->
          <div class="flex-1 overflow-hidden">
            <iframe
              ref="iframeRef"
              class="w-full h-full border-0"
              :sandbox="sandboxAttribute"
              frameborder="0"
            ></iframe>
          </div>
        </div>
      </div>
    </transition>

    <!-- 导出抽屉 -->
    <ExportDrawer
      :visible="showExportDrawer"
      :artifact="currentArtifact"
      @update:visible="closeExportDrawer"
    />
  </teleport>
</template>

<script lang="ts">
// 检测是否为移动端
import { computed } from 'vue'
import { useBasicLayout } from '@/hooks/useBasicLayout'

export default {
  setup() {
    const { isMobile } = useBasicLayout()
    return { isMobile }
  },
}
</script>

<style scoped>
.artifact-sidebar-container.mobile-full {
  width: 100% !important;
}

.file-tree-panel {
  width: 200px;
  min-width: 200px;
}

.file-tree-panel.collapsed {
  width: 40px;
  min-width: 40px;
}

.file-tree-panel.collapsed .file-tree-content {
  display: none;
}

iframe {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
