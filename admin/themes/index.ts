import { hex2rgba } from '@unocss/preset-mini/utils'

// 品牌色 - 蓝色系（与前端保持一致）
const BRAND_PRIMARY = '#275bff'      // 主品牌色
const BRAND_SECONDARY = '#409eff'    // 辅助蓝
const BRAND_LIGHT = '#e8f0fe'        // 淡蓝背景
const BRAND_DARK = '#1d4ed8'         // 深蓝色

export const lightTheme = {
  'color-scheme': 'light',

  // ===== 品牌色系统 =====
  '--brand-primary': BRAND_PRIMARY,
  '--brand-secondary': BRAND_SECONDARY,
  '--brand-light': BRAND_LIGHT,
  '--brand-dark': BRAND_DARK,

  // 内置 UI
  '--ui-primary': hex2rgba(BRAND_PRIMARY)!.join(' '),
  '--ui-text': hex2rgba('#0f0f0f')!.join(' '),

  // ===== 主体 =====
  '--g-bg': '#f8f9fa',              // 页面背景（更亮）
  '--g-container-bg': '#ffffff',    // 容器背景
  '--g-border-color': '#e8f0fe',    // 边框色（淡蓝）

  // ===== 头部 =====
  '--g-header-bg': '#ffffff',
  '--g-header-color': BRAND_PRIMARY,        // 标题蓝色
  '--g-header-menu-color': '#525252',       // 菜单灰色
  '--g-header-menu-hover-bg': BRAND_LIGHT,  // 悬停淡蓝
  '--g-header-menu-hover-color': BRAND_PRIMARY,
  '--g-header-menu-active-bg': BRAND_PRIMARY,  // 激活蓝
  '--g-header-menu-active-color': '#ffffff',

  // ===== 主导航 =====
  '--g-main-sidebar-bg': '#ffffff',
  '--g-main-sidebar-menu-color': '#525252',
  '--g-main-sidebar-menu-hover-bg': '#f0f4ff',
  '--g-main-sidebar-menu-hover-color': BRAND_PRIMARY,
  '--g-main-sidebar-menu-active-bg': BRAND_LIGHT,
  '--g-main-sidebar-menu-active-color': BRAND_PRIMARY,

  // ===== 次导航 =====
  '--g-sub-sidebar-bg': '#f8f9fa',
  '--g-sub-sidebar-logo-bg': BRAND_PRIMARY,   // Logo区域蓝色
  '--g-sub-sidebar-logo-color': '#ffffff',
  '--g-sub-sidebar-menu-color': '#525252',
  '--g-sub-sidebar-menu-hover-bg': BRAND_LIGHT,
  '--g-sub-sidebar-menu-hover-color': BRAND_PRIMARY,
  '--g-sub-sidebar-menu-active-bg': BRAND_PRIMARY,
  '--g-sub-sidebar-menu-active-color': '#ffffff',

  // ===== 标签栏 =====
  '--g-tabbar-dividers-bg': BRAND_LIGHT,
  '--g-tabbar-tab-color': '#737373',
  '--g-tabbar-tab-hover-bg': '#f0f4ff',
  '--g-tabbar-tab-hover-color': BRAND_PRIMARY,
  '--g-tabbar-tab-active-color': BRAND_PRIMARY,

  // ===== 数据表格 =====
  '--g-table-thead-bg': '#f8f9fa',
  '--g-table-thead-color': BRAND_PRIMARY,
  '--g-table-border-color': BRAND_LIGHT,
  '--g-table-row-hover-bg': '#f0f4ff',

  // ===== 卡片 =====
  '--g-card-bg': '#ffffff',
  '--g-card-border-color': BRAND_LIGHT,
  '--g-card-shadow': '0 2px 8px rgba(39, 91, 255, 0.08)',

  // ===== 状态色 =====
  '--g-success': '#10b981',
  '--g-warning': '#f59e0b',
  '--g-danger': '#ef4444',
  '--g-info': BRAND_SECONDARY,
}

export const darkTheme = {
  'color-scheme': 'dark',

  // 品牌色系统
  '--brand-primary': BRAND_PRIMARY,
  '--brand-secondary': BRAND_SECONDARY,
  '--brand-light': '#1e3a5f',  // 深色模式下的淡蓝
  '--brand-dark': BRAND_DARK,

  // 内置 UI
  '--ui-primary': hex2rgba(BRAND_SECONDARY)!.join(' '),
  '--ui-text': hex2rgba('#e5e5e5')!.join(' '),

  // 主体
  '--g-bg': '#0f1419',              // 深蓝黑背景
  '--g-container-bg': '#1a1f29',
  '--g-border-color': '#1e3a5f',

  // 头部
  '--g-header-bg': '#1a1f29',
  '--g-header-color': BRAND_SECONDARY,
  '--g-header-menu-color': '#9ca3af',
  '--g-header-menu-hover-bg': '#1e3a5f',
  '--g-header-menu-hover-color': BRAND_SECONDARY,
  '--g-header-menu-active-bg': BRAND_SECONDARY,
  '--g-header-menu-active-color': '#ffffff',

  // 主导航
  '--g-main-sidebar-bg': '#1a1f29',
  '--g-main-sidebar-menu-color': '#9ca3af',
  '--g-main-sidebar-menu-hover-bg': '#1e3a5f',
  '--g-main-sidebar-menu-hover-color': BRAND_SECONDARY,
  '--g-main-sidebar-menu-active-bg': '#1e3a5f',
  '--g-main-sidebar-menu-active-color': BRAND_SECONDARY,

  // 次导航
  '--g-sub-sidebar-bg': '#0f1419',
  '--g-sub-sidebar-logo-bg': BRAND_SECONDARY,
  '--g-sub-sidebar-logo-color': '#ffffff',
  '--g-sub-sidebar-menu-color': '#9ca3af',
  '--g-sub-sidebar-menu-hover-bg': '#1e3a5f',
  '--g-sub-sidebar-menu-hover-color': BRAND_SECONDARY,
  '--g-sub-sidebar-menu-active-bg': BRAND_SECONDARY,
  '--g-sub-sidebar-menu-active-color': '#ffffff',

  // 标签栏
  '--g-tabbar-dividers-bg': '#1e3a5f',
  '--g-tabbar-tab-color': '#9ca3af',
  '--g-tabbar-tab-hover-bg': '#1e3a5f',
  '--g-tabbar-tab-hover-color': BRAND_SECONDARY,
  '--g-tabbar-tab-active-color': BRAND_SECONDARY,

  // 数据表格
  '--g-table-thead-bg': '#1a1f29',
  '--g-table-thead-color': BRAND_SECONDARY,
  '--g-table-border-color': '#1e3a5f',
  '--g-table-row-hover-bg': '#1e3a5f',

  // 卡片
  '--g-card-bg': '#1a1f29',
  '--g-card-border-color': '#1e3a5f',
  '--g-card-shadow': '0 2px 8px rgba(64, 158, 255, 0.15)',

  // 状态色
  '--g-success': '#10b981',
  '--g-warning': '#f59e0b',
  '--g-danger': '#ef4444',
  '--g-info': BRAND_SECONDARY,
}
