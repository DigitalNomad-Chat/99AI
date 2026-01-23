# 99AI UI 优化执行方案 - 现代+科技组合风格

> **项目：** 99AI 聊天应用
> **风格定位：** 现代简约 (70%) + 科技未来 (30%)
> **制定日期：** 2026年1月23日
> **状态：** 执行中
> **品牌色：** 蓝色系（参考 client_v1.5.2 项目）

---

## 设计美学方向

### 核心理念：「精制科技」

**美学定位：**
- **70% 现代简约**：清爽、整洁、信息层次清晰
- **30% 科技未来**：精致、现代、适度创新元素

**独特记忆点：**
1. **蓝色渐变品牌色** - 采用 client 项目的经典蓝色系（#275bff / #409eff）
2. **毛玻璃关键区域** - 仅在重要交互区域使用
3. **悬浮阴影系统** - 三级阴影创造空间深度
4. **不对称细节** - 打破完美方正的单调

**避免的陈词滥调：**
- ❌ 紫色渐变 + 白色背景（最常见的 AI 应用配色）
- ❌ Inter/Roboto 字体
- ❌ 完美的四角卡片
- ❌ 平淡的灰度背景

---

## 一、色彩系统设计

### 1.1 CSS 变量定义

```css
/* ============================================
   99AI 色彩系统 - 现代简约 + 科技感
   蓝色系品牌色（参考 client_v1.5.2 项目）
   ============================================ */

:root {
  /* ===== 品牌色 - 蓝色渐变系 ===== */
  /* 主色：#275bff（主品牌） → #409eff（辅助蓝） */
  --brand-50: #eff6ff;
  --brand-100: #dbeafe;
  --brand-200: #bfdbfe;
  --brand-300: #93c5fd;
  --brand-400: #60a5fa;
  --brand-500: #275bff;  /* 主品牌色 - 来自 client 项目 */
  --brand-600: #1d4ed8;  /* 深品牌色 */
  --brand-700: #1e40af;
  --brand-800: #1e3a8a;
  --brand-900: #1e3a8a;
  --brand-950: #172554;

  /* 辅助蓝色 */
  --brand-secondary: #409eff;  /* client 项目辅助蓝 */
  --brand-secondary-light: #53a8ff;
  --brand-secondary-dark: #337ecc;

  /* 品牌渐变 */
  --gradient-brand: linear-gradient(135deg, #275bff 0%, #409eff 100%);
  --gradient-brand-subtle: linear-gradient(135deg, #409eff 0%, #275bff 100%);
  --gradient-brand-dark: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);

  /* ===== 功能色 ===== */
  --success: #10b981;
  --success-light: #34d399;
  --warning: #f59e0b;
  --warning-light: #fbbf24;
  --danger: #ef4444;
  --danger-light: #f87171;
  --info: #3b82f6;
  --info-light: #60a5fa;

  /* ===== 中性色 - 精细层次 ===== */
  /* 亮色模式 */
  --gray-50: #fafafa;   /* 页面背景 */
  --gray-100: #f4f4f5;  /* 次级背景 */
  --gray-200: #e4e4e7;  /* 边框/分割 */
  --gray-300: #d4d4d8;  /* 悬停边框 */
  --gray-400: #a3a3a3;  /* 占位文字 */
  --gray-500: #737373;  /* 次要文字 */
  --gray-600: #525252;  /* 正文 */
  --gray-700: #3f3f46;  /* 深色文字 */
  --gray-800: #27272a;  /* 标题 */
  --gray-900: #18181b;  /* 深黑背景 */

  /* 特殊中性色 - 带微调 */
  --surface-1: #fafafa;      /* 主表面 */
  --surface-2: #f4f4f5;      /* 次表面 */
  --surface-3: #e4e4e7;      /* 悬停表面 */
  --surface-4: #d4d4d8;      /* 激活表面 */

  /* ===== 玻璃态变量 ===== */
  --glass-bg: rgba(255, 255, 255, 0.65);
  --glass-border: rgba(255, 255, 255, 0.18);
  --glass-shadow: 0 8px 32px rgba(39, 91, 255, 0.08);
  --glass-blur: blur(12px);

  /* ===== 阴影系统 - 三级空间 ===== */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -5px rgba(0, 0, 0, 0.04);

  /* 特殊阴影 - 悬浮感（蓝色系） */
  --shadow-float: 0 12px 24px -4px rgba(39, 91, 255, 0.12);
  --shadow-glow: 0 0 20px rgba(64, 158, 255, 0.15);

  /* ===== 圆角系统 ===== */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* ===== 过渡统一 ===== */
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== 深色模式覆盖 ===== */
.dark {
  /* 中性色调整 */
  --gray-50: #09090b;
  --gray-100: #18181b;
  --gray-200: #27272a;
  --gray-300: #3f3f46;
  --gray-400: #52525b;
  --gray-500: #71717a;
  --gray-600: #a1a1aa;
  --gray-700: #d4d4d8;
  --gray-800: #e4e4eb;  /* 深色模式文字 */
  --gray-900: #f4f4f5;  /* 深色模式标题 */

  /* 表面色 */
  --surface-1: #18181b;
  --surface-2: #27272a;
  --surface-3: #3f3f46;
  --surface-4: #52525b;

  /* 玻璃态 - 深色模式 */
  --glass-bg: rgba(39, 39, 42, 0.65);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  /* 阴影增强 */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.12);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.15);
}
```

