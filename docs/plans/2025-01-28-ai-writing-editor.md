# AI写作编辑器功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 集成TipTap开源富文本编辑器，实现AI辅助写作功能，包括文章卡片、侧边栏编辑器、AI划词改写等功能。

**Architecture:**
- 前端：Vue 3 + TypeScript + Pinia（现有技术栈）
- 编辑器：TipTap开源版（基于ProseMirror）
- AI集成：自建AI扩展，调用全局AI模型API
- UI组件：侧边栏抽屉 + 文章卡片 + 划词菜单

**Tech Stack:**
- `@tiptap/vue-3` - TipTap Vue 3集成
- `@tiptap/starter-kit` - 基础编辑扩展
- `@tiptap/extension-placeholder` - 占位符
- `@tiptap/extension-character-count` - 字数统计
- `@tiptap/pm/markdown` - Markdown序列化

---

## 依赖安装准备

### Task 1: 安装TipTap核心依赖

**Files:**
- Modify: `chat/package.json`

**Step 1: 添加依赖到package.json**

在`dependencies`中添加：
```json
{
  "@tiptap/vue-3": "^2.1.13",
  "@tiptap/starter-kit": "^2.1.13",
  "@tiptap/extension-placeholder": "^2.1.13",
  "@tiptap/extension-character-count": "^2.1.13",
  "@tiptap/extension-link": "^2.1.13",
  "@tiptap/extension-image": "^2.1.13",
  "@tiptap/extension-code-block-lowlight": "^2.1.13",
  "@tiptpm/lowlight": "^2.1.13",
  "lowlight": "^3.1.0"
}
```

**Step 2: 安装依赖**

```bash
cd chat
pnpm install
```

**Step 3: 验证安装**

检查`node_modules/@tiptap`目录存在：
```bash
ls node_modules/@tiptap
```

预期输出: 看到`vue-3`, `starter-kit`等目录

**Step 4: 提交**

```bash
git add chat/package.json chat/pnpm-lock.yaml
git commit -m "feat: 安装TipTap编辑器核心依赖"
```

---

## Phase 1: 基础编辑器组件开发

### Task 2: 创建TipTap编辑器基础组件

**Files:**
- Create: `chat/src/components/Editor/TiptapEditor.vue`
- Create: `chat/src/components/Editor/types.ts`

**Step 1: 创建类型定义文件**

创建 `chat/src/components/Editor/types.ts`:
```typescript
import type { Editor } from '@tiptap/vue-3'

export interface EditorProps {
  modelValue: string
  placeholder?: string
  editable?: boolean
  characterLimit?: number
}

export interface EditorEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'selection-change', editor: Editor): void
}

export interface AiCommand {
  id: string
  label: string
  prompt: string
  icon?: string
}

export interface Article {
  id: string
  title: string
  content: string
  htmlContent: string
  createdAt: Date
  updatedAt: Date
  status: 'draft' | 'published'
}
```

**Step 2: 创建基础编辑器组件**

