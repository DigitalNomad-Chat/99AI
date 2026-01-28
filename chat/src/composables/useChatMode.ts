import { ref, computed } from 'vue'

export type ChatMode = 'chat' | 'writing' | 'thinking'

export interface ModeConfig {
  label: string
  placeholder: string
  icon: string
  systemPrompt: string
}

const modeConfigs: Record<ChatMode, ModeConfig> = {
  chat: {
    label: '💬 普通聊天',
    placeholder: '输入您的问题...',
    icon: '💬',
    systemPrompt: '你是一个专业的AI助手，帮助用户解答问题。',
  },
  writing: {
    label: '✨ 帮我写作',
    placeholder: '请告诉我您想写什么内容...',
    icon: '✨',
    systemPrompt: `你是一个专业的写作助手。用户将提出写作需求，你需要：

1. 理解用户的写作主题和要求
2. 生成结构化的文章内容
3. 返回JSON格式：
{
  "title": "文章标题",
  "content": "文章正文（支持Markdown格式）",
  "outline": ["要点1", "要点2", ...],
  "tags": ["标签1", "标签2"]
}`,
  },
  thinking: {
    label: '🔧 深度思考',
    placeholder: '提出复杂问题，AI将深度分析...',
    icon: '🔧',
    systemPrompt: '你是一个深度思考助手，擅长复杂问题的分析和推理。',
  },
}

export function useChatMode() {
  const mode = ref<ChatMode>('chat')

  const currentConfig = computed(() => modeConfigs[mode.value])

  const isWritingMode = computed(() => mode.value === 'writing')

  const setMode = (newMode: ChatMode) => {
    mode.value = newMode
  }

  return {
    mode,
    setMode,
    config: currentConfig,
    isWritingMode,
    allModes: Object.entries(modeConfigs) as [ChatMode, ModeConfig][],
  }
}
