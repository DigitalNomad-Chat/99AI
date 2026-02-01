-- 99AI 开放API功能 - 数据库迁移
-- 版本: v1.0
-- 日期: 2026-01-31

-- 1. 创建 api_keys 表
CREATE TABLE IF NOT EXISTS `api_keys` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT '用户ID',
  `api_key` varchar(48) NOT NULL COMMENT 'API Key (sk-前缀)',
  `name` varchar(100) DEFAULT NULL COMMENT 'API Key 名称/备注',
  `expires_at` datetime DEFAULT NULL COMMENT '过期时间 (NULL=永不过期)',
  `is_active` tinyint(1) DEFAULT 1 COMMENT '是否启用',
  `total_requests` int DEFAULT 0 COMMENT '总调用次数',
  `last_used_at` datetime DEFAULT NULL COMMENT '最后使用时间',
  `last_used_ip` varchar(20) DEFAULT NULL COMMENT '最后使用IP',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_api_key` (`api_key`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='API Keys';

-- 2. models 表新增字段 (如果字段不存在则添加)
SET @dbname = DATABASE();
SET @tablename = 'models';
SET @columnname = 'is_api_available';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = @dbname
    AND TABLE_NAME = @tablename
    AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE `', @tablename, '` ADD COLUMN `', @columnname, '` tinyint DEFAULT 1 COMMENT ''是否在开放API中可用''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 3. config 表新增配置 (如果配置不存在则添加)
-- 注意：根据实际 config 表结构使用 configKey 和 configVal
INSERT IGNORE INTO `config` (`configKey`, `configVal`, `public`, `status`) VALUES
('api_key_max_per_user', '5', 1, 1),
('api_key_rate_limit', '60', 1, 1);

-- 验证迁移
SELECT 'Migration completed successfully!' AS status;
SELECT COUNT(*) AS api_keys_table_exists FROM information_schema.tables WHERE table_schema = @dbname AND table_name = 'api_keys';
SELECT COUNT(*) AS config_rows_inserted FROM `config` WHERE `configKey` IN ('api_key_max_per_user', 'api_key_rate_limit');
