-- ============================================
-- RAG 知识库系统数据库迁移脚本
-- ============================================
-- 执行方式：
--   mysql -u root -p chatgpt < rag_knowledge_base.sql
-- 或在 MySQL 客户端中执行 source /path/to/rag_knowledge_base.sql
-- ============================================

-- 1. 创建知识库表
CREATE TABLE IF NOT EXISTS `knowledge_bases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL COMMENT '知识库名称',
  `description` text COMMENT '知识库描述',
  `userId` int COMMENT '创建者用户Id',
  `embeddingModelId` int COMMENT '嵌入模型Id',
  `chunkMaxSize` int NOT NULL DEFAULT 1000 COMMENT '分块最大Token数',
  `chunkOverlapSize` int NOT NULL DEFAULT 100 COMMENT '分块重叠Token数',
  `chunkMinSize` int NOT NULL DEFAULT 50 COMMENT '分块最小Token数',
  `isActive` int NOT NULL DEFAULT 1 COMMENT '是否启用 0:禁用 1:启用',
  `isPublic` int NOT NULL DEFAULT 0 COMMENT '是否公开 0:私有 1:公开',
  `metadataConfig` text COMMENT '元数据配置(JSON)',
  `fileCount` int NOT NULL DEFAULT 0 COMMENT '文件数量',
  `chunkCount` int NOT NULL DEFAULT 0 COMMENT '分块数量',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deletedAt` datetime COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_kb_user` (`userId`),
  KEY `idx_kb_public` (`isPublic`, `isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库表';

-- 2. 创建知识库文件表
CREATE TABLE IF NOT EXISTS `kb_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `knowledgeBaseId` int NOT NULL COMMENT '知识库Id',
  `fileName` varchar(255) NOT NULL COMMENT '文件名',
  `displayName` varchar(255) NOT NULL COMMENT '展示名称',
  `fileSize` int NOT NULL DEFAULT 0 COMMENT '文件大小(字节)',
  `fileType` varchar(255) COMMENT '文件MIME类型',
  `fileExtension` varchar(50) COMMENT '文件扩展名',
  `contentHash` varchar(64) COMMENT '内容MD5哈希',
  `filePath` text COMMENT '文件存储路径',
  `content` longtext COMMENT '文件内容',
  `relativePath` varchar(500) COMMENT '相对路径',
  `parentFolderId` int COMMENT '父文件夹Id',
  `isDirectory` int NOT NULL DEFAULT 0 COMMENT '是否是文件夹 0:文件 1:文件夹',
  `processingStatus` varchar(20) NOT NULL DEFAULT 'pending' COMMENT '处理状态 pending/processing/completed/failed',
  `progressPercentage` int NOT NULL DEFAULT 0 COMMENT '处理进度百分比',
  `currentStep` varchar(100) COMMENT '当前处理步骤',
  `errorMessage` text COMMENT '错误信息',
  `totalChunks` int NOT NULL DEFAULT 0 COMMENT '总分块数',
  `totalTokens` int NOT NULL DEFAULT 0 COMMENT '总Token数',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deletedAt` datetime COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_kbf_kb` (`knowledgeBaseId`),
  KEY `idx_kbf_status` (`processingStatus`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库文件表';

-- 3. 创建知识库分块表
CREATE TABLE IF NOT EXISTS `kb_chunks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `fileId` int NOT NULL COMMENT '文件Id',
  `knowledgeBaseId` int NOT NULL COMMENT '知识库Id',
  `content` longtext COMMENT '分块内容',
  `chunkIndex` int NOT NULL DEFAULT 0 COMMENT '分块索引',
  `vectorId` varchar(255) COMMENT '向量库中的Id',
  `embeddingDimensions` int NOT NULL DEFAULT 1536 COMMENT '嵌入维度',
  `tokenCount` int NOT NULL DEFAULT 0 COMMENT 'Token数量',
  `metadata` text COMMENT '元数据(JSON)',
  `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `deletedAt` datetime COMMENT '删除时间',
  PRIMARY KEY (`id`),
  KEY `idx_kbc_file` (`fileId`),
  KEY `idx_kbc_kb` (`knowledgeBaseId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='知识库分块表';

-- 4. 插入默认嵌入模型（如果 models 表中没有 embedding 模型）
-- 注意：请将 key 字段替换为您的实际 API Key，或留空使用全局 openaiBaseKey
INSERT INTO `models` (
  `keyType`, `modelName`, `model`, `modelAvatar`, `modelOrder`,
  `maxModelTokens`, `max_tokens`, `maxRounds`, `timeout`, `deduct`,
  `deductDeepThink`, `deductType`, `isTokenBased`, `isFileUpload`,
  `isImageUpload`, `tokenFeeRatio`, `remark`, `key`, `status`,
  `useCount`, `useToken`, `proxyUrl`, `modelLimits`, `modelDescription`,
  `isNetworkSearch`, `deepThinkingType`, `isMcpTool`, `systemPrompt`,
  `systemPromptType`, `drawingType`, `is_api_available`
) SELECT
  1, 'Text Embedding 3 Small', 'text-embedding-3-small', '', 99,
  64000, 4096, 12, 300, 1,
  1, 1, 0, 0,
  0, 0, '默认嵌入模型，用于知识库文本向量化', '', 1,
  0, 0, '', 999, 'OpenAI text-embedding-3-small，1536维向量',
  1, 0, 0, '',
  0, 0, 0
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM `models` WHERE `model` = 'text-embedding-3-small'
);
