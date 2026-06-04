# Bot Gateway Extension 实施计划

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有微信公众号集成基础上，通过 Adapter 模式扩展支持企业微信、飞书、Discord、QQ 四大平台 Bot，实现统一的多平台消息收发、用户绑定和对话管理。

**Architecture:** 采用 Adapter 模式设计统一接口 `BotAdapter`，每个平台实现独立的 Adapter（`WecomAdapter`/`FeishuAdapter`/`DiscordAdapter`/`QQAdapter`）。统一的消息实体 `BotMessage` 和 Bot 实例配置实体 `BotInstance` 存储于 MySQL。管理后台提供可视化配置界面。所有 Bot 对话复用现有 `ChatService.chatProcess` 能力。

**Tech Stack:** NestJS 10 + TypeORM + Redis + axios + ws (Discord Gateway WebSocket)

---

## 文件结构

### 新增文件

| 文件 | 职责 |
|------|------|
| `service/src/modules/bot/entities/bot-instance.entity.ts` | Bot 实例配置实体：平台类型、凭证、状态、绑定应用/模型 |
| `service/src/modules/bot/entities/bot-message.entity.ts` | Bot 消息记录实体：平台消息ID、内容、方向、用户映射 |
| `service/src/modules/bot/interfaces/bot-adapter.interface.ts` | BotAdapter 统一接口定义 |
| `service/src/modules/bot/interfaces/bot-message.interface.ts` | 统一消息格式接口 |
| `service/src/modules/bot/adapters/wecom.adapter.ts` | 企业微信 Adapter：回调模式、消息加解密、access_token 管理 |
| `service/src/modules/bot/adapters/feishu.adapter.ts` | 飞书 Adapter：事件订阅、tenant_access_token、消息卡片 |
| `service/src/modules/bot/adapters/discord.adapter.ts` | Discord Adapter：Bot Token、Gateway WebSocket、Slash Command |
| `service/src/modules/bot/adapters/qq.adapter.ts` | QQ Adapter：QQ Bot OpenAPI、群消息/频道消息 |
| `service/src/modules/bot/bot-instance.service.ts` | Bot 实例 CRUD、状态管理、Adapter 工厂 |
| `service/src/modules/bot/bot-message.service.ts` | 消息记录、用户映射查询 |
| `service/src/modules/bot/bot-gateway.service.ts` | 网关核心：注册 Adapter、分发消息、调用 ChatService |
| `service/src/modules/bot/bot.controller.ts` | 管理后台 API + 各平台 Webhook 入口 |
| `service/src/modules/bot/bot.module.ts` | Bot 模块定义 |
| `admin/src/api/modules/bot.ts` | 前端 API 封装 |
| `admin/src/router/modules/bot.menu.ts` | 路由菜单配置 |
| `admin/src/views/bot/index.vue` | Bot 实例列表页 |
| `admin/src/views/bot/edit.vue` | Bot 实例编辑/创建页 |
| `admin/src/views/bot/messages.vue` | 消息记录查询页 |

### 修改文件

| 文件 | 修改内容 |
|------|----------|
| `service/src/app.module.ts` | 导入 `BotModule` |
| `service/src/modules/database/database.module.ts` | entities 数组添加 `BotInstanceEntity`、`BotMessageEntity` |
| `service/src/modules/database/initDatabase.ts` | `NEW_TABLES` 添加 `'bot_instances'`、`'bot_messages'` |
| `service/src/modules/chat/chat.service.ts` | `chatProcess` 支持无 session 的 Bot 调用模式（可选参数） |

---

## Chunk 1: 核心实体与接口定义

### Task 1: Bot 实例实体

**Files:**
- Create: `service/src/modules/bot/entities/bot-instance.entity.ts`
- Modify: `service/src/modules/database/database.module.ts`
- Modify: `service/src/modules/database/initDatabase.ts`

- [ ] **Step 1: 创建 BotInstanceEntity**

```typescript
import { BaseEntity } from 'src/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

export type BotPlatform = 'wecom' | 'feishu' | 'discord' | 'qq';

@Entity({ name: 'bot_instances' })
export class BotInstanceEntity extends BaseEntity {
  @Column({ comment: 'Bot名称' })
  name: string;

  @Column({ comment: '平台类型: wecom/feishu/discord/qq', type: 'varchar', length: 20 })
  platform: BotPlatform;

  @Column({ comment: '平台AppID/BotID', type: 'varchar', length: 255 })
  appId: string;

  @Column({ comment: '平台Secret/Token', type: 'text' })
  appSecret: string;

  @Column({ comment: '附加配置JSON', type: 'text', nullable: true })
  extraConfig: string;

  @Column({ comment: '状态: 0禁用 1启用', default: 1 })
  status: number;

  @Column({ comment: '绑定的应用ID', nullable: true })
  appId_ref: number;

  @Column({ comment: '使用的模型名称', nullable: true, type: 'varchar', length: 100 })
  model: string;

  @Column({ comment: '欢迎语', type: 'text', nullable: true })
  welcomeMessage: string;

  @Column({ comment: '回调URL验证令牌', nullable: true, type: 'varchar', length: 255 })
  verifyToken: string;

  @Column({ comment: '加密密钥', nullable: true, type: 'varchar', length: 255 })
  encodingAesKey: string;
}
```

- [ ] **Step 2: 创建 BotMessageEntity**

```typescript
import { BaseEntity } from 'src/common/entity/baseEntity';
import { Column, Entity } from 'typeorm';

export type MessageDirection = 'in' | 'out';

@Entity({ name: 'bot_messages' })
export class BotMessageEntity extends BaseEntity {
  @Column({ comment: 'Bot实例ID' })
  botInstanceId: number;

  @Column({ comment: '平台消息ID', type: 'varchar', length: 255 })
  platformMsgId: string;

  @Column({ comment: '平台用户ID', type: 'varchar', length: 255 })
  platformUserId: string;

  @Column({ comment: '映射的系统用户ID', nullable: true })
  userId: number;

  @Column({ comment: '消息方向: in/out', type: 'varchar', length: 10 })
  direction: MessageDirection;

  @Column({ comment: '消息内容', type: 'text' })
  content: string;

  @Column({ comment: '消息类型: text/image/file/event', type: 'varchar', length: 20 })
  msgType: string;

  @Column({ comment: '平台类型', type: 'varchar', length: 20 })
  platform: string;
}
```

