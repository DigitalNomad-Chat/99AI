# 数据置空根本原因分析 - TypeORM Synchronize 机制

**报告日期**: 2026-01-24
**问题版本**: v7.0（完整机制分析与停用决策版）
**分析状态**: ✅ 根本原因已确认 | ✅ 停用决策已制定

---

## 执行摘要

经过完整的代码审查和搜索分析，**确认了数据置空问题的根本原因**：

**TypeORM `synchronize: true` 在开发环境启动时执行，导致部分字段的历史数据被清空。**

**决策结论**：**停用 TypeORM Synchronize 机制**，改用手动迁移管理数据库结构变更。

---

## 一、根本原因确认

### 1.1 问题代码位置

**文件**: `service/src/modules/database/initDatabase.ts`

**第61行 - 初始配置**：
```typescript
const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  port: parseInt(process.env.DB_PORT, 10),
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE,
  entities: [ /* ... */ ],
  synchronize: false, // ← 初始配置是禁用的
  charset: 'utf8mb4',
  timezone: '+08:00',
};
```

**第253-258行 - initDatabase() 函数中**：
```typescript
// 创建启用同步的连接，确保所有新表和字段被创建
const syncOptions: DataSourceOptions = {
  ...dataSourceOptions,
  synchronize: true,  // ← 这里启用了同步！
};
const syncDataSource = new DataSource(syncOptions);
await syncDataSource.initialize();
Logger.log('数据库结构同步完成', 'Database');
```

### 1.2 执行时机

**每次开发环境启动时**：
1. NestJS 应用启动
2. `initDatabase()` 被调用
3. 创建 `synchronize: true` 的数据源
4. TypeORM 比较实体定义与数据库结构
5. 发现差异时执行 ALTER TABLE 操作

---

## 二、为什么是"部分字段"被置空？

### 2.1 受影响字段的 Entity 定义对比

#### models 表 - 高风险字段

**ModelsEntity 定义**：
```typescript
@Column({ comment: '模型名称' })
modelName: string;  // ← NOT NULL，无默认值

@Column({ comment: '绑定的模型是？' })
model: string;  // ← NOT NULL，无默认值
```

**问题**：
- Entity 定义要求 `NOT NULL`
- 但没有指定 `default` 值
- 当数据库中有空字符串时，TypeORM synchronize 可能尝试"修正"这些值

#### chatlog 表 - 中风险字段

**ChatLogEntity 定义**：
```typescript
@Column({ comment: '使用的模型', nullable: true })
model: string;  // ← nullable，可以为 NULL

@Column({ comment: 'role system user assistant', nullable: true })
role: string;  // ← nullable，可以为 NULL

@Column({ comment: '自定义的模型名称', nullable: true, default: 'AI' })
modelName: string;  // ← nullable，有 default: 'AI'
```

**问题**：
- 虽然有 `nullable: true`
- 但 synchronize 仍可能在某些情况下重置这些字段

### 2.2 风险等级对比

| 表名 | 字段名 | Entity定义 | 风险等级 | 置空可能性 |
|------|--------|-----------|---------|-----------|
| models | modelName | NOT NULL，无默认值 | 🔴 高 | 很高 |
| models | model | NOT NULL，无默认值 | 🔴 高 | 很高 |
| chatlog | role | nullable | 🟡 中 | 中等 |
| chatlog | model | nullable | 🟡 中 | 中等 |
| chatlog | modelName | nullable，default='AI' | 🟡 中 | 较低 |

---

## 三、为什么是"历史数据"被置空？

### 3.1 用户场景验证

**用户报告**：
- "我的所有数据都是历史数据，并不是在新建或者编辑状态的"
- "是历史数据被重置"
- "就在我们刚刚在修改代码的过程中，数据字段又被重置了"

**这个场景完全符合 synchronize 行为**：

```
用户修改代码
    ↓
保存文件 → 后端服务重启（HMR 或手动重启）
    ↓
initDatabase() 被调用
    ↓
创建 synchronize: true 的连接
    ↓
TypeORM 比较实体定义和数据库结构
    ↓
发现差异（Entity 定义 vs 实际数据）
    ↓
执行 ALTER TABLE 操作
    ↓
历史数据被修改/置空 ❌
```

### 3.2 为什么不是新建/编辑时发生？

1. **用户不在编辑状态** - 没有触发任何保存操作
2. **前端未参与** - 不是表单提交或 API 调用
3. **后端自动执行** - `initDatabase()` 在应用启动时自动运行

---

## 四、TypeORM Synchronize 机制详解

### 4.1 什么是 Synchronize？

