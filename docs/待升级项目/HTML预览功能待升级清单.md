# HTML 预览功能待升级清单

> **项目：** 99AI HTML 预览功能增强
> **创建日期：** 2026年1月23日
> **当前状态：** Phase 1, 1.5, 2.5 已完成，Phase 3.5 部分完成

---

## 📊 完成情况总览

| 阶段 | 名称 | 状态 | 完成度 |
|------|------|------|--------|
| **Phase 1** | 安全增强与代码块集成 | ✅ 已完成 | 100% |
| **Phase 1.5** | UI 布局优化 | ✅ 已完成 | 100% |
| **Phase 2.5** | React/Vue 组件支持 | ✅ 已完成 | 100% |
| **Phase 3.5** | 完整 Artifacts 功能 | 🟡 部分完成 | 75% |

---

## ✅ 已完成的核心功能

### Phase 1: 安全增强
- ✅ DOMPurify 内容清理
- ✅ iframe sandbox 安全配置
- ✅ 代码块预览按钮集成

### Phase 1.5: 侧边栏布局
- ✅ HtmlSidebar 侧边栏组件
- ✅ 平滑滑入动画
- ✅ 侧边栏/模态框模式切换
- ✅ 响应式布局（移动端全屏）
- ✅ 拖拽调整宽度

### Phase 2.5: 框架组件支持
- ✅ React 组件预览 (reactRuntime.ts)
- ✅ Vue 组件预览 (vueRuntime.ts)
- ✅ Mermaid 图表预览 (mermaidRuntime.ts)
- ✅ 自动代码类型检测

### Phase 3.5: Artifacts 功能（部分）
- ✅ 虚拟文件系统 (virtualFS.ts)
- ✅ 文件树组件 (FileTree.vue)
- ✅ 导出工具：ZIP/PDF/PNG/HTML (exporter.ts)
- ✅ 导出抽屉 UI (ExportDrawer.vue)
- ✅ 模板库 (templates.ts) - 9个预设模板
- ✅ 模板选择器组件 (TemplatePicker.vue)

---

## 📋 待升级项目清单

### 项目 1: 文件树集成到侧边栏

**优先级：** 🟢 低（实用价值有限）

**当前状态：**
- ✅ FileTree.vue 组件已创建
- ✅ 虚拟文件系统已就绪
- ❌ 未集成到 HtmlSidebar.vue

**需要实现：**
```vue
<!-- 在 HtmlSidebar.vue 中添加 -->
<div class="file-tree-panel" :class="{ collapsed: isTreeCollapsed }">
  <div class="panel-header" @click="toggleTree">
    <span>📁 文件</span>
    <ChevronLeft / ChevronRight 图标>
  </div>
  <FileTree
    v-show="!isTreeCollapsed"
    :files="fileList"
    @select-file="handleFileSelect"
  />
</div>
```

**为什么优先级低？**
- 只有当 AI 能自动生成多文件项目时才有实际用途
- 当前 AI 响应大多是单个代码块

---

### 项目 2: 模板选择器集成

**优先级：** 🟢 低（实用价值有限）

**当前状态：**
- ✅ TemplatePicker.vue 组件已创建
- ✅ 9个预设模板已准备
- ❌ 未集成到 UI

**集成方案选项：**

**方案 A：在工具栏添加按钮**
```vue
<button @click="showTemplatePicker = true">
  使用模板
</button>
```

**方案 B：在空状态时显示**
```vue
<div v-if="!currentContent" class="empty-state">
  <p>选择一个模板开始</p>
  <TemplatePicker @select="handleTemplateSelect" />
</div>
```

**为什么优先级低？**
- 用户可以直接让 AI 生成代码
- 模板更像是"代码片段库"，对 AI 对话场景帮助有限

---

### 项目 3: 多文件项目自动识别

**优先级：** 🟡 中（需要 AI 能力配合）

**描述：**
当 AI 响应包含多个文件时，自动解析并创建虚拟文件系统

**示例 AI 响应格式：**
```
以下是完整的 React 应用：

### App.tsx
import React from 'react'
function App() { return <div>Hello</div> }

### styles.css
body { margin: 0; }

### index.html
<!DOCTYPE html>
...
```

**需要实现：**
1. 解析 AI 响应中的多文件标记
2. 自动创建 VirtualFile 实例
3. 更新文件树显示

**为什么优先级中等？**
- 需要训练 AI 按特定格式输出
- 或需要复杂的自然语言解析逻辑

---

### 项目 4: 代码编辑器集成

**优先级：** 🟢 低（已有代码块编辑）

**描述：**
在预览侧边栏底部添加代码编辑面板，支持实时编辑并热更新预览

**当前替代方案：**
- 用户可以在原代码块中直接编辑
- 重新点击预览按钮即可更新

---

### 项目 5: 热更新（HMR）

**优先级：** 🟡 中

**描述：**
代码修改后自动刷新预览，无需手动点击预览按钮

**实现方案：**
```typescript
// 监听代码块内容变化
watch(() => codeContent, debounce(() => {
  updatePreview()
}, 500))
```

---

## 🎯 建议的升级优先级

### 短期（可选）
1. **热更新功能** - 提升用户体验
2. **文件树基础集成** - 为未来多文件支持做准备

### 中期（需要产品决策）
1. **多文件项目格式规范** - 定义 AI 输出格式
2. **模板使用场景** - 明确模板功能的定位

### 长期（需要更多需求分析）
1. **代码编辑器集成** - 是否需要独立的编辑面板
2. **协作功能** - 多用户编辑支持

---

## 📝 备注

### 为什么文件树和模板选择器优先级低？

**文件树：**
- 当前 AI 生成内容以单文件为主
- 多文件项目需要特定的 AI 输出格式
- 实际使用场景有限

**模板选择器：**
- 用户可以直接向 AI 描述需求
- 模板更像是辅助工具，不是核心功能
- 增加交互复杂度

### 当前已满足的核心需求

✅ 安全的 HTML/React/Vue/Mermaid 预览
✅ 侧边栏 + 模态框双模式切换
✅ 导出为 ZIP/PDF/PNG/HTML
✅ 响应式布局适配
✅ 拖拽调整宽度

---

**文档创建日期：** 2026年1月23日
**最后更新：** 2026年1月23日