- [ ] **Step 3: 注册实体到 database.module.ts**

在 imports 的 `TypeOrmModule.forRootAsync` entities 数组末尾添加：
```typescript
BotInstanceEntity,
BotMessageEntity,
```

在 `database.module.ts` 文件顶部的 import 区域添加：
```typescript
import { BotInstanceEntity } from '../bot/entities/bot-instance.entity';
import { BotMessageEntity } from '../bot/entities/bot-message.entity';
```

- [ ] **Step 4: 注册新表到 initDatabase.ts**

在 `NEW_TABLES` 数组末尾添加：
```typescript
'bot_instances',
'bot_messages',
```

在 `initDatabase.ts` 的 import 区域添加实体引用（供 TypeORM 同步使用）：
```typescript
import { BotInstanceEntity } from '../bot/entities/bot-instance.entity';
import { BotMessageEntity } from '../bot/entities/bot-message.entity';
```

并将它们加入 `dataSourceOptions.entities` 数组。

---

### Task 2: BotAdapter 统一接口

**Files:**
- Create: `service/src/modules/bot/interfaces/bot-adapter.interface.ts`
- Create: `service/src/modules/bot/interfaces/bot-message.interface.ts`

- [ ] **Step 1: 定义统一消息接口**

```typescript
// bot-message.interface.ts
export interface UnifiedBotMessage {
  platformUserId: string;
  content: string;
  msgType: 'text' | 'image' | 'file' | 'event';
  platformMsgId: string;
  rawData: any;
}

export interface UnifiedBotReply {
  content: string;
  msgType: 'text' | 'image' | 'markdown';
  platformUserId: string;
}
```

- [ ] **Step 2: 定义 BotAdapter 接口**

```typescript
// bot-adapter.interface.ts
import { UnifiedBotMessage, UnifiedBotReply } from './bot-message.interface';
import { BotInstanceEntity } from '../entities/bot-instance.entity';

export interface BotAdapter {
  /** 初始化 Adapter（如连接 WebSocket） */
  initialize(instance: BotInstanceEntity): Promise<void>;

  /** 验证 Webhook 请求合法性 */
  verifyWebhook(query: any, body?: any): Promise<boolean>;

  /** 解析平台消息为统一格式 */
  parseMessage(body: any): Promise<UnifiedBotMessage | null>;

  /** 发送回复消息 */
  sendReply(instance: BotInstanceEntity, reply: UnifiedBotReply): Promise<void>;

  /** 停止 Adapter */
  destroy(): Promise<void>;
}
```

---

## Chunk 2: 企业微信 Adapter

### Task 3: 实现 WecomAdapter

**Files:**
- Create: `service/src/modules/bot/adapters/wecom.adapter.ts`

- [ ] **Step 1: 实现企业微信 Adapter**

