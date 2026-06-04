# 99AI P1 高价值功能实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 TTS/ASR 语音能力、Bot 网关扩展（QQ/飞书/Discord/企微）、审计日志系统三大高价值功能。

**Architecture:** 基于现有 NestJS 架构，审计日志采用 AOP 拦截器 + 独立数据表；TTS 在现有 OpenAI TTS 基础上扩展 ASR 和多提供商；Bot 网关采用适配器模式，复用微信公众号的 token 管理和消息分发逻辑。

**Tech Stack:** NestJS 10 + TypeORM + OpenAI SDK + Redis + SQLite 向量库（知识库复用）

---

## 现有基础设施

| 功能 | 现状 | 可复用性 |
|------|------|----------|
| TTS 语音合成 | `chat.service.ts:1424` 已实现 OpenAI `tts-1` 合成 + 上传 + `ttsUrl` 字段 | 高 |
| Bot 网关（微信公众号） | `official/` 模块完整实现：验证/POST/菜单/二维码/用户绑定 | 高 |
| 审计日志 | 无独立模块，`chatLog` 仅记录对话，`CustomLoggerService` 仅控制台输出 | 低 |

---

## File Structure

### 审计日志系统

| 文件 | 职责 |
|------|------|
| `service/src/modules/audit/entities/audit-log.entity.ts` | 审计日志实体 |
| `service/src/modules/audit/audit.service.ts` | 审计日志服务：记录/查询/清理 |
| `service/src/modules/audit/audit.controller.ts` | 管理端查询接口 |
| `service/src/modules/audit/audit.interceptor.ts` | NestJS 拦截器：自动捕获 HTTP 请求 |
| `service/src/modules/audit/audit.module.ts` | 模块定义 |
| `admin/src/views/audit/index.vue` | 管理端审计日志查看页面 |
| `admin/src/api/modules/audit.ts` | 审计日志 API 模块 |
| `admin/src/router/modules/audit.menu.ts` | 审计日志路由菜单 |

### TTS/ASR 语音能力

| 文件 | 职责 |
|------|------|
| `service/src/modules/voice/voice.module.ts` | 语音模块 |
| `service/src/modules/voice/voice.controller.ts` | TTS/ASR API 接口 |
| `service/src/modules/voice/voice.service.ts` | 语音服务：TTS 合成 + ASR 识别 |
| `service/src/modules/voice/entities/voice-log.entity.ts` | 语音调用记录实体 |
| `service/src/modules/voice/dto/tts.dto.ts` | TTS 请求 DTO |
| `service/src/modules/voice/dto/asr.dto.ts` | ASR 请求 DTO |
| `chat/src/components/VoiceButton/index.vue` | 聊天界面语音输入/输出按钮 |
| `chat/src/api/voice.ts` | 前端语音 API |

### Bot 网关扩展

| 文件 | 职责 |
|------|------|
| `service/src/modules/bot-gateway/bot-gateway.module.ts` | Bot 网关模块 |
| `service/src/modules/bot-gateway/bot-gateway.service.ts` | 网关服务：统一消息分发 |
| `service/src/modules/bot-gateway/entities/bot.entity.ts` | Bot 实例实体 |
| `service/src/modules/bot-gateway/entities/bot-message.entity.ts` | Bot 消息实体 |
| `service/src/modules/bot-gateway/adapters/wecom.adapter.ts` | 企业微信适配器 |
| `service/src/modules/bot-gateway/adapters/feishu.adapter.ts` | 飞书适配器 |
| `service/src/modules/bot-gateway/adapters/discord.adapter.ts` | Discord 适配器 |
| `service/src/modules/bot-gateway/adapters/qq.adapter.ts` | QQ 适配器 |
| `admin/src/views/bot-gateway/index.vue` | Bot 实例管理页面 |
| `admin/src/views/bot-gateway/config.vue` | Bot 配置页面 |
| `admin/src/api/modules/botGateway.ts` | Bot 网关 API |
| `admin/src/router/modules/bot-gateway.menu.ts` | Bot 网关路由菜单 |

---

## Chunk 1: 审计日志系统

### Task 1: 审计日志实体与数据表

**Files:**
- Create: `service/src/modules/audit/entities/audit-log.entity.ts`
- Modify: `service/src/modules/database/initDatabase.ts`

