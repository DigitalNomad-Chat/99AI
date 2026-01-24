# FastGPT工作流对接 - 执行计划

## 任务概述

对接FastGPT工作流平台，支持变量配置和文件上传，融合99AI现有文件上传机制。

## 技术方案

- **方案**: 融合现有文件上传机制（方案A）
- **优先级**: 仅实现FastGPT，Dify/n8n暂缓
- **兼容性**: 保持向后兼容

## 执行阶段

---

## 阶段一：数据库改造 (预计2天)

### 步骤 1.1：修改 AppEntity 实体

**文件**: `service/src/modules/app/app.entity.ts`

**操作**:
- 新增字段 `appType` (应用类型: 0-智能体 1-FastGPT工作流)
- 新增字段 `workflowApiUrl` (工作流API地址)
- 新增字段 `workflowApiKey` (工作流API Key)
- 新增字段 `workflowAppId` (FastGPT AppId)

**预期结果**: Entity包含工作流配置字段

---

### 步骤 1.2：创建数据库迁移

**文件**: `service/src/migrations/{timestamp}-AddWorkflowFieldsToApp.ts`

**操作**:
- 创建TypeORM迁移文件
- 添加四个新字段的ALTER TABLE语句
- 设置默认值保持兼容性

**预期结果**: 数据库表结构更新成功

---

### 步骤 1.3：更新 DTO 定义

**文件**: `service/src/modules/app/dto/*.dto.ts`

**操作**:
- 更新 `CreateAppDto` 添加工作流字段验证
- 更新 `UpdateAppDto` 添加工作流字段可选验证
- 新增 `WorkflowConfigDto` 用于工作流配置验证

**预期结果**: DTO验证规则完善

---

## 阶段二：后端服务改造 (预计3天)

### 步骤 2.1：创建工作流适配器

**文件**: `service/src/modules/workflow/workflow.adapter.ts` (新建)

**操作**:
- 创建 `WorkflowAdapter` 接口
- 创建 `FastGPTAdapter` 类实现接口
- 实现 `buildRequest()` 方法：构建FastGPT请求格式
- 实现 `parseResponse()` 方法：解析FastGPT响应
- 实现 `transformFileUrl()` 方法：转换99AI文件格式到FastGPT格式

**预期结果**: 工作流适配器可独立测试

---

### 步骤 2.2：创建工作流服务

**文件**: `service/src/modules/workflow/workflow.service.ts` (新建)

**操作**:
- 创建 `WorkflowService` 类
- 实现 `callFastGPT()` 方法：调用FastGPT API
- 实现 `validateWorkflowConfig()` 方法：验证配置完整性
- 实现 `formatMessages()` 方法：格式化消息（含文件转换）
- 实现流式和非流式响应处理

**预期结果**: 工作流调用核心功能完成

---

### 步骤 2.3：创建工作流模块

**文件**: `service/src/modules/workflow/workflow.module.ts` (新建)

**操作**:
- 创建 `WorkflowModule`
- 导入 `HttpModule`（用于axios请求）
- 导出 `WorkflowService`

**预期结果**: 模块可被其他模块导入

---

### 步骤 2.4：更新 AppService

**文件**: `service/src/modules/app/app.service.ts`

**操作**:
- 注入 `WorkflowService`
- 修改 `createApp()` 方法：验证工作流配置
- 修改 `updateApp()` 方法：支持工作流字段更新
- 修改 `queryOneCat()` 方法：返回工作流配置信息

**预期结果**: 应用服务支持工作流配置

---

### 步骤 2.5：创建工作流Controller

**文件**: `service/src/modules/workflow/workflow.controller.ts` (新建)

**操作**:
- 创建 `WorkflowController`
- 实现 `POST /workflow/call` 接口：调用工作流
- 实现 `POST /workflow/validate` 接口：验证工作流配置

**预期结果**: 工作流API可被前端调用

---

## 阶段三：管理员后台改造 (预计2天)

### 步骤 3.1：扩展特殊模型选择器

**文件**: `admin/src/views/app/application.vue`

