/**
 * Artifact Store
 * 管理组件预览状态
 *
 * @module store/modules/artifact
 */

import { defineStore } from 'pinia'
import type { Artifact, ArtifactFile, ArtifactState, ArtifactType, FileTreeNode } from './helper'
import { defaultArtifactState, getLocalArtifactState, setLocalArtifactState } from './helper'
import type { VirtualFile, VirtualFileSystem } from '@/utils/compiler/virtualFS'
import { createDefaultFS } from '@/utils/compiler/virtualFS'

export const useArtifactStore = defineStore('artifact-store', {
  state: (): ArtifactState => ({
    ...defaultArtifactState(),
  }),

  getters: {
    /**
     * 当前选中的文件
     */
    selectedFile(state): ArtifactFile | null {
      if (!state.currentArtifact || !state.selectedFileId) {
        return state.currentArtifact?.files[0] || null
      }
      return (
        state.currentArtifact.files.find(f => f.id === state.selectedFileId) ||
        state.currentArtifact.files[0] ||
        null
      )
    },

    /**
     * 是否有编译错误
     */
    hasErrors(state): boolean {
      return state.compileErrors.length > 0
    },

    /**
     * 是否支持自动更新
     */
    canAutoUpdate(state): boolean {
      return state.autoUpdate && state.previewVisible
    },

    /**
     * 获取文件树（用于显示）
     */
    fileTree(state): FileTreeNode[] {
      if (!state.currentArtifact?.fileTree) {
        return []
      }
      // 返回根节点的子节点
      return state.currentArtifact.fileTree.children || []
    },

    /**
     * 是否为多文件项目
     */
    isMultiFile(state): boolean {
      return (state.currentArtifact?.files.length || 0) > 1
    },
  },

  actions: {
    /**
     * 创建新的 Artifact
     */
    createArtifact(
      type: ArtifactType,
      title: string,
      code: string,
      multiFile: boolean = false
    ): string {
      const id = `artifact-${Date.now()}`

      const artifact: Artifact = {
        id,
        type,
        title,
        files: [
          {
            id: `file-${Date.now()}`,
            name: getDefaultFileName(type),
            type: getFileType(type),
            content: code,
          },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // 如果是多文件项目，初始化文件树
      if (multiFile) {
        artifact.fileTree = this.createFileTreeFromFiles(artifact.files)
      }

      this.currentArtifact = artifact
      this.selectedFileId = artifact.files[0].id
      this.compileErrors = []

      return id
    },

    /**
     * 从文件列表创建文件树
     */
    createFileTreeFromFiles(files: ArtifactFile[]): FileTreeNode {
      const root: FileTreeNode = {
        id: 'root',
        name: 'root',
        type: 'directory',
        children: [],
      }

      for (const file of files) {
        const node: FileTreeNode = {
          id: file.id,
          name: file.name,
          type: 'file',
          content: file.content,
          language: file.language || this.inferLanguage(file.name),
        }
        root.children!.push(node)
      }

      return root
    },

    /**
     * 从 VirtualFileSystem 创建 Artifact
     */
    createFromVirtualFS(vfs: VirtualFileSystem, type: ArtifactType, title: string): string {
      const tree = vfs.getTree()
      if (!tree) {
        return this.createArtifact(type, title, '', false)
      }

      const files = this.extractFilesFromTree(tree)
      const id = `artifact-${Date.now()}`

      const artifact: Artifact = {
        id,
        type,
        title,
        files,
        fileTree: tree,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      this.currentArtifact = artifact
      this.selectedFileId = files[0]?.id || null
      this.compileErrors = []

      return id
    },

    /**
     * 从树结构提取文件列表
     */
    extractFilesFromTree(node: FileTreeNode): ArtifactFile[] {
      const files: ArtifactFile[] = []

      function traverse(n: FileTreeNode) {
        if (n.type === 'file' && n.content !== undefined) {
          files.push({
            id: n.id,
            name: n.name,
            type: this.inferFileType(n.name),
            content: n.content,
            language: n.language,
          })
        }

        if (n.children) {
          for (const child of n.children) {
            traverse(child)
          }
        }
      }

      traverse(node)
      return files
    },

    /**
     * 推断文件类型
     */
    inferFileType(filename: string): ArtifactFileType {
      const ext = filename.split('.').pop()?.toLowerCase() || ''
      const typeMap: Record<string, ArtifactFileType> = {
        html: 'html',
        htm: 'html',
        css: 'css',
        js: 'javascript',
        jsx: 'jsx',
        ts: 'typescript',
        tsx: 'tsx',
        vue: 'vue',
        md: 'markdown',
        mmd: 'markdown',
        json: 'json',
      }
      return typeMap[ext] || 'html'
    },

    /**
     * 推断语言
     */
    inferLanguage(filename: string): string {
      const ext = filename.split('.').pop()?.toLowerCase() || ''
      const langMap: Record<string, string> = {
        html: 'html',
        css: 'css',
        js: 'javascript',
        jsx: 'jsx',
        ts: 'typescript',
        tsx: 'tsx',
        vue: 'vue',
        md: 'markdown',
        mmd: 'markdown',
        json: 'json',
      }
      return langMap[ext] || 'text'
    },

    /**
     * 更新当前 Artifact
     */
    updateArtifact(code: string): void {
      if (!this.currentArtifact || !this.selectedFileId) return

      const file = this.currentArtifact.files.find(f => f.id === this.selectedFileId)
      if (file) {
        file.content = code
        this.currentArtifact.updatedAt = Date.now()
      }
    },

    /**
     * 添加新文件
     */
    addFile(name: string, content: string = '', language?: string): string {
      if (!this.currentArtifact) {
        throw new Error('No active artifact')
      }

      const file: ArtifactFile = {
        id: `file-${Date.now()}`,
        name,
        type: this.inferFileType(name),
        content,
        language: language || this.inferLanguage(name),
      }

      this.currentArtifact.files.push(file)
      this.currentArtifact.updatedAt = Date.now()

      // 更新文件树
      if (this.currentArtifact.fileTree) {
        this.currentArtifact.fileTree.children!.push({
          id: file.id,
          name: file.name,
          type: 'file',
          content: file.content,
          language: file.language,
        })
      }

      return file.id
    },

    /**
     * 删除文件
     */
    deleteFile(fileId: string): boolean {
      if (!this.currentArtifact) return false

      const index = this.currentArtifact.files.findIndex(f => f.id === fileId)
      if (index === -1) return false

      this.currentArtifact.files.splice(index, 1)
      this.currentArtifact.updatedAt = Date.now()

      // 如果删除的是当前选中的文件，重新选择
      if (this.selectedFileId === fileId) {
        this.selectedFileId = this.currentArtifact.files[0]?.id || null
      }

      return true
    },

    /**
     * 重命名文件
     */
    renameFile(fileId: string, newName: string): boolean {
      if (!this.currentArtifact) return false

      const file = this.currentArtifact.files.find(f => f.id === fileId)
      if (!file) return false

      file.name = newName
      this.currentArtifact.updatedAt = Date.now()

      return true
    },

    /**
     * 切换文件夹展开状态
     */
    toggleFolder(folderId: string): void {
      if (this.expandedFolders.has(folderId)) {
        this.expandedFolders.delete(folderId)
      } else {
        this.expandedFolders.add(folderId)
      }
      setLocalArtifactState(this.$state)
    },

    /**
     * 设置当前 Artifact
     */
    setCurrentArtifact(artifact: Artifact | null): void {
      this.currentArtifact = artifact
      this.selectedFileId = artifact?.files[0]?.id || null
    },

    /**
     * 打开预览
     */
    openPreview(): void {
      this.previewVisible = true
    },

    /**
     * 关闭预览
     */
    closePreview(): void {
      this.previewVisible = false
    },

    /**
     * 选择文件
     */
    selectFile(fileId: string): void {
      this.selectedFileId = fileId
    },

    /**
     * 设置编译错误
     */
    setCompileErrors(errors: string[]): void {
      this.compileErrors = errors
    },

    /**
     * 清除编译错误
     */
    clearCompileErrors(): void {
      this.compileErrors = []
    },

    /**
     * 切换自动更新
     */
    toggleAutoUpdate(): void {
      this.autoUpdate = !this.autoUpdate
      setLocalArtifactState(this.$state)
    },

    /**
     * 切换文件树显示
     */
    toggleFileTree(): void {
      this.showFileTree = !this.showFileTree
      setLocalArtifactState(this.$state)
    },

    /**
     * 重置状态
     */
    reset(): void {
      this.$reset()
    },
  },
})

/**
 * 获取默认文件名
 */
function getDefaultFileName(type: ArtifactType): string {
  const names: Record<ArtifactType, string> = {
    html: 'index.html',
    react: 'App.jsx',
    vue: 'App.vue',
    mermaid: 'diagram.mmd',
    markmap: 'mindmap.md',
  }
  return names[type] || 'index.html'
}

/**
 * 获取文件类型
 */
function getFileType(type: ArtifactType): ArtifactFileType {
  const types: Record<ArtifactType, ArtifactFileType> = {
    html: 'html',
    react: 'jsx',
    vue: 'vue',
    mermaid: 'markdown',
    markmap: 'markdown',
  }
  return types[type] || 'html'
}

/**
 * 不使用 Pinia 的调用方式
 */
export function useArtifactStoreWithOut() {
  return useArtifactStore()
}