### 1.2 字体系统

```css
/* ===== 字体栈 ===== */
:root {
  /* 优先使用系统优化字体 */
  --font-sans:
    /* macOS */
    -apple-system, BlinkMacSystemFont,
    /* Windows */
    "SF Pro Display", "Segoe UI",
    /* 其他系统 */
    "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", "微软雅黑",
    /* 备用 */
    sans-serif,
    /* Emoji */
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";

  /* 代码字体 */
  --font-mono:
    ui-monospace, SFMono-Regular,
    "SF Mono", Menlo, Monaco, Consolas,
    "Liberation Mono", "Courier New",
    monospace;

  /* 字体大小 */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */

  /* 字重 */
  --font-light: 300;
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}

body {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: var(--font-normal);
  color: var(--gray-700);
  background-color: var(--gray-50);
}

.dark body {
  color: var(--gray-200);
}
```

---

## 二、玻璃态效果（关键区域专用）

### 2.1 玻璃态工具函数

```css
/* ===== 玻璃态混合器 ===== */
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

/* 玻璃态变体 */
.glass-subtle {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-strong {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* 深色模式玻璃态 */
.dark .glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
}

.dark .glass-subtle {
  background: rgba(39, 39, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.dark .glass-strong {
  background: rgba(39, 39, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### 2.2 应用场景

```css
/* 仅在关键区域使用玻璃态 */

/* 聊天输入框区域 */
.chat-input-glass {
  @extend .glass-subtle;
  border-radius: var(--radius-xl);
  padding: 16px;
}

/* 悬浮工具栏 */
.toolbar-glass {
  @extend .glass;
  border-radius: var(--radius-lg);
}

/* 模态框 */
.modal-glass {
  @extend .glass-strong;
  border-radius: var(--radius-2xl);
}

/* 注意：侧边栏、聊天列表不使用玻璃态，保持扁平 */
```

---

## 三、阴影层次系统

### 3.1 三级阴影规范

```css
/* ===== 基础阴影 ===== */
.elevation-1 {
  box-shadow: var(--shadow-sm);
}

.elevation-2 {
  box-shadow: var(--shadow-md);
}

.elevation-3 {
  box-shadow: var(--shadow-lg);
}

.elevation-4 {
  box-shadow: var(--shadow-xl);
}
```

### 3.2 特殊阴影效果

```css
/* 悬浮效果 - 用于按钮、卡片悬停 */
.hover-float:hover {
  box-shadow: var(--shadow-float);
  transform: translateY(-2px);
}