**操作**:
- 在"特殊模型"单选组中添加 `fastgpt` 选项
- 添加 `watchEffect` 监听 `specialModelType` 变化
- 当选择工作流时，自动隐藏"APP预设"和"固定模型"

**预期结果**: 可以选择FastGPT工作流类型

---

### 步骤 3.2：添加工作流配置表单

**文件**: `admin/src/views/app/application.vue`

**操作**:
- 在模板区域添加条件渲染块：`v-if="specialModelType === 'fastgpt'"`
- 添加三个输入框：
  - API地址 (workflowApiUrl)
  - API Key (workflowApiKey)
  - 工作流ID (workflowAppId)
- 添加表单验证规则

**预期结果**: 可以配置工作流连接信息

---

### 步骤 3.3：增强变量配置编辑器

**文件**: `admin/src/components/PromptTemplateEditor/index.vue` (需检查是否存在)

**操作**:
- 扩展字段类型：添加 `file` 和 `image` 类型
- 添加 `isVariable` 布尔字段：是否作为工作流变量
- 添加 `variableName` 字符串字段：变量名
- 添加 `required` 布尔字段：是否必填
- 更新UI渲染逻辑支持新字段类型

**预期结果**: 可以配置工作流变量（含文件）

---

### 步骤 3.4：更新应用保存逻辑

**文件**: `admin/src/api/app.ts`

**操作**:
- 更新 `createApp()` API调用传递工作流字段
- 更新 `updateApp()` API调用传递工作流字段
- 添加工作流配置的提交前验证

**预期结果**: 管理员可以保存工作流应用

---

## 阶段四：前端用户界面改造 (预计3天)

### 步骤 4.1：更新应用列表显示

**文件**: `chat/src/views/chat/components/AppList/index.vue`

**操作**:
- 在应用卡片上添加工作流类型徽章
- 添加 `getWorkflowTypeName()` 辅助函数
- 更新 `App` 接口添加 `appType` 字段

**预期结果**: 用户可以识别工作流应用

---

### 步骤 4.2：创建工作流配置弹窗组件

**文件**: `chat/src/components/WorkflowConfigModal/index.vue` (新建)

**操作**:
- 创建模态弹窗组件
- 实现变量字段渲染（文本、选择、文件、图片）
- 实现文件上传预览功能
- 实现表单验证逻辑
- 暴露 `submit` 事件返回配置数据

**预期结果**: 用户可以配置工作流变量

---

### 步骤 4.3：更新AppList调用逻辑

**文件**: `chat/src/views/chat/components/AppList/index.vue`

**操作**:
- 修改 `handleRunApp()` 方法
- 检测 `app.appType > 0` 时打开配置弹窗
- 注入 `showWorkflowConfigModal` 方法
- 监听配置弹窗的提交事件

**预期结果**: 点击工作流应用时弹出配置界面

---

### 步骤 4.4：修改@应用调用机制

**文件**: `chat/src/views/chat/components/Footer/index.vue`

**操作**:
- 修改 `handleInput()` 方法中的 `selectApp` 逻辑
- 检测应用类型：`app.appType > 0`
- 工作流应用强制打开配置弹窗
- 普通智能体保持原有逻辑

**预期结果**: @工作流应用时弹出配置界面

---

### 步骤 4.5：创建工作流API服务

**文件**: `chat/src/api/workflow.ts` (新建)

**操作**:
- 创建 `callWorkflowAPI()` 函数
- 请求体包含：appId, variables, message, fileUrl
- 处理流式和非流式响应
- 导出供组件使用

**预期结果**: 前端可以调用工作流API

---

### 步骤 4.6：更新对话调用逻辑

**文件**: `chat/src/views/chat/components/Footer/index.vue`

**操作**:
- 修改 `handleSubmit()` 方法
- 检测到工作流应用时调用 `callWorkflowAPI()`
- 将 fileUrl 转换为工作流格式
- 处理工作流响应并显示

**预期结果**: 工作流应用可以正常对话

---

## 阶段五：测试与优化 (预计2天)

### 步骤 5.1：功能测试

