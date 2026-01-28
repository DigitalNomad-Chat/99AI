<template>
  <div v-if="editorError" class="editor-error">
    编辑器加载失败：{{ editorError }}
  </div>

  <div v-else-if="editor" class="tiptap-editor">
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
import { ref, watch, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import type { EditorProps, EditorEmits } from './types'

const editorError = ref<string | null>(null)

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
  },
  onError: ({ error }) => {
    console.error('Editor initialization error:', error)
    editorError.value = error.message || '编辑器初始化失败'
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

.editor-error {
  padding: 16px;
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: 8px;
  text-align: center;
}
</style>
