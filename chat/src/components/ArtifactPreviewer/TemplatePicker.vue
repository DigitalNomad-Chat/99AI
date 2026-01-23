<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronDown } from '@icon-park/vue-next'
import type { Template, TemplateCategory } from '@/utils/compiler/templates'
import {
  templateLibrary,
  getTemplatesByType,
  getAllTemplates,
  searchTemplates,
} from '@/utils/compiler/templates'

interface Props {
  type?: 'html' | 'react' | 'vue' | 'mermaid'
  placeholder?: string
  disabled?: boolean
}

interface Emits {
  (e: 'select', template: Template): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 是否打开
const isOpen = ref(false)

// 选中的模板
const selectedTemplate = ref<Template | null>(null)

// 搜索关键词
const searchQuery = ref('')

// 当前选中的分类
const selectedCategory = ref<TemplateCategory | 'all'>('all')

// 分类选项
const categories = [
  { value: 'all', label: '全部' },
  { value: TemplateCategory.Basic, label: '基础' },
  { value: TemplateCategory.Interactive, label: '交互' },
  { value: TemplateCategory.Visualization, label: '可视化' },
  { value: TemplateCategory.Form, label: '表单' },
  { value: TemplateCategory.Animation, label: '动画' },
]

// 当前显示的模板列表
const filteredTemplates = computed(() => {
  let templates = props.type ? getTemplatesByType(props.type as any) : getAllTemplates()

  // 按分类过滤
  if (selectedCategory.value !== 'all') {
    templates = templates.filter(t => t.category === selectedCategory.value)
  }

  // 按搜索关键词过滤
  if (searchQuery.value.trim()) {
    templates = searchTemplates(searchQuery.value)
  }

  return templates
})

// 选中的模板名称
const selectedTemplateName = computed(() => {
  if (!selectedTemplate.value) return props.placeholder || '选择模板...'
  return `${selectedTemplate.value.icon} ${selectedTemplate.value.name}`
})

/**
 * 选择模板
 */
function selectTemplate(template: Template) {
  selectedTemplate.value = template
  emit('select', template)
  isOpen.value = false
}

/**
 * 切换下拉框
 */
function toggleDropdown() {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

/**
 * 点击外部关闭
 */
function handleClickOutside() {
  isOpen.value = false
}
</script>

<template>
  <div class="template-picker">
    <!-- 触发按钮 -->
    <button
      class="picker-button"
      :class="{ disabled: props.disabled, open: isOpen }"
      :disabled="props.disabled"
      @click="toggleDropdown"
    >
      <span class="selected-text">{{ selectedTemplateName }}</span>
      <ChevronDown :size="14" class="dropdown-icon" :class="{ rotated: isOpen }" />
    </button>

    <!-- 下拉菜单 -->
    <teleport to="body">
      <div v-if="isOpen" class="dropdown-overlay" @click="handleClickOutside">
        <div class="dropdown-menu" @click.stop>
          <!-- 搜索框 -->
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索模板..."
              class="search-input"
            />
          </div>

          <!-- 分类标签 -->
          <div class="category-tabs">
            <button
              v-for="cat in categories"
              :key="cat.value"
              class="category-tab"
              :class="{ active: selectedCategory === cat.value }"
              @click="selectedCategory = cat.value as any"
            >
              {{ cat.label }}
            </button>
          </div>

          <!-- 模板列表 -->
          <div class="template-list">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="template-item"
              @click="selectTemplate(template)"
            >
              <div class="template-icon">{{ template.icon }}</div>
              <div class="template-info">
                <div class="template-name">{{ template.name }}</div>
                <div class="template-desc">{{ template.description }}</div>
                <div class="template-tags">
                  <span v-for="tag in template.tags" :key="tag" class="tag">
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="filteredTemplates.length === 0" class="empty-state">
              <p>没有找到匹配的模板</p>
            </div>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.template-picker {
  position: relative;
  width: 100%;
}

.picker-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  color: #374151;
}

.dark .picker-button {
  background: #1f2937;
  border-color: #374151;
  color: #f9fafb;
}

.picker-button:hover:not(.disabled) {
  border-color: #9ca3af;
}

.dark .picker-button:hover:not(.disabled) {
  border-color: #4b5563;
}

.picker-button.open {
  border-color: #3b82f6;
}

.picker-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.selected-text {
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-icon {
  transition: transform 0.2s;
  flex-shrink: 0;
  color: #6b7280;
}

.dark .dropdown-icon {
  color: #9ca3af;
}

.dropdown-icon.rotated {
  transform: rotate(180deg);
}

.dropdown-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dark .dropdown-menu {
  background: #1f2937;
  border-color: #374151;
}

.search-box {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .search-box {
  border-bottom-color: #374151;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.dark .search-input {
  background: #374151;
  border-color: #4b5563;
  color: #f9fafb;
}

.category-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
}

.dark .category-tabs {
  border-bottom-color: #374151;
}

.category-tab {
  padding: 6px 12px;
  font-size: 12px;
  border: none;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  border-radius: 4px;
  white-space: nowrap;
  transition: all 0.2s;
}

.dark .category-tab {
  color: #9ca3af;
}

.category-tab:hover {
  background: #f3f4f6;
}

.dark .category-tab:hover {
  background: #374151;
}

.category-tab.active {
  background: #e5e7eb;
  color: #111827;
}

.dark .category-tab.active {
  background: #4b5563;
  color: white;
}

.template-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.template-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s;
}

.template-item:hover {
  background: #f9fafb;
}

.dark .template-item:hover {
  background: #374151;
}

.template-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 2px;
}

.dark .template-name {
  color: #f9fafb;
}

.template-desc {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.dark .template-desc {
  color: #9ca3af;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag {
  padding: 2px 6px;
  font-size: 10px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 3px;
}

.dark .tag {
  background: #374151;
  color: #9ca3af;
}

.empty-state {
  padding: 20px;
  text-align: center;
  color: #9ca3af;
}
</style>
