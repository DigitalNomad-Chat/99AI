/**
 * HTML 清理工具
 * 使用 DOMPurify 防止 XSS 攻击
 *
 * @module utils/sanitizer
 */

import DOMPurify from 'dompurify'

/**
 * DOMPurify 配置
 * 安全优先：仅允许安全的 HTML 标签和属性
 */
const PURIFY_CONFIG: DOMPurify.Config = {
  // 允许的标签
  ALLOWED_TAGS: [
    // 基础结构
    'div',
    'span',
    'p',
    'br',
    'hr',
    // 标题
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    // 文本格式
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'sub',
    'sup',
    'del',
    'ins',
    'mark',
    'small',
    'code',
    'pre',
    // 列表
    'ul',
    'ol',
    'li',
    // 表格
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
    'caption',
    // 表单
    'form',
    'input',
    'textarea',
    'button',
    'select',
    'option',
    'label',
    'fieldset',
    'legend',
    // 多媒体
    'img',
    'video',
    'audio',
    'source',
    'track',
    'figure',
    'figcaption',
    // 其他
    'a',
    'blockquote',
    'q',
    'cite',
    'abbr',
    'address',
    'section',
    'article',
    'aside',
    'header',
    'footer',
    'nav',
    'main',
    'details',
    'summary',
  ],

  // 允许的属性
  ALLOWED_ATTR: [
    // 通用属性
    'id',
    'class',
    'style',
    // 链接和引用
    'href',
    'src',
    'cite',
    // 文本属性
    'title',
    'alt',
    'width',
    'height',
    // 表单属性
    'type',
    'name',
    'value',
    'placeholder',
    'required',
    'disabled',
    'readonly',
    'min',
    'max',
    'step',
    'maxlength',
    'pattern',
    'accept',
    'multiple',
    // ARIA 属性
    'aria-*',
    'role',
    // 其他
    'colspan',
    'rowspan',
    'target',
    'rel',
    'download',
  ],

  // 允许的 URI 协议
  ALLOWED_URI_REGEXP:
    /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,

  // 保持文档结构
  KEEP_CONTENT: true,
}

/**
 * 严格模式配置（用于不受信任的内容）
 */
const STRICT_CONFIG: DOMPurify.Config = {
  ...PURIFY_CONFIG,
  ALLOWED_TAGS: [
    'div',
    'span',
    'p',
    'br',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'strong',
    'em',
    'u',
    'code',
    'pre',
    'ul',
    'ol',
    'li',
  ],
  ALLOWED_ATTR: ['id', 'class', 'style'],
}

/**
 * 清理 HTML 内容
 * @param html - 原始 HTML
 * @param strict - 是否使用严格模式
 * @returns 清理后的安全 HTML
 */
export function sanitizeHtml(html: string, strict = false): string {
  const config = strict ? STRICT_CONFIG : PURIFY_CONFIG
  return DOMPurify.sanitize(html, config)
}

/**
 * 清理并移除所有脚本相关内容
 * @param html - 原始 HTML
 * @returns 完全清理后的 HTML
 */
export function sanitizeHtmlStrict(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'],
  })
}

/**
 * 验证 HTML 是否安全
 * @param html - 待验证的 HTML
 * @returns 是否安全
 */
export function isHtmlSafe(html: string): boolean {
  const cleaned = DOMPurify.sanitize(html, PURIFY_CONFIG)
  return cleaned === html
}

/**
 * 导出配置供外部使用
 */
export const SANITIZER_CONFIG = {
  PURIFY_CONFIG,
  STRICT_CONFIG,
} as const
