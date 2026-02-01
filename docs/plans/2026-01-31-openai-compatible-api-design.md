# 99AI 开放API设计方案 - OpenAI兼容接口

**项目**: 99AI
**版本**: v1.0
**日期**: 2026-01-31
**状态**: 待实施

---

## 1. 项目概述

### 1.1 需求背景

当前 99AI 项目是一个封闭的 SaaS 平台，所有 AI 功能需要用户登录后通过 Web 界面使用。为满足第三方系统（如飞书多维表）的接入需求，需要开发一套 **OpenAI 兼容的开放 API**。

### 1.2 设计目标

1. **完全兼容 OpenAI 格式** - 第三方系统无需修改代码即可接入
2. **统一计费系统** - API 调用与 Web 调用共享用户余额
3. **最小侵入原则** - 不改动现有 JWT 认证和计费逻辑
4. **用户友好** - 提供清晰的使用指南和模型列表

---

## 2. 需求确认

| 设计决策 | 确认方案 |
|---------|---------|
| 认证方式 | ✅ 标准 OpenAI 格式 `Authorization: Bearer sk-xxxxx` |
| API Key 管理 | ✅ 每个用户限制固定数量（5 个） |
| 接口兼容范围 | ✅ 只支持 `POST /v1/chat/completions` |
| 计费模式 | ✅ 直接扣除用户现有余额（复用 `user_balances`） |
| 速率限制 | ✅ 全局限制（60/min） |
| 模型管理 | ✅ 直接使用后端 `model` 字段，前端动态展示 |

---

## 3. 整体架构

### 3.1 系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    99AI 开放API架构                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  第三方系统（飞书多维表等）                                    │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────┐               │
│  │   OpenAI 兼容接口层                       │               │
│  │   POST /api/v1/chat/completions          │               │
│  └─────────────────────────────────────────┘               │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────┐               │
│  │   API Key 认证守卫 (OpenAIAuthGuard)    │               │
│  │   - 验证 Bearer Token 格式              │               │
│  │   - 区分 JWT vs API Key (前缀判断)     │               │
│  │   - 查询 user_id 并注入请求上下文        │               │
│  │   - 速率限制检查                        │               │
│  └─────────────────────────────────────────┘               │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────┐               │
│  │   现有 ChatService                      │               │
│  │   (复用，无需改动)                       │               │
│  └─────────────────────────────────────────┘               │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────┐               │
│  │   现有计费系统 (UserBalanceService)     │               │
│  │   (复用，无需改动)                       │               │
│  └─────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 核心设计原则

1. **最小侵入**：新增开放API功能，不改动现有 JWT 认证和计费逻辑
2. **完全兼容**：请求/响应格式与 OpenAI 完全一致
3. **统一计费**：API Key 调用与 Web 调用共享用户余额
4. **性能优先**：使用 Redis 缓存 API Key 验证结果和速率限制

---

## 4. 数据模型设计

### 4.1 API Key 实体 (`api_keys` 表)

```typescript
@Entity({ name: 'api_keys' })
export class ApiKeyEntity extends BaseEntity {
  @Column({ comment: '用户ID' })
  userId: number;

  @Column({ type: 'varchar', length: 48, unique: true, comment: 'API Key (sk-前缀)' })
  apiKey: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: 'API Key 名称/备注' })
  name: string;

  @Column({ type: 'datetime', nullable: true, comment: '过期时间 (NULL=永不过期)' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: true, comment: '是否启用' })
  isActive: boolean;

  @Column({ type: 'int', default: 0, comment: '总调用次数' })
  totalRequests: number;

  @Column({ type: 'datetime', comment: '最后使用时间' })
  lastUsedAt: Date;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '最后使用IP' })
  lastUsedIp: string;
}
```

### 4.2 API Key 格式规范

| 格式 | 示例 | 说明 |
|-----|------|------|
| 前缀 | `sk-` | 固定前缀，便于识别 |
| 随机部分 | `a1b2c3d4e5f6...` | 40 位随机字符（字母+数字） |
| 完整格式 | `sk-a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0` | 总长度 43 字符 |

