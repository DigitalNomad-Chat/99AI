<script setup lang="ts">
import { useHtmlPreview } from '@/composables/useHtmlPreview'
import { MenuDown, Menu, Right } from '@icon-park/vue-next'
import { computed } from 'vue'

const { isSidebarMode, isModalMode, switchToSidebar, switchToModal } = useHtmlPreview()

/**
 * 模式选项
 */
type PreviewMode = 'sidebar' | 'modal'

interface ModeOption {
  value: PreviewMode
  label: string
  icon: any
  description: string
}

const modes: ModeOption[] = [
  {
    value: 'sidebar',
    label: '侧边栏模式',
    icon: Menu,
    description: '在右侧滑出面板，保持主界面可见',
  },
  {
    value: 'modal',
    label: '专注模式',
    icon: MenuDown,
    description: '全屏模态框，专注查看内容',
  },
]

const currentMode = computed(() => (isSidebarMode.value ? 'sidebar' : 'modal'))

/**
 * 切换模式
 */
const handleModeChange = (mode: PreviewMode) => {
  if (mode === 'sidebar') {
    switchToSidebar()
  } else {
    switchToModal()
  }
}
</script>

<template>
  <div class="preview-mode-toggle">
    <div class="flex items-center space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <button
        v-for="mode in modes"
        :key="mode.value"
        @click="handleModeChange(mode.value)"
        class="flex items-center space-x-2 px-3 py-2 rounded-md transition-all duration-200"
        :class="[
          currentMode === mode.value
            ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600 dark:text-primary-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
        ]"
        :title="mode.description"
      >
        <component :is="mode.icon" :size="16" />
        <span class="text-sm font-medium">{{ mode.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.preview-mode-toggle {
  display: inline-block;
}

.preview-mode-toggle button {
  cursor: pointer;
  user-select: none;
}

.preview-mode-toggle button:focus {
  outline: 2px solid rgb(59 130 246);
  outline-offset: 2px;
}

/* 深色模式下的焦点样式 */
.dark .preview-mode-toggle button:focus {
  outline-color: rgb(96 165 250);
}
</style>