/* 发光效果 - 用于强调元素 */
.brand-glow {
  box-shadow: var(--shadow-glow);
}

/* 内阴影 - 用于输入框聚焦 */
.input-focus:focus {
  box-shadow:
    var(--shadow-sm),
    0 0 0 3px rgba(39, 91, 255, 0.15);
}
```

---

## 四、圆角设计系统

### 4.1 圆角规范

```css
/* 统一圆角变量 */
.radius-sm  { border-radius: var(--radius-sm); }   /* 6px */
.radius-md  { border-radius: var(--radius-md); }   /* 10px */
.radius-lg  { border-radius: var(--radius-lg); }   /* 14px */
.radius-xl  { border-radius: var(--radius-xl); }   /* 20px */
.radius-2xl { border-radius: var(--radius-2xl); }  /* 24px */
.radius-full { border-radius: var(--radius-full); } /* 9999px */
```

### 4.2 应用场景

```css
/* 按钮 */
.btn-primary {
  @extend .radius-lg;
}

.btn-secondary {
  @extend .radius-md;
}

/* 药丸按钮 */
.btn-pill {
  @extend .radius-full;
}

/* 卡片 */
.card {
  @extend .radius-xl;
}

/* 输入框 */
.input {
  @extend .radius-md;
}

/* 模态框 */
.modal {
  @extend .radius-2xl;
}
```

### 4.3 不对称圆角（特色设计）

```css
/* 打破方正 - 卡片左上角小圆角 */
.asymmetric-card {
  border-radius: 20px 4px 20px 20px;
}

/* 消息气泡 - 左侧圆角小 */
.message-user {
  border-radius: 20px 4px 20px 20px;
}

.message-ai {
  border-radius: 20px 20px 20px 4px;
}
```

---

## 五、组件样式代码

### 5.1 按钮组件

```vue
<style scoped>
/* ===== 主按钮 ===== */
.btn-primary {
  background: var(--gradient-brand);
  color: white;
  font-weight: var(--font-medium);
  @extend .radius-lg;
  padding: 0.625rem 1.25rem;
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.btn-primary:hover:not(:disabled) {
  background: var(--gradient-brand-dark);
  box-shadow: var(--shadow-lg);
  transform: translateY(-1px);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: var(--shadow-sm);
}

/* 次按钮 - 玻璃态 */
.btn-secondary {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--gray-700);
  @extend .radius-lg;
  padding: 0.625rem 1.25rem;
  transition: all var(--transition-base);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.8);
  border-color: var(--gray-300);
}

.dark .btn-secondary {
  color: var(--gray-300);
}

.dark .btn-secondary:hover:not(:disabled) {
  background: rgba(60, 60, 60, 0.5);
}

/* 幽灵按钮 */
.btn-ghost {
  background: transparent;
  color: var(--gray-600);
  @extend .radius-md;
  padding: 0.5rem 1rem;
  transition: all var(--transition-fast);
}

.btn-ghost:hover:not(:disabled) {
  background: rgba(39, 91, 255, 0.08);
  color: var(--brand-600);
}

.dark .btn-ghost {
  color: var(--gray-400);
}

.dark .btn-ghost:hover:not(:disabled) {
  background: rgba(64, 158, 255, 0.15);
  color: var(--brand-400);
}
</style>
```

### 5.2 卡片组件

```vue
<style scoped>
/* ===== 基础卡片 ===== */
.card {
  background: white;
  border: 1px solid var(--gray-200);
  @extend .radius-xl;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--gray-300);
}

.dark .card {
  background: var(--surface-1);
  border-color: var(--gray-200);
}

.dark .card:hover {
  border-color: var(--gray-300);
}

/* ===== 玻璃态卡片（特殊区域） ===== */
.card-glass {
  @extend .glass;
  @extend .radius-xl;
  padding: 20px;
}

/* ===== 悬浮卡片 ===== */
.card-elevated {
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-base);
}

.card-elevated:hover {
  box-shadow: var(--shadow-float);
  transform: translateY(-2px);
}

