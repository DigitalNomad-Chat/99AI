<script setup lang="ts">
import { computed, ref } from 'vue'
import { Document, Folder, FolderOpen } from '@icon-park/vue-next'
import type { VirtualFile } from '@/utils/compiler/virtualFS'
import { FileType } from '@/utils/compiler/virtualFS'

interface Props {
  files: VirtualFile[]
  selectedId?: string
}

interface Emits {
  (e: 'select-file', file: VirtualFile): void
  (e: 'toggle-folder', file: VirtualFile): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 展开的文件夹 ID 集合
const expandedFolders = ref<Set<string>>(new Set())

/**
 * 切换文件夹展开/折叠状态
 */
function toggleFolder(file: VirtualFile, event: Event) {
  event.stopPropagation()

  if (file.type === FileType.Directory) {
    if (expandedFolders.value.has(file.id)) {
      expandedFolders.value.delete(file.id)
    } else {
      expandedFolders.value.add(file.id)
    }
    emit('toggle-folder', file)
  }
}

/**
 * 选择文件
 */
function selectFile(file: VirtualFile) {
  if (file.type === FileType.File) {
    emit('select-file', file)
  }
}

/**
 * 判断文件夹是否展开
 */
function isExpanded(file: VirtualFile): boolean {
  return expandedFolders.value.has(file.id)
}

/**
 * 获取文件图标
 */
function getFileIcon(file: VirtualFile) {
  if (file.type === FileType.Directory) {
    return isExpanded(file) ? FolderOpen : Folder
  }
  return Document
}

/**
 * 获取文件图标颜色
 */
function getIconColor(file: VirtualFile): string {
  const isDark = document.documentElement.classList.contains('dark')

  if (file.type === FileType.Directory) {
    return isDark ? '#fbbf24' : '#f59e0b' // amber-500/400
  }

  // 根据文件扩展名返回不同颜色
  const ext = getFileExtension(file.name)
  const colors: Record<string, string> = {
    html: isDark ? '#f97316' : '#ea580c', // orange
    css: isDark ? '#3b82f6' : '#2563eb', // blue
    js: isDark ? '#eab308' : '#ca8a04', // yellow
    ts: isDark ? '#3b82f6' : '#2563eb', // blue
    vue: isDark ? '#42b883' : '#35495e', // vue green
    json: isDark ? '#a78bfa' : '#8b5cf6', // purple
  }

  return colors[ext] || (isDark ? '#9ca3af' : '#6b7280') // gray-400/500
}

/**
 * 获取文件扩展名
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? parts[parts.length - 1] : ''
}

/**
 * 是否选中
 */
function isSelected(file: VirtualFile): boolean {
  return props.selectedId === file.id
}
</script>

<template>
  <div class="file-tree">
    <div
      v-for="file in files"
      :key="file.id"
      class="file-item"
      :class="{
        selected: isSelected(file),
        'is-directory': file.type === FileType.Directory,
      }"
      @click="file.type === FileType.File ? selectFile(file) : toggleFolder(file, $event)"
    >
      <!-- 图标和名称 -->
      <div class="file-content">
        <component :is="getFileIcon(file)" :size="16" :style="{ color: getIconColor(file) }" />
        <span class="file-name">{{ file.name }}</span>
      </div>

      <!-- 子文件/文件夹（仅当展开时显示） -->
      <template v-if="file.type === FileType.Directory && file.children && isExpanded(file)">
        <FileTree
          :files="file.children"
          :selected-id="selectedId"
          @select-file="emit('select-file', $event)"
          @toggle-folder="emit('toggle-folder', $event)"
          class="file-tree-children"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.file-tree {
  user-select: none;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.file-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.dark .file-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.file-item.selected {
  background: rgba(59, 130, 246, 0.1);
}

.dark .file-item.selected {
  background: rgba(59, 130, 246, 0.2);
}

.file-item.is-directory {
  cursor: pointer;
}

.file-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark .file-name {
  color: #d1d5db;
}

.file-tree-children {
  margin-left: 16px;
}
</style>
