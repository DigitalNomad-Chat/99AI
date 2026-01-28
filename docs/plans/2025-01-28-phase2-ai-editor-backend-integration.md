# AI写作编辑器 - Phase 2 后端API与界面集成实施方案

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**制定日期:** 2025-01-28
**当前状态:** Phase 1 前端组件已完成（10/13任务，77%）
**目标:** 完成后端AI编辑器API和聊天界面集成

---

## 项目架构分析

### 后端架构（NestJS）
- **框架:** NestJS 10.x + TypeORM
- **数据库:** MySQL/PostgreSQL
- **AI服务:** OpenAI SDK（通过OpenAIChatService）
- **模块化设计:** 功能按模块划分（chat/auth/user等）
- **全局配置:** GlobalConfigService
- **认证:** JwtAuthGuard

### 前端架构（Vue 3）
- **框架:** Vue 3 + TypeScript + Composition API
- **状态管理:** Pinia
- **路由:** Vue Router（当前仅配置了根路由）
- **UI组件:** 已完成Editor组件集合

---

## Phase 2: 后端AI编辑器API实现

### 概述
创建aiEditor模块，提供AI编辑、续写、文章生成功能。

### 架构设计
```
service/src/modules/aiEditor/
├── dto/
│   ├── ai-edit.dto.ts           # AI编辑DTO
│   ├── ai-continue.dto.ts       # AI续写DTO
│   └── generate-article.dto.ts  # 文章生成DTO
├── ai-editor.controller.ts      # API控制器
├── ai-editor.service.ts         # 业务逻辑服务
├── ai-editor.module.ts          # 模块定义
└── entities/
    └── article.entity.ts        # 文章实体（可选）
```

---

### Task 1: 创建AI编辑器DTO定义

**Files:**
- Create: `service/src/modules/aiEditor/dto/ai-edit.dto.ts`
- Create: `service/src/modules/aiEditor/dto/ai-continue.dto.ts`
- Create: `service/src/modules/aiEditor/dto/generate-article.dto.ts`

**Step 1: 创建AI编辑DTO**

创建 `service/src/modules/aiEditor/dto/ai-edit.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum AiCommand {
  REWRITE = 'rewrite',
  EXPAND = 'expand',
  SUMMARIZE = 'summarize',
  TRANSLATE = 'translate',
  POLISH = 'polish',
}

export class AiEditDto {
  @ApiModelProperty({ description: '要编辑的内容', example: '这是一段需要改写的文字。' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiModelProperty({
    description: 'AI命令类型',
    enum: AiCommand,
    example: AiCommand.REWRITE,
  })
  @IsEnum(AiCommand)
  @IsNotEmpty()
  command: AiCommand;

  @ApiModelProperty({
    description: '自定义提示词（可选，覆盖默认prompt）',
    required: false,
  })
  @IsString()
  @IsOptional()
  prompt?: string;
}
```

**Step 2: 创建AI续写DTO**

创建 `service/src/modules/aiEditor/dto/ai-continue.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AiContinueDto {
  @ApiModelProperty({ description: '当前文章内容', example: '人工智能是计算机科学...' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
```

**Step 3: 创建文章生成DTO**

创建 `service/src/modules/aiEditor/dto/generate-article.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GenerateArticleDto {
  @ApiModelProperty({ description: '写作需求描述', example: '写一篇关于人工智能发展历史的文章' })
  @IsString()
  @IsNotEmpty()
  prompt: string;
}
```

**Step 4: 提交**

```bash
git add service/src/modules/aiEditor/dto/
git commit -m "feat: 添加AI编辑器DTO定义"
```

---

### Task 2: 创建AI编辑器Service

**Files:**
- Create: `service/src/modules/aiEditor/ai-editor.service.ts`

**Step 1: 创建AI编辑器Service**