**生成方式**：`crypto.randomBytes(24).toString('base64url')`

### 4.3 数据库变更 SQL

```sql
-- 创建 api_keys 表
CREATE TABLE `api_keys` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT '用户ID',
  `api_key` varchar(48) NOT NULL COMMENT 'API Key',
  `name` varchar(100) DEFAULT NULL COMMENT '名称/备注',
  `expires_at` datetime DEFAULT NULL COMMENT '过期时间',
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

-- models 表新增字段
ALTER TABLE `models` ADD COLUMN `is_api_available` tinyint DEFAULT 1 COMMENT '是否在开放API中可用';

-- config 表新增配置
INSERT INTO `config` (`option_name`, `option_value`, `description`) VALUES
('api_key_max_per_user', '5', '每个用户最多创建的 API Key 数量'),
('api_key_rate_limit', '60', 'API Key 每分钟请求限制');
```

### 4.4 数据关系

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   api_keys      │         │     users       │         │ user_balances   │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ id (PK)         │    ┌───▶│ id (PK)         │    ┌───▶│ id (PK)         │
│ userId (FK)     │────┘    │ username        │    │     │ userId (FK)     │
│ apiKey          │         │ email           │────┘     │ model3Count     │
│ name            │         │ ...             │          │ useModel3Token  │
│ expiresAt       │         └─────────────────┘          │ ...             │
│ isActive        │                                     └─────────────────┘
│ lastUsedAt      │
└─────────────────┘
```

---

## 5. 核心模块设计

### 5.1 目录结构

```
service/src/
├── modules/
│   ├── apiKey/                    # 新增：API Key 管理模块
│   │   ├── apiKey.controller.ts   # API Key CRUD 接口
│   │   ├── apiKey.service.ts      # API Key 业务逻辑
│   │   ├── apiKey.entity.ts       # API Key 数据实体
│   │   ├── dto/
│   │   │   ├── createApiKey.dto.ts
│   │   │   └── queryApiKey.dto.ts
│   │   └── apiKey.module.ts
│   │
│   ├── openaiApi/                 # 新增：OpenAI 兼容 API 模块
│   │   ├── openai.controller.ts   # /v1/chat/completions 接口
│   │   ├── openai.service.ts      # OpenAI 格式转换与转发
│   │   ├── dto/
│   │   │   └── chatCompletion.dto.ts
│   │   └── openai.module.ts
│   │
│   └── chat/                      # 现有模块（保持不变）
│       ├── chat.controller.ts
│       ├── chat.service.ts
│       └── ...
│
├── common/
│   ├── guards/
│   │   ├── jwtAuth.guard.ts       # 现有 JWT 守卫
│   │   └── openaiAuth.guard.ts    # 新增：OpenAI API Key 守卫
│   │
│   ├── decorators/
│   │   └── currentApiKey.decorator.ts
│   │
│   └── interceptors/
│       └── rateLimit.interceptor.ts
│
└── main.ts
```

### 5.2 API Key 认证守卫

```typescript
@Injectable()
export class OpenAIAuthGuard implements CanActivate {
  constructor(
    @Inject(REQUEST) private request: Request,
    private apiKeyService: ApiKeyService,
  ) {}

  async canActivate(): Promise<boolean> {
    const authHeader = this.request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid Authorization format');
    }

    const token = parts[1];

    // 判断是 JWT 还是 API Key
    if (token.startsWith('sk-')) {
      const apiKey = await this.apiKeyService.validateApiKey(token);
      if (!apiKey) {
        throw new UnauthorizedException('Invalid API Key');
      }

      this.request['user'] = { id: apiKey.userId };
      this.request['apiKey'] = apiKey;
      return true;
    }

