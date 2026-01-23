/**
 * Artifact Store 类型定义
 * 用于管理组件预览状态
 *
 * @module store/modules/artifact/helper
 */

import { ss } from '@/utils/storage'

const LOCAL_NAME = 'artifactStorage'

/**
 * Artifact 文件类型
 */
export type ArtifactFileType = 'html' | 'css' | 'javascript' | 'typescript' | 'jsx' | 'tsx' | 'vue' | 'markdown' | 'json'

/**
 * Artifact 内容类型
 */
export type ArtifactType = 'html' | 'react' | 'vue' | 'mermaid' | 'markmap'

/**
 * Artifact 文件
 */
export interface ArtifactFile {
  id: string
  name: string
  type: ArtifactFileType
  content: string
  language?: string
}

/**
 * 文件树节点（用于显示）
 */
export interface FileTreeNode {
  id: string
  name: string
  type: 'file' | 'directory'
  content?: string
  language?: string
  children?: FileTreeNode[]
  parentId?: string | null
  isExpanded?: boolean
}

/**
 * Artifact 数据结构
 */
export interface Artifact {
  id: string
  type: ArtifactType
  title: string
  files: ArtifactFile[]
  fileTree?: FileTreeNode  // 文件树结构
  createdAt: number
  updatedAt: number
}

/**
 * Artifact State
 */
export interface ArtifactState {
  currentArtifact: Artifact | null
  previewVisible: boolean
  selectedFileId: string | null
  autoUpdate: boolean
  compileErrors: string[]
  // 新增：文件树展开状态
  expandedFolders: Set<string>
  // 新增：是否显示文件树
  showFileTree: boolean
}

/**
 * 默认设置
 */
export function defaultArtifactState(): ArtifactState {
  return {
    currentArtifact: null,
    previewVisible: false,
    selectedFileId: null,
    autoUpdate: true,
    compileErrors: [],
    expandedFolders: new Set(),
    showFileTree: false,
  }
}

/**
 * 获取本地存储的状态
 */
export function getLocalArtifactState(): ArtifactState {
  const localState: ArtifactState | undefined = ss.get(LOCAL_NAME)
  if (!localState) {
    return { ...defaultArtifactState(), expandedFolders: new Set() }
  }
  return {
    ...defaultArtifactState(),
    ...localState,
    expandedFolders: new Set(localState.expandedFolders || []),
  }
}

/**
 * 保存状态到本地存储
 */
export function setLocalArtifactState(state: ArtifactState): void {
  // 将 Set 转换为数组以便序列化
  const serializableState = {
    ...state,
    expandedFolders: Array.from(state.expandedFolders),
  }
  ss.set(LOCAL_NAME, serializableState)
}
