# 99AI HTML预览功能方案计划报告

## 一、项目背景分析

### 1.1 当前项目状态
99AI是一个基于 **Vue 3 + TypeScript + Vite** 的AI对话平台，目前具备：
- Markdown渲染（使用 markdown-it）
- 代码高亮
- 基础的消息展示
- Mermaid图表支持

### 1.2 需求定位
实现类似Claude Artifacts / 豆包的HTML预览功能：
- 在代码块中识别HTML代码并提供预览按钮
- 在独立窗口中安全渲染HTML内容
- 支持交互式组件（React/Vue）

---

## 二、开源项目调研

### 2.1 核心参考项目

| 项目 | 技术栈 | 特点 | 推荐指数 |
|------|--------|------|----------|
| **LobeChat** | Next.js + React | 完整的Artifacts实现，支持SVG/HTML/React | ⭐⭐⭐⭐⭐ |
| **@centralmind/artifacts** | React组件 | 专注Artifact预览，支持React/Vue/HTML | ⭐⭐⭐⭐ |
| **assistant-ui** | React工具包 | 完整聊天UI + Artifacts | ⭐⭐⭐ |
| **LibreChat** | React | Artifacts支持React组件、HTML、Mermaid | ⭐⭐⭐⭐ |

### 2.2 技术方案总结

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **iframe + sandbox** | 安全隔离、实现简单 | 跨域限制、通信复杂 | 纯HTML预览 |
| **Shadow DOM** | 同域、样式隔离 | 无法完全隔离脚本 | 简单组件 |
| **Web Worker** | 真正隔离、安全性高 | 无法操作DOM | 复杂计算 |
| **代码编译（esbuild/swc）** | 支持React/Vue | 性能开销大 | 完整框架支持 |

### 2.3 安全性最佳实践

**关键安全措施：**
1. **iframe sandbox属性**：`sandbox="allow-scripts"`（不含`allow-same-origin`）
2. **DOMPurify**：HTML内容清理
3. **CSP策略**：限制资源加载
4. **白名单机制**：仅允许特定CDN/域名

---

## 三、推荐技术方案

基于您的Vue 3项目，我推荐采用**分阶段实现方案**：

### 3.1 第一阶段：纯HTML预览（基础版）

**技术栈：**
- iframe + sandbox属性
- DOMPurify进行内容清理
- 代码块识别增强

**实现要点：**
```vue
<!-- HtmlPreviewer.vue -->
<template>
  <div class="html-previewer">
    <iframe
      :srcdoc="sanitizedHtml"
      sandbox="allow-scripts allow-forms"
      :class="themeClass"
    />
  </div>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify'

const props = defineProps<{
  content: string
  theme?: 'light' | 'dark'
}>()

const sanitizedHtml = computed(() => {
  return DOMPurify.sanitize(props.content, {
    ALLOWED_TAGS: ['div', 'span', 'h1', 'p', /* ... */],
    ALLOWED_ATTR: ['class', 'style', 'id', /* ... */]
  })
})
</script>
```

### 3.2 第二阶段：React/Vue组件支持（进阶版）

**技术栈：**
- esbuild-wasm（浏览器端编译）
- iframe通信
- 动态模块加载

**架构设计：**
```
┌─────────────────────────────────────────┐
│          主应用 (Vue 3)                  │
├─────────────────────────────────────────┤
│  - 代码解析                              │
│  - 文件管理 (虚拟文件系统)                │
│  - 编译调度 (esbuild-wasm)               │
└──────────────┬──────────────────────────┘
               │ postMessage
               ▼
┌─────────────────────────────────────────┐
│           iframe沙箱                     │
│  ┌─────────────────────────────────────┐│
│  │      预览运行时                      ││
│  │  - React/Vue运行时                  ││
│  │  - esbuild编译                      ││
│  │  - 模块执行                         ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### 3.3 第三阶段：完整Artifacts功能（终极版）

参考LobeChat的RFC #3292设计：
- 多文件支持
- 实时热更新
- 文件树管理
- 导出功能

---

## 四、详细实现计划

### 4.1 目录结构建议

```
chat/src/
├── components/
│   └── HtmlPreviewer/
│       ├── index.vue              # 主预览组件
│       ├── IframeRenderer.vue      # iframe渲染器
│       ├── CodeDetector.ts         # 代码检测工具
│       ├── SandboxSecurity.ts      # 安全配置
│       └── types.ts               # 类型定义
├── store/
│   └── modules/
│       └── preview.ts             # 预览状态管理
└── utils/
    ├── sanitizer.ts              # HTML清理
    └── compiler.ts               # 代码编译(二期)
