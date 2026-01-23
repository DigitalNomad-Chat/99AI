import { ss } from '@/utils/storage'
import { UserState } from '../users/helper'

const LOCAL_NAME = 'userStorage'

export interface UserInfo {
  avatar: string
  name: string
}

export interface OrderInfo {
  pkgInfo: {
    id: number
    des: string
    name: string
    price: string
    model3Count: number
    model4Count: number
    drawMjCount: number
    coverImg: string
    days: number
  }
}

export interface GlobalState {
  loading: boolean
  showLoginDialog: boolean
  goodsDialog: boolean
  fingerprint: number
  noticeDialog: boolean
  bindWxDialog: boolean
  signInDialog: boolean
  appDialog: boolean
  identityDialog: boolean
  phoneIdentityDialog: boolean
  userAgreementDialog: boolean
  BadWordsDialog: boolean
  htmlDialog: boolean
  pythonDialog: boolean
  pythonContent: string
  settingsDialog: boolean
  mobileSettingsDialog: boolean
  settingsActiveTab: number
  mobileInitialTab?: string
  isChatIn: boolean
  isCacheEnabled: boolean
  orderInfo: OrderInfo
  model: number
  iframeUrl: string
  clipboardText: string
  htmlContent: string
  contentType: 'html' | 'react' | 'vue' | 'mermaid' | 'markmap' | ''
  textContent: string
  full_json: string
  externalLinkDialog: boolean
  showAppListComponent: boolean
  showBadWordsDialog: boolean
  showHtmlPreviewer: boolean
  showTextEditor: boolean
  showImagePreviewer: boolean
  showWorkflowPreviewer: boolean
  showMarkdownPreviewer: boolean
  isMarkdownPreviewerVisible: boolean
  previewImageUrls: string[]
  initialImageIndex: number
  currentExternalLink: string | null
  mjImageData: any
  workflowContent: string[]
  markdownContent: string

  // 新增：预览器配置
  previewerConfig: {
    sandboxMode: 'basic' | 'strict'
    enableSanitizer: boolean
    theme: 'light' | 'dark' | 'auto'
  }

  // 新增：预览历史记录
  previewHistory: Array<{
    id: string
    content: string
    contentType: string
    timestamp: number
  }>

  // 新增：预览显示模式
  previewDisplayMode: 'sidebar' | 'modal'

  // 新增：侧边栏配置
  sidebarConfig: {
    width: number // 侧边栏宽度 (30-70)
    position: 'right' // 固定右侧
    resizable: boolean // 是否可调整大小
    animation: boolean // 是否启用动画
  }
}

export function defaultSetting(): UserState {
  return {
    userInfo: {
      avatar: '',
      name: '未登录',
    },
  }
}

export function getLocalState(): UserState {
  const localSetting: UserState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: UserState): void {
  ss.set(LOCAL_NAME, setting)
}
