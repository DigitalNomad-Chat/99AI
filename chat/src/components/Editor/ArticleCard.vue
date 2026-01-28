<template>
  <div class="article-card">
    <div class="card-header">
      <h4 class="card-title">{{ article.title || '无标题' }}</h4>
      <div class="card-actions">
        <button class="icon-button" @click="handleEdit" title="编辑">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
            />
          </svg>
        </button>
        <button class="icon-button" @click="handleDelete" title="删除">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
            />
          </svg>
        </button>
      </div>
    </div>
    <div class="card-preview" v-html="sanitizedContent"></div>
    <div class="card-footer">
      <span class="card-time">{{ formatTime(article.updatedAt) }}</span>
      <span class="card-status">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DOMPurify from 'dompurify'
import type { Article } from './types'

interface Props {
  article: Article
  maxLength?: number
}

interface Emits {
  (e: 'edit', article: Article): void
  (e: 'delete', id: string): void
}

const DEFAULT_MAX_LENGTH = 150

const props = withDefaults(defineProps<Props>(), {
  maxLength: DEFAULT_MAX_LENGTH,
})
const emit = defineEmits<Emits>()

const statusTextMap = {
  draft: '草稿',
  published: '已发布',
}

const statusText = computed(() => statusTextMap[props.article.status])

// 截取预览内容（避免显示过长）
const sanitizedContent = computed(() => {
  if (!props.article.htmlContent) return ''

  // 使用DOMPurify清理HTML，防止XSS攻击
  const cleanHtml = DOMPurify.sanitize(props.article.htmlContent)

  // 客户端环境下提取文本长度
  if (typeof window !== 'undefined') {
    const temp = document.createElement('div')
    temp.innerHTML = cleanHtml
    const text = temp.textContent || temp.innerText || ''

    if (text.length <= props.maxLength) {
      return cleanHtml
    }

    // 截断后添加省略号（纯文本）
    return text.substring(0, props.maxLength) + '...'
  }

  return cleanHtml
})

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
  flex: 1;
  margin-right: 12px;
}

.card-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
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
  margin: 0;
}

.card-preview :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.card-time {
  font-size: 12px;
  color: #9ca3af;
}

.card-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #e5e7eb;
  color: #6b7280;
}
</style>
