/**
 * React 运行时工具
 * 用于在 iframe 中预览 React 组件
 *
 * @module utils/compiler/reactRuntime
 */

// 使用 React 18，因为 React 19 没有 UMD 构建版本
const REACT_VERSION = '18.3.1'
const BABEL_VERSION = '7.23.5'

/**
 * React CDN URLs
 */
const REACT_CDN = {
  react: `https://unpkg.com/react@${REACT_VERSION}/umd/react.development.js`,
  reactDom: `https://unpkg.com/react-dom@${REACT_VERSION}/umd/react-dom.development.js`,
  babel: `https://unpkg.com/@babel/standalone@${BABEL_VERSION}/babel.min.js`,
}

/**
 * 创建 React 预览 HTML
 * @param code - React 组件代码
 * @param style - 可选的 CSS 样式
 * @returns 完整的 HTML 文档
 */
export function createReactPreview(code: string, style = ''): string {
  // 移除 import 语句，因为库已通过 CDN 全局加载
  const cleanedCode = removeImportStatements(code)

  // 提取组件名称
  const componentName = extractComponentName(cleanedCode) || 'App'

  // 在代码前添加 hooks 解构，让用户代码可以直接使用 useState 等
  const hooksDeclaration = `
// 从全局 React 对象解构常用的 hooks
const { useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef, useImperativeHandle, useLayoutEffect, useDebugValue, useDeferredValue, useTransition, useId } = React;
`

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>React Preview</title>
  <script crossorigin src="${REACT_CDN.react}"></script>
  <script crossorigin src="${REACT_CDN.reactDom}"></script>
  <script src="${REACT_CDN.babel}"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    #root { min-height: 100vh; padding: 20px; display: flex; align-items: center; justify-content: center; }
    ${style}
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel" data-presets="react,env">
    ${hooksDeclaration}
    ${cleanedCode}

    // 渲染组件
    const root = ReactDOM.createRoot(document.getElementById('root'));
    try {
      root.render(React.createElement(${componentName}));
    } catch (error) {
      console.error('React render error:', error);
      document.getElementById('root').innerHTML = '<div style="color: red; padding: 20px;">Error: ' + error.message + '</div>';
    }
  </script>
</body>
</html>`
}

/**
 * 创建 React 错误边界 HTML
 * @param error - 错误信息
 * @returns 包含错误显示的 HTML
 */
export function createReactErrorPreview(error: string): string {
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
      border-left: 4px solid #ff4444;
    }
    .error-title {
      color: #ff4444;
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
    <div class="error-title">React 组件渲染错误</div>
    <div class="error-message">${escapeHtml(error)}</div>
  </div>
</body>
</html>`
}

/**
 * 提取组件名称
 */
function extractComponentName(code: string): string | null {
  // 匹配 function ComponentName() {}
  const functionMatch = code.match(/function\s+(\w+)\s*\(/)
  if (functionMatch) return functionMatch[1]

  // 匹配 const ComponentName = () => {}
  const arrowMatch = code.match(/const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|\w+\s*\()/)
  if (arrowMatch) return arrowMatch[1]

  // 匹配 const ComponentName = function() {}
  const constFunctionMatch = code.match(/const\s+(\w+)\s*=\s*function/)
  if (constFunctionMatch) return constFunctionMatch[1]

  return null
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
 * 移除 import 语句
 * 因为在 iframe 中，库已经通过 CDN 全局加载
 */
function removeImportStatements(code: string): string {
  // 使用一个更全面的正则表达式来匹配所有类型的 React import 语句
  // 匹配格式：
  // - import React from 'react';
  // - import React, { useState } from 'react';
  // - import { useState, useEffect } from 'react';
  // - import ReactDOM from 'react-dom';
  const importPattern =
    /^import\s+(?:(?:React|ReactDOM)|(?:\{[^}]*\}))?(?:\s*,\s*(?:\{[^}]*\}))?\s+from\s+['"](react|react-dom)['"];\s*$/gm

  const cleanedCode = code.replace(importPattern, '').trim()

  // 如果还有其他 import 语句（多行格式），也移除它们
  const finalCode = cleanedCode
    .replace(/^import\s+\{[\s\S]*?\}\s+from\s+['"](react|react-dom)['"];\s*$/gm, '')
    .replace(/^import\s+React[\s\S]*?from\s+['"]react['"];\s*$/gm, '')
    .trim()

  return finalCode
}

/**
 * 检查代码是否为 React 组件
 */
export function isReactComponent(code: string): boolean {
  const reactPatterns = [
    /import\s+.*\s+from\s+['"]react['"]/,
    /from\s+['"]react['"]/,
    /React\.(?:Component|FC|useState|useEffect)/,
    /jsx|tsx|jsx/,
  ]

  return reactPatterns.some(pattern => pattern.test(code))
}

/**
 * 获取 React CDN URLs
 */
export function getReactCdnUrls() {
  return REACT_CDN
}