/* ===== 不对称卡片（特色设计） ===== */
.card-asymmetric {
  border-radius: 20px 6px 20px 20px;
}

/* ===== 聊天消息卡片 ===== */
.message-card {
  @extend .radius-xl;
  padding: 12px 16px;
  max-width: 85%;
  box-shadow: var(--shadow-xs);
  transition: all var(--transition-fast);
}

.message-card:hover {
  box-shadow: var(--shadow-sm);
}
</style>
```

### 5.3 输入框组件

```vue
<style scoped>
/* ===== 基础输入框 ===== */
.input {
  background: white;
  border: 1px solid var(--gray-200);
  @extend .radius-md;
  padding: 0.625rem 0.875rem;
  color: var(--gray-700);
  transition: all var(--transition-base);
}

.input:hover:not(:disabled) {
  border-color: var(--gray-300);
}

.input:focus {
  outline: none;
  border-color: var(--brand-500);
  box-shadow:
    var(--shadow-sm),
    0 0 0 3px rgba(39, 91, 255, 0.12);
}

.input::placeholder {
  color: var(--gray-400);
}

.dark .input {
  background: var(--surface-2);
  border-color: var(--gray-200);
  color: var(--gray-300);
}

.dark .input::placeholder {
  color: var(--gray-500);
}

/* ===== 玻璃态输入框（聊天区域） ===== */
.input-glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  color: var(--gray-700);
}

.dark .input-glass {
  background: var(--glass-bg);
  color: var(--gray-200);
}
</style>
```

### 5.4 侧边栏优化

```vue
<style scoped>
/* ===== 侧边栏容器 ===== */
.sidebar {
  background: var(--surface-1);
  border-right: 1px solid var(--gray-200);
}

.dark .sidebar {
  background: var(--surface-1);
  border-right: 1px solid var(--gray-200);
}

/* ===== 聊天列表项 ===== */
.chat-item {
  padding: 12px 16px;
  @extend .radius-lg;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: 1px solid transparent;
}

.chat-item:hover {
  background: var(--surface-2);
  border-color: var(--gray-200);
}

.chat-item.active {
  background: var(--gradient-brand);
  color: white;
  box-shadow: var(--shadow-md);
  border-color: transparent;
}

.dark .chat-item:hover {
  background: var(--surface-3);
  border-color: var(--gray-300);
}

.dark .chat-item.active {
  background: var(--gradient-brand-dark);
}

/* ===== 搜索框 ===== */
.search-input {
  background: var(--surface-2);
  border: 1px solid var(--gray-200);
  @extend .radius-lg;
  padding: 10px 16px;
}

.search-input:focus {
  border-color: var(--brand-500);
  box-shadow:
    var(--shadow-sm),
    0 0 0 3px rgba(39, 91, 255, 0.12);
}
</style>
```

### 5.5 聊天消息气泡

```vue
<style scoped>
/* ===== 用户消息 ===== */
.message-user {
  background: var(--gradient-brand);
  color: white;
  @extend .radius-xl;
  border-radius: 20px 4px 20px 20px; /* 不对称 */
  box-shadow: var(--shadow-sm);
  padding: 12px 16px;
}

/* ===== AI 消息 ===== */
.message-ai {
  background: white;
  color: var(--gray-700);
  @extend .radius-xl;
  border-radius: 20px 20px 20px 4px; /* 不对称 */
  border: 1px solid var(--gray-200);
  box-shadow: var(--shadow-xs);
  padding: 12px 16px;
}