    throw new UnauthorizedException('Invalid token format');
  }
}
```

### 5.3 API Key 服务

```typescript
@Injectable()
export class ApiKeyService {
  constructor(
    @InjectRepository(ApiKeyEntity) private repo: Repository<ApiKeyEntity>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // 创建 API Key
  async create(userId: number, name?: string): Promise<string> {
    const count = await this.repo.count({ where: { userId } });
    const maxKeys = parseInt(await this.getConfig('api_key_max_per_user'));
    if (count >= maxKeys) {
      throw new BadRequestException(`最多创建 ${maxKeys} 个 API Key`);
    }

    const apiKey = `sk-${crypto.randomBytes(24).toString('base64url')}`;

    const entity = this.repo.create({
      userId,
      apiKey,
      name: name || `API Key ${count + 1}`,
    });

    await this.repo.save(entity);
    await this.cacheManager.set(`apikey:${apiKey}`, entity, 3600);

    return apiKey;
  }

  // 验证 API Key（带缓存）
  async validateApiKey(apiKey: string): Promise<ApiKeyEntity | null> {
    const cached = await this.cacheManager.get<ApiKeyEntity>(`apikey:${apiKey}`);
    if (cached) {
      return cached;
    }

    const entity = await this.repo.findOne({
      where: { apiKey, isActive: true },
    });

    if (entity) {
      if (entity.expiresAt && entity.expiresAt < new Date()) {
        return null;
      }
      await this.cacheManager.set(`apikey:${apiKey}`, entity, 3600);
    }

    return entity;
  }

  // 记录使用
  async recordUsage(apiKey: string, ip: string): Promise<void> {
    await this.repo.update({ apiKey }, {
      lastUsedAt: new Date(),
      lastUsedIp: ip,
      totalRequests: () => 'totalRequests + 1',
    });
  }
}
```

### 5.4 OpenAI 兼容接口

```typescript
@ApiTags('OpenAI API')
@Controller('api/v1')
export class OpenAIController {
  constructor(
    private openaiService: OpenAIService,
    private chatService: ChatService,
  ) {}

  @Post('chat/completions')
  @ApiOperation({ summary: 'OpenAI 兼容聊天接口' })
  @UseGuards(OpenAIAuthGuard)
  @UseInterceptors(RateLimitInterceptor)
  async chatCompletions(
    @Body() dto: ChatCompletionDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // OpenAI 格式转换 → 内部格式
    const internalRequest = this.openaiService.toInternalFormat(dto);

    // 调用现有 ChatService
    return this.chatService.chatProcess(internalRequest, req, res);
  }

  @Get('models')
  @ApiOperation({ summary: '获取可用模型列表' })
  @UseGuards(OpenAIAuthGuard)
  async getModels(@Req() req: Request) {
    return this.openaiService.getAvailableModels();
  }
}
```

### 5.5 速率限制拦截器

```typescript
@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  constructor(@Inject(CACHE_MANAGER) private cache: Cache) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request['apiKey']?.apiKey;

    if (!apiKey) return next.handle();

    const key = `ratelimit:${apiKey}:${Math.floor(Date.now() / 60000)}`;
    const current = await this.cache.get<number>(key) || 0;
    const limit = parseInt(await this.getConfig('api_key_rate_limit')) || 60;

    if (current >= limit) {
      throw new ThrottlerException('Rate limit exceeded');
    }

    await this.cache.set(key, current + 1, 60);

    return next.handle();
  }
}
```

---

## 6. 前端页面设计

### 6.1 页面结构

```
前端项目/src/
├── views/
│   └── settings/
│       └── ApiKeys.vue          # API Key 管理页面
├── api/
│   └── apiKey.ts                # API Key 相关接口
└── router/
    └── index.ts                 # 添加路由 /settings/api-keys