创建 `service/src/modules/aiEditor/ai-editor.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OpenAIChatService } from '../aiTool/chat/chat.service';
import { GlobalConfigService } from '../globalConfig/globalConfig.service';
import { AiEditDto, AiCommand } from './dto/ai-edit.dto';
import { AiContinueDto } from './dto/ai-continue.dto';
import { GenerateArticleDto } from './dto/generate-article.dto';

@Injectable()
export class AiEditorService {
  private readonly logger = new Logger(AiEditorService.name);

  constructor(
    private readonly globalConfigService: GlobalConfigService,
    private readonly openAIChatService: OpenAIChatService,
  ) {}

  /**
   * AI编辑（改写、扩写、总结、翻译、润色）
   */
  async aiEdit(dto: AiEditDto, userId: number): Promise<{ result: string }> {
    const { content, command, prompt: customPrompt } = dto;

    this.logger.log(`用户 ${userId} 请求AI编辑: ${command}`);

    // 构建AI请求prompt
    const systemPrompt = this.buildPrompt(command, content, customPrompt);

    // 调用OpenAIChatService
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content },
    ];

    try {
      const result = await this.callOpenAI(messages);
      return { result };
    } catch (error) {
      this.logger.error(`AI编辑失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * AI续写
   */
  async aiContinue(dto: AiContinueDto, userId: number): Promise<{ result: string }> {
    const { content } = dto;

    this.logger.log(`用户 ${userId} 请求AI续写`);

    const systemPrompt = `你是一个专业的写作助手。请根据以下内容进行续写，保持相同的风格和语调。续写内容应该自然、连贯，并且符合上下文逻辑。`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请续写以下内容：\n\n${content}` },
    ];

    try {
      const result = await this.callOpenAI(messages);
      return { result };
    } catch (error) {
      this.logger.error(`AI续写失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 生成文章
   */
  async generateArticle(dto: GenerateArticleDto, userId: number): Promise<{
    title: string;
    content: string;
    htmlContent: string;
  }> {
    const { prompt } = dto;

    this.logger.log(`用户 ${userId} 请求生成文章: ${prompt}`);

    const systemPrompt = `你是一个专业的写作助手。用户将提出写作需求，你需要：

1. 理解用户的写作主题和要求
2. 生成结构化的文章内容
3. 返回JSON格式（必须是有效的JSON，不要包含markdown代码块标记）：
{
  "title": "文章标题",
  "content": "文章正文（支持Markdown格式）",
  "outline": ["要点1", "要点2"],
  "tags": ["标签1", "标签2"]
}

请确保返回的是纯JSON格式，不要用markdown代码块包裹。`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await this.callOpenAI(messages);

      // 解析JSON响应
      const jsonMatch = result.match(/```json\s*([\s\S]*?)\s*```/) ||
                        result.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('AI返回的内容格式不正确');
      }

      const jsonStr = jsonMatch[1] || jsonMatch[0];
      const articleData = JSON.parse(jsonStr);

      return {
        title: articleData.title || '未命名文章',
        content: articleData.content || result,
        htmlContent: articleData.content || result,
      };
    } catch (error) {
      this.logger.error(`生成文章失败: ${error.message}`);
      // 如果解析失败，返回原始内容
      return {
        title: '生成的文章',
        content: result,
        htmlContent: result,
      };
    }
  }

  /**
   * 根据命令构建prompt
   */
  private buildPrompt(command: AiCommand, content: string, customPrompt?: string): string {
    if (customPrompt) {
      return customPrompt;
    }

    const prompts: Record<AiCommand, string> = {
      [AiCommand.REWRITE]: `你是一个专业的编辑助手。请改写以下内容，保持原意但改善表达方式，使文字更加流畅、准确、生动。

原文：
${content}`,
      [AiCommand.EXPAND]: `你是一个专业的写作助手。请对以下内容进行详细扩写，添加更多细节、例子和说明，使内容更加丰富和完整。

原文：
${content}`,
      [AiCommand.SUMMARIZE]: `你是一个专业的编辑助手。请用一句话简明扼要地总结以下内容的核心要点。

原文：
${content}`,
      [AiCommand.TRANSLATE]: `你是一个专业的翻译助手。请将以下内容翻译成英文，确保翻译准确、流畅、符合英文表达习惯。

原文：
${content}`,
      [AiCommand.POLISH]: `你是一个专业的编辑助手。请对以下内容进行润色优化，改善语言表达，提升文字的质量和专业性。

原文：
${content}`,
    };

    return prompts[command] || content;
  }

  /**
   * 调用OpenAI服务
   */
  private async callOpenAI(messages: any[]): Promise<string> {
    // 获取全局配置
    const {
      openaiBaseUrl,
      openaiBaseKey,
      openaiBaseModel,
    } = await this.globalConfigService.getConfigs([
      'openaiBaseUrl',
      'openaiBaseKey',
      'openaiBaseModel',
    ]);

    // 构建请求参数
    const requestOptions = {
      apiKey: openaiBaseKey,
      model: openaiBaseModel,
      proxyUrl: openaiBaseUrl,
      timeout: 60000,
      messages: messages,
      stream: false,
      abortController: new AbortController(),
    };

    // 调用OpenAIChatService（需要适配现有接口）
    // 这里需要根据OpenAIChatService的实际接口进行调整
    const result = await this.openAIChatService.chatProcess(requestOptions);

    return result;
  }
}
```

**Step 2: 提交**

```bash
git add service/src/modules/aiEditor/ai-editor.service.ts
git commit -m "feat: 创建AI编辑器Service"
```

---

### Task 3: 创建AI编辑器Controller

**Files:**
- Create: `service/src/modules/aiEditor/ai-editor.controller.ts`

**Step 1: 创建Controller**

创建 `service/src/modules/aiEditor/ai-editor.controller.ts`:
```typescript
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/auth/jwtAuth.guard';
import { AiEditorService } from './ai-editor.service';
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AiEditDto } from './dto/ai-edit.dto';
import { AiContinueDto } from './dto/ai-continue.dto';
import { GenerateArticleDto } from './dto/generate-article.dto';