创建 `chat/src/components/Editor/TiptapEditor.vue`:
```vue
<template>
  <div v-if="editor" class="tiptap-editor">
    <!-- 工具栏 -->
    <div v-if="editable" class="editor-toolbar">
      <button
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor.isActive('bold') }"
        title="粗体"
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M8 11h4.5a2.5 2.5 0 0 0 0-5H8v5zm10 4.5a4.5 4.5 0 0 1-4.5 4.5H6V4h6.5a4.5 4.5 0 0 1 3.256 7.606A4.498 4.498 0 0 1 18 15.5zM8 13v5h5.5a2.5 2.5 0 0 0 0-5H8z"/>
        </svg>
      </button>
      <button
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        title="斜体"
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M15 20H7v-2h2.927l2.116-12H9V4h8v2h-2.927l-2.116 12H15z"/>
        </svg>
      </button>
      <button
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }"
        title="删除线"
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M3 12h18v2H3z"/>
        </svg>
      </button>
      <div class="toolbar-divider"></div>
      <button
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
        title="一级标题"
      >
        H1
      </button>
      <button
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        title="二级标题"
      >
        H2
      </button>
      <button
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        title="三级标题"
      >
        H3
      </button>
      <div class="toolbar-divider"></div>
      <button
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        title="无序列表"
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M8 4h13v2H8V4zM5 3v3h1v1H3V6h1V4H3V3h2zm0 7v3h1v1H3v-1h1v-2H3v-1h2zm0 7v3h1v1H3v-1h1v-2H3v-1h2zM8 11h13v2H8v-2zm0 7h13v2H8v-2z"/>
        </svg>
      </button>
      <button
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        title="有序列表"
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M8 4h13v2H8V4zM5 3v3h1v1H3V6h1V4H3V3h2zm0 7v3h1v1H3v-1h1v-2H3v-1h2zm0 7v3h1v1H3v-1h1v-2H3v-1h2zM8 11h13v2H8v-2zm0 7h13v2H8v-2z"/>
        </svg>
      </button>
      <div class="toolbar-divider"></div>
      <button
        @click="editor.chain().focus().toggleCodeBlock().run()"
        :class="{ 'is-active': editor.isActive('codeBlock') }"
        title="代码块"
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="currentColor" d="M24 10.933v2.134l-8 5.333-1.067-1.6L20.8 12l-5.867-4.8L16 5.6l8 5.333zm-16 0L0 5.6l1.067 1.6L6.933 12l-5.866 4.8L0 16.4l8-5.467z"/>
        </svg>
      </button>
    </div>

    <!-- 编辑器内容 -->
    <editor-content :editor="editor" class="editor-content" />

    <!-- 底部状态栏 -->
    <div v-if="editor" class="editor-statusbar">
      <span v-if="characterLimit" class="character-count">
        {{ editor.storage.characterCount.characters() }} / {{ characterLimit }}
      </span>
      <span v-else class="word-count">
        {{ editor.storage.characterCount.words() }} 字
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import type { EditorProps, EditorEmits } from './types'

const props = withDefaults(defineProps<EditorProps>(), {
  placeholder: '请输入内容...',
  editable: true,
  characterLimit: undefined
})

const emit = defineEmits<EditorEmits>()

const lowlight = createLowlight(common)

const editor = useEditor({
  content: props.modelValue,
  editable: props.editable,
  extensions: [
    StarterKit.configure({
      codeBlock: false
    }),
    Placeholder.configure({
      placeholder: props.placeholder
    }),
    CharacterCount.configure({
      limit: props.characterLimit
    }),
    Link.configure({
      openOnClick: false
    }),
    Image,
    CodeBlockLowlight.configure({
      lowlight
    })
  ],
  onUpdate: ({ editor }) => {
    const html = editor.getHTML()
    emit('update:modelValue', html)
  },
  onSelectionUpdate: ({ editor }) => {
    emit('selection-change', editor)
  }
})

// 监听外部内容变化
watch(() => props.modelValue, (value) => {
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, false)
  }
})

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.tiptap-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
  flex-wrap: wrap;
}

.editor-toolbar button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.editor-toolbar button:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.editor-toolbar button.is-active {
  background: #3b82f6;
  color: white;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #e5e7eb;
  margin: 0 4px;
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.editor-content :deep(.ProseMirror) {
  height: 100%;
  outline: none;
}

.editor-content :deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

.editor-statusbar {
  display: flex;
  justify-content: flex-end;
  padding: 8px 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 12px;
  color: #6b7280;
}
</style>
```

**Step 3: 提交**

```bash
git add chat/src/components/Editor/
git commit -m "feat: 创建TipTap编辑器基础组件"
```

---

### Task 3: 创建侧边栏抽屉组件

**Files:**
- Create: `chat/src/components/Editor/SidebarDrawer.vue`

**Step 1: 创建侧边栏抽屉组件**

创建 `chat/src/components/Editor/SidebarDrawer.vue`:
```vue
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
```

**Step 2: 提交**

```bash
git add chat/src/components/Editor/SidebarDrawer.vue
git commit -m "feat: 创建编辑器侧边栏抽屉组件"
```

---

### Task 4: 创建文章卡片组件

**Files:**
- Create: `chat/src/components/Editor/ArticleCard.vue`

