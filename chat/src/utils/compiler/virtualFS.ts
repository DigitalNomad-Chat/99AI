/**
 * 虚拟文件系统
 * 用于管理 Artifact 的多文件结构
 *
 * @module utils/compiler/virtualFS
 */

/**
 * 文件类型枚举
 */
export enum FileType {
  File = 'file',
  Directory = 'directory',
}

/**
 * 虚拟文件接口
 */
export interface VirtualFile {
  id: string
  name: string
  type: FileType
  content?: string
  language?: string
  children?: VirtualFile[]
  parentId?: string | null
  createdAt: number
  updatedAt: number
}

/**
 * 文件系统配置
 */
export interface FileSystemConfig {
  rootName: string
  autoIncrementId: boolean
}

/**
 * 虚拟文件系统类
 */
export class VirtualFileSystem {
  private files: Map<string, VirtualFile> = new Map()
  private config: FileSystemConfig
  private nextId: number = 1

  constructor(config: Partial<FileSystemConfig> = {}) {
    this.config = {
      rootName: config.rootName || 'project',
      autoIncrementId: config.autoIncrementId ?? true,
    }

    // 创建根目录
    this.createDirectory(this.config.rootName, null)
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    if (this.config.autoIncrementId) {
      return `file-${this.nextId++}`
    }
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 获取根目录
   */
  getRoot(): VirtualFile | undefined {
    return this.files.get(this.config.rootName)
  }

  /**
   * 获取文件
   */
  getFile(id: string): VirtualFile | undefined {
    return this.files.get(id)
  }

  /**
   * 获取所有文件
   */
  getAllFiles(): VirtualFile[] {
    return Array.from(this.files.values())
  }

  /**
   * 获取所有平级文件列表（包括目录）
   */
  getFlatList(): VirtualFile[] {
    return Array.from(this.files.values()).filter(f => f.parentId)
  }

  /**
   * 获取目录树结构
   */
  getTree(): VirtualFile | undefined {
    const root = this.getRoot()
    if (!root) return undefined

    return this.buildTree(root.id)
  }

  /**
   * 递归构建树结构
   */
  private buildTree(id: string): VirtualFile | undefined {
    const file = this.files.get(id)
    if (!file) return undefined

    // 创建副本以避免修改原始数据
    const tree: VirtualFile = { ...file }

    if (file.type === FileType.Directory && file.children) {
      tree.children = file.children.map(child => this.buildTree(child.id)).filter(Boolean) as VirtualFile[]
    }

    return tree
  }

  /**
   * 创建文件
   */
  createFile(name: string, parentId: string, content: string = '', language?: string): VirtualFile {
    const id = this.generateId()
    const now = Date.now()

    const file: VirtualFile = {
      id,
      name,
      type: FileType.File,
      content,
      language,
      parentId,
      createdAt: now,
      updatedAt: now,
    }

    this.files.set(id, file)

    // 添加到父目录的 children
    const parent = this.files.get(parentId)
    if (parent && parent.type === FileType.Directory) {
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(file)
    }

    return file
  }

  /**
   * 创建目录
   */
  createDirectory(name: string, parentId: string | null): VirtualFile {
    const id = name === this.config.rootName ? name : this.generateId()
    const now = Date.now()

    const directory: VirtualFile = {
      id,
      name,
      type: FileType.Directory,
      children: [],
      parentId,
      createdAt: now,
      updatedAt: now,
    }

    this.files.set(id, directory)

    // 如果有父目录，添加到父目录的 children
    if (parentId) {
      const parent = this.files.get(parentId)
      if (parent && parent.type === FileType.Directory) {
        if (!parent.children) {
          parent.children = []
        }
        parent.children.push(directory)
      }
    }

    return directory
  }

  /**
   * 更新文件内容
   */
  updateFile(id: string, content: string): boolean {
    const file = this.files.get(id)
    if (!file || file.type !== FileType.File) {
      return false
    }

    file.content = content
    file.updatedAt = Date.now()
    return true
  }

  /**
   * 重命名文件或目录
   */
  rename(id: string, newName: string): boolean {
    const file = this.files.get(id)
    if (!file) return false

    file.name = newName
    file.updatedAt = Date.now()
    return true
  }

  /**
   * 删除文件或目录
   */
  delete(id: string): boolean {
    const file = this.files.get(id)
    if (!file) return false

    // 如果是目录，递归删除所有子文件
    if (file.type === FileType.Directory && file.children) {
      for (const child of file.children) {
        this.delete(child.id)
      }
    }

    // 从父目录的 children 中移除
    if (file.parentId) {
      const parent = this.files.get(file.parentId)
      if (parent && parent.children) {
        parent.children = parent.children.filter(child => child.id !== id)
      }
    }

    return this.files.delete(id)
  }

  /**
   * 移动文件或目录
   */
  move(id: string, newParentId: string): boolean {
    const file = this.files.get(id)
    if (!file) return false

    const oldParentId = file.parentId
    const newParent = this.files.get(newParentId)

    if (!newParent || newParent.type !== FileType.Directory) {
      return false
    }

    // 从旧父目录移除
    if (oldParentId) {
      const oldParent = this.files.get(oldParentId)
      if (oldParent && oldParent.children) {
        oldParent.children = oldParent.children.filter(child => child.id !== id)
      }
    }

    // 添加到新父目录
    file.parentId = newParentId
    if (!newParent.children) {
      newParent.children = []
    }
    newParent.children.push(file)
    file.updatedAt = Date.now()

    return true
  }

  /**
   * 获取文件的扩展名
   */
  getExtension(file: VirtualFile): string {
    if (file.type !== FileType.File) return ''
    const parts = file.name.split('.')
    return parts.length > 1 ? parts[parts.length - 1] : ''
  }

  /**
   * 根据扩展名推断语言
   */
  inferLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'vue': 'vue',
      'html': 'html',
      'htm': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'php': 'php',
      'svg': 'svg',
      'xml': 'xml',
    }

