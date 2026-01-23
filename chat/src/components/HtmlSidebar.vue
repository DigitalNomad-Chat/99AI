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
const { closePreview, switchToModal } = useHtmlPreview()
const { isMobile } = useBasicLayout()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const sidebarRef = ref<HTMLDivElement | null>(null)
const isResizing = ref(false)
const startX = ref(0)
const startWidthPercent = ref(0)

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

// 侧边栏宽度（百分比）
const sidebarWidth = computed(() => globalStore.sidebarConfig.width)

// 是否启用动画
const isAnimationEnabled = computed(() => globalStore.sidebarConfig.animation)

// 是否可调整大小
const isResizable = computed(() => globalStore.sidebarConfig.resizable)

// 侧边栏容器样式
const sidebarStyle = computed(() => {
  const width = sidebarWidth.value

  if (isMobile.value) {
    // 移动端：全屏覆盖，使用 transform 滑动
    return {
      width: '100%',
      transform: isVisible.value ? 'translateX(0)' : 'translateX(100%)',
      transition: isAnimationEnabled.value ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
    }
  }

  // 桌面端：相对定位，使用 flex 布局
  // 使用 flex-basis 控制宽度，避免动画遮挡问题
  return {
    flexBasis: isVisible.value ? `${width}%` : '0%',
    minWidth: isVisible.value ? '30%' : '0',
    maxWidth: '80%',
    opacity: isVisible.value ? '1' : '0',
    transition: isAnimationEnabled.value
      ? 'flex-basis 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease'
      : 'none',
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
  globalStore.setPreviewMode('sidebar')
}

/**
 * 切换到专注模式（全屏模态框）
 */
const switchToFocusMode = () => {
  globalStore.setPreviewMode('modal')
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
  startWidthPercent.value = sidebarWidth.value

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

  // 计算新的宽度百分比
  const startWidthPx = (startWidthPercent.value / 100) * windowWidth
  const newWidthPx = startWidthPx + deltaX
  const newWidth = (newWidthPx / windowWidth) * 100

  // 限制宽度范围 30% - 80%
  const clampedWidth = Math.max(30, Math.min(80, newWidth))

  // 更新 store（这将触发聊天容器的响应式变化）
  globalStore.updateSidebarConfig({ width: Math.round(clampedWidth) })
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

  <!-- 侧边栏容器（不再使用 Teleport） -->
  <div
    ref="sidebarRef"
    class="sidebar-container"
    :class="{ 'mobile-mode': isMobile, 'desktop-mode': !isMobile }"
    :style="sidebarStyle"
  >
    <!-- 桌面端：拖拽调整手柄 -->
    <div
      v-if="isResizable && !isMobile && !isResizing && isVisible"
      class="resize-handle"
      @mousedown="startResize"
    >
      <div class="resize-handle-line"></div>
    </div>

    <!-- 拖拽中的遮罩 -->
    <div
      v-if="isResizing"
      class="fixed inset-0 cursor-col-resize z-50"
      style="cursor: col-resize"
    ></div>

    <!-- 工具栏 -->
    <div class="sidebar-header">
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
          class="icon-btn"
          title="导出"
        >
          <Download :size="16" class="text-gray-600 dark:text-gray-400" />
        </button>

        <!-- 切换到专注模式 -->
        <button
          v-if="!isMobile"
          @click="switchToFocusMode"
          class="icon-btn"
          title="切换到专注模式"
        >
          <FullScreen :size="16" class="text-gray-600 dark:text-gray-400" />
        </button>

        <!-- 关闭按钮 -->
        <button
          @click="handleClose"
          class="icon-btn"
          title="关闭"
        >
          <Close :size="16" class="text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>

    <!-- 预览区域 -->
    <div class="sidebar-content">
      <iframe
        ref="iframeRef"
        class="w-full h-full border-0"
        :sandbox="sandboxAttribute"
        frameborder="0"
      ></iframe>
    </div>

    <!-- 导出抽屉 -->
    <ExportDrawer
      :visible="showExportDrawer"
      :artifact="currentArtifact"
      @update:visible="closeExportDrawer"
    />
  </div>
</template>

<style scoped>
/* ========== 桌面端布局（相对定位，flex 模式） ========== */
.sidebar-container.desktop-mode {
  position: relative;
  height: 100%;
  background-color: rgb(255 255 255);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 使用 flex-shrink: 0 防止被压缩 */
  flex-shrink: 0;
}

.dark .sidebar-container.desktop-mode {
  background-color: rgb(17 24 39);
}

/* ========== 移动端布局（固定定位，覆盖模式） ========== */
.sidebar-container.mobile-mode {
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  background-color: rgb(255 255 255);
  z-index: 50;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dark .sidebar-container.mobile-mode {
  background-color: rgb(17 24 39);
}

/* ========== 工具栏 ========== */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgb(229 231 235);
  flex-shrink: 0;
}

.dark .sidebar-header {
  border-bottom: 1px solid rgb(55 65 81);
}

.icon-btn {
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: background-color 0.15s ease;
}

.icon-btn:hover {
  background-color: rgb(243 244 246);
}

.dark .icon-btn:hover {
  background-color: rgb(55 65 81);
}

/* ========== 预览区域 ========== */
.sidebar-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* ========== 拖拽调整手柄 ========== */
.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s ease;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
}

.resize-handle:hover {
  background-color: rgba(59, 130, 246, 0.1);
}

.resize-handle-line {
  width: 3px;
  height: 40px;
  background-color: transparent;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.resize-handle:hover .resize-handle-line {
  background-color: rgb(59 130 246);
}

.dark .resize-handle:hover {
  background-color: rgba(96, 165, 250, 0.15);
}

.dark .resize-handle:hover .resize-handle-line {
  background-color: rgb(96 165 250);
}

/* ========== iframe 样式 ========== */
iframe {
  display: block;
  width: 100%;
  height: 100%;
}

/* ========== 滚动条样式（iframe 内部） ========== */
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