**Step 1: 创建文章卡片组件**

创建 `chat/src/components/Editor/ArticleCard.vue`:
```vue
<template>
  <div class="article-card">
    <div class="card-header">
      <h4 class="card-title">{{ article.title || '无标题' }}</h4>
      <div class="card-actions">
        <button class="icon-button" @click="handleEdit" title="编辑">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
          </svg>
        </button>
        <button class="icon-button" @click="handleDelete" title="删除">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="card-preview" v-html="article.htmlContent"></div>
    <div class="card-footer">
      <span class="card-time">{{ formatTime(article.updatedAt) }}</span>
      <span class="card-status">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Article } from './types'

interface Props {
  article: Article
}

interface Emits {
  (e: 'edit', article: Article): void
  (e: 'delete', id: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const statusTextMap = {
  draft: '草稿',
  published: '已发布'
}

const statusText = computed(() => statusTextMap[props.article.status])

const formatTime = (date: Date) => {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return d.toLocaleDateString()
}

const handleEdit = () => {
  emit('edit', props.article)
}

const handleDelete = () => {
  if (confirm('确定要删除这篇文章吗？')) {
    emit('delete', props.article.id)
  }
}
</script>

<style scoped>
.article-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.article-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #d1d5db;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.icon-button {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.icon-button:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.card-preview {
  padding: 16px;
  max-height: 200px;
  overflow: hidden;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.6;
}

.card-preview :deep(p) {
  margin: 0 0 8px 0;
}

.card-preview :deep(p:last-child) {
  margin-bottom: 0;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
  font-size: 12px;
}

.card-time {
  color: #6b7280;
}

.card-status {
  padding: 2px 8px;
  background: #e5e7eb;
  color: #4b5563;
  border-radius: 4px;
}
</style>
```

**Step 2: 提交**

```bash
git add chat/src/components/Editor/ArticleCard.vue
git commit -m "feat: 创建文章卡片组件"
```

---

## Phase 2: AI功能集成

### Task 5: 创建AI服务层

**Files:**
- Create: `chat/src/api/aiEditor.ts`
- Create: `chat/src/services/aiEditor.ts`

**Step 1: 创建AI编辑器API**

创建 `chat/src/api/aiEditor.ts`:
```typescript
import axios from 'axios'

export interface AiEditorRequest {
  content: string
  command: string
  prompt?: string
}

export interface AiEditorResponse {
  success: boolean
  data: {
    result: string
  }
}

// AI改写/扩写/翻译等
export async function fetchAiEditAPI(data: AiEditorRequest): Promise<AiEditorResponse> {
  const response = await axios.post('/api/ai/editor', data)
  return response.data
}

// AI续写
export async function fetchAiContinueAPI(content: string): Promise<AiEditorResponse> {
  const response = await axios.post('/api/ai/continue', { content })
  return response.data
}
```

**Step 2: 创建AI编辑器服务**

创建 `chat/src/services/aiEditor.ts`:
```typescript
import type { Editor } from '@tiptap/vue-3'
import { fetchAiEditAPI, fetchAiContinueAPI } from '@/api/aiEditor'

export interface AiExecuteOptions {
  editor: Editor
  command: string
  prompt?: string
  onStream?: (chunk: string) => void
  onComplete?: (result: string) => void
  onError?: (error: Error) => void
}

/**
 * 执行AI编辑命令
 */
export async function executeAiCommand(options: AiExecuteOptions) {
  const { editor, command, prompt, onStream, onComplete, onError } = options

  // 获取选中的文本，如果没有选中则获取全文
  const { from, to, empty } = editor.state.selection
  let selectedText = ''

  if (empty) {
    selectedText = editor.getText()
  } else {
    selectedText = editor.state.doc.textBetween(from, to)
  }

  if (!selectedText) {
    onError?.(new Error('没有选中文本'))
    return
  }

  try {
    const response = await fetchAiEditAPI({
      content: selectedText,
      command,
      prompt
    })

    if (response.success) {
      const result = response.data.result

      // 替换选中的文本
      if (!empty) {
        editor.chain().focus().deleteSelection().insertContent(result).run()
      } else {
        // 在光标位置插入
        editor.chain().focus().insertContent(result).run()
      }

      onComplete?.(result)
    }
  } catch (error) {
    onError?.(error as Error)
  }
}

/**
 * AI续写
 */
export async function aiContinue(editor: Editor): Promise<string> {
  const content = editor.getText()

  if (!content) {
    throw new Error('文档为空')
  }

  const response = await fetchAiContinueAPI(content)

  if (response.success) {
    const result = response.data.result
    editor.chain().focus().insertContent(result).run()
    return result
  }

  throw new Error('AI续写失败')
}
```