```typescript
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { BotAdapter } from '../interfaces/bot-adapter.interface';
import { UnifiedBotMessage, UnifiedBotReply } from '../interfaces/bot-message.interface';
import { BotInstanceEntity } from '../entities/bot-instance.entity';

@Injectable()
export class WecomAdapter implements BotAdapter {
  private readonly logger = new Logger(WecomAdapter.name);
  private accessToken: string | null = null;
  private tokenExpireAt = 0;

  async initialize(instance: BotInstanceEntity): Promise<void> {
    this.logger.log(`初始化企业微信 Adapter: ${instance.name}`);
    await this.refreshAccessToken(instance);
  }

  async verifyWebhook(query: any): Promise<boolean> {
    const { msg_signature, timestamp, nonce, echostr } = query;
    // 企业微信回调验证逻辑
    // TODO: 实现签名验证（使用 encodingAesKey 解密）
    return true;
  }

  async parseMessage(body: any): Promise<UnifiedBotMessage | null> {
    // 企业微信 XML 消息解析
    const xml = body.xml || body;
    const getVal = (field: string) => {
      const v = xml[field] || xml[field.toLowerCase()];
      return Array.isArray(v) ? v[0] : v;
    };

    const msgType = getVal('MsgType');
    const userId = getVal('FromUserName');
    const content = getVal('Content');

    if (!userId) return null;

    return {
      platformUserId: userId,
      content: content || '',
      msgType: msgType === 'text' ? 'text' : 'event',
      platformMsgId: getVal('MsgId') || `${Date.now()}`,
      rawData: body,
    };
  }

  async sendReply(instance: BotInstanceEntity, reply: UnifiedBotReply): Promise<void> {
    const token = await this.getAccessToken(instance);
    const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`;

    const extra = instance.extraConfig ? JSON.parse(instance.extraConfig) : {};
    const agentId = extra.agentId;

    await axios.post(url, {
      touser: reply.platformUserId,
      msgtype: 'text',
      agentid: agentId,
      text: { content: reply.content },
    });
  }

  async destroy(): Promise<void> {
    this.logger.log('销毁企业微信 Adapter');
  }

  private async getAccessToken(instance: BotInstanceEntity): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpireAt) {
      return this.accessToken;
    }
    return this.refreshAccessToken(instance);
  }

  private async refreshAccessToken(instance: BotInstanceEntity): Promise<string> {
    const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${instance.appId}&corpsecret=${instance.appSecret}`;
    const res = await axios.get(url);
    if (res.data.errcode !== 0) {
      throw new HttpException(`企业微信获取token失败: ${res.data.errmsg}`, HttpStatus.BAD_REQUEST);
    }
    this.accessToken = res.data.access_token;
    this.tokenExpireAt = Date.now() + (res.data.expires_in - 300) * 1000;
    return this.accessToken;
  }
}
```

---

## Chunk 3: 飞书 Adapter

### Task 4: 实现 FeishuAdapter

**Files:**
- Create: `service/src/modules/bot/adapters/feishu.adapter.ts`

- [ ] **Step 1: 实现飞书 Adapter**

```typescript
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';
import { BotAdapter } from '../interfaces/bot-adapter.interface';
import { UnifiedBotMessage, UnifiedBotReply } from '../interfaces/bot-message.interface';
import { BotInstanceEntity } from '../entities/bot-instance.entity';

@Injectable()
export class FeishuAdapter implements BotAdapter {
  private readonly logger = new Logger(FeishuAdapter.name);
  private tenantToken: string | null = null;
  private tokenExpireAt = 0;

  async initialize(instance: BotInstanceEntity): Promise<void> {
    this.logger.log(`初始化飞书 Adapter: ${instance.name}`);
  }

  async verifyWebhook(query: any, body?: any): Promise<boolean> {
    // 飞书事件订阅验证：challenge 模式
    return true;
  }

  async parseMessage(body: any): Promise<UnifiedBotMessage | null> {
    // 飞书事件回调结构
    const event = body.event || body;
    const message = event.message || event;

    if (!message) return null;

    const userId = event.sender?.sender_id?.open_id || message.chat_id;
    const content = message.content || '{}';
    let text = '';
    try {
      const parsed = JSON.parse(content);
      text = parsed.text || '';
    } catch {
      text = content;
    }

    return {
      platformUserId: userId,
      content: text,
      msgType: message.msg_type === 'text' ? 'text' : 'event',
      platformMsgId: message.message_id || `${Date.now()}`,
      rawData: body,
    };
  }

  async sendReply(instance: BotInstanceEntity, reply: UnifiedBotReply): Promise<void> {
    const token = await this.getTenantToken(instance);
    const url = 'https://open.feishu.cn/open-apis/im/v1/messages';

    await axios.post(
      url,
      {
        receive_id: reply.platformUserId,
        msg_type: 'text',
        content: JSON.stringify({ text: reply.content }),
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { receive_id_type: 'open_id' },
      },
    );
  }

  async destroy(): Promise<void> {
    this.logger.log('销毁飞书 Adapter');
  }

  private async getTenantToken(instance: BotInstanceEntity): Promise<string> {
    if (this.tenantToken && Date.now() < this.tokenExpireAt) {
      return this.tenantToken;
    }

    const url = 'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';
    const res = await axios.post(url, {
      app_id: instance.appId,
      app_secret: instance.appSecret,
    });

    if (res.data.code !== 0) {
      throw new HttpException(`飞书获取token失败: ${res.data.msg}`, HttpStatus.BAD_REQUEST);
    }

    this.tenantToken = res.data.tenant_access_token;
    this.tokenExpireAt = Date.now() + (res.data.expire - 300) * 1000;
    return this.tenantToken;
  }
}
```

---

## Chunk 4: Discord Adapter

### Task 5: 实现 DiscordAdapter

**Files:**
- Create: `service/src/modules/bot/adapters/discord.adapter.ts`

- [ ] **Step 1: 实现 Discord Adapter**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BotAdapter } from '../interfaces/bot-adapter.interface';
import { UnifiedBotMessage, UnifiedBotReply } from '../interfaces/bot-message.interface';
import { BotInstanceEntity } from '../entities/bot-instance.entity';

@Injectable()
export class DiscordAdapter implements BotAdapter {
  private readonly logger = new Logger(DiscordAdapter.name);
  private ws: WebSocket | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private sessionId: string | null = null;

  async initialize(instance: BotInstanceEntity): Promise<void> {
    this.logger.log(`初始化 Discord Adapter: ${instance.name}`);
    // Discord 使用 Gateway WebSocket，在 BotGatewayService 中统一管理连接
  }

  async verifyWebhook(query: any): Promise<boolean> {
    // Discord 使用 interactions 端点验证
    return true;
  }

  async parseMessage(body: any): Promise<UnifiedBotMessage | null> {
    // Discord Gateway message_create 事件
    if (body.t !== 'MESSAGE_CREATE') return null;
    const msg = body.d;
    if (msg.author?.bot) return null; // 忽略 Bot 自己的消息

    return {
      platformUserId: msg.author?.id,
      content: msg.content || '',
      msgType: 'text',
      platformMsgId: msg.id,
      rawData: body,
    };
  }

