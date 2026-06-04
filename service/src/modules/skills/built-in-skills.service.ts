import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillEntity } from './entities/skill.entity';
import { SkillCategoryEntity } from './entities/skill-category.entity';

/**
 * 技能执行上下文
 */
export interface SkillExecutionContext {
  userId: number;
  groupId?: number;
  apiKey: string;
  model: string;
  proxyUrl: string;
  temperature: number;
  max_tokens: number;
  timeout: number;
  onProgress?: (data: any) => void;
  abortController?: AbortController;
}

/**
 * 内置技能定义接口
 */
export interface BuiltInSkillDefinition {
  key: string;
  name: string;
  description: string;
  type: string;
  tags: string;
  categoryId: string;
  systemPrompt: string;
  inputSchema: any;
  outputSchema?: any;
  executionConfig?: any;
  modelKey?: string;
}

@Injectable()
export class BuiltInSkillsService {
  private readonly logger = new Logger(BuiltInSkillsService.name);

  constructor(
    @InjectRepository(SkillEntity)
    private readonly skillRepository: Repository<SkillEntity>,
    @InjectRepository(SkillCategoryEntity)
    private readonly skillCategoryRepository: Repository<SkillCategoryEntity>,
  ) {}

  /**
   * 获取所有内置技能定义
   */
  getBuiltInSkillDefinitions(): BuiltInSkillDefinition[] {
    return [
      // ===== 内容创作类 =====
      {
        key: 'article_generator',
        name: '文章生成器',
        description: '根据主题和要点自动生成高质量文章，支持多种写作风格和字数要求',
        type: 'agent',
        tags: '内容创作,写作,文章',
        categoryId: '1',
        systemPrompt:
          '你是一位专业的内容创作者。根据用户提供的主题和要点，撰写高质量、有深度的文章。文章应该结构清晰、逻辑严密、语言流畅。',
        inputSchema: {
          fields: [
            {
              id: 'topic',
              type: 'input',
              title: '文章主题',
              placeholder: '输入文章主题',
              required: true,
            },
            {
              id: 'keypoints',
              type: 'input',
              title: '关键要点',
              placeholder: '输入关键要点，用逗号分隔',
              required: false,
            },
            {
              id: 'style',
              type: 'select',
              title: '写作风格',
              options: ['专业严谨', '轻松幽默', '深度分析', '新闻报道', '故事叙述'],
              required: false,
            },
            {
              id: 'wordCount',
              type: 'select',
              title: '字数要求',
              options: ['500字以内', '800-1200字', '1500-2000字', '2000字以上'],
              required: false,
            },
          ],
        },
        executionConfig: {
          tools: ['net_search__web_search'],
          maxIterations: 3,
        },
      },
      {
        key: 'copywriter_rewrite',
        name: '文案改写助手',
        description: '将文案改写为不同风格或平台适配版本，支持小红书、朋友圈、公众号等多种平台',
        type: 'prompt',
        tags: '内容创作,文案,改写',
        categoryId: '1',
        systemPrompt:
          '你是一位资深文案专家。根据用户提供的原文和目标平台要求，将其改写为适合该平台风格的文案。保持核心信息不变，调整语气、格式和表达方式。',
        inputSchema: {
          fields: [
            {
              id: 'original',
              type: 'textarea',
              title: '原始文案',
              placeholder: '粘贴需要改写的文案',
              required: true,
            },
            {
              id: 'platform',
              type: 'select',
              title: '目标平台',
              options: ['小红书', '微信朋友圈', '公众号', '微博', '知乎', 'LinkedIn', '通用'],
              required: true,
            },
            {
              id: 'tone',
              type: 'select',
              title: '语气风格',
              options: ['正式专业', '亲切随和', '活泼有趣', '权威可信'],
              required: false,
            },
          ],
        },
      },
      {
        key: 'title_generator',
        name: '标题生成器',
        description: '根据文章内容生成多个吸引人的标题选项，支持不同平台和风格',
        type: 'prompt',
        tags: '内容创作,标题,文案',
        categoryId: '1',
        systemPrompt:
          '你是一位标题党专家。根据文章内容，生成多个吸引人点击的标题。标题要简洁有力、引发好奇、突出价值。',
        inputSchema: {
          fields: [
            {
              id: 'content',
              type: 'textarea',
              title: '文章内容',
              placeholder: '输入文章内容',
              required: true,
            },
            {
              id: 'count',
              type: 'select',
              title: '生成数量',
              options: ['3个', '5个', '10个'],
              required: false,
            },
            {
              id: 'style',
              type: 'select',
              title: '标题风格',
              options: ['悬念式', '数字式', '疑问式', '对比式', '情绪式', '干货式'],
              required: false,
            },
          ],
        },
      },
      {
        key: 'email_writer',
        name: '邮件撰写助手',
        description: '根据场景和需求自动生成专业邮件，支持商务、求职、客服等多种场景',
        type: 'prompt',
        tags: '内容创作,邮件,办公',
        categoryId: '1',
        systemPrompt:
          '你是一位商务沟通专家。根据用户提供的邮件场景和要点，撰写专业、得体、高效的邮件。注意邮件格式、称谓、正文的逻辑性和结尾的礼貌用语。',
        inputSchema: {
          fields: [
            {
              id: 'scene',
              type: 'select',
              title: '邮件场景',
              options: ['商务合作', '求职应聘', '客户沟通', '投诉建议', '感谢信', '邀请函', '其他'],
              required: true,
            },
            {
              id: 'recipient',
              type: 'input',
              title: '收件人信息',
              placeholder: '收件人职位/关系',
              required: false,
            },
            {
              id: 'keyPoints',
              type: 'textarea',
              title: '邮件要点',
              placeholder: '输入邮件需要包含的要点',
              required: true,
            },
            {
              id: 'tone',
              type: 'select',
              title: '语气',
              options: ['正式', '友好', '紧急', '委婉'],
              required: false,
            },
          ],
        },
      },

      // ===== 研究分析类 =====
      {
        key: 'research_analyst',
        name: '研究分析师',
        description: '针对特定主题进行深度网络搜索和分析，生成结构化研究报告',
        type: 'agent',
        tags: '研究,分析,搜索,报告',
        categoryId: '2',
        systemPrompt:
          '你是一位专业的研究分析师。针对用户提供的主题，进行系统的信息搜集、整理和分析，生成结构化的研究报告。报告应包含背景、现状、关键发现、趋势分析和结论建议。',
        inputSchema: {
          fields: [
            {
              id: 'topic',
              type: 'input',
              title: '研究主题',
              placeholder: '输入需要研究分析的主题',
              required: true,
            },
            {
              id: 'depth',
              type: 'select',
              title: '研究深度',
              options: ['简要概述', '中等分析', '深度研究'],
              required: false,
            },
            {
              id: 'focus',
              type: 'input',
              title: '关注重点',
              placeholder: '输入特别关注的方面',
              required: false,
            },
          ],
        },
        executionConfig: {
          tools: ['net_search__web_search', 'time__get_current_time'],
          maxIterations: 5,
        },
      },
      {
        key: 'document_summary',
        name: '文档摘要专家',
        description: '对长文档进行智能摘要，提取核心观点、关键数据和行动项',
        type: 'prompt',
        tags: '研究,摘要,文档',
        categoryId: '2',
        systemPrompt:
          '你是一位文档分析专家。对用户提供的文档内容进行深度分析，提取核心观点、关键数据、重要结论和行动项。摘要应简洁明了、重点突出。',
        inputSchema: {
          fields: [
            {
              id: 'document',
              type: 'textarea',
              title: '文档内容',
              placeholder: '粘贴需要摘要的文档内容',
              required: true,
            },
            {
              id: 'length',
              type: 'select',
              title: '摘要长度',
              options: ['一句话', '100字以内', '300字以内', '500字以内'],
              required: false,
            },
            {
              id: 'focus',
              type: 'input',
              title: '关注重点',
              placeholder: '输入特别需要关注的内容',
              required: false,
            },
          ],
        },
      },
      {
        key: 'data_organizer',
        name: '数据整理助手',
        description: '将混乱的数据整理为结构化格式，支持表格、JSON、Markdown 等多种输出',
        type: 'prompt',
        tags: '研究,数据,整理',
        categoryId: '2',
        systemPrompt:
          '你是一位数据整理专家。将用户提供的非结构化或混乱的数据，整理为清晰、规范的结构化格式。确保数据的完整性、一致性和可读性。',
        inputSchema: {
          fields: [
            {
              id: 'data',
              type: 'textarea',
              title: '原始数据',
              placeholder: '粘贴需要整理的数据',
              required: true,
            },
            {
              id: 'format',
              type: 'select',
              title: '输出格式',
              options: ['Markdown表格', 'JSON', 'YAML', 'CSV', '有序列表'],
              required: true,
            },
            {
              id: 'columns',
              type: 'input',
              title: '字段定义',
              placeholder: '输入期望的字段名，用逗号分隔',
              required: false,
            },
          ],
        },
      },
      {
        key: 'competitor_analysis',
        name: '竞品分析助手',
        description: '分析指定竞品的信息，生成包含优劣势对比、差异化分析的结构化报告',
        type: 'agent',
        tags: '研究,竞品,分析',
        categoryId: '2',
        systemPrompt:
          '你是一位市场研究专家。针对用户指定的产品或竞品，进行全面的竞品分析。分析维度包括：产品功能、定价策略、目标用户、市场表现、优劣势、差异化机会等。',
        inputSchema: {
          fields: [
            {
              id: 'product',
              type: 'input',
              title: '自家产品',
              placeholder: '输入自家产品名称',
              required: true,
            },
            {
              id: 'competitors',
              type: 'input',
              title: '竞品列表',
              placeholder: '输入竞品名称，用逗号分隔',
              required: true,
            },
            {
              id: 'industry',
              type: 'input',
              title: '所属行业',
              placeholder: '输入所属行业',
              required: false,
            },
          ],
        },
        executionConfig: {
          tools: ['net_search__web_search'],
          maxIterations: 4,
        },
      },

      // ===== 知识库类 =====
      {
        key: 'kb_qa',
        name: '知识库问答',
        description: '基于知识库内容进行智能问答，支持引用来源和深度追问',
        type: 'agent',
        tags: '知识库,问答,RAG',
        categoryId: '3',
        systemPrompt:
          '你是一位知识库专家。基于知识库中的内容回答用户问题。回答要准确、全面，并标注信息来源。如果知识库中没有相关信息，请明确告知。',
        inputSchema: {
          fields: [
            {
              id: 'kbId',
              type: 'select',
              title: '选择知识库',
              placeholder: '选择要查询的知识库',
              required: true,
            },
            {
              id: 'question',
              type: 'textarea',
              title: '问题',
              placeholder: '输入你的问题',
              required: true,
            },
          ],
        },
        executionConfig: {
          tools: ['knowledge_base__search'],
          maxIterations: 3,
        },
      },
      {
        key: 'faq_generator',
        name: 'FAQ 生成器',
        description: '根据产品或主题自动生成常见问题及答案',
        type: 'prompt',
        tags: '知识库,FAQ,问答',
        categoryId: '3',
        systemPrompt:
          '你是一位客户服务专家。根据用户提供的产品或主题信息，生成全面的常见问题（FAQ）及专业答案。FAQ应覆盖用户最可能关心的问题。',
        inputSchema: {
          fields: [
            {
              id: 'subject',
              type: 'input',
              title: '产品/主题',
              placeholder: '输入产品或主题名称',
              required: true,
            },
            {
              id: 'description',
              type: 'textarea',
              title: '描述',
              placeholder: '输入产品或主题的详细描述',
              required: true,
            },
            {
              id: 'count',
              type: 'select',
              title: 'FAQ数量',
              options: ['5个', '10个', '15个', '20个'],
              required: false,
            },
            {
              id: 'audience',
              type: 'input',
              title: '目标用户',
              placeholder: '输入目标用户群体',
              required: false,
            },
          ],
        },
      },

      // ===== 编程开发类 =====
      {
        key: 'code_explainer',
        name: '代码解释器',
        description: '对代码进行详细解释，包括逻辑分析、关键算法说明和潜在问题提示',
        type: 'prompt',
        tags: '编程,代码,解释',
        categoryId: '4',
        systemPrompt:
          '你是一位资深软件工程师。对用户提供的代码进行详细解释，包括：整体逻辑、关键算法、设计模式、潜在问题和优化建议。解释要通俗易懂，适合不同水平的开发者。',
        inputSchema: {
          fields: [
            {
              id: 'code',
              type: 'textarea',
              title: '代码',
              placeholder: '粘贴需要解释的代码',
              required: true,
            },
            {
              id: 'language',
              type: 'select',
              title: '编程语言',
              options: ['JavaScript/TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C/C++', '其他'],
              required: true,
            },
            {
              id: 'level',
              type: 'select',
              title: '解释深度',
              options: ['入门（面向新手）', '中级（面向开发者）', '高级（面向专家）'],
              required: false,
            },
          ],
        },
      },
      {
        key: 'code_generator',
        name: '代码生成器',
        description: '根据需求描述生成高质量代码，支持多种编程语言和框架',
        type: 'agent',
        tags: '编程,代码,生成',
        categoryId: '4',
        systemPrompt:
          '你是一位全栈开发专家。根据用户的需求描述，生成高质量、可运行的代码。代码应遵循最佳实践，包含必要的注释，并考虑边界情况和错误处理。',
        inputSchema: {
          fields: [
            {
              id: 'requirement',
              type: 'textarea',
              title: '需求描述',
              placeholder: '详细描述你需要实现的功能',
              required: true,
            },
            {
              id: 'language',
              type: 'select',
              title: '编程语言',
              options: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', '其他'],
              required: true,
            },
            {
              id: 'framework',
              type: 'input',
              title: '框架/库',
              placeholder: '如 React, Vue, NestJS 等',
              required: false,
            },
            {
              id: 'constraints',
              type: 'textarea',
              title: '约束条件',
              placeholder: '输入特殊要求或约束',
              required: false,
            },
          ],
        },
        executionConfig: {
          tools: ['net_search__web_search'],
          maxIterations: 3,
        },
      },
      {
        key: 'bug_fixer',
        name: 'Bug 修复助手',
        description: '分析代码中的 Bug，提供修复方案和修复后的代码',
        type: 'prompt',
        tags: '编程,调试,Bug',
        categoryId: '4',
        systemPrompt:
          '你是一位调试专家。分析用户提供的错误代码和错误信息，找出 Bug 的根本原因，提供修复方案和修复后的代码。同时解释为什么会出错以及如何避免类似问题。',
        inputSchema: {
          fields: [
            {
              id: 'code',
              type: 'textarea',
              title: '问题代码',
              placeholder: '粘贴有问题的代码',
              required: true,
            },
            {
              id: 'error',
              type: 'textarea',
              title: '错误信息',
              placeholder: '粘贴错误信息或日志',
              required: true,
            },
            {
              id: 'context',
              type: 'textarea',
              title: '上下文',
              placeholder: '描述代码的运行环境和触发条件',
              required: false,
            },
          ],
        },
      },
      {
        key: 'code_reviewer',
        name: '代码审查助手',
        description: '对代码进行全面审查，检查代码质量、安全性、性能和可维护性',
        type: 'prompt',
        tags: '编程,审查,质量',
        categoryId: '4',
        systemPrompt:
          '你是一位代码审查专家。对用户提供的代码进行全面审查，从以下维度给出评价和建议：代码质量、安全性、性能、可维护性、可读性、设计模式使用。给出具体的改进建议。',
        inputSchema: {
          fields: [
            {
              id: 'code',
              type: 'textarea',
              title: '代码',
              placeholder: '粘贴需要审查的代码',
              required: true,
            },
            {
              id: 'language',
              type: 'select',
              title: '编程语言',
              options: ['JavaScript/TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C/C++', '其他'],
              required: true,
            },
            {
              id: 'focus',
              type: 'select',
              title: '审查重点',
              options: ['全面审查', '安全性', '性能', '可读性', '架构设计'],
              required: false,
            },
          ],
        },
      },

      // ===== 办公效率类 =====
      {
        key: 'meeting_minutes',
        name: '会议纪要助手',
        description: '将会议记录或录音转写整理为结构化的会议纪要，提取决议和待办',
        type: 'prompt',
        tags: '办公,会议,纪要',
        categoryId: '5',
        systemPrompt:
          '你是一位行政助理。将用户提供的会议内容整理为规范的会议纪要。纪要应包含：会议基本信息、与会人员、主要议题、讨论要点、决议事项、待办事项（含负责人和截止日期）。',
        inputSchema: {
          fields: [
            {
              id: 'content',
              type: 'textarea',
              title: '会议内容',
              placeholder: '粘贴会议记录或转写内容',
              required: true,
            },
            {
              id: 'title',
              type: 'input',
              title: '会议主题',
              placeholder: '输入会议主题',
              required: false,
            },
            {
              id: 'participants',
              type: 'input',
              title: '参会人员',
              placeholder: '输入参会人员',
              required: false,
            },
          ],
        },
      },
      {
        key: 'ppt_outline',
        name: 'PPT 大纲生成器',
        description: '根据主题生成完整的 PPT 大纲，包含每页的内容要点和设计建议',
        type: 'prompt',
        tags: '办公,PPT,演示',
        categoryId: '5',
        systemPrompt:
          '你是一位PPT设计专家。根据用户提供的主题和要求，生成完整的PPT大纲。大纲应包含：封面页、目录页、内容页（每页有标题、要点、设计建议）、总结页。',
        inputSchema: {
          fields: [
            {
              id: 'topic',
              type: 'input',
              title: 'PPT主题',
              placeholder: '输入PPT主题',
              required: true,
            },
            {
              id: 'audience',
              type: 'input',
              title: '目标受众',
              placeholder: '输入目标受众',
              required: false,
            },
            {
              id: 'pages',
              type: 'select',
              title: '页数',
              options: ['5-8页', '10-15页', '15-20页', '20页以上'],
              required: false,
            },
            {
              id: 'style',
              type: 'select',
              title: '风格',
              options: ['商务正式', '简约现代', '创意活泼', '数据驱动'],
              required: false,
            },
          ],
        },
      },
      {
        key: 'mindmap_generator',
        name: '思维导图生成器',
        description: '将主题或内容转换为层级化的思维导图结构（Mermaid格式）',
        type: 'prompt',
        tags: '办公,思维导图,Mermaid',
        categoryId: '5',
        systemPrompt:
          '你是一位思维导图专家。将用户提供的主题或内容转换为结构清晰的思维导图。使用 Markdown 或层级列表格式输出，确保逻辑层次分明、重点突出。',
        inputSchema: {
          fields: [
            {
              id: 'topic',
              type: 'input',
              title: '中心主题',
              placeholder: '输入思维导图的中心主题',
              required: true,
            },
            {
              id: 'branches',
              type: 'input',
              title: '分支主题',
              placeholder: '输入主要分支，用逗号分隔',
              required: false,
            },
            {
              id: 'depth',
              type: 'select',
              title: '层级深度',
              options: ['2层', '3层', '4层'],
              required: false,
            },
          ],
        },
      },
      {
        key: 'table_organizer',
        name: '表格整理助手',
        description: '将混乱的表格数据整理为规范的格式，支持数据清洗和格式转换',
        type: 'prompt',
        tags: '办公,表格,数据清洗',
        categoryId: '5',
        systemPrompt:
          '你是一位数据处理专家。将用户提供的混乱表格数据，整理为规范、清晰的格式。包括：对齐数据、统一格式、填充缺失值、去除重复、排序等。',
        inputSchema: {
          fields: [
            {
              id: 'data',
              type: 'textarea',
              title: '表格数据',
              placeholder: '粘贴表格数据（支持CSV、JSON、Markdown等格式）',
              required: true,
            },
            {
              id: 'format',
              type: 'select',
              title: '输出格式',
              options: ['Markdown表格', 'CSV', 'JSON', 'HTML表格'],
              required: true,
            },
            {
              id: 'operations',
              type: 'select',
              title: '整理操作',
              options: ['基础整理', '数据清洗', '去重排序', '完整处理'],
              required: false,
            },
          ],
        },
      },

      // ===== 创意生成类 =====
      {
        key: 'brainstorming',
        name: '头脑风暴助手',
        description: '围绕主题进行多角度头脑风暴，生成创新的想法和解决方案',
        type: 'agent',
        tags: '创意,头脑风暴,创新',
        categoryId: '6',
        systemPrompt:
          '你是一位创新思维导师。围绕用户提供的主题，从多个角度进行头脑风暴。运用多种创新思维方法（逆向思维、类比思维、组合思维等），生成独特、可行的想法和解决方案。',
        inputSchema: {
          fields: [
            {
              id: 'topic',
              type: 'input',
              title: '主题',
              placeholder: '输入头脑风暴的主题',
              required: true,
            },
            {
              id: 'constraints',
              type: 'textarea',
              title: '约束条件',
              placeholder: '输入需要考虑的限制条件',
              required: false,
            },
            {
              id: 'count',
              type: 'select',
              title: '想法数量',
              options: ['5个', '10个', '15个', '20个'],
              required: false,
            },
          ],
        },
        executionConfig: {
          tools: ['net_search__web_search'],
          maxIterations: 3,
        },
      },
      {
        key: 'roleplay',
        name: '角色扮演',
        description: '扮演指定角色与用户对话，支持历史人物、虚拟角色、专业顾问等多种角色',
        type: 'prompt',
        tags: '创意,角色扮演,对话',
        categoryId: '6',
        systemPrompt:
          '你是一位专业演员。根据用户指定的角色，完全沉浸在该角色的身份、知识、语气和行为模式中。保持角色一致性，提供深入、有趣的对话体验。',
        inputSchema: {
          fields: [
            {
              id: 'role',
              type: 'input',
              title: '角色',
              placeholder: '如：诸葛亮、爱因斯坦、孙悟空、心理医生',
              required: true,
            },
            {
              id: 'scene',
              type: 'input',
              title: '场景设定',
              placeholder: '描述对话的场景背景',
              required: false,
            },
            {
              id: 'message',
              type: 'textarea',
              title: '你的消息',
              placeholder: '输入你想对角色说的话',
              required: true,
            },
          ],
        },
      },
      {
        key: 'story_creator',
        name: '故事创作助手',
        description: '根据设定创作完整的故事，支持多种题材和风格',
        type: 'prompt',
        tags: '创意,故事,创作',
        categoryId: '6',
        systemPrompt:
          '你是一位小说家。根据用户提供的设定，创作引人入胜的故事。故事要有完整的情节、鲜明的人物、生动的描写和出人意料的转折。',
        inputSchema: {
          fields: [
            {
              id: 'genre',
              type: 'select',
              title: '题材',
              options: ['科幻', '奇幻', '悬疑', '爱情', '武侠', '都市', '历史', '恐怖', '童话'],
              required: true,
            },
            {
              id: 'theme',
              type: 'input',
              title: '主题',
              placeholder: '输入故事主题或核心idea',
              required: true,
            },
            {
              id: 'characters',
              type: 'textarea',
              title: '角色设定',
              placeholder: '描述主要角色',
              required: false,
            },
            {
              id: 'length',
              type: 'select',
              title: '篇幅',
              options: ['微型小说(500字)', '短篇(1500字)', '中篇(3000字)', '长篇梗概'],
              required: false,
            },
          ],
        },
      },
      {
        key: 'poetry_creator',
        name: '诗歌创作助手',
        description: '根据主题创作诗歌，支持现代诗、古体诗、散文诗等多种体裁',
        type: 'prompt',
        tags: '创意,诗歌,文学',
        categoryId: '6',
        systemPrompt:
          '你是一位诗人。根据用户提供的主题和体裁要求，创作优美的诗歌。注重意境、韵律和情感表达。',
        inputSchema: {
          fields: [
            {
              id: 'theme',
              type: 'input',
              title: '主题',
              placeholder: '输入诗歌主题',
              required: true,
            },
            {
              id: 'form',
              type: 'select',
              title: '体裁',
              options: ['现代诗', '古体诗', '散文诗', '十四行诗', '俳句', '自由诗'],
              required: true,
            },
            {
              id: 'emotion',
              type: 'select',
              title: '情感基调',
              options: ['喜悦', '忧伤', '激昂', '宁静', '怀旧', '希望'],
              required: false,
            },
            {
              id: 'length',
              type: 'select',
              title: '长度',
              options: ['短诗', '中等', '长诗'],
              required: false,
            },
          ],
        },
      },

      // ===== 通用工具类 =====
      {
        key: 'translator',
        name: '多语言翻译专家',
        description: '专业级多语言翻译，支持润色和本地化适配',
        type: 'prompt',
        tags: '工具,翻译,语言',
        categoryId: '7',
        systemPrompt:
          '你是一位专业翻译。将用户提供的文本准确翻译为目标语言。注意：保持原文的语气和风格，处理专业术语时要准确，必要时提供多种翻译选项。',
        inputSchema: {
          fields: [
            {
              id: 'text',
              type: 'textarea',
              title: '原文',
              placeholder: '输入需要翻译的文本',
              required: true,
            },
            {
              id: 'targetLang',
              type: 'select',
              title: '目标语言',
              options: [
                '中文',
                'English',
                '日本語',
                '한국어',
                'Français',
                'Deutsch',
                'Español',
                'Italiano',
                'Русский',
                'العربية',
              ],
              required: true,
            },
            {
              id: 'style',
              type: 'select',
              title: '翻译风格',
              options: ['直译', '意译', '文学翻译', '商务翻译', '技术翻译'],
              required: false,
            },
          ],
        },
      },
      {
        key: 'sql_generator',
        name: 'SQL 生成器',
        description: '根据自然语言描述生成 SQL 查询语句，支持多种数据库',
        type: 'prompt',
        tags: '工具,SQL,数据库',
        categoryId: '7',
        systemPrompt:
          '你是一位数据库专家。根据用户的自然语言描述，生成正确、高效的 SQL 查询语句。提供查询解释和优化建议。',
        inputSchema: {
          fields: [
            {
              id: 'description',
              type: 'textarea',
              title: '查询需求',
              placeholder: '用自然语言描述你的查询需求',
              required: true,
            },
            {
              id: 'dbType',
              type: 'select',
              title: '数据库类型',
              options: ['MySQL', 'PostgreSQL', 'SQLite', 'SQL Server', 'Oracle', 'MongoDB'],
              required: true,
            },
            {
              id: 'schema',
              type: 'textarea',
              title: '表结构',
              placeholder: '粘贴表结构定义（可选，帮助生成更准确的SQL）',
              required: false,
            },
          ],
        },
      },
      {
        key: 'regex_generator',
        name: '正则表达式助手',
        description: '根据需求生成正则表达式，并提供解释和测试用例',
        type: 'prompt',
        tags: '工具,正则表达式',
        categoryId: '7',
        systemPrompt:
          '你是一位正则表达式专家。根据用户的需求，生成准确、高效的正则表达式。提供详细的解释、使用示例和常见陷阱提示。',
        inputSchema: {
          fields: [
            {
              id: 'requirement',
              type: 'textarea',
              title: '匹配需求',
              placeholder: '描述你需要匹配的内容',
              required: true,
            },
            {
              id: 'lang',
              type: 'select',
              title: '编程语言',
              options: ['JavaScript', 'Python', 'Java', 'Go', 'PHP', '通用'],
              required: false,
            },
            {
              id: 'testCases',
              type: 'textarea',
              title: '测试用例',
              placeholder: '输入测试用例，每行一个',
              required: false,
            },
          ],
        },
      },
    ];
  }

