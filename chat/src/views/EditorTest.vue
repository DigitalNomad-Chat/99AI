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
      <button class="test-button" @click="showSidebar = true">打开侧边栏</button>
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
      <pre class="html-preview">{{ content }}</pre>
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
  alert('文章已保存！')
}

const handleEditArticle = (article: Article.Article) => {
  console.log('编辑文章:', article)
  showSidebar.value = true
}

const handleDeleteArticle = (id: string) => {
  console.log('删除文章:', id)
  alert('文章已删除！')
}
</script>

<style scoped>
.editor-test-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.editor-test-page > h1 {
  margin-bottom: 24px;
  font-size: 28px;
  color: #1f2937;
}

.test-section {
  margin-bottom: 32px;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}

.test-section h2 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 18px;
  color: #374151;
}

.test-button {
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.test-button:hover {
  background: #2563eb;
}

.html-preview {
  background: #f3f4f6;
  padding: 12px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  color: #4b5563;
  max-height: 300px;
}
</style>