```

### 6.2 API 使用指南页面

```
┌─────────────────────────────────────────────────────────────┐
│  📌 快速开始                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. 创建 API Key                                      │   │
│  │ 2. 复制 Key                                         │   │
│  │ 3. 使用下方代码调用                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🔑 我的 API Keys（当前 1/5）                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ sk-a1b2c3d4...  [复制] [删除]  最后使用: 2分钟前      │   │
│  │ [+ 创建新的 API Key]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📖 调用示例                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ curl 示例 | Python | 飞书多维表                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🤖 可用模型列表                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ gpt-4o                      10 次     128,000        │   │
│  │ gpt-4o-mini                  5 次     128,000        │   │
│  │ claude-3-5-sonnet-20241022  15 次     200,000        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 代码示例（动态生成）

**Python:**
```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-a1b2c3d4...",
    base_url="https://你的域名/api/v1"
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "你好"}]
)

print(response.choices[0].message.content)
```

**飞书多维表配置:**
```
API 地址: https://你的域名/api/v1/chat/completions
API Key: sk-a1b2c3d4...
模型名称: gpt-4o
```

---

## 7. API 接口清单

### 7.1 后端接口

| 路径 | 方法 | 认证 | 说明 |
|-----|------|------|------|
| `/api/v1/chat/completions` | POST | API Key | OpenAI 兼容聊天接口 |
| `/api/v1/models` | GET | API Key | 获取可用模型列表 |
| `/user/api-keys` | GET | JWT | 获取用户的 API Keys |
| `/user/api-keys` | POST | JWT | 创建新 API Key |
| `/user/api-keys/:id` | DELETE | JWT | 删除 API Key |
| `/user/api-keys/stats` | GET | JWT | 获取使用统计 |

### 7.2 模型验证逻辑

```typescript
// 用户请求: { model: 'gpt-4o' }
// ↓ 直接查询 models 表
const model = await this.modelsService.findOne({
  where: { model: 'gpt-4o', isApiAvailable: 1, status: 1 }
});
// ↓ 不存在则返回错误
if (!model) {
  throw new BadRequestException('模型不存在或不可用');
}
```

---

## 8. 实施计划

### 8.1 开发阶段

