import { computed } from 'vue'
import { useGlobalStoreWithOut } from '@/store'

/**
 * HTML 预览选项接口
 */
export interface PreviewOptions {
  /** 预览内容 */
  content: string
  /** 内容类型 */
  contentType?: 'html' | 'react' | 'vue' | 'mermaid' | 'markmap' | ''
  /** 预览模式（不指定则使用当前默认模式） */
  mode?: 'sidebar' | 'modal'
}

/**
 * HTML 预览复用 Hook
 * 提供统一的预览控制逻辑，可在多个组件中复用
 */
export function useHtmlPreview() {
  const globalStore = useGlobalStoreWithOut()

  /**
   * 打开预览
   * @param options 预览选项
   */
  const openPreview = (options: PreviewOptions) => {
    const { content, contentType = 'html', mode } = options
    globalStore.updateHtmlContent(content, contentType)
    if (mode) {
      globalStore.setPreviewMode(mode)
    }
    globalStore.updateHtmlPreviewer(true)
  }

  /**
   * 关闭预览
   */
  const closePreview = () => {
    globalStore.updateHtmlPreviewer(false)
  }

  /**
   * 切换预览模式（侧边栏 ↔ 模态框）
   */
  const toggleMode = () => {
    globalStore.togglePreviewMode()
  }

  /**
   * 切换到侧边栏模式
   */
  const switchToSidebar = () => {
    globalStore.setPreviewMode('sidebar')
  }

  /**
   * 切换到模态框模式
   */
  const switchToModal = () => {
    globalStore.setPreviewMode('modal')
  }

  // 计算属性：当前模式
  const currentMode = computed(() => globalStore.previewDisplayMode)

  // 计算属性：是否为侧边栏模式
  const isSidebarMode = computed(() => globalStore.previewDisplayMode === 'sidebar')

  // 计算属性：是否为模态框模式
  const isModalMode = computed(() => globalStore.previewDisplayMode === 'modal')

  // 计算属性：侧边栏宽度
  const sidebarWidth = computed(() => `${globalStore.sidebarConfig.width}%`)

  // 计算属性：侧边栏配置
  const sidebarConfig = computed(() => globalStore.sidebarConfig)

  // 计算属性：是否启用动画
  const isAnimationEnabled = computed(() => globalStore.sidebarConfig.animation)

  // 计算属性：是否可调整大小
  const isResizable = computed(() => globalStore.sidebarConfig.resizable)

  /**
   * 更新侧边栏配置
   * @param config 配置项
   */
  const updateSidebarConfig = (config: Partial<typeof sidebarConfig.value>) => {
    globalStore.updateSidebarConfig(config)

    // 同步更新 CSS 变量（用于分屏布局）
    if (config.width !== undefined) {
      const widthPercent = config.width
      const sidebarWidthPx = (window.innerWidth * widthPercent) / 100
      document.documentElement.style.setProperty('--sidebar-width', `${widthPercent}%`)
      document.documentElement.style.setProperty('--sidebar-width-px', `${sidebarWidthPx}px`)
    }
  }

  return {
    // 方法
    openPreview,
    closePreview,
    toggleMode,
    switchToSidebar,
    switchToModal,
    updateSidebarConfig,

    // 计算属性
    currentMode,
    isSidebarMode,
    isModalMode,
    sidebarWidth,
    sidebarConfig,
    isAnimationEnabled,
    isResizable,
  }
}
