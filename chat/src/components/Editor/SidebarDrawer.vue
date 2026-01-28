<template>
  <teleport to="body">
    <transition name="slide-left">
      <div v-if="visible" class="sidebar-drawer-overlay" @click="handleClose">
        <div class="sidebar-drawer" @click.stop>
          <!-- 头部 -->
          <div class="drawer-header">
            <h3 class="drawer-title">{{ title || '文章编辑' }}</h3>
            <div class="header-actions">
              <button class="mode-toggle-button" @click="toggleEditMode">
                <svg v-if="!isEditingMode" width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                {{ isEditingMode ? '预览' : '编辑' }}
              </button>
              <button class="close-button" @click="handleClose">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <!-- 编辑器区域 -->
          <div class="drawer-content">
            <!-- 预览模式：使用v-html渲染Markdown -->
            <div
              v-if="!isEditingMode"
              class="markdown-body preview-content"
              v-html="previewContent"
            ></div>
            <!-- 编辑模式：使用TipTap富文本编辑器 -->
            <TiptapEditor
              v-else
              v-model="articleContent"
              :placeholder="'请输入文章内容...'"
              :editable="true"
              @selection-change="handleSelectionChange"
            />
          </div>

          <!-- 底部操作栏 -->
          <div class="drawer-footer">
            <div class="footer-left">
              <button v-if="hasSelection" class="ai-button" @click="showAiMenu">
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"
                  />
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
          <div v-if="aiMenuVisible" class="ai-menu" :style="aiMenuStyle">
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

          <!-- AI气泡菜单（划词显示） -->
          <AiBubbleMenu
            v-if="editor"
            :editor="editor"
            :visible="bubbleMenuVisible"
            :position="bubbleMenuPosition"
            @close="bubbleMenuVisible = false"
            @executing="handleAiExecuting"
          />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import TiptapEditor from './TiptapEditor.vue'
import AiBubbleMenu from './AiBubbleMenu.vue'
import type { Editor } from '@tiptap/core'
import type { Article, AiCommand } from './types'
import MarkdownIt from 'markdown-it'
import mdKatex from '@traptitech/markdown-it-katex'
import hljs from 'highlight.js'

// 复用项目现有的MarkdownIt配置
const mdi = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight(code, language) {
    const validLang = !!(language && hljs.getLanguage(language))
    if (validLang) {
      const lang = language ?? ''
      // 简化的代码高亮（与项目保持一致）
      return `<pre><code class="hljs language-${lang}">${hljs.highlight(code, { language: lang }).value}</code></pre>`
    }
    return `<pre><code class="hljs">${hljs.highlightAuto(code).value}</code></pre>`
  },
})

// 添加LaTeX支持
mdi.use(mdKatex)

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

// 编辑模式状态
const isEditingMode = ref(false)

const articleContent = ref('')
const articleMarkdown = ref('')  // 保存原始Markdown
const title = ref('')
const hasSelection = ref(false)
const aiMenuVisible = ref(false)
const aiMenuPosition = ref({ x: 0, y: 0 })

// AI气泡菜单相关状态
const editor = ref<Editor | null>(null)
const bubbleMenuVisible = ref(false)
const bubbleMenuPosition = ref({ x: 0, y: 0 })
const isAiExecuting = ref(false)

const aiMenuStyle = computed(() => ({
  left: `${aiMenuPosition.value.x}px`,
  top: `${aiMenuPosition.value.y}px`,
}))

const aiCommands: AiCommand[] = [
  { id: 'rewrite', label: '改写', prompt: '请改写选中的内容，保持原意但改善表达', icon: '✍️' },
  { id: 'expand', label: '扩写', prompt: '请对选中的内容进行详细扩写', icon: '📝' },
  { id: 'summarize', label: '总结', prompt: '请用一句话总结选中的内容', icon: '📋' },
  { id: 'translate', label: '翻译', prompt: '请将选中的内容翻译成英文', icon: '🌐' },
  { id: 'polish', label: '润色', prompt: '请对选中的内容进行润色优化', icon: '✨' },
]