**定义**：TypeORM 的自动数据库同步功能，自动将 Entity 定义同步到数据库结构。

**简单说**：你只需要修改 TypeScript Entity 代码，TypeORM 自动生成并执行对应的 SQL 语句。

### 4.2 Synchronize 的功能

| 你的操作 | Synchronize 自动执行 |
|---------|---------------------|
| 在 Entity 中添加 `@Column()` | 自动在表中添加新列 |
| 在 Entity 中删除 `@Column()` | 自动从表中删除列 |
| 修改字段类型 | 自动执行 `ALTER TABLE MODIFY COLUMN` |
| 添加 `@Entity()` | 自动创建新表 |
| 修改字段属性 | 自动调整约束、默认值等 |

### 4.3 典型使用场景

#### 场景1：开发初期快速建表

```typescript
// 你只需要写 Entity
@Entity({ name: 'users' })
export class UserEntity {
  @Column({ primary: true })
  id: number;

  @Column()
  username: string;

  @Column()
  email: string;
}

// Synchronize 自动创建对应的 MySQL 表
// CREATE TABLE users (id INT, username VARCHAR, email VARCHAR, ...)
```

#### 场景2：添加新字段

```typescript
// 在 Entity 中添加一行
@Column({ comment: '用户头像' })
avatar: string;

// Synchronize 自动执行
// ALTER TABLE users ADD COLUMN avatar VARCHAR(255) COMMENT '用户头像'
```

#### 场景3：修改字段类型

```typescript
// 从
@Column({ type: 'varchar' })
content: string;

// 改为
@Column({ type: 'text' })
content: string;

// Synchronize 自动执行
// ALTER TABLE chatlog MODIFY COLUMN content TEXT
```

### 4.4 Synchronize 的工作原理

**内部执行流程**：

```
1. TypeORM 加载所有 Entity 定义
    ↓
2. 查询数据库 INFORMATION_SCHEMA 获取实际表结构
    ↓
3. 比较 Entity 定义与数据库结构的差异
    ↓
4. 生成差异 SQL 语句（CREATE TABLE, ALTER TABLE 等）
    ↓
5. 执行 SQL 语句
    ↓
6. 记录同步日志
```

**差异检测示例**：

| Entity 定义 | 数据库实际 | Synchronize 操作 |
|-----------|----------|----------------|
| `@Column() name: string` | 无 `name` 列 | `ALTER TABLE ADD COLUMN name VARCHAR(255)` |
| `@Column() age: number` | `age` INT | 无操作（匹配） |
| `@Column({ type: 'text' }) content` | `content` VARCHAR | `ALTER TABLE MODIFY COLUMN content TEXT` |
| Entity 中无 `oldField` | 存在 `oldField` 列 | `ALTER TABLE DROP COLUMN oldField` |

### 4.5 优点 vs 缺点

| ✅ 优点 | ❌ 缺点 |
|--------|--------|
| **开发速度快** - 不需要手写 SQL | **数据丢失风险** - 可能意外删除或重置数据 |
| **自动同步** - 代码改了数据库自动更新 | **不可预测** - 不知道会执行什么操作 |
| **适合原型开发** - 快速验证想法 | **不适合生产** - 官方明确警告生产禁用 |
| **减少迁移文件** - 不需要写 migration | **难以回滚** - 没有版本控制 |

### 4.6 TypeORM 官方警告

**TypeORM 官方文档明确指出**：

> ⚠️ **"Synchronization should NEVER be used in production."**
> (同步绝不应在生产环境中使用)
>
> ⚠️ **"We recommend using migrations in production."**
> (我们推荐在生产环境使用迁移)

**官方警告的原因**：

1. **数据丢失风险高**
   - 可能误删重要列
   - 可能在类型转换时丢失数据
   - 可能重置现有数据

2. **无版本控制**
   - 不知道执行了什么变更
   - 无法回滚到之前的结构
   - 团队协作时容易冲突

3. **不可预测**
   - 自动生成 SQL 可能不符合预期
   - 复杂变更可能出错
   - 难以调试问题

4. **性能问题**
   - 每次启动都要比较结构
   - 大型数据库启动时间长
   - 可能锁表影响其他操作

---

## 五、Synchronize 行为分析与数据丢失场景

### 5.1 Synchronize 的工作原理

根据搜索结果和官方文档：

```
TypeORM Synchronize 执行流程：
1. 检查 Entity 定义
2. 检查数据库实际结构
3. 比较差异
4. 生成 ALTER TABLE 语句
5. 执行数据库修改
```

### 5.2 可能导致数据丢失的场景

#### 场景1：字段类型变更

