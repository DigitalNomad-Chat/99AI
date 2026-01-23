# HTML预览功能三阶段实施方案

> **项目：** 99AI HTML预览功能增强
> **制定日期：** 2026年1月22日
> **最后更新：** 2026年1月23日（UI优化版）
> **技术栈：** Vue 3 + TypeScript + Vite + Pinia

---

## 📋 项目现状分析

### 现有功能
项目已具备基础HTML预览功能：
- ✅ `HtmlDialog.vue` - HTML编辑和预览对话框
- ✅ Global Store 状态管理（`showHtmlPreviewer`、`htmlContent`、`contentType`）
- ✅ CodeMirror 代码编辑器集成
- ✅ iframe 预览渲染
- ✅ Phase 1 已完成：安全增强 + DOMPurify + 预览按钮

### 需要改进的问题
- ⚠️ **UI 布局问题**：全屏模态框遮挡主界面，不符合主流产品体验
- ⚠️ **缺少侧边栏模式**：Claude/LobeChat/豆包均采用侧边栏设计
- ❌ **不支持框架**：无法预览 React/Vue 组件
- ❌ **缺少高级功能**：多文件、热更新、导出等

---

## 🎯 四阶段实施概览

| 阶段 | 名称 | 周期 | 优先级 | 核心目标 | 状态 |
|------|------|------|--------|----------|------|
| **Phase 1** | 安全增强与代码块集成 | 2-3天 | 🔴 高 | 安全防护、预览按钮 | ✅ 完成 |
| **Phase 1.5** | UI 布局优化 | 2-3天 | 🔴 高 | 侧边栏滑入、响应式 | 📋 待实施 |
| **Phase 2.5** | React/Vue 组件支持 | 5-7天 | 🟡 中 | 框架组件预览 | 📋 规划中 |
| **Phase 3.5** | 完整 Artifacts 功能 | 3-5天 | 🟢 低 | 多文件、导出、模板 | 📋 规划中 |

---

## 产品研究总结

### 竞品分析

