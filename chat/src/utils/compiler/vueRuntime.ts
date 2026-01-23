/**
 * Vue 运行时工具
 * 用于在 iframe 中预览 Vue 组件
 *
 * @module utils/compiler/vueRuntime
 */

import { version as vueVersion } from 'vue/package.json'

/**
 * Vue CDN URLs
 */
const VUE_CDN = {
  vue: `https://unpkg.com/vue@${vueVersion}/dist/vue.global.js`,
}

/**
 * 创建 Vue 预览 HTML
 * @param code - Vue 组件代码
 * @param style - 可选的 CSS 样式
 * @returns 完整的 HTML 文档
 */
export function createVuePreview(code: string, style = ''): string {
  // 提取模板、脚本和样式
  const { template, script, componentStyle } = parseVueComponent(code)

  // 移除脚本中的 import 语句
  const cleanedScript = removeVueImportStatements(script)

  // 提取返回的变量名
  const returnVars = extractReturnVariables(cleanedScript)

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vue Preview</title>
  <script src="${VUE_CDN.vue}"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; }
    #app-wrapper { width: 100%; max-width: 600px; }
    ${style}
    ${componentStyle}
  </style>
</head>
<body>
  <div id="app-wrapper">
    <div id="app">${template}</div>
  </div>
  <script>
    try {
      // 从全局 Vue 对象解构所需的 API
      const { createApp, ref, computed, onMounted, onUnmounted, watch } = Vue;

      // 用户代码中声明的变量和函数
      ${cleanedScript}

      // 创建 Vue 应用
      const app = createApp({
        setup() {
          // 返回所有用户声明的变量和函数
          return ${returnVars};
        }
      });

      app.mount('#app');
    } catch (error) {
      console.error('Vue render error:', error);
      document.getElementById('app').innerHTML = '<div style="color: red; padding: 20px; background: white; border-radius: 8px;">Error: ' + error.message + '<br><br><pre style="font-size: 12px;">' + error.stack + '</pre></div>';
    }
  </script>
</body>
</html>`
}

/**
 * 创建 Vue 错误边界 HTML
 * @param error - 错误信息
 * @returns 包含错误显示的 HTML
 */
export function createVueErrorPreview(error: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a1a;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .error-container {
      max-width: 600px;
      background: #2d2d2d;
      border-radius: 8px;
      padding: 20px;
      border-left: 4px solid #42b883;
    }
    .error-title {
      color: #42b883;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
    }
    .error-message {
      color: #ccc;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-title">Vue 组件渲染错误</div>
    <div class="error-message">${escapeHtml(error)}</div>
  </div>
</body>
</html>`
}

/**
 * 解析 Vue 组件代码
 */
function parseVueComponent(code: string) {
  let template = ''
  let script = ''
  let componentStyle = ''

  // 提取 <template>
  const templateMatch = code.match(/<template[^>]*>([\s\S]*?)<\/template>/)
  if (templateMatch) {
    template = templateMatch[1].trim()
  }

  // 提取 <script>
  const scriptMatch = code.match(/<script[^>]*>([\s\S]*?)<\/script>/)
  if (scriptMatch) {
    script = scriptMatch[1].trim()
  }

  // 提取 <style>
  const styleMatch = code.match(/<style[^>]*>([\s\S]*?)<\/style>/)
  if (styleMatch) {
    componentStyle = styleMatch[1].trim()
  }

  // 如果没有 SFC 格式，尝试作为纯 JS 代码处理
  if (!template && !script && !componentStyle) {
    script = code
  }

  return { template, script, componentStyle }
}

/**
 * 移除 Vue import 语句
 * 因为在 iframe 中，Vue 已经通过 CDN 全局加载
 */
function removeVueImportStatements(script: string): string {
  // 移除所有类型的 Vue import 语句
  // 匹配格式：
  // - import { ref } from 'vue';
  // - import { ref, computed } from 'vue';
  // - import * as Vue from 'vue';
  return script
    .replace(/^import\s+\{[^}]*\}\s+from\s+['"]vue['"];\s*$/gm, '')
    .replace(/^import\s+\*[^']*'vue['"];\s*$/gm, '')
    .replace(/^import\s+.*from\s+['"]vue['"];\s*$/gm, '')
    .trim()
}

/**
 * 从 script setup 代码中提取需要返回的变量名
 * 自动识别 const/let/var 声明的变量和函数
 */
function extractReturnVariables(script: string): string {
  // 移除空行
  const lines = script.split('\n').filter(line => line.trim())

  // 提取所有的变量声明和函数声明
  const declarations: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    // 跳过空行和注释
    if (!trimmed || trimmed.startsWith('//')) continue

    // 匹配 const/let/var 声明
    if (/^(const|let|var)\s/.test(trimmed)) {
      // 提取变量名
      const match = trimmed.match(/^(?:const|let|var)\s+(\w+)/)
      if (match) {
        declarations.push(match[1])
      }
    }
    // 匹配函数声明
    else if (/^(function\s+\w+|const\s+\w+\s*=\s*(?:function|\([^)]*\)\s*=>))/) {
      const funcMatch = trimmed.match(
        /^(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:function|\([^)]*\)\s*=>))/
      )
      if (funcMatch) {
        declarations.push(funcMatch[1] || funcMatch[2])
      }
    }
  }

  // 返回包含所有声明的对象字面量
  if (declarations.length > 0) {
    return `{ ${declarations.join(', ')} }`
  }

  return '{}'
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 检查代码是否为 Vue 组件
 */
export function isVueComponent(code: string): boolean {
  const vuePatterns = [
    /<template[^>]*>/,
    /import.*from\s+['"]vue['"]/,
    /from\s+['"]vue['"]/,
    /Vue\.(?:ref|computed|onMounted|defineComponent)/,
    /\.vue['"]/,
  ]

  return vuePatterns.some(pattern => pattern.test(code))
}

/**
 * 获取 Vue CDN URLs
 */
export function getVueCdnUrls() {
  return VUE_CDN
}