// 转换markdown为HTML（预览模式）
const renderMarkdownHtml = (markdown: string) => {
  if (!markdown) return ''
  try {
    // 复用项目现有的处理逻辑
    let modifiedValue = markdown
      .replace(/\\\(\s*/g, '$')
      .replace(/\s*\\\)/g, '$')
      .replace(/\\\[\s*/g, '$$')
      .replace(/\s*\\\]/g, '$$')
      .replace(
        /\[\[(\d+)\]\((https?:\/\/[^\)]+)\)\]/g,
        '<button class="bg-gray-500 text-white rounded-full w-4 h-4 mx-1 flex justify-center items-center text-sm hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 inline-flex" onclick="window.open(\'$2\', \'_blank\')">$1</button>'
      )
    return mdi.render(modifiedValue)
  } catch (error) {
    console.error('Markdown渲染失败:', error)
    return markdown
  }
}

// 计算属性：预览内容（HTML）
const previewContent = computed(() => {
  return renderMarkdownHtml(articleMarkdown.value)
})

// 监听文章变化
watch(
  () => props.article,
  article => {
    if (article) {
      articleMarkdown.value = article.content || ''
      title.value = article.title
      // 默认使用预览模式
      isEditingMode.value = false
    }
  },
  { immediate: true }
)

// 切换编辑模式
const toggleEditMode = () => {
  isEditingMode.value = !isEditingMode.value
  if (isEditingMode.value) {
    // 切换到编辑模式：将HTML转换为Markdown（简化版，直接使用原始markdown）
    articleContent.value = articleMarkdown.value
  } else {
    // 切换到预览模式：渲染为HTML
    articleContent.value = previewContent.value
  }
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleSave = () => {
  emit('save', {
    title: title.value,
    content: articleContent.value,
    htmlContent: articleContent.value,
    status: 'draft',
  })
  emit('update:visible', false)
}

const handleSelectionChange = (ed: Editor) => {
  editor.value = ed

  const { from, to, empty } = ed.state.selection
  hasSelection.value = !empty

  // 显示气泡菜单
  if (!empty) {
    const { view } = ed
    const coords = view.coordsAtPos(from)
    bubbleMenuPosition.value = {
      x: coords.left,
      y: coords.top - 50,
    }
    bubbleMenuVisible.value = true
  } else {
    bubbleMenuVisible.value = false
  }
}

const handleAiExecuting = (executing: boolean) => {
  isAiExecuting.value = executing
  // 可以添加加载状态UI
}

const showAiMenu = (event: MouseEvent) => {
  const button = event.currentTarget as HTMLElement
  const rect = button.getBoundingClientRect()
  aiMenuPosition.value = {
    x: rect.left,
    y: rect.bottom + 8,
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-toggle-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-toggle-button:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
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
  overflow-y: auto;
  padding: 24px;
}

/* 预览内容区域样式 */
.preview-content {
  line-height: 1.7;
  color: #374151;
}

/* Markdown样式复用项目全局样式 */
.markdown-body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
  font-size: 15px;
  word-wrap: break-word;
}

.markdown-body > *:first-child {
  margin-top: 0 !important;
}

.markdown-body > *:last-child {
  margin-bottom: 0 !important;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.markdown-body h1 {
  font-size: 2em;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.3em;
}

.markdown-body h2 {
  font-size: 1.5em;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.3em;
}

.markdown-body p {
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-body code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(175, 184, 193, 0.2);
  border-radius: 6px;
}

.markdown-body pre {
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  background-color: #f6f8fa;
  border-radius: 6px;
  margin-bottom: 16px;
}

.markdown-body pre code {
  padding: 0;
  background-color: transparent;
  border-radius: 0;
}

.markdown-body ul,
.markdown-body ol {
  padding-left: 2em;
  margin-bottom: 16px;
}

.markdown-body blockquote {
  padding: 0 1em;
  color: #6b7280;
  border-left: 0.25em solid #e5e7eb;
  margin: 0 0 16px 0;
}

.markdown-body table {
  border-spacing: 0;
  border-collapse: collapse;
  margin-bottom: 16px;
  width: 100%;
}

.markdown-body table th,
.markdown-body table td {
  padding: 6px 13px;
  border: 1px solid #e5e7eb;
}

.markdown-body table th {
  font-weight: 600;
  background-color: #f6f8fa;
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
