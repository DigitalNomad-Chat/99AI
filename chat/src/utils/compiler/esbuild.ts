/**
 * esbuild 封装工具
 * 用于在浏览器中编译 TypeScript/JSX 代码
 *
 * @module utils/compiler/esbuild
 */

import * as esbuildWasm from 'esbuild-wasm'
import { version } from 'esbuild-wasm/package.json'

let esbuildInitialized = false
let esbuild: typeof esbuildWasm | null = null

/**
 * 初始化 esbuild
 */
export async function initializeEsbuild(): Promise<void> {
  if (esbuildInitialized) return

  try {
    // 动态导入 esbuild-wasm
    esbuild = await import('esbuild-wasm')
    await esbuild.initialize({
      wasmURL: `https://unpkg.com/esbuild-wasm@${version}/esbuild.wasm`,
    })
    esbuildInitialized = true
  } catch (error) {
    console.error('Failed to initialize esbuild:', error)
    throw new Error('esbuild 初始化失败')
  }
}

/**
 * 编译 JavaScript/TypeScript 代码
 * @param code - 源代码
 * @param options - 编译选项
 * @returns 编译后的代码
 */
export async function compileCode(
  code: string,
  options: {
    format?: 'iife' | 'cjs' | 'esm'
    target?: 'es2020' | 'es2015' | 'es5'
    jsx?: 'transform' | 'preserve'
    jsxFactory?: string
    jsxFragment?: string
    minify?: boolean
  } = {}
): Promise<string> {
  await initializeEsbuild()

  if (!esbuild) {
    throw new Error('esbuild 未初始化')
  }

  try {
    const result = await esbuild.transform(code, {
      format: options.format || 'iife',
      target: options.target || 'es2020',
      jsx: options.jsx || 'transform',
      jsxFactory: options.jsxFactory || 'React.createElement',
      jsxFragment: options.jsxFragment || 'React.Fragment',
      minify: options.minify || false,
      loader: 'tsx',
    })

    return result.code
  } catch (error) {
    console.error('esbuild compile error:', error)
    throw error
  }
}

/**
 * 编译 React 组件
 * @param code - React 组件代码
 * @returns 编译后的代码
 */
export async function compileReactComponent(code: string): Promise<string> {
  return compileCode(code, {
    format: 'iife',
    target: 'es2020',
    jsx: 'transform',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  })
}

/**
 * 编译 Vue 组件
 * @param code - Vue 组件代码
 * @returns 编译后的代码
 */
export async function compileVueComponent(code: string): Promise<string> {
  // Vue 组件通常不需要 JSX 转换
  return compileCode(code, {
    format: 'iife',
    target: 'es2020',
    jsx: 'preserve',
  })
}

/**
 * 转译 TypeScript 为 JavaScript
 * @param code - TypeScript 代码
 * @returns JavaScript 代码
 */
export async function transpileTypeScript(code: string): Promise<string> {
  return compileCode(code, {
    format: 'esm',
    target: 'es2020',
  })
}

/**
 * 检查 esbuild 是否已初始化
 */
export function isEsbuildReady(): boolean {
  return esbuildInitialized
}

/**
 * 重置 esbuild（用于测试）
 */
export function resetEsbuild(): void {
  esbuildInitialized = false
  esbuild = null
}