    return languageMap[extension] || 'text'
  }

  /**
   * 导出为 JSON（用于持久化）
   */
  toJSON(): string {
    const root = this.getTree()
    return JSON.stringify(root, null, 2)
  }

  /**
   * 从 JSON 导入（用于恢复）
   */
  static fromJSON(json: string): VirtualFileSystem {
    const data = JSON.parse(json)
    const fs = new VirtualFileSystem({ rootName: data.name })

    // 递归导入文件
    const importFile = (fileData: any, parentId: string | null = null): void => {
      if (fileData.type === FileType.Directory) {
        const dir = fs.createDirectory(fileData.name, parentId)
        if (fileData.children) {
          for (const child of fileData.children) {
            importFile(child, dir.id)
          }
        }
      } else {
        fs.createFile(fileData.name, parentId || '', fileData.content || '', fileData.language)
      }
    }

    importFile(data)
    return fs
  }

  /**
   * 清空文件系统
   */
  clear(): void {
    this.files.clear()
    this.nextId = 1
    this.createDirectory(this.config.rootName, null)
  }
}

/**
 * 创建默认的虚拟文件系统
 */
export function createDefaultFS(): VirtualFileSystem {
  const fs = new VirtualFileSystem({ rootName: 'artifact' })

  // 创建默认的目录结构
  const srcDir = fs.createDirectory('src', 'artifact')

  // 创建示例文件
  fs.createFile('index.html', srcDir.id, getDefaultTemplate('html'), 'html')
  fs.createFile('styles.css', srcDir.id, '', 'css')

  return fs
}

/**
 * 获取默认模板内容
 */
function getDefaultTemplate(type: string): string {
  const templates: Record<string, string> = {
    html: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Artifact</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  <h1>Hello, Artifact!</h1>
  <p>Start editing to see your changes.</p>
</body>
</html>`,
    css: `/* Styles */
body {
  margin: 0;
  padding: 0;
}`,
    js: `// JavaScript
console.log('Hello from Artifact!');`,
    vue: `<template>
  <div class="container">
    <h1>{{ message }}</h1>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const message = ref('Hello from Vue!')
</script>

<style scoped>
.container {
  padding: 20px;
}
</style>`,
    react: `import React, { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>Hello from React!</h1>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  )
}

export default App`,
  }

  return templates[type] || ''
}