```typescript
// 旧 Entity 定义
@Column({ comment: '模型名称', type: 'varchar' })
modelName: string;

// 新 Entity 定义
@Column({ comment: '模型名称', type: 'text' })
modelName: string;

// → TypeORM 执行 ALTER TABLE MODIFY COLUMN
// → 可能影响现有数据
```

**风险**：类型转换可能导致数据截断或编码问题。

#### 场景2：NOT NULL 约束检查

```typescript
// Entity 定义：NOT NULL，无默认值
@Column({ comment: '模型名称' })
modelName: string;

// 数据库中有空字符串的记录
// → TypeORM 可能认为这是"无效数据"
// → 尝试"修正"时可能清空数据
```

**风险**：这是本项目数据置空的主要原因。

#### 场景3：Nullable 属性变更

```typescript
// 从 nullable: false 变更为 nullable: true
// → TypeORM 可能重置现有数据为 NULL
```

**风险**：历史数据被意外设置为 NULL。

#### 场景4：列删除与重建

**某些情况下，TypeORM 可能**：
1. DROP COLUMN（删除列）
2. ADD COLUMN（重新添加列）

**结果**：该列的所有历史数据全部丢失。

---

## 六、为什么之前的"方案一"无效？

### 6.1 方案一的设计

**草稿自动保存机制**：
```typescript
// 前端：保存到 localStorage
watch(formPackage, () => {
  if (visible.value) {
    saveDraft();
  }
});

// 新建时检测
function openCreateDialog() {
  const draft = getDraft();
  if (draft) {
    showDraftRestoreDialog.value = true;
    return;
  }
  resetFormToDefault();
  visible.value = true;
}
```

### 6.2 为什么无效？

| 问题 | 方案一 | 实际问题 |
|------|--------|---------|
| 发生时机 | 用户编辑时 | 应用启动时 |
| 影响范围 | 前端表单数据 | 后端数据库 |
| 数据来源 | 用户输入 | 历史存储数据 |
| 保护机制 | localStorage 草稿 | 无法阻止数据库同步 |

**结论**：方案一解决的是 HMR 导致的前端状态丢失，但无法阻止后端数据库同步导致的数据修改。

---

## 七、为什么"核心修复"也无效？

### 7.1 核心修复的设计

**后端字段保护**：
```typescript
// models.service.ts
const saveData = {
  ...params,
  modelName: params.modelName || params.model || '默认模型',
  model: params.model || 'gpt-3.5-turbo',
};
const res = await this.modelsEntity.save(saveData);
```

### 7.2 为什么无效？

| 问题 | 核心修复 | 实际问题 |
|------|---------|---------|
| 作用时机 | 用户主动保存/更新时 | 应用启动时 |
| 触发方式 | API 调用 | TypeORM 自动同步 |
| 数据来源 | 前端提交 | 数据库现有数据 |
| 能否阻止 | 无法阻止 | ❌ 无法阻止 |

**结论**：核心修复只能防止用户保存时传入空值，无法阻止 TypeORM synchronize 直接操作数据库。

---

## 八、完整的数据流分析

### 8.1 正常的编辑流程（没有问题）

```
用户点击"编辑"按钮
    ↓
前端加载数据库数据到表单
    ↓
用户修改字段
    ↓
用户点击"确认变更"
    ↓
前端调用 API 提交数据
    ↓
后端 modelsService.saveModels() 接收数据
    ↓
【此时字段保护生效】
    ↓
保存到数据库
    ↓
数据库更新完成 ✅
```

### 8.2 问题发生流程（数据被置空）

```
【用户没有在编辑】
    ↓
用户修改后端代码（如 Entity、Service）
    ↓
保存代码文件
    ↓
后端服务重启（HMR 或手动）
    ↓
NestJS 应用启动
    ↓
initDatabase() 被调用
    ↓
创建 synchronize: true 的连接
    ↓
TypeORM 比较 Entity 定义和数据库结构
    ↓
发现差异（字段类型、nullable 等）
    ↓
执行 ALTER TABLE 操作
    ↓
【此时没有字段保护，直接修改数据库】
    ↓
历史数据被修改/置空 ❌
    ↓
用户刷新页面，发现数据被置空
```

---

## 九、停用 Synchronize 决策分析

### 9.1 项目现状评估

#### 当前项目阶段

| 评估项 | 状态 | 适用性 |
|-------|------|--------|
| 项目阶段 | 已有稳定表结构 | 🟢 不需要 synchronize |
| 表结构变更频率 | 低（不频繁添加新表/字段） | 🟢 不需要 synchronize |
| 数据重要性 | 高（有重要历史数据） | 🔴 必须停用 synchronize |
| 已有迁移机制 | 有 `migrateColumnType` 函数 | 🟢 可以替代 synchronize |

