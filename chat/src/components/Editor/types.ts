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