@ApiTags('AI编辑器')
@Controller('api/ai/editor')
export class AiEditorController {
  constructor(private readonly aiEditorService: AiEditorService) {}

  @Post('edit')
  @ApiOperation({ summary: 'AI编辑（改写、扩写、总结、翻译、润色）' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async aiEdit(@Body() dto: AiEditDto, @Req() req: Request) {
    const result = await this.aiEditorService.aiEdit(dto, req.user.id);
    return {
      success: true,
      data: result,
    };
  }

  @Post('continue')
  @ApiOperation({ summary: 'AI续写' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async aiContinue(@Body() dto: AiContinueDto, @Req() req: Request) {
    const result = await this.aiEditorService.aiContinue(dto, req.user.id);
    return {
      success: true,
      data: result,
    };
  }
}

@ApiTags('AI文章生成')
@Controller('api/ai')
export class AiArticleController {
  constructor(private readonly aiEditorService: AiEditorService) {}

  @Post('generate-article')
  @ApiOperation({ summary: 'AI生成文章' })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async generateArticle(@Body() dto: GenerateArticleDto, @Req() req: Request) {
    const result = await this.aiEditorService.generateArticle(dto, req.user.id);
    return {
      success: true,
      data: result,
    };
  }
}
```

**Step 2: 提交**

```bash
git add service/src/modules/aiEditor/ai-editor.controller.ts
git commit -m "feat: 创建AI编辑器Controller"
```

---

### Task 4: 创建AI编辑器Module

**Files:**
- Create: `service/src/modules/aiEditor/ai-editor.module.ts`

**Step 1: 创建Module**

创建 `service/src/modules/aiEditor/ai-editor.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AiEditorController } from './ai-editor.controller';
import { AiEditorService } from './ai-editor.service';
import { GlobalConfigModule } from '../globalConfig/globalConfig.module';
import { AiToolModule } from '../aiTool/aiTool.module';

@Module({
  imports: [GlobalConfigModule, AiToolModule],
  controllers: [AiEditorController],
  providers: [AiEditorService],
  exports: [AiEditorService],
})
export class AiEditorModule {}
```

**Step 2: 注册到AppModule**

修改 `service/src/app.module.ts`:
```typescript
import { AiEditorModule } from './modules/aiEditor/ai-editor.module';

@Module({
  imports: [
    // ... 现有imports
    AiEditorModule,
  ],
})
export class AppModule {}
```

**Step 3: 提交**

```bash
git add service/src/modules/aiEditor/ service/src/app.module.ts
git commit -m "feat: 创建AI编辑器Module并注册"
```

---

### Task 5: 适配OpenAIChatService接口

**Files:**
- Modify: `service/src/modules/aiEditor/ai-editor.service.ts`

**Step 1: 查看OpenAIChatService实际接口**

先检查 `service/src/modules/aiTool/chat/chat.service.ts` 的公开方法签名。

**Step 2: 调整callOpenAI方法**

根据实际接口调整 `ai-editor.service.ts` 中的 `callOpenAI` 方法实现。

**Step 3: 提交**

```bash
git add service/src/modules/aiEditor/ai-editor.service.ts
git commit -m "fix: 适配OpenAIChatService接口"
```

---

## Phase 3: 前端路由配置

### Task 6: 添加路由配置

**Files:**
- Modify: `chat/src/utils/router.ts`

**Step 1: 添加编辑器测试页面路由**

修改 `chat/src/utils/router.ts`:
```typescript
const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Chat',
    component: () => import('@/views/chat/chat.vue'),
  },
  {
    path: '/editor-test',
    name: 'EditorTest',
    component: () => import('@/views/EditorTest.vue'),
    meta: {
      title: '编辑器测试',
    },
  },
  {
    path: '/:catchAll(.*)',
    redirect: '/',
  },
]
```

**Step 2: 提交**

```bash
git add chat/src/utils/router.ts
git commit -m "feat: 添加编辑器测试页面路由"
```

---

## Phase 4: 聊天界面集成写作模式

### Task 7: 创建写作模式组件

**Files:**
- Create: `chat/src/components/WritingMode/ModeSwitcher.vue`
- Create: `chat/src/components/WritingMode/index.ts`

**Step 1: 创建模式切换器组件**

创建 `chat/src/components/WritingMode/ModeSwitcher.vue`:
```vue
<template>
  <div class="mode-switcher">
    <button
      v-for="[key, config] in allModes"
      :key="key"
      class="mode-button"
      :class="{ active: mode === key }"
      @click="handleModeChange(key as ChatMode)"
    >
      <span class="mode-icon">{{ config.icon }}</span>
      <span class="mode-label">{{ config.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useChatMode } from '@/composables/useChatMode'
import type { ChatMode } from '@/composables/useChatMode'

const { mode, setMode, allModes } = useChatMode()

const emit = defineEmits<{
  (e: 'mode-change', mode: ChatMode): void
}>()

const handleModeChange = (newMode: ChatMode) => {
  setMode(newMode)
  emit('mode-change', newMode)
}
</script>

<style scoped>
.mode-switcher {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.mode-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-button:hover {
  background: #f3f4f6;
}

.mode-button.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.mode-icon {
  font-size: 16px;
}

.mode-label {
  font-weight: 500;
}
</style>
```

**Step 2: 创建导出文件**

创建 `chat/src/components/WritingMode/index.ts`:
```typescript
export { default as ModeSwitcher } from './ModeSwitcher.vue'
```

**Step 3: 提交**

```bash
git add chat/src/components/WritingMode/
git commit -m "feat: 创建写作模式切换器组件"
```

---

### Task 8: 更新Footer组件集成模式切换

**Files:**
- Modify: `chat/src/views/chat/components/Footer/index.vue`

**Step 1: 在Footer组件中集成模式切换器**

由于Footer组件较复杂（1400+行），采用最小化修改策略：

1. 在script setup部分添加导入：
```typescript
import ModeSwitcher from '@/components/WritingMode'
import { useChatMode } from '@/composables/useChatMode'
import { useArticleStore } from '@/store/modules/article'

const { config: modeConfig, isWritingMode } = useChatMode()
const articleStore = useArticleStore()
const showArticleDrawer = ref(false)
```

2. 在template中适当位置添加模式切换器（在输入框上方）：
```vue
<!-- 模式切换器 -->
<ModeSwitcher
  v-if="!isStreamIn"
  @mode-change="handleModeChange"
/>

<!-- 文章抽屉 -->
<SidebarDrawer
  v-model:visible="showArticleDrawer"
  :article="currentArticle"
  @save="handleSaveArticle"
/>
```

3. 添加事件处理：
```typescript
const handleModeChange = (mode: ChatMode) => {
  console.log('模式切换:', mode)
}

const handleSaveArticle = (article: Omit<Article.Article, 'id' | 'createdAt' | 'updatedAt'>) => {
  articleStore.addArticle(article)
}
```

**Step 2: 提交**

```bash
git add chat/src/views/chat/components/Footer/index.vue
git commit -m "feat: 集成写作模式切换器到Footer组件"
```

---

### Task 9: 实现写作模式特殊处理逻辑

**Files:**
- Modify: `chat/src/views/chat/components/Footer/index.vue`

**Step 1: 修改发送消息逻辑**

在写作模式下，发送消息应该生成文章而不是普通对话。

修改 `handleSend` 或类似的发送函数：
```typescript
const handleSend = async () => {
  if (isWritingMode.value) {
    // 写作模式：生成文章
    await generateArticle()
  } else {
    // 普通聊天模式
    await sendMessage()
  }
}

const generateArticle = async () => {
  try {
    const response = await fetch('/api/ai/generate-article', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ prompt: prompt.value }),
    })

    const data = await response.json()

    if (data.success) {
      const article = {
        title: data.data.title,
        content: data.data.content,
        htmlContent: data.data.htmlContent,
        status: 'draft' as const,
      }

      const savedArticle = articleStore.addArticle(article)
      currentArticle.value = savedArticle
      showArticleDrawer.value = true
    }
  } catch (error) {
    console.error('生成文章失败:', error)
    ms.error('生成文章失败，请重试')
  }
}
```

**Step 2: 提交**

```bash
git add chat/src/views/chat/components/Footer/index.vue
git commit -m "feat: 实现写作模式文章生成逻辑"
```

---

## Phase 5: 测试与验证

### Task 10: 端到端测试

**Step 1: 启动后端服务**

```bash
cd service
npm run start:dev
```

**Step 2: 启动前端服务**

```bash
cd chat
npm run dev
```

**Step 3: 测试AI编辑器API**

使用Postman或curl测试：
```bash
curl -X POST http://localhost:3000/api/ai/editor/edit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "content": "这是一段测试文字。",
    "command": "rewrite"
  }'