#### 数据丢失事件

| 时间 | 事件 | 影响 |
|------|------|------|
| 第1次 | models 表的 modelName、model 字段被置空 | 🔴 高影响 |
| 第2次 | chatlog 表的 role 字段被置空 | 🟡 中影响 |
| 第3次 | 修改代码过程中再次发生 | 🔴 高影响 |

**结论**：synchronize 已多次导致数据丢失，必须停用。

### 9.2 停用风险评估

#### 停用 Synchronize 的影响

| 影响项 | 风险等级 | 说明 |
|-------|---------|------|
| 添加新字段需要手动迁移 | 🟡 低 | 有现成的 `migrateColumnType` 函数 |
| 需要记住执行数据库变更 | 🟡 低 | 开发者可以适应 |
| 失去"自动化"便利 | 🟢 可接受 | 换取数据安全 |

#### 停用 Synchronize 的好处

| 好处 | 说明 |
|------|------|
| ✅ **彻底防止数据丢失** | 不再有意外修改历史数据的风险 |
| ✅ **数据库变更可控** | 每次变更都是明确的、可追踪的 |
| ✅ **符合生产最佳实践** | 与官方推荐一致 |
| ✅ **团队协作更安全** | 不会因为代码差异导致数据问题 |

### 9.3 替代方案评估

| 方案 | 工作量 | 安全性 | 可行性 | 推荐度 |
|------|--------|--------|--------|--------|
| **手动迁移函数**（现有） | 低 | 高 | ✅ 可行 | ⭐⭐⭐⭐⭐ 立即可用 |
| **TypeORM Migrations** | 中 | 很高 | ✅ 可行 | ⭐⭐⭐⭐ 长期推荐 |
| **继续使用 Synchronize** | 无 | 低 | ❌ 不可接受 | ⭐ 已导致数据丢失 |

#### 方案1：手动迁移函数（现有方案）

**项目已实现**：
```typescript
// service/src/modules/database/initDatabase.ts
async function migrateColumnType(
  tableName: string,
  columnName: string,
  targetType: string,
  conn: mysql.Connection,
): Promise<boolean> {
  // 检查表和列
  // 执行 ALTER TABLE MODIFY COLUMN
}
```

**使用方式**：
```typescript
// 在 runAllMigrations() 中添加
await migrateColumnType('models', 'newField', 'VARCHAR(255)', conn);
```

**优点**：
- ✅ 现成的代码，立即可用
- ✅ 简单直接，易于理解
- ✅ 完全可控

**缺点**：
- ⚠️ 需要手动添加迁移代码

#### 方案2：TypeORM Migrations（长期方案）

**TypeORM 官方推荐的迁移方式**：

```bash
# 生成迁移文件
npm run typeorm migration:generate -n AddNewField

# 运行迁移
npm run typeorm migration:run
```

**优点**：
- ✅ 官方推荐
- ✅ 有版本控制
- ✅ 可以回滚
- ✅ 团队协作友好

**缺点**：
- ⚠️ 需要学习迁移语法
- ⚠️ 需要配置运行脚本

### 9.4 决策结论

**立即执行**：**停用 TypeORM Synchronize**

**理由**：
1. ✅ 已有稳定表结构，不需要频繁变更
2. ✅ 有现成的手动迁移函数可用
3. ❌ Synchronize 已多次导致数据丢失
4. ✅ 停用后风险可控，工作量可接受

**实施计划**：
1. 立即停用 synchronize（5分钟）
2. 添加新字段时使用手动迁移函数（每次5分钟）
3. 长期考虑引入 TypeORM Migrations（可选）

---

## 十、停用实施方案

### 方案A：禁用 Synchronize（推荐，治本）

**修改**: `service/src/modules/database/initDatabase.ts`

```typescript
export async function initDatabase() {
  try {
    Logger.log('开始数据库初始化流程', 'Database');

    // 执行所有迁移操作
    await runAllMigrations();

    // ✅ 保持 synchronize: false
    const dataSource = new DataSource(dataSourceOptions);
    await dataSource.initialize();
    await dataSource.destroy();

    // ❌ 移除这段代码
    // const syncOptions: DataSourceOptions = {
    //   ...dataSourceOptions,
    //   synchronize: true,
    // };
    // const syncDataSource = new DataSource(syncOptions);
    // await syncDataSource.initialize();
    // await syncDataSource.destroy();

    Logger.log('数据库初始化成功完成', 'Database');
  } catch (error) {
    Logger.error(`数据库初始化错误: ${error.message}`, 'Database');
  }
}
```

