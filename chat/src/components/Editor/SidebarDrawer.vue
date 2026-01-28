<template>
  <transition name="slide-left">
    <div v-if="visible" class="sidebar-drawer-overlay" @click="handleClose">
      <div class="sidebar-drawer" @click.stop>
        <!-- 头部 -->
        <div class="drawer-header">
          <h3 class="drawer-title">{{ title || '文章编辑' }}</h3>
          <button class="close-button" @click="handleClose">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <!-- 编辑器区域 -->
        <div class="drawer-content">
          <TiptapEditor
            v-model="articleContent"
            :placeholder="'请输入文章内容...'"
            :editable="true"
            @selection-change="handleSelectionChange"
          />
        </div>

        <!-- 底部操作栏 -->
        <div class="drawer-footer">
          <div class="footer-left">
            <button
              v-if="hasSelection"
              class="ai-button"
              @click="showAiMenu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              AI助手
            </button>
          </div>
          <div class="footer-right">
            <button class="cancel-button" @click="handleClose">取消</button>
            <button class="save-button" @click="handleSave">保存</button>
          </div>
        </div>

        <!-- AI菜单浮层 -->
        <div
          v-if="aiMenuVisible"
          class="ai-menu"
          :style="aiMenuStyle"
        >
          <div
            v-for="command in aiCommands"
            :key="command.id"
            class="ai-menu-item"
            @click="handleAiCommand(command)"
          >
            <span v-if="command.icon" class="command-icon">{{ command.icon }}</span>
            <span class="command-label">{{ command.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import TiptapEditor from './TiptapEditor.vue'
import type { Editor } from '@tiptap/vue-3'
import type { Article, AiCommand } from './types'

interface Props {
  visible: boolean
  article?: Article | null
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'save', article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const articleContent = ref('')
const title = ref('')
const hasSelection = ref(false)
const aiMenuVisible = ref(false)
const aiMenuPosition = ref({ x: 0, y: 0 })

const aiMenuStyle = computed(() => ({
  left: `${aiMenuPosition.value.x}px`,
  top: `${aiMenuPosition.value.y}px`
}))

const aiCommands: AiCommand[] = [
  { id: 'rewrite', label: '改写', prompt: '请改写选中的内容，保持原意但改善表达', icon: '✍️' },
  { id: 'expand', label: '扩写', prompt: '请对选中的内容进行详细扩写', icon: '📝' },
  { id: 'summarize', label: '总结', prompt: '请用一句话总结选中的内容', icon: '📋' },
  { id: 'translate', label: '翻译', prompt: '请将选中的内容翻译成英文', icon: '🌐' },
  { id: 'polish', label: '润色', prompt: '请对选中的内容进行润色优化', icon: '✨' }
]

// 监听文章变化
watch(() => props.article, (article) => {
  if (article) {
    articleContent.value = article.content
    title.value = article.title
  }
}, { immediate: true })

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  emit('save', {
    title: title.value,
    content: articleContent.value,
    htmlContent: articleContent.value,
    status: 'draft'
  })
  emit('update:visible', false)
}

const handleSelectionChange = (editor: Editor) => {
  hasSelection.value = !editor.state.selection.empty
}

const showAiMenu = (event: MouseEvent) => {
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  aiMenuPosition.value = {
    x: rect.left,
    y: rect.bottom + 8
  }
  aiMenuVisible.value = !aiMenuVisible.value
}

const handleAiCommand = async (command: AiCommand) => {
  aiMenuVisible.value = false
  // TODO: 调用AI API处理选中的文本
  console.log('执行AI命令:', command.id, command.prompt)
}
</script>

<style scoped>
.sidebar-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
}

.sidebar-drawer {
  width: 600px;
  max-width: 90vw;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.1);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-button {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-button:hover {
  background: #f3f4f6;
}

.drawer-content {
  flex: 1;
  overflow: hidden;
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.footer-left,
.footer-right {
  display: flex;
  gap: 12px;
}

.ai-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.ai-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.cancel-button {
  padding: 8px 20px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.cancel-button:hover {
  background: #f3f4f6;
}

.save-button {
  padding: 8px 20px;
  border: none;
  background: #3b82f6;
  color: white;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.save-button:hover {
  background: #2563eb;
}

.ai-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 8px;
  z-index: 1001;
  min-width: 180px;
}

.ai-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.2s;
}

.ai-menu-item:hover {
  background: #f3f4f6;
}

.command-icon {
  font-size: 16px;
}

.command-label {
  font-size: 14px;
  color: #1f2937;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  opacity: 0;
}

.slide-left-enter-from .sidebar-drawer {
  transform: translateX(-100%);
}

.slide-left-leave-to {
  opacity: 0;
}

.slide-left-leave-to .sidebar-drawer {
  transform: translateX(-100%);
}

.slide-left-enter-to .sidebar-drawer,
.slide-left-leave-from .sidebar-drawer {
  transform: translateX(0);
}
</style>