  async sendReply(instance: BotInstanceEntity, reply: UnifiedBotReply): Promise<void> {
    // Discord 通过 REST API 发送消息
    const extra = instance.extraConfig ? JSON.parse(instance.extraConfig) : {};
    const channelId = extra.channelId || reply.platformUserId;

    await axios.post(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      { content: reply.content },
      {
        headers: {
          Authorization: `Bot ${instance.appSecret}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async destroy(): Promise<void> {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.ws) this.ws.close();
    this.logger.log('销毁 Discord Adapter');
  }

  // WebSocket 相关方法
  connectGateway(token: string, onMessage: (data: any) => void): void {
    const ws = new (require('ws'))('wss://gateway.discord.gg/?v=10&encoding=json');
    this.ws = ws;

    ws.on('open', () => {
      this.logger.log('Discord Gateway 已连接');
    });

    ws.on('message', (data: Buffer) => {
      const payload = JSON.parse(data.toString());
      const { op, d, s, t } = payload;

      if (op === 10) {
        // Hello
        const interval = d.heartbeat_interval;
        this.heartbeatInterval = setInterval(() => {
          ws.send(JSON.stringify({ op: 1, d: this.sessionId ? s : null }));
        }, interval);

        // Identify
        ws.send(
          JSON.stringify({
            op: 2,
            d: {
              token,
              intents: 512, // GUILD_MESSAGES
              properties: { os: 'linux', browser: '99AI', device: '99AI' },
            },
          }),
        );
      }

      if (op === 0 && t) {
        if (t === 'READY') this.sessionId = d.session_id;
        onMessage(payload);
      }
    });

    ws.on('close', () => {
      this.logger.warn('Discord Gateway 连接关闭');
    });

    ws.on('error', (err) => {
      this.logger.error(`Discord Gateway 错误: ${err.message}`);
    });
  }
}
```

---

## Chunk 5: QQ Adapter

### Task 6: 实现 QQAdapter

**Files:**
- Create: `service/src/modules/bot/adapters/qq.adapter.ts`

- [ ] **Step 1: 实现 QQ Adapter**

```typescript
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { BotAdapter } from '../interfaces/bot-adapter.interface';
import { UnifiedBotMessage, UnifiedBotReply } from '../interfaces/bot-message.interface';
import { BotInstanceEntity } from '../entities/bot-instance.entity';

@Injectable()
export class QQAdapter implements BotAdapter {
  private readonly logger = new Logger(QQAdapter.name);
  private accessToken: string | null = null;
  private tokenExpireAt = 0;

  async initialize(instance: BotInstanceEntity): Promise<void> {
    this.logger.log(`初始化 QQ Adapter: ${instance.name}`);
  }

  async verifyWebhook(query: any, body?: any): Promise<boolean> {
    // QQ Bot 回调验证
    return true;
  }

  async parseMessage(body: any): Promise<UnifiedBotMessage | null> {
    const event = body;
    if (!event.t) return null;

    const msg = event.d || {};
    const author = msg.author || {};

    if (event.t === 'C2C_MESSAGE_CREATE' || event.t === 'GROUP_AT_MESSAGE_CREATE') {
      return {
        platformUserId: author.id || msg.group_openid,
        content: msg.content || '',
        msgType: 'text',
        platformMsgId: msg.id || `${Date.now()}`,
        rawData: body,
      };
    }

    return null;
  }

  async sendReply(instance: BotInstanceEntity, reply: UnifiedBotReply): Promise<void> {
    const token = await this.getAccessToken(instance);
    const extra = instance.extraConfig ? JSON.parse(instance.extraConfig) : {};

    // QQ Bot OpenAPI v2
    const url = `https://api.sgroup.qq.com/v2/groups/${reply.platformUserId}/messages`;

    await axios.post(
      url,
      { content: reply.content, msg_type: 0 },
      {
        headers: {
          Authorization: `QQBot ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async destroy(): Promise<void> {
    this.logger.log('销毁 QQ Adapter');
  }

  private async getAccessToken(instance: BotInstanceEntity): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpireAt) {
      return this.accessToken;
    }

    const url = 'https://bots.qq.com/app/getAppAccessToken';
    const res = await axios.post(url, {
      appId: instance.appId,
      clientSecret: instance.appSecret,
    });

    if (res.data.code !== 0) {
      throw new HttpException(`QQ获取token失败`, HttpStatus.BAD_REQUEST);
    }

    this.accessToken = res.data.access_token;
    this.tokenExpireAt = Date.now() + res.data.expires_in * 1000;
    return this.accessToken;
  }
}
```

---

## Chunk 6: Bot 核心服务层

### Task 7: BotInstanceService

**Files:**
- Create: `service/src/modules/bot/bot-instance.service.ts`

- [ ] **Step 1: 实现 BotInstanceService**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotInstanceEntity, BotPlatform } from './entities/bot-instance.entity';

@Injectable()
export class BotInstanceService {
  private readonly logger = new Logger(BotInstanceService.name);

  constructor(
    @InjectRepository(BotInstanceEntity)
    private readonly botInstanceRepository: Repository<BotInstanceEntity>,
  ) {}

  async findAll(): Promise<BotInstanceEntity[]> {
    return this.botInstanceRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: number): Promise<BotInstanceEntity | null> {
    return this.botInstanceRepository.findOne({ where: { id } });
  }

  async findByPlatform(platform: BotPlatform): Promise<BotInstanceEntity[]> {
    return this.botInstanceRepository.find({ where: { platform, status: 1 } });
  }

  async create(data: Partial<BotInstanceEntity>): Promise<BotInstanceEntity> {
    const instance = this.botInstanceRepository.create(data);
    return this.botInstanceRepository.save(instance);
  }

  async update(id: number, data: Partial<BotInstanceEntity>): Promise<void> {
    await this.botInstanceRepository.update(id, data);
  }

  async delete(id: number): Promise<void> {
    await this.botInstanceRepository.delete(id);
  }
}
```

### Task 8: BotMessageService

**Files:**
- Create: `service/src/modules/bot/bot-message.service.ts`

- [ ] **Step 1: 实现 BotMessageService**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotMessageEntity } from './entities/bot-message.entity';

@Injectable()
export class BotMessageService {
  private readonly logger = new Logger(BotMessageService.name);

  constructor(
    @InjectRepository(BotMessageEntity)
    private readonly botMessageRepository: Repository<BotMessageEntity>,
  ) {}

  async logMessage(data: Partial<BotMessageEntity>): Promise<BotMessageEntity> {
    const msg = this.botMessageRepository.create(data);
    return this.botMessageRepository.save(msg);
  }

  async findByBotInstance(botInstanceId: number, page = 1, size = 20): Promise<{ rows: BotMessageEntity[]; count: number }> {
    const [rows, count] = await this.botMessageRepository.findAndCount({
      where: { botInstanceId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });
    return { rows, count };
  }

  async findOrCreateUserMapping(platformUserId: string, platform: string): Promise<number | null> {
    // 查找已有映射
    const existing = await this.botMessageRepository.findOne({
      where: { platformUserId, platform },
      order: { createdAt: 'DESC' },
    });
    if (existing?.userId) return existing.userId;

    // 未绑定用户，返回 null，由上层处理创建访客用户
    return null;
  }
}
```

### Task 9: BotGatewayService（核心网关）

**Files:**
- Create: `service/src/modules/bot/bot-gateway.service.ts`

- [ ] **Step 1: 实现 BotGatewayService**

```typescript
import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';
import { UserService } from '../user/user.service';
import { BotInstanceService } from './bot-instance.service';
import { BotMessageService } from './bot-message.service';
import { BotAdapter } from './interfaces/bot-adapter.interface';
import { UnifiedBotMessage, UnifiedBotReply } from './interfaces/bot-message.interface';
import { WecomAdapter } from './adapters/wecom.adapter';
import { FeishuAdapter } from './adapters/feishu.adapter';
import { DiscordAdapter } from './adapters/discord.adapter';
import { QQAdapter } from './adapters/qq.adapter';
import { BotInstanceEntity, BotPlatform } from './entities/bot-instance.entity';

@Injectable()
export class BotGatewayService implements OnModuleInit {
  private readonly logger = new Logger(BotGatewayService.name);
  private adapters: Map<number, BotAdapter> = new Map();

  constructor(
    private readonly botInstanceService: BotInstanceService,
    private readonly botMessageService: BotMessageService,
    private readonly chatService: ChatService,
    private readonly userService: UserService,
    private readonly wecomAdapter: WecomAdapter,
    private readonly feishuAdapter: FeishuAdapter,
    private readonly discordAdapter: DiscordAdapter,
    private readonly qqAdapter: QQAdapter,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('初始化 Bot Gateway...');
    const instances = await this.botInstanceService.findAll();
    for (const instance of instances) {
      if (instance.status === 1) {
        await this.registerAdapter(instance);
      }
    }
  }

  async registerAdapter(instance: BotInstanceEntity): Promise<void> {
    const adapter = this.getAdapterByPlatform(instance.platform);
    if (!adapter) {
      this.logger.warn(`不支持的平台: ${instance.platform}`);
      return;
    }

    await adapter.initialize(instance);
    this.adapters.set(instance.id, adapter);
    this.logger.log(`注册 Bot Adapter: ${instance.name} (${instance.platform})`);

    // Discord 特殊处理：建立 Gateway WebSocket
    if (instance.platform === 'discord') {
      (adapter as DiscordAdapter).connectGateway(instance.appSecret, (payload) => {
        this.handleDiscordPayload(instance, payload);
      });
    }
  }

  async unregisterAdapter(instanceId: number): Promise<void> {
    const adapter = this.adapters.get(instanceId);
    if (adapter) {
      await adapter.destroy();
      this.adapters.delete(instanceId);
    }
  }

  async handleWebhook(
    instanceId: number,
    platform: BotPlatform,
    query: any,
    body: any,
  ): Promise<any> {
    const instance = await this.botInstanceService.findById(instanceId);
    if (!instance || instance.status !== 1) {
      throw new HttpException('Bot 实例未找到或已禁用', HttpStatus.NOT_FOUND);
    }

    const adapter = this.adapters.get(instanceId);
    if (!adapter) {
      throw new HttpException('Adapter 未注册', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 验证
    const verified = await adapter.verifyWebhook(query, body);
    if (!verified) {
      throw new HttpException('验证失败', HttpStatus.FORBIDDEN);
    }

    // 飞书/QQ challenge 验证
    if (body.challenge) return { challenge: body.challenge };

    // 解析消息
    const message = await adapter.parseMessage(body);
    if (!message) return 'success';

    // 记录入站消息
    await this.botMessageService.logMessage({
      botInstanceId: instance.id,
      platformMsgId: message.platformMsgId,
      platformUserId: message.platformUserId,
      content: message.content,
      msgType: message.msgType,
      direction: 'in',
      platform,
    });

    // 获取或创建用户映射
    let userId = await this.botMessageService.findOrCreateUserMapping(
      message.platformUserId,
      platform,
    );

    if (!userId) {
      // 创建访客用户
      const guestUser = await this.userService.createGuestUser(platform, message.platformUserId);
      userId = guestUser.id;
    }

    // 调用 ChatService 处理消息
    try {
      const chatResult = await this.chatService.chatProcess(
        {
          prompt: message.content,
          model: instance.model,
          appId: instance.appId_ref,
        },
        { user: { id: userId } } as any,
      );

      const replyContent = typeof chatResult === 'string' ? chatResult : '处理完成';

      // 发送回复
      const reply: UnifiedBotReply = {
        platformUserId: message.platformUserId,
        content: replyContent,
        msgType: 'text',
      };

      await adapter.sendReply(instance, reply);

      // 记录出站消息
      await this.botMessageService.logMessage({
        botInstanceId: instance.id,
        platformMsgId: `reply_${Date.now()}`,
        platformUserId: message.platformUserId,
        userId,
        content: replyContent,
        msgType: 'text',
        direction: 'out',
        platform,
      });
    } catch (error) {
      this.logger.error(`处理 Bot 消息失败: ${error.message}`);
      const reply: UnifiedBotReply = {
        platformUserId: message.platformUserId,
        content: '抱歉，处理您的请求时出错了，请稍后重试。',
        msgType: 'text',
      };
      await adapter.sendReply(instance, reply);
    }

    return 'success';
  }

  private async handleDiscordPayload(instance: BotInstanceEntity, payload: any): Promise<void> {
    const adapter = this.adapters.get(instance.id);
    if (!adapter) return;

    const message = await adapter.parseMessage(payload);
    if (!message) return;

    // 复用 handleWebhook 的逻辑处理消息
    await this.handleWebhook(instance.id, 'discord', {}, payload);
  }

  private getAdapterByPlatform(platform: BotPlatform): BotAdapter | null {
    switch (platform) {
      case 'wecom':
        return this.wecomAdapter;
      case 'feishu':
        return this.feishuAdapter;
      case 'discord':
        return this.discordAdapter;
      case 'qq':
        return this.qqAdapter;
      default:
        return null;
    }
  }
}
```

---

## Chunk 7: Controller 与模块

### Task 10: BotController

**Files:**
- Create: `service/src/modules/bot/bot.controller.ts`

- [ ] **Step 1: 实现 BotController**

```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '@/common/auth/jwtAuth.guard';
import { SuperAuthGuard } from '@/common/auth/superAuth.guard';
import { BotInstanceService } from './bot-instance.service';
import { BotMessageService } from './bot-message.service';
import { BotGatewayService } from './bot-gateway.service';

@ApiTags('Bot')
@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(
    private readonly botInstanceService: BotInstanceService,
    private readonly botMessageService: BotMessageService,
    private readonly botGatewayService: BotGatewayService,
  ) {}

  // ==================== 管理后台 API ====================

  @Get('instances')
  @UseGuards(SuperAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 Bot 实例列表' })
  async getInstances() {
    return this.botInstanceService.findAll();
  }

  @Post('instances')
  @UseGuards(SuperAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建 Bot 实例' })
  async createInstance(@Body() body: any) {
    const instance = await this.botInstanceService.create(body);
    // 自动注册 Adapter
    await this.botGatewayService.registerAdapter(instance);
    return instance;
  }

  @Put('instances/:id')
  @UseGuards(SuperAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新 Bot 实例' })
  async updateInstance(@Param('id') id: number, @Body() body: any) {
    await this.botGatewayService.unregisterAdapter(id);
    await this.botInstanceService.update(id, body);
    const instance = await this.botInstanceService.findById(id);
    if (instance && instance.status === 1) {
      await this.botGatewayService.registerAdapter(instance);
    }
    return { success: true };
  }

  @Delete('instances/:id')
  @UseGuards(SuperAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除 Bot 实例' })
  async deleteInstance(@Param('id') id: number) {
    await this.botGatewayService.unregisterAdapter(id);
    await this.botInstanceService.delete(id);
    return { success: true };
  }

  @Get('instances/:id/messages')
  @UseGuards(SuperAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取 Bot 消息记录' })
  async getMessages(
    @Param('id') id: number,
    @Query('page') page: number,
    @Query('size') size: number,
  ) {
    return this.botMessageService.findByBotInstance(id, page || 1, size || 20);
  }

  // ==================== Webhook 入口 ====================

  @Post('webhook/:platform/:instanceId')
  @ApiOperation({ summary: 'Bot Webhook 接收端点' })
  async webhook(
    @Param('platform') platform: any,
    @Param('instanceId') instanceId: number,
    @Query() query: any,
    @Body() body: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.botGatewayService.handleWebhook(
        instanceId,
        platform,
        query,
        body,
      );
      if (result && typeof result === 'object' && result.challenge) {
        return res.status(200).json(result);
      }
      return res.status(200).send(result);
    } catch (error) {
      this.logger.error(`Webhook 处理失败: ${error.message}`);
      return res.status(200).send('success');
    }
  }

  @Get('webhook/:platform/:instanceId')
  @ApiOperation({ summary: 'Bot Webhook GET 验证' })
  async webhookGet(
    @Param('platform') platform: any,
    @Param('instanceId') instanceId: number,
    @Query() query: any,
    @Res() res: Response,
  ) {
    try {
      const result = await this.botGatewayService.handleWebhook(
        instanceId,
        platform,
        query,
        {},
      );
      return res.status(200).send(result);
    } catch (error) {
      return res.status(200).send('success');
    }
  }
}
```

### Task 11: BotModule

**Files:**
- Create: `service/src/modules/bot/bot.module.ts`

- [ ] **Step 1: 实现 BotModule**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotInstanceEntity } from './entities/bot-instance.entity';
import { BotMessageEntity } from './entities/bot-message.entity';
import { BotInstanceService } from './bot-instance.service';
import { BotMessageService } from './bot-message.service';
import { BotGatewayService } from './bot-gateway.service';
import { BotController } from './bot.controller';
import { WecomAdapter } from './adapters/wecom.adapter';
import { FeishuAdapter } from './adapters/feishu.adapter';
import { DiscordAdapter } from './adapters/discord.adapter';
import { QQAdapter } from './adapters/qq.adapter';

@Module({
  imports: [TypeOrmModule.forFeature([BotInstanceEntity, BotMessageEntity])],
  controllers: [BotController],
  providers: [
    BotInstanceService,
    BotMessageService,
    BotGatewayService,
    WecomAdapter,
    FeishuAdapter,
    DiscordAdapter,
    QQAdapter,
  ],
  exports: [BotInstanceService, BotMessageService],
})
export class BotModule {}
```

### Task 12: 注册模块到 AppModule

**Files:**
- Modify: `service/src/app.module.ts`

- [ ] **Step 1: 导入 BotModule**

在 `app.module.ts` 顶部添加：
```typescript
import { BotModule } from './modules/bot/bot.module';
```

在 `imports` 数组末尾添加 `BotModule`。

---

## Chunk 8: 管理后台前端

### Task 13: 前端 API 封装

**Files:**
- Create: `admin/src/api/modules/bot.ts`

- [ ] **Step 1: 创建 API 文件**

```typescript
import api from '@/api';

export function getBotInstances() {
  return api.get('/bot/instances');
}

export function createBotInstance(data: any) {
  return api.post('/bot/instances', data);
}

export function updateBotInstance(id: number, data: any) {
  return api.put(`/bot/instances/${id}`, data);
}

export function deleteBotInstance(id: number) {
  return api.delete(`/bot/instances/${id}`);
}

export function getBotMessages(id: number, params: { page?: number; size?: number }) {
  return api.get(`/bot/instances/${id}/messages`, { params });
}
```

### Task 14: 路由菜单

**Files:**
- Create: `admin/src/router/modules/bot.menu.ts`
- Modify: `admin/src/router/routes.ts`

- [ ] **Step 1: 创建菜单文件**

```typescript
import type { RouteRecordRaw } from 'vue-router';

const route: RouteRecordRaw = {
  path: '/bot',
  component: () => import('@/layouts/index.vue'),
  redirect: '/bot/list',
  name: 'Bot',
  meta: {
    title: 'Bot 管理',
    icon: 'ep:chat-dot-round',
  },
  children: [
    {
      path: 'list',
      name: 'BotList',
      component: () => import('@/views/bot/index.vue'),
      meta: {
        title: 'Bot 实例',
        icon: 'ep:bot',
        cache: true,
      },
    },
    {
      path: 'messages',
      name: 'BotMessages',
      component: () => import('@/views/bot/messages.vue'),
      meta: {
        title: '消息记录',
        icon: 'ep:message',
        cache: true,
      },
    },
  ],
};

export default route;
```

- [ ] **Step 2: 注册路由**

在 `routes.ts` 导入区域添加：
```typescript
import BotMenu from './modules/bot.menu';
```

在 `asyncRoutes` 数组的 children 中添加 `BotMenu`。

### Task 15: Bot 实例列表页

**Files:**
- Create: `admin/src/views/bot/index.vue`

- [ ] **Step 1: 实现列表页**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { getBotInstances, deleteBotInstance } from '@/api/modules/bot';

const router = useRouter();
const loading = ref(false);
const tableData = ref([]);

const platformMap: Record<string, string> = {
  wecom: '企业微信',
  feishu: '飞书',
  discord: 'Discord',
  qq: 'QQ',
};

const statusMap: Record<number, string> = {
  0: '禁用',
  1: '启用',
};

async function loadData() {
  loading.value = true;
  try {
    const res: any = await getBotInstances();
    tableData.value = res.data || res || [];
  } finally {
    loading.value = false;
  }
}

function handleAdd() {
  router.push({ name: 'BotEdit' });
}

function handleEdit(row: any) {
  router.push({ name: 'BotEdit', query: { id: row.id } });
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该 Bot 实例吗？', '提示', { type: 'warning' });
    await deleteBotInstance(row.id);
    ElMessage.success('删除成功');
    loadData();
  } catch {
    // cancel
  }
}

onMounted(loadData);
</script>

<template>
  <div class="p-4">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <span>Bot 实例管理</span>
          <el-button type="primary" @click="handleAdd">新增 Bot</el-button>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="platform" label="平台">
          <template #default="{ row }">
            {{ platformMap[row.platform] || row.platform }}
          </template>
        </el-table-column>
        <el-table-column prop="appId" label="AppID" />
        <el-table-column prop="model" label="模型" />
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ statusMap[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
```

### Task 16: Bot 编辑页

**Files:**
- Create: `admin/src/views/bot/edit.vue`
- Modify: `admin/src/router/modules/bot.menu.ts`

- [ ] **Step 1: 添加编辑路由**

在 `bot.menu.ts` 的 children 中添加：
```typescript
{
  path: 'edit',
  name: 'BotEdit',
  component: () => import('@/views/bot/edit.vue'),
  meta: {
    title: '编辑 Bot',
    hidden: true,
  },
},
```

- [ ] **Step 2: 实现编辑页**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { createBotInstance, updateBotInstance, getBotInstances } from '@/api/modules/bot';

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const isEdit = ref(false);

const form = ref({
  name: '',
  platform: 'wecom',
  appId: '',
  appSecret: '',
  extraConfig: '',
  status: 1,
  appId_ref: null as number | null,
  model: '',
  welcomeMessage: '',
  verifyToken: '',
  encodingAesKey: '',
});

const platforms = [
  { value: 'wecom', label: '企业微信' },
  { value: 'feishu', label: '飞书' },
  { value: 'discord', label: 'Discord' },
  { value: 'qq', label: 'QQ' },
];

async function loadData() {
  const id = route.query.id;
  if (!id) return;
  isEdit.value = true;
  const res: any = await getBotInstances();
  const list = res.data || res || [];
  const item = list.find((x: any) => x.id === Number(id));
  if (item) {
    form.value = { ...item };
  }
}

async function handleSubmit() {
  loading.value = true;
  try {
    if (isEdit.value) {
      await updateBotInstance(Number(route.query.id), form.value);
    } else {
      await createBotInstance(form.value);
    }
    ElMessage.success('保存成功');
    router.push({ name: 'BotList' });
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败');
  } finally {
    loading.value = false;
  }
}

onMounted(loadData);
</script>

<template>
  <div class="p-4">
    <el-card>
      <template #header>
        <span>{{ isEdit ? '编辑 Bot' : '新增 Bot' }}</span>
      </template>
      <el-form :model="form" label-width="120px">
        <el-form-item label="名称" required>
          <el-input v-model="form.name" placeholder="Bot 名称" />
        </el-form-item>
        <el-form-item label="平台" required>
          <el-select v-model="form.platform" placeholder="选择平台">
            <el-option
              v-for="p in platforms"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="AppID" required>
          <el-input v-model="form.appId" placeholder="平台 AppID / BotID" />
        </el-form-item>
        <el-form-item label="Secret / Token" required>
          <el-input v-model="form.appSecret" type="password" placeholder="平台 Secret 或 Token" />
        </el-form-item>
        <el-form-item label="使用模型">
          <el-input v-model="form.model" placeholder="如 gpt-3.5-turbo" />
        </el-form-item>
        <el-form-item label="绑定应用ID">
          <el-input-number v-model="form.appId_ref" :min="0" placeholder="应用 ID" />
        </el-form-item>
        <el-form-item label="欢迎语">
          <el-input v-model="form.welcomeMessage" type="textarea" rows="3" />
        </el-form-item>
        <el-form-item label="验证令牌">
          <el-input v-model="form.verifyToken" placeholder="Webhook 验证令牌" />
        </el-form-item>
        <el-form-item label="加密密钥">
          <el-input v-model="form.encodingAesKey" placeholder="消息加密密钥" />
        </el-form-item>
        <el-form-item label="附加配置">
          <el-input
            v-model="form.extraConfig"
            type="textarea"
            rows="3"
            placeholder='JSON 格式，如 {"agentId": 1000002}'
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleSubmit">保存</el-button>
          <el-button @click="$router.back()">返回</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
```

### Task 17: 消息记录页

**Files:**
- Create: `admin/src/views/bot/messages.vue`

- [ ] **Step 1: 实现消息记录页**

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { getBotMessages, getBotInstances } from '@/api/modules/bot';

const loading = ref(false);
const tableData = ref([]);
const botInstances = ref([]);
const selectedBotId = ref<number | null>(null);
const pagination = ref({ page: 1, size: 20, total: 0 });

async function loadBots() {
  const res: any = await getBotInstances();
  botInstances.value = res.data || res || [];
  if (botInstances.value.length > 0) {
    selectedBotId.value = botInstances.value[0].id;
    loadMessages();
  }
}

async function loadMessages() {
  if (!selectedBotId.value) return;
  loading.value = true;
  try {
    const res: any = await getBotMessages(selectedBotId.value, {
      page: pagination.value.page,
      size: pagination.value.size,
    });
    const data = res.data || res;
    tableData.value = data.rows || [];
    pagination.value.total = data.count || 0;
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败');
  } finally {
    loading.value = false;
  }
}

function handlePageChange(page: number) {
  pagination.value.page = page;
  loadMessages();
}

onMounted(loadBots);
</script>

<template>
  <div class="p-4">
    <el-card>
      <template #header>
        <div class="flex justify-between items-center">
          <span>Bot 消息记录</span>
          <el-select
            v-model="selectedBotId"
            placeholder="选择 Bot"
            style="width: 200px"
            @change="loadMessages"
          >
            <el-option
              v-for="bot in botInstances"
              :key="bot.id"
              :label="bot.name"
              :value="bot.id"
            />
          </el-select>
        </div>
      </template>
      <el-table v-loading="loading" :data="tableData" border>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="platformMsgId" label="平台消息ID" />
        <el-table-column prop="platformUserId" label="平台用户ID" />
        <el-table-column prop="direction" label="方向" width="80">
          <template #default="{ row }">
            <el-tag :type="row.direction === 'in' ? 'primary' : 'success'">
              {{ row.direction === 'in' ? '接收' : '发送' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="msgType" label="类型" width="80" />
        <el-table-column prop="content" label="内容" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="180" />
      </el-table>
      <div class="mt-4 flex justify-end">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :total="pagination.total"
          layout="total, prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>
  </div>
</template>
```

---

## Chunk 9: ChatService 兼容性修改

### Task 18: 修改 ChatService 支持 Bot 调用

**Files:**
- Modify: `service/src/modules/chat/chat.service.ts`

- [ ] **Step 1: 调整 chatProcess 参数兼容性**

找到 `chatProcess` 方法签名和开头部分。当前方法依赖 `req.user.id`。需要支持传入模拟用户对象。

在 `chatProcess` 方法开头，添加对 `req` 为模拟对象的兼容：

```typescript
async chatProcess(body: any, req?: Request, res?: Response) {
    // Bot 调用时 req 可能为 { user: { id: number } }
    const userId = (req as any)?.user?.id;
    if (!userId) {
      throw new HttpException('用户未认证', HttpStatus.UNAUTHORIZED);
    }
    // 后续逻辑不变...
```

**注意：** 不要修改方法签名，只在内部增加空值保护。

---

## Chunk 10: 编译验证与测试

### Task 19: 编译验证

- [ ] **Step 1: 编译 service**

Run: `cd /Volumes/KINGSTON/CodeVault/GitHub/99AI/service && pnpm build`
Expected: 编译成功，无错误

- [ ] **Step 2: 编译 admin**

Run: `cd /Volumes/KINGSTON/CodeVault/GitHub/99AI/admin && pnpm build`
Expected: 编译成功，无错误

### Task 20: 端到端测试

- [ ] **Step 1: 启动后端**

Run: `cd /Volumes/KINGSTON/CodeVault/GitHub/99AI/service && pnpm dev`

- [ ] **Step 2: 测试管理后台**

1. 访问 admin 页面
2. 在左侧菜单看到 "Bot 管理"
3. 点击 "新增 Bot"，选择飞书平台，填写测试 AppID/Secret
4. 保存后在列表中显示

- [ ] **Step 3: 测试 Webhook（飞书示例）**

1. 使用飞书开放平台的挑战验证请求：
```bash
curl -X POST http://localhost:9520/bot/webhook/feishu/1 \
  -H "Content-Type: application/json" \
  -d '{"challenge": "test123"}'
```
Expected: 返回 `{"challenge":"test123"}`

2. 测试消息接收：
```bash
curl -X POST http://localhost:9520/bot/webhook/feishu/1 \
  -H "Content-Type: application/json" \
  -d '{
    "schema": "2.0",
    "header": {"event_id": "test"},
    "event": {
      "message": {
        "message_id": "test_msg",
        "chat_type": "p2p",
        "msg_type": "text",
        "content": "{\"text\": \"你好\"}"
      },
      "sender": {"sender_id": {"open_id": "test_user"}}
    }
  }'
```
Expected: 返回 `success`，数据库 `bot_messages` 表中有入站记录

---

## 风险与应对

| 风险 | 应对 |
|------|------|
| 各平台 API 差异大 | Adapter 模式隔离差异，统一接口处理 |
| Discord WebSocket 连接不稳定 | 增加断线重连机制（后续迭代） |
| 企业微信消息加密复杂 | 先实现明文模式，加密模式后续迭代 |
| Bot 用户无系统账号 | 自动创建访客用户，绑定 platformUserId |
| 消息循环触发 | 过滤 Bot 自身消息，避免自回复循环 |
| 长对话上下文管理 | 复用现有 ChatService 的上下文能力 |

---

*核心原则：Adapter 模式保证平台隔离，统一复用 ChatService 对话能力，管理后台提供完整 CRUD 和消息追踪。*