```

**Step 4: 测试前端功能**

1. 访问 `http://localhost:9002/editor-test`
2. 测试基础编辑器功能
3. 测试侧边栏打开/关闭
4. 测试文章卡片编辑/删除

**Step 5: 测试写作模式**

1. 访问 `http://localhost:9002`
2. 点击"帮我写作"模式
3. 输入写作需求并发送
4. 验证文章生成和抽屉显示

---

## 任务优先级与依赖关系

### 高优先级（核心功能）
1. **Task 1-4**: 后端AI编辑器API（独立完成）
   - 依赖：无
   - 预估时间：2-3小时

2. **Task 5**: 适配OpenAIChatService接口
   - 依赖：Task 1-4
   - 预估时间：1-2小时

3. **Task 7-8**: 写作模式组件与集成
   - 依赖：无
   - 预估时间：2-3小时

### 中优先级（集成功能）
4. **Task 6**: 路由配置
   - 依赖：无
   - 预估时间：30分钟

5. **Task 9**: 写作模式逻辑实现
   - 依赖：Task 7-8, Task 1-5
   - 预估时间：1-2小时

### 低优先级（测试验证）
6. **Task 10**: 端到端测试
   - 依赖：所有上述任务
   - 预估时间：1-2小时

---

## 风险与注意事项