**Step 3: 提交**

```bash
git add chat/src/api/aiEditor.ts chat/src/services/aiEditor.ts
git commit -m "feat: 创建AI编辑器API和服务层"
```

---

### Task 6: 创建AI划词菜单组件

**Files:**
- Create: `chat/src/components/Editor/AiBubbleMenu.vue`

**Step 1: 创建AI气泡菜单组件**

创建 `chat/src/components/Editor/AiBubbleMenu.vue`:
```vue
<template>
  <div
    v-if="visible"
    class="ai-bubble-menu"
    :style="menuStyle"
  >
    <button
      class="bubble-button"
      @click="handleCommand('rewrite')"
      title="改写"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
    </button>
    <button
      class="bubble-button"
      @click="handleCommand('expand')"
      title="扩写"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    </button>
    <button
      class="bubble-button"
      @click="handleCommand('summarize')"
      title="总结"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/>
      </svg>
    </button>
    <button
      class="bubble-button"
      @click="handleCommand('translate')"
      title="翻译"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { executeAiCommand } from '@/services/aiEditor'
import type { Editor } from '@tiptap/vue-3'

interface Props {
  editor: Editor
  visible: boolean
  position: { x: number; y: number }
}

interface Emits {
  (e: 'close'): void
  (e: 'executing', isExecuting: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const menuStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`
}))

const handleCommand = async (command: string) => {
  emit('executing', true)

  try {
    await executeAiCommand({
      editor: props.editor,
      command,
      onComplete: () => {
        emit('close')
        emit('executing', false)
      },
      onError: (error) => {
        console.error('AI命令执行失败:', error)
        alert(error.message)
        emit('executing', false)
      }
    })
  } catch (error) {
    console.error('AI命令执行失败:', error)
    emit('executing', false)
  }
}
</script>

<style scoped>
.ai-bubble-menu {
  position: fixed;
  display: flex;
  gap: 4px;
  padding: 6px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bubble-button {
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
  transition: all 0.2s;
}

.bubble-button:hover {
  background: #f3f4f6;
  color: #3b82f6;
}
</style>
```

**Step 2: 提交**

```bash
git add chat/src/components/Editor/AiBubbleMenu.vue
git commit -m "feat: 创建AI划词气泡菜单组件"
```

---

### Task 7: 更新侧边栏组件集成AI功能

**Files:**
- Modify: `chat/src/components/Editor/SidebarDrawer.vue`

**Step 1: 更新SidebarDrawer组件**

在 `chat/src/components/Editor/SidebarDrawer.vue` 中：

在template中添加AiBubbleMenu：
```vue
<template>
  <transition name="slide-left">
    <div v-if="visible" class="sidebar-drawer-overlay" @click="handleClose">
      <div class="sidebar-drawer" @click.stop>
        <!-- ... 现有代码 ... -->

        <!-- AI气泡菜单 -->
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
</template>
```

在script中添加：
```typescript
import AiBubbleMenu from './AiBubbleMenu.vue'
import type { Editor } from '@tiptap/vue-3'

const editor = ref<Editor | null>(null)
const bubbleMenuVisible = ref(false)
const bubbleMenuPosition = ref({ x: 0, y: 0 })
const isAiExecuting = ref(false)

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
      y: coords.top - 50
    }
    bubbleMenuVisible.value = true
  } else {
    bubbleMenuVisible.value = false
  }
}