```
┌─────────────────────────────────────────────────────────────┐
│                        开发路线图                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Phase 1: 数据库与基础架构    ████████████░░░░░░  2天        │
│  Phase 2: 后端核心功能        ░░░░░░░░░░░░░░░░░░  3天        │
│  Phase 3: 前端页面开发        ░░░░░░░░░░░░░░░░░░  2天        │
│  Phase 4: 联调与测试          ░░░░░░░░░░░░░░░░░░  2天        │
│  Phase 5: 文档与部署          ░░░░░░░░░░░░░░░░░░  1天        │
│                                                             │
│  预计总工时: 10个工作日                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Phase 1: 数据库与基础架构 (2天)

- [ ] 执行数据库迁移 SQL
- [ ] 创建 `apiKey` 模块骨架
- [ ] 创建 `openaiApi` 模块骨架
- [ ] 定义 TypeORM 实体

### 8.3 Phase 2: 后端核心功能 (3天)

**Day 1: API Key 管理**
- [ ] ApiKeyEntity 实体
- [ ] CRUD Service
- [ ] CRUD Controller
- [ ] DTO 定义

**Day 2: 认证与速率限制**
- [ ] OpenAIAuthGuard
- [ ] RateLimitInterceptor
- [ ] CurrentApiKey 装饰器
- [ ] 集成测试

**Day 3: OpenAI 兼容接口**
- [ ] ChatCompletionDto
- [ ] OpenAI 格式转换 Service
- [ ] chat/completions 接口

### 8.4 Phase 3: 前端页面开发 (2天)

- [ ] API Key 管理页面
- [ ] API 封装
- [ ] 使用指南组件
- [ ] 响应式适配

### 8.5 Phase 4: 联调与测试 (2天)

| 测试项 | 测试内容 |
|-------|---------|
| API Key 创建 | 用户创建 5 个 Key |
| API Key 认证 | 用错误的 Key 调用 |
| 速率限制 | 1分钟内调用 61 次 |
| 模型验证 | 传入不存在的模型 |
| 计费扣除 | API 调用扣费 |
| 飞书接入 | 配置飞书调用 |

### 8.6 Phase 5: 文档与部署 (1天)

- [ ] 用户使用指南
- [ ] 飞书接入教程
- [ ] 常见问题 FAQ
- [ ] 部署检查清单

---

## 9. 风险与应对

| 风险 | 影响 | 应对措施 |
|-----|------|---------|
| API Key 泄露 | 恶意消耗余额 | 1. 支持设置过期时间<br>2. 异常流量告警<br>3. 一键禁用功能 |
| 速率限制绕过 | 服务过载 | Redis + IP 双重限制 |
| 模型名称变更 | 第三方调用失败 | 保持 model 字段稳定 |

---

## 10. 验收标准

### 10.1 功能验收

- [ ] 用户可创建/删除 API Key
- [ ] API Key 认证正常工作
- [ ] 速率限制生效（60/min）
- [ ] 可用 curl 调用 `/api/v1/chat/completions`
- [ ] 计费正确扣除用户余额
- [ ] 飞书多维表可正常接入

### 10.2 性能验收

- [ ] API Key 验证响应时间 < 50ms（命中缓存）
- [ ] 聊天接口响应时间与现有接口持平
- [ ] 速率限制不产生性能损耗

### 10.3 安全验收

- [ ] API Key 采用安全随机算法生成
- [ ] 过期 Key 自动失效
- [ ] 异常流量触发告警

---

## 11. 核心代码文件清单

### 11.1 后端新增/修改文件 (13个)

```
service/src/
├── modules/
│   ├── apiKey/                          [新增]
│   │   ├── apiKey.entity.ts
│   │   ├── apiKey.service.ts
│   │   ├── apiKey.controller.ts
│   │   ├── dto/createApiKey.dto.ts
│   │   ├── dto/queryApiKey.dto.ts
│   │   └── apiKey.module.ts
│   │
│   └── openaiApi/                        [新增]
│       ├── openai.controller.ts
│       ├── openai.service.ts
│       ├── dto/chatCompletion.dto.ts
│       └── openai.module.ts
│
├── common/
│   ├── guards/openaiAuth.guard.ts        [新增]
│   ├── interceptors/rateLimit.ts        [新增]
│   └── decorators/currentApiKey.ts       [新增]
│
└── main.ts                               [修改: 注册模块]
```

### 11.2 前端新增/修改文件 (4个)

```
前端项目/src/
├── views/settings/ApiKeys.vue            [新增]
├── api/apiKey.ts                         [新增]
├── router/index.ts                       [修改]
└── settings/                             [可能新增菜单项]
```

---

## 12. 参考资料

### 12.1 参考项目

- **niceai_unlocked_1.5.6**: 本地参考项目，位于 `~/办公/GitHub/niceai_unlocked_1.5.6`
  - API Key 管理: `backend/app/Http/Controllers/Controller.php:4733`
  - 数据库表: `backend/database/migrations/2024_06_02_203910_create_api_manage_table.php`

### 12.2 相关文档

- [OpenAI API 文档](https://platform.openai.com/docs/api-reference)
- [NestJS Guards](https://docs.nestjs.com/guards)
- [飞书多维表 AI 接入指南](https://www.feishu.cn/hc/zh-CN)

---

## 13. 附录

### 13.1 测试用例

```bash
# 1. 测试 API Key 认证
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer sk-invalid" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"hi"}]}'

# 2. 测试正常调用
curl -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Authorization: Bearer sk-valid-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"你好"}]}'

# 3. 测试飞书兼容性（使用 OpenAI SDK）
python -c "
from openai import OpenAI
client = OpenAI(api_key='sk-valid-key', base_url='http://localhost:3000/api/v1')
resp = client.chat.completions.create(model='gpt-4o', messages=[{'role':'user','content':'hi'}])
print(resp.choices[0].message.content)
"
```

---

**文档版本**: v1.0
**最后更新**: 2026-01-31
**状态**: 待实施
