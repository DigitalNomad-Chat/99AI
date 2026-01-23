/**
 * 导出工具
 * 用于将 Artifact 导出为各种格式
 *
 * @module utils/compiler/exporter
 */

import JSZip from 'jszip'
import { toPng, toCanvas } from 'html-to-image'
import jsPDF from 'jspdf'
import type { Artifact, ArtifactFile } from '@/store/modules/artifact/helper'

/**
 * 导出格式
 */
export type ExportFormat = 'zip' | 'pdf' | 'png' | 'html'

/**
 * 导出配置
 */
export interface ExportConfig {
  format: ExportFormat
  filename?: string
  includeSource?: boolean
  quality?: number // 图片质量 0-1
}

/**
 * 导出为 ZIP
 */
export async function exportAsZip(
  artifact: Artifact,
  config: ExportConfig = { format: 'zip' }
): Promise<Blob> {
  const zip = new JSZip()

  // 添加所有文件
  for (const file of artifact.files) {
    zip.file(file.name, file.content)
  }

  // 生成 ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' })

  return zipBlob
}

/**
 * 导出为单个 HTML 文件
 */
export function exportAsHtml(artifact: Artifact): Blob {
  // 如果是单文件，直接返回
  if (artifact.files.length === 1) {
    const content = artifact.files[0].content
    return new Blob([content], { type: 'text/html' })
  }

  // 多文件：创建一个包含所有文件的 HTML
  const mainFile = artifact.files.find(f => f.name.endsWith('.html')) || artifact.files[0]
  const otherFiles = artifact.files.filter(f => f.id !== mainFile.id)

  // 简单的内联处理：将 CSS/JS 直接嵌入
  let htmlContent = mainFile.content

  // 如果有其他文件，添加引用链接
  if (otherFiles.length > 0) {
    const fileLinks = otherFiles
      .map(f => `<a href="${f.name}" download="${f.name}">${f.name}</a>`)
      .join(' | ')

    htmlContent = htmlContent.replace(
      '</body>',
      `
        <div style="position:fixed;bottom:20px;right:20px;padding:10px;background:#f0f0f0;border-radius:8px;font-size:12px;">
          <strong>附件：</strong>${fileLinks}
        </div>
      </body>`
    )
  }

  return new Blob([htmlContent], { type: 'text/html' })
}

/**
 * 导出为 PDF
 */
export async function exportAsPdf(
  artifact: Artifact,
  config: ExportConfig = { format: 'pdf' }
): Promise<Blob> {
  const htmlBlob = exportAsHtml(artifact)
  const htmlContent = await blobToString(htmlBlob)

  // 创建临时 DOM 元素进行渲染
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = '800px'
  container.style.minHeight = '600px'
  container.style.backgroundColor = '#ffffff'
  container.style.zIndex = '-9999'
  container.style.padding = '20px'
  container.innerHTML = htmlContent
  document.body.appendChild(container)

  // 等待图片和字体加载
  await waitForResources(container)

  try {
    // 使用 toCanvas 获取 canvas 元素
    const canvas = await toCanvas(container, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    })

    if (!canvas) {
      throw new Error('Failed to generate canvas')
    }

    // 创建 PDF
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgWidth, imgHeight],
    })

    // 将 canvas 转换为 data URL
    const imageData = canvas.toDataURL('image/png')
    pdf.addImage(imageData, 'PNG', 0, 0, imgWidth, imgHeight)

    const pdfBlob = pdf.output('blob')
    return pdfBlob
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * 导出为 PNG 图片
 */
export async function exportAsPng(
  artifact: Artifact,
  config: ExportConfig = { format: 'png' }
): Promise<Blob> {
  const htmlBlob = exportAsHtml(artifact)
  const htmlContent = await blobToString(htmlBlob)

  // 创建临时 DOM 元素进行渲染
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.top = '0'
  container.style.left = '0'
  container.style.width = '800px'
  container.style.minHeight = '600px'
  container.style.backgroundColor = '#ffffff'
  container.style.zIndex = '-9999'
  container.style.padding = '20px'
  container.innerHTML = htmlContent
  document.body.appendChild(container)

  // 等待图片和字体加载
  await waitForResources(container)

  try {
    // 使用 toCanvas 获取 canvas 元素
    const canvas = await toCanvas(container, {
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
    })

    if (!canvas) {
      throw new Error('Failed to generate canvas')
    }

    // 将 canvas 转换为 Blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        'image/png',
        config.quality || 0.95
      )
    })
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * 等待资源加载完成
 */
async function waitForResources(container: HTMLElement): Promise<void> {
  // 等待基本 DOM 渲染
  await new Promise(resolve => setTimeout(resolve, 100))

  // 等待所有图片加载
  const images = container.querySelectorAll('img')
  const imagePromises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve()
    return new Promise<void>(resolve => {
      img.onload = () => resolve()
      img.onerror = () => resolve() // 即使失败也继续
      // 超时保护
      setTimeout(() => resolve(), 2000)
    })
  })

  // 等待所有字体加载
  await document.fonts.ready

  // 等待所有图片
  await Promise.all(imagePromises)

  // 额外等待确保渲染完成
  await new Promise(resolve => setTimeout(resolve, 200))
}

/**
 * 触发下载
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 统一导出函数
 */
export async function exportArtifact(
  artifact: Artifact,
  config: ExportConfig
): Promise<{ blob: Blob; filename: string }> {
  const { format } = config
  const filename = config.filename || `${artifact.title}.${format}`

  let blob: Blob

  switch (format) {
    case 'zip':
      blob = await exportAsZip(artifact, config)
      break
    case 'pdf':
      blob = await exportAsPdf(artifact, config)
      break
    case 'png':
      blob = await exportAsPng(artifact, config)
      break
    case 'html':
      blob = exportAsHtml(artifact)
      break
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }

  return { blob, filename }
}

/**
 * Blob 转换为字符串
 */
async function blobToString(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(blob)
  })
}

/**
 * 获取推荐文件名
 */
export function getRecommendedFilename(artifact: Artifact, format: ExportFormat): string {
  const timestamp = new Date().toISOString().slice(0, 10)
  return `${artifact.title}-${timestamp}.${format}`
}

/**
 * 批量导出
 */
export async function exportMultiple(artifacts: Artifact[], format: ExportFormat): Promise<Blob> {
  const zip = new JSZip()

  for (const artifact of artifacts) {
    const { blob, filename } = await exportArtifact(artifact, { format })
    zip.file(filename, blob)
  }

  return await zip.generateAsync({ type: 'blob' })
}

/**
 * 创建自包含的 HTML（将所有资源内联）
 */
export function createSelfContainedHtml(artifact: Artifact): string {
  // 合并所有文件到一个 HTML
  const htmlFile = artifact.files.find(f => f.type === 'html') || artifact.files[0]
  const cssFiles = artifact.files.filter(f => f.type === 'css')
  const jsFiles = artifact.files.filter(
    f => f.type === 'javascript' || f.type === 'jsx' || f.type === 'tsx'
  )

  let html = htmlFile.content

  // 注入 CSS
  if (cssFiles.length > 0) {
    const cssContent = cssFiles.map(f => `<style>\n${f.content}\n</style>`).join('\n')
    html = html.replace('</head>', `${cssContent}\n</head>`)
  }

  // 注入 JS
  if (jsFiles.length > 0) {
    const jsContent = jsFiles.map(f => `<script>\n${f.content}\n<\/script>`).join('\n')
    html = html.replace('</body>', `${jsContent}\n</body>`)
  }

  return html
}