**Entity 设计：**
```typescript
@Entity({ name: 'audit_logs' })
export class AuditLogEntity extends BaseEntity {
  @Column({ comment: '操作用户ID', nullable: true })
  userId: number;

  @Column({ comment: '操作类型: login/logout/create/update/delete/query/execute', length: 50 })
  action: string;

  @Column({ comment: '操作模块', length: 50 })
  module: string;

  @Column({ comment: '请求方法', length: 10, nullable: true })
  method: string;

  @Column({ comment: '请求路径', length: 255, nullable: true })
  path: string;

  @Column({ comment: '请求参数 JSON', type: 'text', nullable: true })
  requestParams: string;

  @Column({ comment: '响应状态码', nullable: true })
  statusCode: number;

  @Column({ comment: 'IP 地址', length: 50, nullable: true })
  ip: string;

  @Column({ comment: 'User-Agent', length: 500, nullable: true })
  userAgent: string;

  @Column({ comment: '执行耗时(ms)', nullable: true })
  duration: number;

  @Column({ comment: '操作描述', length: 255, nullable: true })
  description: string;
}
```

- [ ] **Step 1: 创建审计日志实体**
- [ ] **Step 2: 在 `initDatabase.ts` 注册实体和 `NEW_TABLES`**
- [ ] **Step 3: 在 `database.module.ts` 导入实体**

### Task 2: 审计日志拦截器与服务

**Files:**
- Create: `service/src/modules/audit/audit.interceptor.ts`
- Create: `service/src/modules/audit/audit.service.ts`
- Create: `service/src/modules/audit/audit.module.ts`

**拦截器逻辑：** 使用 `@Injectable()` 实现 `NestInterceptor`，在 `intercept()` 中：
1. 记录开始时间
2. 从 `req.user` 获取用户 ID
3. 从 `req.method`、`req.url`、`req.headers['user-agent']`、`req.ip` 获取请求信息
4. `next.handle().pipe(tap(() => { ... 记录结束时间和状态码 ... }))`
5. 排除 `/api/share` 等公开接口和静态资源

- [ ] **Step 4: 实现 AuditInterceptor**
- [ ] **Step 5: 实现 AuditService（save/query/cleanup）**
- [ ] **Step 6: 实现 AuditModule，导出 AuditService**

### Task 3: 全局注册拦截器与管理端 API

**Files:**
- Modify: `service/src/app.module.ts`
- Create: `service/src/modules/audit/audit.controller.ts`

- [ ] **Step 7: 在 `app.module.ts` providers 中全局注册 `APP_INTERCEPTOR`**
- [ ] **Step 8: 实现 AuditController 查询接口（支持按 module/action/userId/time 过滤）**

### Task 4: 管理端页面

**Files:**
- Create: `admin/src/api/modules/audit.ts`
- Create: `admin/src/views/audit/index.vue`
- Create: `admin/src/router/modules/audit.menu.ts`
- Modify: `admin/src/router/routes.ts`

- [ ] **Step 9: 创建审计日志 API 模块**
- [ ] **Step 10: 创建审计日志管理页面（表格 + 筛选 + 分页）**
- [ ] **Step 11: 创建路由菜单并注册**
- [ ] **Step 12: 编译验证 admin**

---

## Chunk 2: TTS/ASR 语音能力

### Task 5: 语音服务后端

**Files:**
- Create: `service/src/modules/voice/entities/voice-log.entity.ts`
- Create: `service/src/modules/voice/dto/tts.dto.ts`
- Create: `service/src/modules/voice/dto/asr.dto.ts`
- Create: `service/src/modules/voice/voice.service.ts`
- Create: `service/src/modules/voice/voice.controller.ts`
- Create: `service/src/modules/voice/voice.module.ts`

**TTS 逻辑：**
- 复用 `chat.service.ts` 中 `ttsProcess` 的 OpenAI 调用逻辑
- 支持模型选择：`tts-1`、`tts-1-hd`、豆包 TTS 等
- 支持音色选择：alloy、echo、fable、onyx、nova、shimmer
- 返回音频文件 URL

**ASR 逻辑：**
- 使用 OpenAI `whisper-1` 模型
- 接收音频文件（mp3/wav/m4a/ogg），调用 `openai.audio.transcriptions.create()`
- 返回识别文本

- [ ] **Step 13: 创建 VoiceLogEntity 和 DTOs**
- [ ] **Step 14: 在 database 注册实体**
- [ ] **Step 15: 实现 VoiceService（TTS + ASR）**
- [ ] **Step 16: 实现 VoiceController（POST /api/voice/tts, POST /api/voice/asr）**
- [ ] **Step 17: 实现 VoiceModule 并注册到 AppModule**

### Task 6: 前端语音交互

**Files:**
- Create: `chat/src/api/voice.ts`
- Create: `chat/src/views/chat/components/VoiceButton/index.vue`
- Modify: `chat/src/views/chat/components/Footer/index.vue`

**前端交互设计：**
- Footer 右侧添加语音按钮
- 长按录音 -> 松开发送（ASR 识别为文字后填入输入框）
- 点击播放按钮 -> 调用 TTS 将 AI 回复转为语音播放
- 使用浏览器原生 `MediaRecorder` API 录制音频