const handleAiExecuting = (executing: boolean) => {
  isAiExecuting.value = executing
  // 可以添加加载状态
}
```

**Step 2: 提交**

```bash
git add chat/src/components/Editor/SidebarDrawer.vue
git commit -m "feat: 集成AI气泡菜单到侧边栏"
```

---

## Phase 3: 状态管理和数据持久化

### Task 8: 创建文章Store

**Files:**
- Create: `chat/src/store/modules/article/helper.ts`
- Create: `chat/src/store/modules/article/index.ts`

**Step 1: 创建文章Store Helper**

创建 `chat/src/store/modules/article/helper.ts`:
```typescript
export const ARTICLE_KEY = 'articleStore'

export interface ArticleStorage {
  articles: Record<string, Article.Article>
  currentArticleId: string | null
}

export function getLocalState(): ArticleStorage {
  const storage = localStorage.getItem(ARTICLE_KEY)
  if (storage) {
    try {
      return JSON.parse(storage)
    } catch {
      return {
        articles: {},
        currentArticleId: null
      }
    }
  }
  return {
    articles: {},
    currentArticleId: null
  }
}

export function setLocalState(state: ArticleStorage) {
  localStorage.setItem(ARTICLE_KEY, JSON.stringify(state))
}
```

**Step 2: 创建文章Store**

创建 `chat/src/store/modules/article/index.ts`:
```typescript
import { defineStore } from 'pinia'
import { getLocalState, setLocalState, ARTICLE_KEY } from './helper'

export const useArticleStore = defineStore(ARTICLE_KEY, {
  state: (): ArticleStore => getLocalState(),

  getters: {
    articlesList: state => Object.values(state.articles),
    currentArticle: state => state.currentArticleId ? state.articles[state.currentArticleId] : null
  },

  actions: {
    addArticle(article: Omit<Article.Article, 'id' | 'createdAt' | 'updatedAt'>) {
      const id = `article_${Date.now()}`
      const now = new Date()
      const newArticle: Article.Article = {
        id,
        createdAt: now,
        updatedAt: now,
        ...article
      }
      this.articles[id] = newArticle
      this.currentArticleId = id
      setLocalState(this.$state)
      return newArticle
    },

    updateArticle(id: string, updates: Partial<Article.Article>) {
      if (this.articles[id]) {
        this.articles[id] = {
          ...this.articles[id],
          ...updates,
          updatedAt: new Date()
        }
        setLocalState(this.$state)
      }
    },

    deleteArticle(id: string) {
      delete this.articles[id]
      if (this.currentArticleId === id) {
        this.currentArticleId = null
      }
      setLocalState(this.$state)
    },

    setCurrentArticle(id: string | null) {
      this.currentArticleId = id
      setLocalState(this.$state)
    },

    getArticle(id: string) {
      return this.articles[id]
    }
  }
})
```

**Step 3: 添加类型定义**

在 `chat/src/typings/chat.d.ts` 中添加：
```typescript
export namespace Article {
  export interface Article {
    id: string
    title: string
    content: string
    htmlContent: string
    createdAt: Date
    updatedAt: Date
    status: 'draft' | 'published'
  }
}

export interface ArticleStore {
  articles: Record<string, Article.Article>
  currentArticleId: string | null
}
```

**Step 4: 提交**

```bash
git add chat/src/store/modules/article/ chat/src/typings/chat.d.ts
git commit -m "feat: 创建文章Store和类型定义"
```

---

## Phase 4: 与聊天界面集成

### Task 9: 添加聊天模式切换

**Files:**
- Modify: `chat/src/store/modules/chat/index.ts`
- Create: `chat/src/composables/useChatMode.ts`

**Step 1: 创建聊天模式组合函数**

创建 `chat/src/composables/useChatMode.ts`:
```typescript
import { ref, computed } from 'vue'

export type ChatMode = 'chat' | 'writing' | 'thinking'

export interface ModeConfig {
  label: string
  placeholder: string
  icon: string
  systemPrompt: string
}