| 产品 | UI 模式 | 布局特点 | 参考来源 |
|------|--------|----------|----------|
| **Claude Artifacts** | 半屏侧边栏 | 右侧滑入，可扩展全屏，无遮罩 | [Claude Help Center](https://support.claude.com/en/articles/9487310) |
| **LobeChat Artifacts** | 侧边栏架构 | 两窗口布局，常驻侧边栏 | [LobeChat RFC #3292](https://github.com/lobehub/lobe-chat/discussions/3292) |
| **豆包 MarsCode** | 分栏设计 | 左右分栏，快捷键切换 | [MarsCode 文档](https://www.ruanyifeng.com/blog/2025/06/doubao-ai-coding.html) |

### 核心发现
1. **统一趋势**：三大主流产品均采用侧边栏/分栏布局
2. **用户体验**：侧边栏允许用户同时查看对话和预览
3. **交互模式**：平滑滑入动画 + 可选全屏扩展
4. **技术实现**：无需遮罩层，使用 fixed 定位 + transform 动画

---

## 第一阶段：安全增强与代码块集成 ✅ 已完成

### 📅 时间估算：2-3天

### 🎯 目标
1. 修复 iframe sandbox 安全隐患
2. 集成 DOMPurify 内容清理
3. 在代码块中添加预览按钮

### ✅ 完成清单

| 任务 | 文件 | 状态 |
|------|------|------|
| 1.1 安装依赖 | `package.json` | ✅ 完成 |
| 1.2 创建 sanitizer.ts | `src/utils/sanitizer.ts` | ✅ 完成 |
| 1.3 创建 htmlDetector.ts | `src/utils/htmlDetector.ts` | ✅ 完成 |
| 1.4 修复 HtmlDialog | `src/components/HtmlDialog.vue` | ✅ 完成 |
| 1.5 扩展 Store 类型 | `src/store/modules/global/helper.ts` | ✅ 完成 |
| 1.6 扩展 Store Actions | `src/store/modules/global/index.ts` | ✅ 完成 |
| 1.7 添加预览按钮 | `src/views/chat/components/Message/Text/index.vue` | ✅ 完成 |

---

## 第一阶段（补充）：UI 布局优化

### 📅 时间估算：2-3天

### 🎯 目标
1. 创建侧边栏组件（HtmlSidebar.vue）
2. 实现平滑滑入动画
3. 支持响应式布局（桌面端侧边栏，移动端全屏）
4. 添加显示模式切换功能

### 📁 文件清单

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `chat/src/components/HtmlSidebar.vue` | 新建 | 侧边栏预览组件 |
| `chat/src/components/PreviewModeToggle.vue` | 新建 | 模式切换组件 |
| `chat/src/store/modules/global/helper.ts` | 修改 | 添加预览模式类型 |
| `chat/src/store/modules/global/index.ts` | 修改 | 添加模式切换方法 |
| `chat/src/App.vue` | 修改 | 集成侧边栏组件 |
| `chat/src/composables/useHtmlPreview.ts` | 新建 | 预览逻辑复用 |

### 🔧 详细任务

#### 任务 1.5.1：扩展 Store 类型定义
**修改文件：** `chat/src/store/modules/global/helper.ts`

**在 GlobalState 接口中添加：**
```typescript
export interface GlobalState {
  // ... 现有属性

  // 新增：预览显示模式
  previewDisplayMode: 'sidebar' | 'modal'

  // 新增：侧边栏配置
  sidebarConfig: {
    width: number          // 侧边栏宽度 (30-70%)
    position: 'right'     // 固定右侧
    resizable: boolean    // 是否可调整大小
    animation: boolean    // 是否启用动画
  }
}
```

#### 任务 1.5.2：扩展 Store Actions
**修改文件：** `chat/src/store/modules/global/index.ts`

**在 state 中添加：**
```typescript
state: (): GlobalState => ({
  // ... 现有状态

  previewDisplayMode: 'sidebar',
  sidebarConfig: {
    width: 50,
    position: 'right',
    resizable: false,
    animation: true
  }
})
```

**在 actions 中添加：**
```typescript
actions: {
  // ... 现有 actions

  /**
   * 切换预览显示模式
   */
  togglePreviewMode() {
    this.previewDisplayMode = this.previewDisplayMode === 'sidebar' ? 'modal' : 'sidebar'
  },

  /**
   * 设置预览显示模式
   */
  setPreviewMode(mode: 'sidebar' | 'modal') {
    this.previewDisplayMode = mode
  },

  /**
   * 更新侧边栏配置
   */
  updateSidebarConfig(config: Partial<GlobalState['sidebarConfig']>) {
    this.sidebarConfig = { ...this.sidebarConfig, ...config }
  }
}
```

#### 任务 1.5.3：创建预览逻辑复用 Hook
**新建文件：** `chat/src/composables/useHtmlPreview.ts`

```typescript
import { computed } from 'vue'
import { useGlobalStoreWithOut } from '@/store'

export interface PreviewOptions {
  content: string
  contentType?: 'html' | 'react' | 'vue' | 'mermaid' | 'markmap'
  mode?: 'sidebar' | 'modal'
}

/**
 * HTML 预览逻辑复用 Hook
 */
export function useHtmlPreview() {
  const globalStore = useGlobalStoreWithOut()

  /**
   * 打开预览器
   */
  const openPreview = (options: PreviewOptions) => {
    const { content, contentType = 'html', mode } = options

    // 更新内容
    globalStore.updateHtmlContent(content, contentType)

    // 如果指定了模式，切换到指定模式
    if (mode) {
      globalStore.setPreviewMode(mode)
    }

    // 打开预览器
    globalStore.updateHtmlPreviewer(true)
  }

  /**
   * 关闭预览器
   */
  const closePreview = () => {
    globalStore.updateHtmlPreviewer(false)
  }

  /**
   * 切换显示模式
   */
  const toggleMode = () => {
    globalStore.togglePreviewMode()
  }

  /**
   * 当前显示模式
   */
  const currentMode = computed(() => globalStore.previewDisplayMode)

  /**
   * 是否为侧边栏模式
   */
  const isSidebarMode = computed(() => globalStore.previewDisplayMode === 'sidebar')

  /**
   * 是否为模态框模式
   */
  const isModalMode = computed(() => globalStore.previewDisplayMode === 'modal')

  /**
   * 侧边栏宽度
   */
  const sidebarWidth = computed(() => `${globalStore.sidebarConfig.width}%`)

  return {
    openPreview,
    closePreview,
    toggleMode,
    currentMode,
    isSidebarMode,
    isModalMode,
    sidebarWidth
  }
}
```

#### 任务 1.5.4：创建侧边栏组件
**新建文件：** `chat/src/components/HtmlSidebar.vue`

```vue
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGlobalStoreWithOut } from '@/store'
import { sanitizeHtml } from '@/utils/sanitizer'
import { Close, RefreshLeft, Download, FullScreen, OneTwo } from '@icon-park/vue-next'

interface Props {
  visible: boolean
  html?: string
  editable?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['update:visible', 'update:html'])

const globalStore = useGlobalStoreWithOut()
const htmlPreviewRef = ref<HTMLIFrameElement | null>(null)
const localEditableText = ref(props.html || '')
const isResizing = ref(false)
const sidebarRef = ref<HTMLElement | null>(null)

// 检测是否为移动端
const isMobile = computed(() => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
})

// 计算侧边栏宽度
const sidebarStyle = computed(() => {
  const width = globalStore.sidebarConfig.width
  const animation = globalStore.sidebarConfig.animation

  return {
    width: isMobile.value ? '100%' : `${width}%`,
    transition: animation ? 'transform 0.3s ease' : 'none'
  }
})

// 当 props.html 变化时更新本地编辑文本
watchEffect(() => {
  if (props.visible && props.html && props.html !== localEditableText.value) {
    localEditableText.value = props.html
  }
})

// 当本地编辑文本变化时更新预览
watchEffect(() => {
  if (props.visible) {
    updatePreview()
  }
})

// 预览更新逻辑
const updatePreview = () => {
  if (htmlPreviewRef.value) {
    const sanitizedContent = sanitizeHtml(localEditableText.value)
    htmlPreviewRef.value.srcdoc = sanitizedContent
  }
}

function handleClose() {
  emit('update:visible', false)
  emit('update:html', localEditableText.value)
  globalStore.updateHtmlPreviewer(false)
}

const handleCopy = async () => {
  try {
    await navigator.clipboard.writeText(localEditableText.value)
    // TODO: 添加成功提示
  } catch (err) {
    // TODO: 添加失败提示
  }
}

// 切换显示模式
const handleToggleMode = () => {
  globalStore.togglePreviewMode()
}

// Esc 键关闭
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    handleClose()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  updatePreview()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <transition name="slide-left">
      <div
        v-if="props.visible"
        ref="sidebarRef"
        class="html-sidebar"
        :style="sidebarStyle"
      >
        <!-- 顶部工具栏 -->
        <div class="sidebar-header">
          <div class="header-left">
            <span class="title">HTML 预览</span>
            <span v-if="props.contentType" class="badge">{{ props.contentType }}</span>
          </div>
          <div class="header-right">
            <button
              @click="handleToggleMode"
              class="icon-btn"
              title="切换显示模式"
            >
              <OneTwo size="18" />
            </button>
            <button
              @click="handleClose"
              class="icon-btn"
              title="关闭 (Esc)"
            >
              <Close size="18" />
            </button>
          </div>
        </div>

        <!-- 预览区域 -->
        <div class="sidebar-content">
          <iframe
            ref="htmlPreviewRef"
            class="preview-iframe"
            sandbox="allow-scripts allow-forms"
          />
        </div>

        <!-- 底部操作栏 -->
        <div v-if="props.editable !== false" class="sidebar-footer">
          <button @click="handleCopy" class="action-btn">
            复制代码
          </button>
        </div>
      </div>
    </transition>

    <!-- 点击外部关闭的遮罩层（仅移动端） -->
    <div
      v-if="props.visible && isMobile"
      class="sidebar-overlay"
      @click="handleClose"
    ></div>
  </Teleport>
</template>

<style scoped>
.html-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  background: white;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.dark .html-sidebar {
  background: #1a1a1a;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.3);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.dark .sidebar-header {
  border-bottom-color: #374151;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.dark .title {
  color: #f9fafb;
}

.badge {
  padding: 2px 8px;
  font-size: 12px;
  background: #f3f4f6;
  color: #6b7280;
  border-radius: 4px;
}

.dark .badge {
  background: #374151;
  color: #9ca3af;
}

.header-right {
  display: flex;
  gap: 4px;
}

.icon-btn {
  padding: 6px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.dark .icon-btn {
  color: #9ca3af;
}

.dark .icon-btn:hover {
  background: #374151;
  color: #f9fafb;
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.sidebar-footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
}

.dark .sidebar-footer {
  border-top-color: #374151;
}

.action-btn {
  padding: 8px 16px;
  font-size: 14px;
  border: 1px solid #d1d5db;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.dark .action-btn {
  background: #1f2937;
  border-color: #374151;
  color: #f9fafb;
}

.dark .action-btn:hover {
  background: #374151;
}

.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 99;
}

/* 滑入动画 */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(100%);
}

.slide-left-leave-to {
  transform: translateX(100%);
}
</style>
```

#### 任务 1.5.5：创建模式切换组件
**新建文件：** `chat/src/components/PreviewModeToggle.vue`

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { useGlobalStoreWithOut } from '@/store'
import { OneTwo } from '@icon-park/vue-next'

const globalStore = useGlobalStoreWithOut()

const currentMode = computed(() => globalStore.previewDisplayMode)

const modes = [
  { value: 'sidebar', label: '侧边栏', icon: '📱' },
  { value: 'modal', label: '全屏', icon: '🖥️' }
]

const handleModeChange = (mode: 'sidebar' | 'modal') => {
  globalStore.setPreviewMode(mode)
}
</script>

<template>
  <div class="mode-toggle">
    <button
      v-for="mode in modes"
      :key="mode.value"
      class="mode-btn"
      :class="{ active: currentMode === mode.value }"
      @click="handleModeChange(mode.value)"
      :title="`切换到${mode.label}模式`"
    >
      <span class="mode-icon">{{ mode.icon }}</span>
      <span class="mode-label">{{ mode.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.mode-toggle {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: #f3f4f6;
  border-radius: 8px;
}

.dark .mode-toggle {
  background: #374151;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
}

.mode-btn:hover {
  background: rgba(255, 255, 255, 0.5);
}

.dark .mode-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.mode-btn.active {
  background: white;
  color: #111827;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.dark .mode-btn.active {
  background: #4b5563;
  color: white;
}

.mode-icon {
  font-size: 16px;
}

.mode-label {
  font-size: 12px;
  font-weight: 500;
}
</style>
```

#### 任务 1.5.6：更新 App.vue 集成侧边栏
**修改文件：** `chat/src/App.vue`

**在 template 中添加侧边栏组件：**
```vue
<template>
  <!-- 水印组件（如果启用） -->
  <Watermark v-if="showWatermark"></Watermark>

  <!-- 主要内容使用router-view -->
  <router-view />

  <!-- HTML 预览组件 - 支持侧边栏和模态框两种模式 -->
  <HtmlDialog
    v-if="useGlobalStore.previewDisplayMode === 'modal'"
    :visible="useGlobalStore.htmlDialog || useGlobalStore.showHtmlPreviewer"
    :html="useGlobalStore.showHtmlPreviewer ? useGlobalStore.htmlContent : sharedHtml"
  />

  <HtmlSidebar
    v-else
    :visible="useGlobalStore.showHtmlPreviewer"
    :html="useGlobalStore.htmlContent"
    :contentType="useGlobalStore.contentType"
  />

  <!-- 全局图片预览器 -->
  <GlobalImageViewer />
</template>

<script setup lang="ts">
// ... 现有导入

import HtmlSidebar from '@/components/HtmlSidebar.vue'

// ... 现有代码
</script>
```

#### 任务 1.5.7：在工具栏添加模式切换按钮
**位置：** 根据实际 UI 布局选择合适位置

```vue
<PreviewModeToggle v-if="useGlobalStore.showHtmlPreviewer" />
```

### ✅ 验收标准

- [ ] 侧边栏从右侧平滑滑入（300ms ease）
- [ ] 不影响主对话区域布局
- [ ] 支持点击遮罩或 Esc 键关闭
- [ ] 移动端自动切换为全屏模式
- [ ] 支持侧边栏/模态框模式切换
- [ ] 模式选择持久化到本地存储

### 🧪 测试用例

```typescript
describe('HtmlSidebar', () => {
  test('侧边栏应该从右侧滑入', async () => {
    const { openPreview, isSidebarMode } = useHtmlPreview()

    openPreview({ content: '<div>Test</div>', mode: 'sidebar' })
    await nextTick()

    expect(isSidebarMode.value).toBe(true)
    // 检查 DOM 中存在侧边栏元素
  })

  test('移动端应该使用全屏模式', () => {
    // 模拟移动端视口
    Object.defineProperty(window, 'innerWidth', { value: 375 })

    const { sidebarWidth } = useHtmlPreview()
    expect(sidebarWidth.value).toBe('100%')
  })

  test('Esc 键应该关闭侧边栏', async () => {
    const { openPreview, closePreview } = useHtmlPreview()

    openPreview({ content: '<div>Test</div>' })
    await nextTick()

    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' })
    window.dispatchEvent(escEvent)

    await nextTick()
    // 验证侧边栏已关闭
  })
})
```

---

## 第二阶段（原 Phase 2）：React/Vue 组件支持

### 📅 时间估算：5-7天

### 🎯 目标
1. 支持预览 React 组件
2. 支持预览 Vue 组件
3. 实现代码热更新
4. 错误边界处理
5. **适配侧边栏布局**

### 📁 文件清单

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `chat/package.json` | 修改 | 添加 esbuild-wasm、react 依赖 |
| `chat/src/components/ArtifactPreviewer/` | 新建 | 组件预览器目录 |
| `chat/src/components/ArtifactPreviewer/SidebarRenderer.vue` | 新建 | 侧边栏专用渲染器 |
| `chat/src/components/ArtifactPreviewer/IframeRenderer.vue` | 新建 | iframe 渲染器 |
| `chat/src/components/ArtifactPreviewer/CodeEditor.vue` | 新建 | 代码编辑器 |
| `chat/src/utils/compiler/` | 新建 | 编译器工具目录 |
| `chat/src/utils/compiler/esbuild.ts` | 新建 | esbuild 封装 |
| `chat/src/utils/compiler/reactRuntime.ts` | 新建 | React 运行时 |
| `chat/src/utils/compiler/vueRuntime.ts` | 新建 | Vue 运行时 |
| `chat/src/utils/compiler/virtualFS.ts` | 新建 | 虚拟文件系统 |
| `chat/src/store/modules/artifact.ts` | 新建 | Artifact 专用 store |
| `chat/src/views/chat/components/Message/Text/index.vue` | 修改 | 添加 React/Vue 预览按钮 |

### 🔧 关键变更点

**与原 Phase 2 的主要区别：**
1. **渲染器组件**：从全屏模态框改为侧边栏布局
2. **代码编辑器**：集成到侧边栏底部或可折叠面板
3. **错误提示**：使用 toast 而非模态框内嵌提示
4. **响应式适配**：移动端自动切换为全屏编辑模式

#### 任务 2.x.1：创建侧边栏渲染器
**新建文件：** `chat/src/components/ArtifactPreviewer/SidebarRenderer.vue`

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useArtifactStore } from '@/store/modules/artifact'
import { createReactPreview } from '@/utils/compiler/reactRuntime'
import { createVuePreview } from '@/utils/compiler/vueRuntime'
import { sanitizeHtml } from '@/utils/sanitizer'

const artifactStore = useArtifactStore()
const iframeRef = ref<HTMLIFrameElement | null>(null)

// 根据内容类型生成预览 HTML
const previewHtml = computed(() => {
  if (!artifactStore.currentArtifact) return ''

  const { type, files } = artifactStore.currentArtifact
  const content = files[0]?.content || ''

  switch (type) {
    case 'html':
      return sanitizeHtml(content)
    case 'react':
      return createReactPreview(content)
    case 'vue':
      return createVuePreview(content)
    default:
      return ''
  }
})

// 监听内容变化更新预览
watch(previewHtml, (newHtml) => {
  if (iframeRef.value && newHtml) {
    iframeRef.value.srcdoc = newHtml
  }
})
</script>

<template>
  <div class="artifact-sidebar-renderer">
    <iframe
      ref="iframeRef"
      class="artifact-iframe"
      :sandbox="getSandboxConfig(artifactStore.currentArtifact?.type)"
    />
  </div>
</template>

<style scoped>
.artifact-sidebar-renderer {
  width: 100%;
  height: 100%;
}

.artifact-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>
```

### ✅ 验收标准

- [ ] 侧边栏中能预览 React 组件
- [ ] 侧边栏中能预览 Vue 组件
- [ ] 代码修改后自动热更新
- [ ] 编译错误使用 toast 提示
- [ ] 可以导出组件代码

---

## 第三阶段（原 Phase 3）：完整 Artifacts 功能

### 📅 时间估算：3-5天

### 🎯 目标
1. 多文件项目管理
2. 文件树可视化
3. 高级导出功能
4. 模板库

### 🔧 关键变更点

**与原 Phase 3 的主要区别：**
1. **文件树组件**：集成到侧边栏可折叠面板
2. **全屏模式**：从预览内容全屏改为侧边栏全屏
3. **模板选择器**：使用侧边抽屉而非模态框

#### 任务 3.x.1：侧边栏集成文件树
**修改文件：** `chat/src/components/ArtifactPreviewer/SidebarRenderer.vue`

```vue
<template>
  <div class="artifact-sidebar-renderer">
    <!-- 可折叠的文件树面板 -->
    <div class="file-tree-panel" :class="{ collapsed: isTreeCollapsed }">
      <div class="panel-header" @click="toggleTree">
        <span>📁 文件</span>
        <span class="toggle-icon">{{ isTreeCollapsed ? '▶' : '▼' }}</span>
      </div>
      <FileTree v-show="!isTreeCollapsed" @select-file="handleFileSelect" />
    </div>

    <!-- 预览区域 -->
    <div class="preview-area">
      <iframe ref="iframeRef" class="artifact-iframe" />
    </div>
  </div>
</template>
```

### ✅ 验收标准

- [ ] 文件树集成到侧边栏可折叠面板
- [ ] 导出功能使用侧边抽屉
- [ ] 模板选择器使用下拉菜单
- [ ] 全屏按钮展开侧边栏为 100% 宽度

---

## 📦 依赖安装汇总

### Phase 1 依赖 ✅ 已安装
```bash
cd chat
pnpm install dompurify
```

### Phase 1.5 依赖
```bash
cd chat
# 无额外依赖，使用原生 CSS
# 可选：拖拽调整宽度功能
pnpm install vue3-resize
```

### Phase 2.5 依赖
```bash
cd chat
pnpm install esbuild-wasm react react-dom
pnpm install -D @types/react @types/react-dom
```

### Phase 3.5 依赖
```bash
cd chat
pnpm install jszip html-to-image jspdf
```

---

## 🗂️ 更新后的目录结构

```
chat/src/
├── components/
│   ├── ArtifactPreviewer/           # 新建：组件预览器
│   │   ├── SidebarRenderer.vue       # 侧边栏专用渲染器
│   │   ├── IframeRenderer.vue        # iframe 渲染器
│   │   ├── CodeEditor.vue            # 代码编辑器
│   │   ├── FileManager.vue           # 文件管理器
│   │   ├── FileTree.vue             # 文件树组件
│   │   ├── TemplatePicker.vue       # 模板选择器
│   │   └── ExportDialog.vue         # 导出对话框
│   ├── HtmlDialog.vue               # 保留：全屏模态框
│   └── HtmlSidebar.vue              # 新建：侧边栏预览
├── composables/
│   └── useHtmlPreview.ts             # 新建：预览逻辑复用
├── store/modules/
│   ├── global/
│   │   ├── index.ts                  # 修改：扩展预览状态
│   │   └── helper.ts                 # 修改：扩展类型定义
│   └── artifact/
│       └── index.ts                  # 新建：Artifact Store
├── utils/
│   ├── sanitizer.ts                  # 新建：HTML 清理工具
│   ├── htmlDetector.ts               # 新建：HTML 检测工具
│   └── compiler/                     # 新建：编译器目录
│       ├── esbuild.ts                # esbuild 封装
│       ├── reactRuntime.ts            # React 运行时
│       ├── vueRuntime.ts              # Vue 运行时
│       ├── virtualFS.ts               # 虚拟文件系统
│       ├── templates.ts               # 模板库
│       └── exporter.ts                # 导出工具
└── views/
    └── chat/
        └── components/
            └── Message/
                └── Text/
                    └── index.vue      # 修改：添加预览按钮
```

---

## 📊 四阶段对比总结

| 功能特性 | Phase 1 | Phase 1.5 | Phase 2.5 | Phase 3.5 |
|----------|---------|-----------|-----------|-----------|
| **安全防护** | ✅ DOMPurify | ✅ | ✅ | ✅ |
| **预览按钮** | ✅ 代码块集成 | ✅ | ✅ | ✅ |
| **侧边栏模式** | ❌ | ✅ 滑入动画 | ✅ | ✅ |
| **模态框模式** | ✅ 全屏 | ✅ 保留 | ✅ | ✅ |
| **模式切换** | ❌ | ✅ | ✅ | ✅ |
| **响应式** | ❌ | ✅ 移动端全屏 | ✅ | ✅ |
| **HTML 预览** | ✅ | ✅ | ✅ | ✅ |
| **React 组件** | ❌ | ❌ | ✅ | ✅ |
| **Vue 组件** | ❌ | ❌ | ✅ | ✅ |
| **热更新** | ❌ | ❌ | ✅ | ✅ |
| **多文件支持** | ❌ | ❌ | ❌ | ✅ |
| **文件树** | ❌ | ❌ | ❌ | ✅ |
| **导出功能** | ❌ | ❌ | ❌ | ✅ |
| **模板库** | ❌ | ❌ | ❌ | ✅ |
| **开发周期** | ✅ 完成 | 2-3天 | 5-7天 | 3-5天 |

---

## 🚀 实施建议

### 优先级策略

**立即实施（Phase 1.5）：**
1. 创建 `HtmlSidebar.vue` 组件
2. 实现滑入动画效果
3. 添加模式切换功能
4. 响应式适配

**二期规划（Phase 2.5）：**
- React/Vue 组件支持
- 侧边栏布局适配
- 热更新机制

**长期演进（Phase 3.5）：**
- 多文件管理
- 高级导出功能
- 模板库集成

### 技术选型建议

| 功能 | 推荐方案 | 说明 |
|------|----------|------|
| 基础侧边栏 | 原生 CSS | 最轻量，满足基本需求 |
| 拖拽调整宽度 | `vue3-resize` | 可选功能 |
| 完整分栏布局 | `splitpanes` | Phase 3.5 考虑 |
| 动画效果 | CSS Transition | Vue transition 组件 |

### 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 布局冲突导致样式问题 | 中 | 使用隔离的 CSS 作用域 |
| 移动端体验下降 | 中 | 响应式检测，小屏幕全屏显示 |
| 与现有功能冲突 | 低 | 保持现有组件，添加新组件 |
| 性能问题（动画卡顿） | 低 | 使用 CSS transform 而非 width |

---

## 📚 参考资源

### 开源项目
- [LobeChat - Artifacts RFC #3292](https://github.com/lobehub/lobe-chat/discussions/3292)
- [LobeChat GitHub Repository](https://github.com/lobehub/lobe-chat)
- [@centralmind/artifacts](https://github.com/centralmind/artifacts)
- [LibreChat Artifacts](https://www.librechat.ai/docs/features/artifacts)

### 技术文档
- [MDN - iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox)
- [DOMPurify 文档](https://github.com/cure53/DOMPurify)
- [Vue 3 Transition 组件](https://vuejs.org/api/built-in-components.html#transition)

### 产品参考
- [Claude Help Center - Artifacts](https://support.claude.com/en/articles/9487310-what-are-artifacts-and-how-do-i-use-them)
- [LobeChat Artifacts Release](https://lobehub.com/changelog/2024-09-20-artifacts)
- [PC Mag - Claude Artifacts](https://www.pcmag.com/news/anthropic-brings-artifacts-split-screen-view-to-all-claude-users)

---

**文档版本：** v2.0 (UI优化版)
**最后更新：** 2026年1月23日