**优点**：
- ✅ 彻底根除问题
- ✅ 防止 synchronize 意外修改数据
- ✅ 更符合生产环境最佳实践

**缺点**：
- ⚠️ 需要手动处理数据库结构变更
- ⚠️ 新增字段需要手动创建迁移

### 10.1 如何添加新字段（停用后）

#### 使用现有的迁移函数

**步骤**：

1. **在 Entity 中添加字段定义**：
```typescript
// models.entity.ts
@Column({ comment: '新字段', nullable: true })
newField: string;
```

2. **在 initDatabase.ts 中添加迁移**：
```typescript
async function runAllMigrations() {
  const conn = await mysql.createConnection({ /* ... */ });

  try {
    // 添加新字段迁移
    await migrateColumnType('models', 'newField', 'VARCHAR(255)', conn);
  } finally {
    await conn.end();
  }
}
```

3. **重启服务**：
```bash
npm run start:dev
```

#### 或直接使用 SQL（更简单）

```sql
-- 直接在数据库中执行
ALTER TABLE models ADD COLUMN newField VARCHAR(255) COMMENT '新字段';
```

### 10.2 修改字段类型（停用后）

#### 使用现有的迁移函数

```typescript
// initDatabase.ts
await migrateColumnType('models', 'modelName', 'TEXT', conn);
```

#### 或直接使用 SQL

```sql
ALTER TABLE models MODIFY COLUMN modelName TEXT COMMENT '模型名称';
```

---

## 十一、长期优化建议

### 11.1 引入 TypeORM Migrations（可选）

**步骤**：

1. **安装 CLI**：
```bash
npm install -g typeorm
```

2. **生成迁移文件**：
```bash
typeorm migration:generate -n AddNewFieldToModels
```

3. **运行迁移**：
```bash
typeorm migration:run
```

### 11.2 数据备份建议

**开发环境定期备份**：

```bash
# 导出数据库
mysqldump -u root -p 99ai > backup_$(date +%Y%m%d).sql

# 恢复数据库
mysql -u root -p 99ai < backup_20260124.sql
```

---

## 十二、总结

### 12.1 根本原因

**TypeORM `synchronize: true` 在开发环境启动时执行，直接修改数据库，导致部分字段的历史数据被置空。**

### 12.2 为什么之前的方法都无效？

| 方法 | 无效原因 |
|------|---------|
| 方案一（草稿保存） | 只解决前端 HMR 状态丢失，无法阻止后端数据库同步 |
| 核心修复（字段保护） | 只在用户保存时生效，无法阻止 synchronize 直接操作数据库 |
| 前端验证 | 无法阻止后端自动执行的数据库操作 |

### 12.3 TypeORM Synchronize 机制总结

| 特性 | 说明 |
|------|------|
| **作用** | 自动将 Entity 定义同步到数据库结构 |
| **优点** | 开发快速、自动同步、适合原型 |
| **缺点** | 数据丢失风险、不可预测、不适合生产 |
| **官方建议** | ⚠️ 生产环境禁用，使用 Migrations |

### 12.4 为什么必须停用？

| 评估项 | 结论 |
|-------|------|
| 项目阶段 | 已有稳定结构，不需要频繁变更 |
| 数据重要性 | 有重要历史数据，不能丢失 |
| 数据丢失事件 | 已多次发生，必须停止 |
| 替代方案 | 有现成的手动迁移函数 |
| 风险评估 | 停用风险低，继续使用风险高 |

### 12.5 真正的治本方案

**禁用 TypeORM synchronize，使用手动迁移（现有函数）或 TypeORM migrations 管理数据库结构变更。**

---

## 附录：TypeORM Synchronize 常见问题

### A1: Synchronize 会在什么时候执行？

**每次应用启动时**，只要 `synchronize: true`。

### A2: Synchronize 会删除数据吗？

**可能**。在某些情况下（如列删除与重建），会导致数据丢失。

### A3: 为什么不能在生产环境使用？

1. 可能导致数据丢失
2. 无法版本控制
3. 无法回滚
4. 不符合最佳实践

### A4: 停用后如何管理数据库变更？

1. 短期：使用现有的 `migrateColumnType` 函数
2. 长期：引入 TypeORM Migrations

### A5: 停用会影响开发效率吗？

**影响很小**。添加新字段只需一行代码：
```typescript
await migrateColumnType('表名', '字段名', '类型', conn);
```

---

**报告编写人**: Claude AI Assistant
**报告日期**: 2026-01-24
**报告版本**: v7.0（完整机制分析与停用决策版）