**测试项**:
- [ ] 管理员创建FastGPT工作流应用
- [ ] 配置工作流连接信息
- [ ] 配置工作流变量（含文件）
- [ ] 用户在应用广场查看工作流应用
- [ ] 用户通过@调用工作流应用
- [ ] 文件上传功能
- [ ] 变量传递正确性
- [ ] 流式响应处理

---

### 步骤 5.2：向后兼容性测试

**测试项**:
- [ ] 现有智能体应用正常工作
- [ ] 现有文件上传功能不受影响
- [ ] 现有GPTs应用正常工作

---

### 步骤 5.3：错误处理与用户提示

**优化项**:
- 添加工作流连接失败提示
- 添加变量验证错误提示
- 添加文件上传失败重试机制
- 添加工作流执行超时处理

---

## 文件清单

### 新建文件

| 文件路径 | 说明 |
|---------|------|
| `service/src/migrations/{timestamp}-AddWorkflowFieldsToApp.ts` | 数据库迁移 |
| `service/src/modules/workflow/workflow.adapter.ts` | 工作流适配器 |
| `service/src/modules/workflow/workflow.service.ts` | 工作流服务 |
| `service/src/modules/workflow/workflow.module.ts` | 工作流模块 |
| `service/src/modules/workflow/workflow.controller.ts` | 工作流控制器 |
| `chat/src/components/WorkflowConfigModal/index.vue` | 工作流配置弹窗 |
| `chat/src/api/workflow.ts` | 工作流API服务 |

### 修改文件

| 文件路径 | 修改内容 |
|---------|----------|
| `service/src/modules/app/app.entity.ts` | 添加工作流字段 |
| `service/src/modules/app/app.service.ts` | 支持工作流配置 |
| `service/src/modules/app/dto/*.dto.ts` | 更新DTO验证 |
| `admin/src/views/app/application.vue` | 添加工作流配置表单 |
| `admin/src/api/app.ts` | 更新API调用 |
| `chat/src/views/chat/components/AppList/index.vue` | 显示工作流标识 |
| `chat/src/views/chat/components/Footer/index.vue` | 修改@调用逻辑 |

---

## 数据库字段定义

```typescript
@Column({ comment: '应用类型: 0-智能体 1-FastGPT工作流', default: 0 })
appType: number;

@Column({ comment: '工作流API地址', nullable: true, type: 'text' })
workflowApiUrl: string;

@Column({ comment: '工作流API Key', nullable: true, type: 'text' })
workflowApiKey: string;

@Column({ comment: 'FastGPT AppId', nullable: true })
workflowAppId: string;
```

---

## 关键函数签名

```typescript
// 工作流适配器
interface WorkflowAdapter {
  buildRequest(app: AppEntity, variables: any, message: string, fileUrl?: string): AxiosRequestConfig;
  parseResponse(response: any): WorkflowResult;
  transformFileUrl(fileUrl: string): MessageContent[];
}

// 工作流服务
class WorkflowService {
  async callFastGPT(options: CallWorkflowOptions): Promise<WorkflowResult>;
  async validateWorkflowConfig(config: WorkflowConfigDto): Promise<boolean>;
  formatMessages(variables: any, message: string, fileUrl?: string): any[];
}

// 前端配置弹窗
interface WorkflowConfigData {
  [variableName: string]: string | File;
}
```

---

## 执行顺序

```
阶段一（数据库） → 阶段二（后端） → 阶段三（管理后台） → 阶段四（前端） → 阶段五（测试）
      ↓                 ↓                  ↓                    ↓                ↓
   Entity/迁移      适配器/服务         配置表单            配置弹窗/@调用      功能测试
                    Controller         变量编辑器           API服务          兼容性测试
```

---

## 风险提示

1. **文件格式转换**: 99AI的fileUrl格式与FastGPT格式需要仔细映射
2. **流式响应**: 需要确保FastGPT的流式响应能正确处理
3. **向后兼容**: 必须确保现有智能体应用不受影响

---

**计划制定完成，等待用户批准后进入执行阶段。**