- [ ] **Step 18: 创建前端 Voice API**
- [ ] **Step 19: 创建 VoiceButton 组件（录音/播放）**
- [ ] **Step 20: 在 Footer 集成语音按钮**
- [ ] **Step 21: 编译验证 chat**

---

## Chunk 3: Bot 网关扩展

### Task 7: Bot 网关核心架构

**Files:**
- Create: `service/src/modules/bot-gateway/entities/bot.entity.ts`
- Create: `service/src/modules/bot-gateway/entities/bot-message.entity.ts`
- Create: `service/src/modules/bot-gateway/interfaces/bot-adapter.interface.ts`
- Create: `service/src/modules/bot-gateway/bot-gateway.service.ts`
- Create: `service/src/modules/bot-gateway/bot-gateway.module.ts`

**适配器接口：**
```typescript
export interface BotAdapter {
  platform: string;
  validate(config: any): boolean;
  sendMessage(to: string, content: string): Promise<void>;
  handleWebhook(body: any): Promise<any>;
}
```

- [ ] **Step 22: 创建实体和适配器接口**
- [ ] **Step 23: 在 database 注册实体**
- [ ] **Step 24: 实现 BotGatewayService（适配器注册、消息分发）**

### Task 8: 企业微信适配器

**Files:**
- Create: `service/src/modules/bot-gateway/adapters/wecom.adapter.ts`

**功能：**
- 接收企业微信 webhook 消息（验证/事件/文本）
- 调用 `ChatService` 获取 AI 回复
- 调用企业微信 API 发送消息
- 支持 `corpid` + `corpsecret` + `agentid` 配置

- [ ] **Step 25: 实现企业微信适配器**

### Task 9: 飞书适配器

**Files:**
- Create: `service/src/modules/bot-gateway/adapters/feishu.adapter.ts`

**功能：**
- 接收飞书事件订阅（URL 验证/事件推送）
- 调用飞书机器人 API 发送消息
- 支持 `app_id` + `app_secret` + 加密 token 配置

- [ ] **Step 26: 实现飞书适配器**

### Task 10: Discord 适配器

**Files:**
- Create: `service/src/modules/bot-gateway/adapters/discord.adapter.ts`

**功能：**
- 使用 `discord.js` 或 REST API 接收/发送消息
- 支持 Bot Token 配置
- 将 Discord 消息映射到本地对话组

- [ ] **Step 27: 安装 discord.js 依赖**
- [ ] **Step 28: 实现 Discord 适配器**

### Task 11: QQ 适配器

**Files:**
- Create: `service/src/modules/bot-gateway/adapters/qq.adapter.ts`

**功能：**
- 使用 go-cqhttp / NapCatQQ 的 HTTP API 协议
- 支持接收/发送消息
- 将 QQ 消息映射到本地对话组

- [ ] **Step 29: 实现 QQ 适配器（基于 go-cqhttp HTTP API）**

### Task 12: Bot 管理端页面

**Files:**
- Create: `admin/src/api/modules/botGateway.ts`
- Create: `admin/src/views/bot-gateway/index.vue`
- Create: `admin/src/views/bot-gateway/config.vue`
- Create: `admin/src/router/modules/bot-gateway.menu.ts`
- Modify: `admin/src/router/routes.ts`

- [ ] **Step 30: 创建 Bot 网关 API 模块**
- [ ] **Step 31: 创建 Bot 实例管理页面**
- [ ] **Step 32: 创建路由菜单并注册**
- [ ] **Step 33: 编译验证 admin**

---

## Chunk 4: 编译测试与验证

### Task 13: 后端编译验证

- [ ] **Step 34: `cd service && pnpm build` 确保编译成功**

### Task 15: 端到端测试

- [ ] **Step 35: 审计日志：访问任意 API，检查 audit_logs 表是否有记录**
- [ ] **Step 36: TTS：调用 POST /api/voice/tts 生成语音文件**
- [ ] **Step 37: ASR：上传音频文件调用 POST /api/voice/asr 获取文本**
- [ ] **Step 38: Bot 网关：配置企业微信 webhook 并发送测试消息**

---

## 风险与应对

| 风险 | 应对 |
|------|------|
| ASR 依赖 OpenAI Whisper，国内访问受限 | 提供豆包/阿里云等国内 ASR 提供商备选方案 |
| Discord/QQ 适配器需要外部服务 | 文档说明需要自建 go-cqhttp / Discord Bot 应用 |
| 审计日志表膨胀 | 支持自动清理（保留 N 天），管理端提供手动清理 |
| Bot 多平台消息格式差异大 | 适配器模式隔离差异，统一内部消息格式 |

---

*P1 高价值功能计划完成。核心原则：审计日志先做（基础设施），TTS/ASR 其次（用户体验），Bot 网关最后（多平台覆盖）。*
