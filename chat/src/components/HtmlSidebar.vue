<script setup lang="ts">
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useGlobalStoreWithOut } from '@/store'
import { useHtmlPreview } from '@/composables/useHtmlPreview'
import { Close, FullScreen, OneToOne, Download } from '@icon-park/vue-next'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { createReactPreview } from '@/utils/compiler/reactRuntime'
import { createVuePreview } from '@/utils/compiler/vueRuntime'
import { createMermaidPreview } from '@/utils/compiler/mermaidRuntime'
import ExportDrawer from '@/components/ArtifactPreviewer/ExportDrawer.vue'
import type { Artifact } from '@/store/modules/artifact/helper'

const globalStore = useGlobalStoreWithOut()
const { closePreview, switchToModal, sidebarWidth, isAnimationEnabled, isResizable } =
  useHtmlPreview()
const { isMobile } = useBasicLayout()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const sidebarRef = ref<HTMLDivElement | null>(null)
const isResizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

// 导出抽屉状态
const showExportDrawer = ref(false)

// 当前内容
const currentContent = computed(() => globalStore.htmlContent)
const currentContentType = computed(() => globalStore.contentType)

// 当前 Artifact（用于导出）
const currentArtifact = computed((): Artifact | null => {
  if (!currentContent.value) return null
  return {
    id: 'current',
    title: `${currentContentType.value.toUpperCase()} 预览`,
    type: currentContentType.value as any,
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

// 侧边栏宽度样式
const sidebarStyle = computed(() => {
  const width = isMobile.value ? '100%' : sidebarWidth.value
  return {
    width,
    transform: isVisible.value ? 'translateX(0)' : 'translateX(100%)',
    transition: isAnimationEnabled.value ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
  }
})

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

  console.log('[HtmlSidebar] contentType:', contentType)
  console.log('[HtmlSidebar] content length:', content?.length)
  console.log('[HtmlSidebar] content preview:', content?.substring(0, 100))

  if (!content) {
    return '<!DOCTYPE html><html><body><div style="padding:20px;color:#999">No content</div></body></html>'
  }

  switch (contentType) {
    case 'react':
      console.log('[HtmlSidebar] Using React preview')
      return createReactPreview(content)

    case 'vue':
      console.log('[HtmlSidebar] Using Vue preview')
      return createVuePreview(content)

    case 'mermaid':
      console.log('[HtmlSidebar] Using Mermaid preview')
      return createMermaidPreview(content)

    case 'html':
    case 'markmap':
    default:
      console.log('[HtmlSidebar] Using raw HTML content')
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
  closePreview()
  // 重置模式为侧边栏，以便下次预览默认打开侧边栏
  globalStore.setPreviewMode('sidebar')
}

/**
 * 切换到专注模式（全屏模态框）
 */
const switchToFocusMode = () => {
  // 先切换模式
  globalStore.setPreviewMode('modal')
  // 确保 showHtmlPreviewer 保持 true，这样 HtmlDialog 会显示
  // 使用 nextTick 确保状态更新完成
  nextTick(() => {
    if (!globalStore.showHtmlPreviewer) {
      globalStore.updateHtmlPreviewer(true)
    }
  })
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

/**
 * 开始拖拽调整大小
 */
const startResize = (e: MouseEvent) => {
  if (!isResizable.value || isMobile.value) return

  isResizing.value = true
  startX.value = e.clientX
  startWidth.value = sidebarRef.value?.offsetWidth || 0

  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)

  // 拖拽时临时禁用动画
  globalStore.updateSidebarConfig({ animation: false })
}

/**
 * 拖拽中
 */
const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return

  const deltaX = startX.value - e.clientX
  const windowWidth = window.innerWidth
  let newWidth = ((startWidth.value + deltaX) / windowWidth) * 100

  // 限制宽度范围 30% - 80%
  newWidth = Math.max(30, Math.min(80, newWidth))

  globalStore.updateSidebarConfig({ width: Math.round(newWidth) })
}

/**
 * 停止拖拽
 */
const stopResize = () => {
  if (!isResizing.value) return

  isResizing.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)

  // 恢复动画
  globalStore.updateSidebarConfig({ animation: true })
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
      <div
        v-if="isVisible && isMobile"
        class="fixed inset-0 bg-black/50 z-40"
        @click="handleClose"
      ></div>
    </transition>

    <!-- 侧边栏容器 -->
    <div
      ref="sidebarRef"
      class="fixed top-0 right-0 h-full bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col html-sidebar-container"
      :class="{ 'mobile-full': isMobile }"
      :style="sidebarStyle"
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
                    ? 'React 预览'
                    : currentContentType === 'vue'
                      ? 'Vue 预览'
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
            <FullScreen :size="16" class="text-gray-600 dark:text-gray-400" />
          </button>

          <!-- 关闭按钮 -->
          <button
            @click="handleClose"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="关闭"
          >
            <Close :size="16" class="text-gray-600 dark:text-gray-400" />
          </button>
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

      <!-- 拖拽调整手柄（仅桌面端且可调整时显示） -->
      <div
        v-if="isResizable && !isMobile && !isResizing"
        class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary-500 transition-colors resize-handle"
        @mousedown="startResize"
      ></div>

      <!-- 拖拽中的遮罩 -->
      <div
        v-if="isResizing"
        class="fixed inset-0 cursor-col-resize z-50"
        style="cursor: col-resize"
      ></div>
    </div>

    <!-- 导出抽屉 -->
    <ExportDrawer
      :visible="showExportDrawer"
      :artifact="currentArtifact"
      @update:visible="closeExportDrawer"
    />
  </teleport>
</template>

<style scoped>
.html-sidebar-container.mobile-full {
  width: 100% !important;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s;
}

.resize-handle:hover {
  background-color: rgb(59 130 246); /* primary-500 */
}

.resize-handle:hover::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 4px;
  height: 40px;
  background-color: rgb(59 130 246);
  border-radius: 2px;
}

/* 深色模式下的拖拽手柄 */
.dark .resize-handle:hover {
  background-color: rgb(96 165 250); /* primary-400 */
}

.dark .resize-handle:hover::after {
  background-color: rgb(96 165 250);
}

/* iframe 样式 */
iframe {
  display: block;
  width: 100%;
  height: 100%;
}

/* 滚动条样式（iframe 内部） */
:deep(body) {
  scrollbar-width: thin;
  scrollbar-color: rgb(156 163 175) transparent;
}

:deep(body::-webkit-scrollbar) {
  width: 8px;
  height: 8px;
}

:deep(body::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(body::-webkit-scrollbar-thumb) {
  background-color: rgb(156 163 175);
  border-radius: 4px;
}

:deep(body::-webkit-scrollbar-thumb:hover) {
  background-color: rgb(107 114 128);
}
</style>