const modeConfigs: Record<ChatMode, ModeConfig> = {
  chat: {
    label: '💬 普通聊天',
    placeholder: '输入您的问题...',
    icon: '💬',
    systemPrompt: '你是一个专业的AI助手，帮助用户解答问题。'
  },
  writing: {
    label: '✨ 帮我写作',
    placeholder: '请告诉我您想写什么内容...',
    icon: '✨',
    systemPrompt: `你是一个专业的写作助手。用户将提出写作需求，你需要：

1. 理解用户的写作主题和要求
2. 生成结构化的文章内容
3. 返回JSON格式：
{
  "title": "文章标题",
  "content": "文章正文（支持Markdown格式）",
  "outline": ["要点1", "要点2", ...],
  "tags": ["标签1", "标签2"]
}`
  },
  thinking: {
    label: '🔧 深度思考',
    placeholder: '提出复杂问题，AI将深度分析...',
    icon: '🔧',
    systemPrompt: '你是一个深度思考助手，擅长复杂问题的分析和推理。'
  }
}

export function useChatMode() {
  const mode = ref<ChatMode>('chat')

  const currentConfig = computed(() => modeConfigs[mode.value])

  const isWritingMode = computed(() => mode.value === 'writing')

  const setMode = (newMode: ChatMode) => {
    mode.value = newMode
  }

  return {
    mode,
    setMode,
    config: currentConfig,
    isWritingMode,
    allModes: Object.entries(modeConfigs) as [ChatMode, ModeConfig][]
  }
}
```

**Step 2: 提交**

```bash
git add chat/src/composables/useChatMode.ts
git commit -m "feat: 创建聊天模式切换组合函数"
```

---

### Task 10: 更新聊天界面集成写作模式

**Files:**
- Modify: `chat/src/views/chat/components/Footer/index.vue`

**Step 1: 更新Footer组件添加模式切换**

在现有的Footer组件中添加模式切换UI：

```vue
<template>
  <div class="chat-footer">
    <!-- 现有的输入框等内容 -->

    <!-- 新增：模式切换器 -->
    <div class="mode-switcher">
      <button
        v-for="[key, config] in allModes"
        :key="key"
        class="mode-button"
        :class="{ active: mode === key }"
        @click="setMode(key as ChatMode)"
      >
        {{ config.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useChatMode } from '@/composables/useChatMode'
import { useArticleStore } from '@/store/modules/article'
import { ref } from 'vue'

const { mode, setMode, config, isWritingMode, allModes } = useChatMode()
const articleStore = useArticleStore()
const showSidebar = ref(false)

// 根据模式更新输入框placeholder
const inputPlaceholder = computed(() => config.value.placeholder)

// 处理发送消息
const handleSend = async () => {
  if (isWritingMode.value) {
    // 写作模式：生成文章
    const article = await generateArticle(inputValue.value)
    articleStore.addArticle(article)
    showSidebar.value = true
  } else {
    // 普通聊天模式
    await sendMessage(inputValue.value)
  }
  inputValue.value = ''
}

// 生成文章
const generateArticle = async (content: string) => {
  // 调用全局AI模型生成文章
  const response = await fetch('/api/ai/generate-article', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  })
  const data = await response.json()
  return {
    title: data.data.title,
    content: data.data.content,
    htmlContent: data.data.content,
    status: 'draft'
  }
}
</script>

<style scoped>
.mode-switcher {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.mode-button {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-button:hover {
  background: #f3f4f6;
}

.mode-button.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}
</style>
```

**Step 2: 提交**

```bash
git add chat/src/views/chat/components/Footer/index.vue
git commit -m "feat: 添加写作模式切换到聊天界面"
```

---

## Phase 5: 后端API实现

### Task 11: 实现后端AI编辑器API

**Files:**
- Create: `service/controller/article.go`
- Create: `service/router/article.go`
- Modify: `service/main.go`

**Step 1: 创建文章控制器**

创建 `service/controller/article.go`:
```go
package controller

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

type AiEditorRequest struct {
	Content string `json:"content" binding:"required"`
	Command string `json:"command" binding:"required"`
	Prompt  string `json:"prompt"`
}

type AiEditorResponse struct {
	Success bool   `json:"success"`
	Data    struct {
		Result string `json:"result"`
	} `json:"data"`
	Message string `json:"message,omitempty"`
}

// AiEdit 处理AI编辑请求（改写、扩写、翻译等）
func AiEdit(c *gin.Context) {
	var req AiEditorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, AiEditorResponse{
			Success: false,
			Message: "参数错误: " + err.Error(),
		})
		return
	}

	// 构建AI请求prompt
	prompt := buildPrompt(req.Command, req.Content, req.Prompt)

	// 调用全局AI模型
	result, err := callGlobalAI(prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, AiEditorResponse{
			Success: false,
			Message: "AI处理失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, AiEditorResponse{
		Success: true,
		Data: struct {
			Result string `json:"result"`
		}{
			Result: result,
		},
	})
}