.dark .message-ai {
  background: var(--surface-1);
  border-color: var(--gray-200);
  color: var(--gray-200);
}
</style>
```

---

## 六、Tailwind 配置更新

### 6.1 更新 tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 品牌色 - 蓝色系（参考 client 项目）
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#275bff',  // 主品牌色 - client 项目
          600: '#1d4ed8',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#1e3a8a',
          950: '#172554',
          DEFAULT: '#275bff',
        },

        // 辅助蓝色
        secondary: {
          DEFAULT: '#409eff',
          light: '#53a8ff',
          dark: '#337ecc',
        },

        // 表面色
        surface: {
          1: '#fafafa',
          2: '#f4f4f5',
          3: '#e4e4e7',
          4: '#d4d4d8',
        },
      },

      boxShadow: {
        'brand-glow': '0 0 20px rgba(64, 158, 255, 0.15)',
        'float': '0 12px 24px -4px rgba(39, 91, 255, 0.12)',
      },

      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #275bff 0%, #409eff 100%)',
        'brand-gradient-hover': 'linear-gradient(135deg, #1d4ed8 0%, #337ecc 100%)',
      },

      borderRadius: {
        asymmetric: '20px 4px 20px 20px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwind-scrollbar'),
  ],
}
```

---

## 七、实施计划

### 7.1 阶段划分

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| **阶段一** | CSS 变量和 Tailwind 配置 | 1小时 |
| **阶段二** | 基础组件样式（按钮、输入框、卡片） | 3小时 |
| **阶段三** | 聊天界面组件（消息气泡、输入区） | 2小时 |
| **阶段四** | 侧边栏和导航 | 2小时 |
| **阶段五** | 深色模式适配 | 2小时 |
| **阶段六** | 细节打磨和测试 | 2小时 |

**总计：约 12 小时**

### 7.2 文件修改清单

| 文件 | 修改内容 | 优先级 |
|------|----------|--------|
| `tailwind.config.js` | 添加颜色、阴影、渐变 | 🔴 高 |
| `src/styles/global.css` | 添加 CSS 变量、基础样式 | 🔴 高 |
| `src/components/*` | 更新组件样式 | 🟡 中 |
| `src/views/chat/components/*` | 聊天相关组件 | 🟡 中 |
| `src/App.vue` | 全局样式调整 | 🟢 低 |

### 7.3 实施顺序

```
1. CSS 变量系统
   ↓
2. Tailwind 配置更新
   ↓
3. 基础组件（按钮、输入框）
   ↓
4. 聊天组件（消息气泡、卡片）
   ↓
5. 侧边栏和导航
   ↓
6. 深色模式适配
   ↓
7. 全局测试和调优
```

---

## 八、设计原则和最佳实践

### 8.1 设计原则

1. **克制使用** - 玻璃态仅在关键区域使用
2. **一致性优先** - 统一的圆角、阴影、间距
3. **渐进增强** - 从基础样式开始，逐步添加特色
4. **性能意识** - 避免过度使用 backdrop-filter

### 8.2 最佳实践

#### DO（推荐）

```css
/* ✅ 统一使用 CSS 变量 */
color: var(--gray-700);
background: var(--surface-1);

/* ✅ 统一过渡时长 */
transition: all var(--transition-base);

/* ✅ 统一圆角变量 */
border-radius: var(--radius-lg);
```

#### DON'T（避免）

```css
/* ❌ 魔法数字 */
color: #a855f7;
border-radius: 14px;

/* ❌ 过度动画 */
transition: all 0.5s ease-in-out;

/* ❌ 混合使用单位 */
padding: 12px 16px;
margin: 8px 0;
```

### 8.3 性能优化建议

```css
/* 限制 backdrop-filter 使用区域 */
.glass {
  /* 仅在关键区域使用 */
  will-change: transform; /* 优化渲染性能 */
}

/* 避免频繁的阴影重绘 */
.animated-element {
  /* 动画元素固定阴影 */
  box-shadow: var(--shadow-md);
}
```

---

## 九、后续优化方向

### 9.1 可选增强（本次不实施）

- [ ] 页面加载动画
- [ ] 消息气泡错落布局
- [ ] 微交互反馈（点击波纹）
- [ ] 自定义滚动条样式

### 9.2 长期优化

- [ ] 设计系统文档化
- [ ] 组件库 Storybook
- [ ] 设计 tokens 管理
- [ ] A/B 测试框架

---

**方案创建日期：** 2026年1月23日
**预计完成时间：** 12 小时（分6个阶段）
**状态：** 待确认开始执行
