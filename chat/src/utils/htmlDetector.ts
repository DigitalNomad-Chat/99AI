/**
 * HTML 代码检测工具
 *
 * @module utils/htmlDetector
 */

/**
 * HTML 相关语言标识
 */
const HTML_LANGUAGES = ['html', 'htm', 'xml', 'svg', 'xhtml'] as const

/**
 * React 相关语言标识
 */
const REACT_LANGUAGES = ['jsx', 'tsx', 'react'] as const

/**
 * Vue 相关语言标识
 */
const VUE_LANGUAGES = ['vue', 'vhtml', 'vue3', 'vuejs'] as const

/**
 * 判断是否为 HTML 类语言
 * @param lang - 语言标识
 * @returns 是否为 HTML
 */
export function isHtmlLanguage(lang?: string): boolean {
  if (!lang) return false
  return HTML_LANGUAGES.includes(lang.toLowerCase() as any)
}

/**
 * 判断是否为 React 类语言
 * @param lang - 语言标识
 * @returns 是否为 React
 */
export function isReactLanguage(lang?: string): boolean {
  if (!lang) return false
  return REACT_LANGUAGES.includes(lang.toLowerCase() as any)
}

/**
 * 判断是否为 Vue 类语言
 * @param lang - 语言标识
 * @returns 是否为 Vue
 */
export function isVueLanguage(lang?: string): boolean {
  if (!lang) return false
  return VUE_LANGUAGES.includes(lang.toLowerCase() as any)
}

/**
 * 判断是否为可预览的语言（HTML/React/Vue）
 * @param lang - 语言标识
 * @returns 是否可预览
 */
export function isPreviewableLanguage(lang?: string): boolean {
  return isHtmlLanguage(lang) || isReactLanguage(lang) || isVueLanguage(lang)
}

/**
 * 从代码内容中检测是否为 HTML
 * @param code - 代码内容
 * @returns 是否为 HTML
 */
export function detectHtmlContent(code: string): boolean {
  const trimmed = code.trim().toLowerCase()

  // 检测 DOCTYPE 声明
  if (trimmed.startsWith('<!doctype')) return true

  // 检测 HTML 标签
  const htmlTags = ['<html', '<head', '<body', '<div', '<span', '<p', '<h1', '<h2', '<h3']
  return htmlTags.some(tag => trimmed.includes(tag))
}

/**
 * 从代码内容中检测是否为 React JSX
 * @param code - 代码内容
 * @returns 是否为 React
 */
export function detectReactContent(code: string): boolean {
  const trimmed = code.trim()

  // 检测 React 导入
  const reactImports = [
    /import\s+.*\s+from\s+['"](react|react-dom)['"]/, // ES6 import
    /const\s+.*=\s*require\(['"]react['"]\)/, // CommonJS
    /React\.(createElement|Component|useState|useEffect)/, // React API
  ]

  // 检测 JSX 语法
  const jsxPatterns = [
    /<[A-Z]\w+/, // 组件标签（大写开头）
    /<\w+[^>]*\{[^}]*\}/, // 带花括号的属性
    /\{[^}]*\}.*</, // 花括号表达式后跟标签
  ]

  return [...reactImports, ...jsxPatterns].some(pattern => pattern.test(trimmed))
}

/**
 * 从代码内容中检测是否为 Vue
 * @param code - 代码内容
 * @returns 是否为 Vue
 */
export function detectVueContent(code: string): boolean {
  const trimmed = code.trim()

  // 同时检测原始标签和 HTML 实体（&lt; &gt;）
  const hasTemplateTag = /<template|&lt;template/i.test(code)
  const hasScriptTag = /<script|&lt;script/i.test(code)
  const hasStyleTag = /<style|&lt;style/i.test(code)
  const hasScriptSetup = /<script\s+setup|&lt;script\s+setup/i.test(code)

  // 如果同时有 template 和 script，很可能是 Vue SFC
  if (hasTemplateTag && hasScriptTag) {
    return true
  }

  // 检测 script setup（Vue 3 特有）+ scoped style 的组合
  if (hasScriptSetup && /scoped|&lt;style/.test(code)) {
    return true
  }

  // 检测 script setup（Vue 3 特有）
  if (hasScriptSetup) {
    return true
  }

  // 检测 style scoped（Vue 特有）+ script 标签的组合
  if (/style\s+scoped|scoped/.test(code) && hasScriptTag) {
    return true
  }

  // 检测 Vue 3 Composition API 特有语法
  const vueCompositionPatterns = [
    /defineComponent\s*\(/,
    /defineProps\s*\(/,
    /defineEmits\s*\(/,
    /from\s+['"]vue['"]/, // 注意：这是 'from "vue"' 不是 'from "react"'
    /<script\s+setup>/,
  ]

  for (const pattern of vueCompositionPatterns) {
    if (pattern.test(trimmed)) {
      return true
    }
  }

  return false
}

/**
 * 自动检测代码类型
 * @param code - 代码内容
 * @param lang - 语言标识（可选）
 * @returns 代码类型
 */
export type CodeType = 'html' | 'react' | 'vue' | 'unknown'

export function detectCodeType(code: string, lang?: string): CodeType {
  // 优先使用语言标识
  if (lang) {
    if (isHtmlLanguage(lang)) return 'html'
    if (isReactLanguage(lang)) return 'react'
    if (isVueLanguage(lang)) return 'vue'
  }

  // 从内容检测（Vue 优先，因为 Vue SFC 可能包含 import 语句）
  const isVue = detectVueContent(code)
  const isReact = detectReactContent(code)
  const isHtml = detectHtmlContent(code)

  if (isVue) return 'vue'
  if (isReact) return 'react'
  if (isHtml) return 'html'

  return 'unknown'
}

/**
 * 提取 HTML 中的 body 内容
 * @param html - 完整 HTML
 * @returns body 内容或原始内容
 */
export function extractBodyContent(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  if (bodyMatch && bodyMatch[1]) {
    return bodyMatch[1]
  }
  return html
}

/**
 * 检测 HTML 是否包含不安全的标签
 * @param html - HTML 内容
 * @returns 是否包含不安全标签
 */
export function hasUnsafeTags(html: string): boolean {
  const unsafePatterns = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /javascript:/i,
    /on\w+\s*=/i, // 事件处理器
  ]

  return unsafePatterns.some(pattern => pattern.test(html))
}