// AiContinue 处理AI续写请求
func AiContinue(c *gin.Context) {
	var req struct {
		Content string `json:"content" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "参数错误",
		})
		return
	}

	prompt := "请根据以下内容进行续写，保持相同的风格和语调：\n\n" + req.Content

	result, err := callGlobalAI(prompt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "AI续写失败",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": struct {
			Result string `json:"result"`
		}{
			Result: result,
		},
	})
}

// buildPrompt 根据命令构建AI prompt
func buildPrompt(command, content, customPrompt string) string {
	prompts := map[string]string{
		"rewrite":   "请改写以下内容，保持原意但改善表达：\n\n%s",
		"expand":    "请对以下内容进行详细扩写，添加更多细节和例子：\n\n%s",
		"summarize": "请用一句话总结以下内容：\n\n%s",
		"translate": "请将以下内容翻译成英文：\n\n%s",
		"polish":    "请对以下内容进行润色优化，改善语言表达：\n\n%s",
	}

	if customPrompt != "" {
		return customPrompt
	}

	if template, ok := prompts[command]; ok {
		return fmt.Sprintf(template, content)
	}

	return content
}

// callGlobalAI 调用全局AI模型（需要根据实际情况实现）
func callGlobalAI(prompt string) (string, error) {
	// TODO: 实现调用全局AI模型的逻辑
	// 这里需要根据项目中实际的全局AI模型调用方式来实现
	// 可能是调用FastGPT工作流或其他AI服务

	return "", nil
}
```

**Step 2: 创建文章路由**

创建 `service/router/article.go`:
```go
package router

import (
	"github.com/gin-gonic/gin"
	"your-project/controller"
)

func InitArticleRouter(router *gin.Engine) {
	articleGroup := router.Group("/api/article")
	{
		articleGroup.POST("/save", controller.SaveArticle)
		articleGroup.GET("/list", controller.GetArticleList)
		articleGroup.GET("/:id", controller.GetArticle)
		articleGroup.PUT("/:id", controller.UpdateArticle)
		articleGroup.DELETE("/:id", controller.DeleteArticle)
	}

	aiEditorGroup := router.Group("/api/ai/editor")
	{
		aiEditorGroup.POST("/edit", controller.AiEdit)
		aiEditorGroup.POST("/continue", controller.AiContinue)
	}

	aiGenerateGroup := router.Group("/api/ai")
	{
		aiGenerateGroup.POST("/generate-article", controller.GenerateArticle)
	}
}
```

**Step 3: 更新main.go注册路由**

在 `service/main.go` 中添加：
```go
import (
	"your-project/router"
)

func main() {
	// ... 现有代码 ...

	// 初始化文章相关路由
	router.InitArticleRouter(r)

	// ... 现有代码 ...
}
```

**Step 4: 提交**

```bash
git add service/controller/article.go service/router/article.go service/main.go
git commit -m "feat: 实现后端AI编辑器API"
```

---

## Phase 6: 测试与优化

### Task 12: 创建编辑器测试页面

**Files:**
- Create: `chat/src/views/EditorTest.vue`

**Step 1: 创建测试页面**

创建 `chat/src/views/EditorTest.vue`:
```vue
<template>
  <div class="editor-test-page">
    <h1>TipTap编辑器测试</h1>

    <div class="test-section">
      <h2>基础编辑器</h2>
      <TiptapEditor
        v-model="content"
        placeholder="请输入内容测试编辑器..."
      />
    </div>

    <div class="test-section">
      <h2>侧边栏编辑器</h2>
      <button @click="showSidebar = true">打开侧边栏</button>
      <SidebarDrawer
        v-model:visible="showSidebar"
        :article="testArticle"
        @save="handleSaveArticle"
      />
    </div>

    <div class="test-section">
      <h2>文章卡片</h2>
      <ArticleCard
        :article="testArticle"
        @edit="handleEditArticle"
        @delete="handleDeleteArticle"
      />
    </div>

    <div class="test-section">
      <h2>当前内容 (HTML)</h2>
      <pre>{{ content }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TiptapEditor from '@/components/Editor/TiptapEditor.vue'
import SidebarDrawer from '@/components/Editor/SidebarDrawer.vue'
import ArticleCard from '@/components/Editor/ArticleCard.vue'
import type { Article } from '@/components/Editor/types'

const content = ref('<p>欢迎使用TipTap编辑器！</p><p>这是一个<strong>测试</strong>内容。</p>')
const showSidebar = ref(false)

const testArticle = ref<Article.Article>({
  id: 'test_1',
  title: '测试文章',
  content: content.value,
  htmlContent: content.value,
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'draft'
})

const handleSaveArticle = (article: Omit<Article.Article, 'id' | 'createdAt' | 'updatedAt'>) => {
  console.log('保存文章:', article)
}

const handleEditArticle = (article: Article.Article) => {
  console.log('编辑文章:', article)
  showSidebar.value = true
}

const handleDeleteArticle = (id: string) => {
  console.log('删除文章:', id)
}
</script>

<style scoped>
.editor-test-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.test-section {
  margin-bottom: 32px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.test-section h2 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
}

pre {
  background: #f3f4f6;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
```

**Step 2: 添加测试路由**

在路由配置中添加测试页面路由：
```typescript
{
  path: '/editor-test',
  name: 'EditorTest',
  component: () => import('@/views/EditorTest.vue')
}
```

**Step 3: 提交**

```bash
git add chat/src/views/EditorTest.vue
git commit -m "test: 添加编辑器测试页面"
```

---

### Task 13: 运行测试验证功能

**Files:**
- (No files created - testing steps)

**Step 1: 安装依赖并启动开发服务器**

```bash
cd chat
pnpm install
pnpm dev
```

**Step 2: 访问测试页面**

浏览器访问: `http://localhost:9002/editor-test`

**Step 3: 验证功能清单**

- [ ] 基础编辑器正常渲染
- [ ] 工具栏按钮功能正常（粗体、斜体、标题等）
- [ ] 侧边栏可以正常打开/关闭
- [ ] 文章卡片显示正常
- [ ] 内容编辑和保存正常
- [ ] 字数统计显示正常

**Step 4: 控制台检查**

打开浏览器开发者工具，检查：
- 无Console错误
- 无Console警告
- 网络请求正常

**Step 5: 提交测试结果**

如果测试通过，创建标记：
```bash
git tag -a v1.0.0-editor-mvp -m "编辑器MVP功能完成"
git push origin v1.0.0-editor-mvp
```

---

## 实施总结

### 完成功能
1. ✅ TipTap编辑器基础组件
2. ✅ 侧边栏抽屉组件
3. ✅ 文章卡片组件
4. ✅ AI划词菜单组件
5. ✅ AI服务层（API调用封装）
6. ✅ 文章Store（状态管理）
7. ✅ 聊天模式切换
8. ✅ 后端AI API

### 待优化功能（后续迭代）
- [ ] 流式输出支持
- [ ] 版本历史记录
- [ ] 协作编辑
- [ ] 导出功能（PDF/Word）
- [ ] 图片上传
- [ ] 代码高亮优化
- [ ] 移动端适配

### 关键技术决策
1. **编辑器选型**: TipTap开源版（MIT协议，完全可控）
2. **AI集成**: 自建扩展，调用全局AI模型
3. **状态管理**: Pinia Store + LocalStorage持久化
4. **UI框架**: 复用现有Vue 3技术栈

### 风险与注意事项
1. **大文档性能**: 虚拟滚动 + 文档分块
2. **AI响应延迟**: 添加加载状态 + 错误处理
3. **数据丢失**: 自动保存 + 版本历史
4. **移动端体验**: 响应式设计 + 触控优化