### 技术风险
1. **OpenAIChatService接口适配**
   - 风险：现有接口可能与预期不符
   - 缓解：先查看chat.service.ts的实际调用方式

2. **Footer组件复杂性**
   - 风险：1400+行代码，修改可能引入问题
   - 缓解：采用最小化修改策略，增量测试

3. **AI响应解析**
   - 风险：AI可能不返回纯JSON格式
   - 缓解：添加多层fallback逻辑

### 业务风险
1. **用户认证**
   - 需要确保所有API都有JwtAuthGuard保护

2. **费用控制**
   - AI调用需要扣费，确保集成用户余额检查

3. **并发控制**
   - 文章生成可能耗时较长，考虑添加队列机制

---

## 后续优化方向

1. **流式响应**
   - 实现Server-Sent Events (SSE)流式生成

2. **文章管理**
   - 添加文章列表页面
   - 实现文章编辑/删除持久化到数据库

3. **导出功能**
   - 支持导出为PDF/Word/Markdown

4. **性能优化**
   - 添加请求缓存
   - 优化chunk大小

---

## 总结

**总任务数**: 10个任务
**预估时间**: 10-15小时
**技术栈**: NestJS + Vue 3 + TipTap
**关键里程碑**:
- ✅ Phase 1完成：前端组件（77%）
- ⏳ Phase 2进行中：后端API（0%）
- ⏳ Phase 3待开始：前端集成（0%）

**下一步**: 等待用户指令开始执行