  /**
   * 初始化内置技能到数据库
   */
  async initBuiltInSkills(): Promise<void> {
    // 先初始化分类
    const categories = [
      {
        id: 1,
        name: '内容创作',
        description: '文章生成、文案改写、标题生成等写作相关技能',
        icon: 'edit',
        order: 100,
      },
      {
        id: 2,
        name: '研究分析',
        description: '搜索分析、文档摘要、竞品分析等研究技能',
        icon: 'search',
        order: 90,
      },
      {
        id: 3,
        name: '知识库',
        description: '知识库问答、FAQ生成等知识管理技能',
        icon: 'book',
        order: 80,
      },
      {
        id: 4,
        name: '编程开发',
        description: '代码解释、生成、审查等开发技能',
        icon: 'code',
        order: 70,
      },
      {
        id: 5,
        name: '办公效率',
        description: '会议纪要、PPT大纲、思维导图等办公技能',
        icon: 'briefcase',
        order: 60,
      },
      {
        id: 6,
        name: '创意生成',
        description: '头脑风暴、角色扮演、故事创作等创意技能',
        icon: 'lightbulb',
        order: 50,
      },
      {
        id: 7,
        name: '通用工具',
        description: '翻译、SQL生成、正则表达式等工具技能',
        icon: 'tool',
        order: 40,
      },
    ];

    for (const cat of categories) {
      const existing = await this.skillCategoryRepository.findOne({ where: { name: cat.name } });
      if (!existing) {
        await this.skillCategoryRepository.save(
          this.skillCategoryRepository.create({
            name: cat.name,
            description: cat.description,
            icon: cat.icon,
            order: cat.order,
            status: 1,
            isMember: 0,
            hideFromNonMember: 0,
          }),
        );
      }
    }

    const definitions = this.getBuiltInSkillDefinitions();
    let created = 0;
    let updated = 0;

    for (const def of definitions) {
      const existing = await this.skillRepository.findOne({
        where: { builtInKey: def.key },
      });

      if (existing) {
        existing.name = def.name;
        existing.description = def.description;
        existing.type = def.type;
        existing.tags = def.tags;
        existing.systemPrompt = def.systemPrompt;
        existing.inputSchema = JSON.stringify(def.inputSchema);
        if (def.outputSchema) existing.outputSchema = JSON.stringify(def.outputSchema);
        if (def.executionConfig) existing.executionConfig = JSON.stringify(def.executionConfig);
        existing.isBuiltIn = 1;
        existing.status = 1;
        await this.skillRepository.save(existing);
        updated++;
      } else {
        const skill = this.skillRepository.create({
          name: def.name,
          description: def.description,
          type: def.type,
          tags: def.tags,
          catId: def.categoryId,
          systemPrompt: def.systemPrompt,
          inputSchema: JSON.stringify(def.inputSchema),
          outputSchema: def.outputSchema ? JSON.stringify(def.outputSchema) : null,
          executionConfig: def.executionConfig ? JSON.stringify(def.executionConfig) : null,
          modelKey: def.modelKey || null,
          isBuiltIn: 1,
          builtInKey: def.key,
          status: 1,
          order: 100,
          isPublic: true,
          useCount: 0,
          likes: 0,
        });
        await this.skillRepository.save(skill);
        created++;
      }
    }

    this.logger.log(`内置技能初始化完成: 新建 ${created} 个, 更新 ${updated} 个`);
  }
}