```

### 4.2 代码增强点

**当前代码块高亮函数增强（`chat/src/views/chat/components/Message/Text/index.vue:514`）：**

```typescript
// 新增预览按钮
function highlightBlock(str: string, lang?: string) {
  const blockId = `code-block-${Date.now()}-${Math.floor(Math.random() * 1000)}`

  const isHtml = ['html', 'xml'].includes(lang?.toLowerCase() || '')
  const previewBtn = isHtml ? `
    <button class="btn-preview" data-block-id="${blockId}">
      <svg>...</svg>
      <span>预览</span>
    </button>
  ` : ''

  return `<pre class="...">
    <div class="code-block-header">
      <span>${lang || 'text'}</span>
      <div class="flex gap-2">
        ${previewBtn}
        <button class="btn-copy" data-block-id="${blockId}">...</button>
      </div>
    </div>
    <code class="...">${str}</code>
  </pre>`
}
```

### 4.3 状态管理扩展

**扩展全局store（`chat/src/store/modules/preview.ts`）：**

```typescript
export const usePreviewStore = defineStore('preview', () => {
  const isPreviewerVisible = ref(false)
  const currentContent = ref('')
  const contentType = ref<'html' | 'react' | 'vue'>('html')
  const previewTheme = ref<'light' | 'dark'>('dark')

  const openPreview = (content: string, type: 'html' | 'react' | 'vue') => {
    currentContent.value = content
    contentType.value = type
    isPreviewerVisible.value = true
  }

  const closePreview = () => {
    isPreviewerVisible.value = false
  }

  return {
    isPreviewerVisible,
    currentContent,
    contentType,
    previewTheme,
    openPreview,
    closePreview
  }
})
```

---

## 五、关键技术决策

### 5.1 安全方案对比

| 方案 | 安全性 | 性能 | 复杂度 | 推荐 |
|------|--------|------|--------|------|
| **iframe sandbox（基础）** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | ✅ 第一期 |
| **iframe + CSP** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | ✅ 推荐 |
| **Web Worker + DOM** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ 过度设计 |
| **Service Worker** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ 不适用 |

**推荐配置：**
```typescript
const SANDBOX_CONFIG = {
  // 基础沙箱：仅允许脚本执行
  basic: 'allow-scripts',

  // 表单支持：允许表单提交
  withForms: 'allow-scripts allow-forms',

  // 完全隔离：推荐用于不受信任内容
  strict: 'allow-scripts'

  // ⚠️ 永远不要组合 allow-scripts + allow-same-origin
  // 这会完全绕过沙箱保护
}
```

### 5.2 依赖库选择

| 功能 | 推荐库 | 版本 | 用途 |
|------|--------|------|------|
| HTML清理 | `dompurify` | ^3.0.0 | XSS防护 |
| 代码编译(二期) | `esbuild-wasm` | ^0.19.0 | 浏览器端编译 |
| React支持(二期) | `react` + `react-dom` | ^18.0.0 | 运行时 |
| Vue支持(二期) | `vue` | ^3.0.0 | 运行时 |

---

## 六、实施路线图

### Phase 1: 基础HTML预览（2-3天）

- [ ] 安装DOMPurify依赖
- [ ] 创建HtmlPreviewer组件
- [ ] 修改代码块渲染逻辑，添加预览按钮
- [ ] 实现iframe + sandbox基础渲染
- [ ] 添加主题适配

**交付物：**
- 纯HTML代码可以安全预览
- 深色/浅色主题切换
- 响应式布局

### Phase 2: React/Vue支持（5-7天）

- [ ] 集成esbuild-wasm
- [ ] 实现文件系统虚拟化
- [ ] 添加React/Vue运行时
- [ ] 实现热更新机制
- [ ] 错误边界处理

**交付物：**
- 支持React组件预览
- 支持Vue组件预览
- 实时编译和错误提示

### Phase 3: 高级功能（3-5天）

- [ ] 多文件支持
- [ ] 导出功能（HTML/图片）
- [ ] 全屏模式
- [ ] 代码编辑器集成

---

## 七、风险与注意事项

### 7.1 安全风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| XSS攻击 | 高 | DOMPurify + CSP + iframe sandbox |
| 沙箱逃逸 | 中 | 避免allow-same-origin |
| 恶意资源 | 中 | 白名单CDN |

### 7.2 性能考虑

- **esbuild-wasm初始加载**：~2-3MB，需预加载
- **iframe通信开销**：使用postMessage批量更新
- **内存管理**：及时清理未使用的预览实例

---

## 八、参考资源

### 开源项目
- [LobeChat - Artifacts文档](https://lobehub.com/docs/usage/features/artifacts)
- [LobeChat - RFC #3292](https://github.com/lobehub/lobe-chat/discussions/3292)
- [@centralmind/artifacts](https://github.com/centralmind/artifacts)
- [LibreChat - Artifacts](https://www.librechat.ai/docs/features/artifacts)

### 技术文档
- [MDN - iframe sandbox](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox)
- [DOMPurify文档](https://github.com/cure53/DOMPurify)
- [esbuild-wasm文档](https://esbuild.github.io/)

### 设计参考
- [Claude Artifacts使用指南](https://albato.com/blog/publications/how-to-use-claude-artifacts-guide)
- [Simon Willison - HTML工具模式](https://simonwillison.net/2025/Dec/10/html-tools/)

---

## 九、总结与建议

### 推荐实施顺序：

1. **立即开始**：Phase 1 基础HTML预览
   - 低风险、高价值
   - 2-3天即可完成
   - 满足80%的基础需求

2. **二期规划**：Phase 2 React/Vue支持
   - 需要评估性能影响
   - 考虑使用CDN加载esbuild
   - 建议作为可选功能

3. **长期演进**：Phase 3 高级功能
   - 根据用户反馈决定优先级
   - 可参考LobeChat的完整实现

### 关键成功因素：

- ✅ **安全第一**：始终使用sandbox，避免allow-same-origin
- ✅ **渐进增强**：从简单功能开始，逐步扩展
- ✅ **性能优先**：懒加载esbuild，避免阻塞主线程
- ✅ **用户体验**：清晰的错误提示，优雅的降级方案

---

**参考来源：**
- [LobeChat Artifacts Documentation](https://lobehub.com/docs/usage/features/artifacts)
- [LobeChat GitHub Repository](https://github.com/lobehub/lobe-chat)
- [LobeChat RFC #3292 - Artifacts](https://github.com/lobehub/lobe-chat/discussions/3292)
- [centralmind/artifacts](https://github.com/centralmind/artifacts)
- [LibreChat Artifacts](https://www.librechat.ai/docs/features/artifacts)
- [assistant-ui Artifacts](https://www.assistant-ui.com/examples/artifacts)
- [Artifactuse SDK](https://artifactuse.com/)
- [DOMPurify - GitHub](https://github.com/cure53/DOMPurify)
- [Claude Artifacts使用指南](https://albato.com/blog/publications/how-to-use-claude-artifacts-guide)
- [Simon Willison - HTML工具模式](https://simonwillison.net/2025/Dec/10/html-tools/)
- [从DOM Clobbering到V8漏洞利用的沙箱逃逸](https://blog.csdn.net/2402_86373248/article/details/148593856)
- [Vue3与React构建可扩展Web应用的技术方案](https://segmentfault.com/a/1190000046573349)
