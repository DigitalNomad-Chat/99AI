<template>
  <div
    v-if="visible"
    class="ai-bubble-menu"
    :style="menuStyle"
  >
    <button
      class="bubble-button"
      @click="handleCommand('rewrite')"
      title="改写"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
      </svg>
    </button>
    <button
      class="bubble-button"
      @click="handleCommand('expand')"
      title="扩写"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
    </button>
    <button
      class="bubble-button"
      @click="handleCommand('summarize')"
      title="总结"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M14 17H4v2h10v-2zm6-8H4v2h16V9zM4 15h16v-2H4v2zM4 5v2h16V5H4z"/>
      </svg>
    </button>
    <button
      class="bubble-button"
      @click="handleCommand('translate')"
      title="翻译"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
      </svg>
    </button>
    <button
      class="bubble-button"
      @click="handleCommand('polish')"
      title="润色"
    >
      <svg width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M9.37 5.51L7.37 10 9.37 14.5H11.37L14.37 8H17.37L19.37 10V17H21.37V10L18.37 6H15.37L13.37 8H10.37L9.37 5.51M5 3C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V3H5M5 5H19V19H5V5Z"/>
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { executeAiCommand } from '@/services/aiEditor'
import type { Editor } from '@tiptap/core'

interface Props {
  editor: Editor
  visible: boolean
  position: { x: number; y: number }
}

interface Emits {
  (e: 'close'): void
  (e: 'executing', isExecuting: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const menuStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`
}))

const handleCommand = async (command: string) => {
  emit('executing', true)

  try {
    await executeAiCommand({
      editor: props.editor,
      command,
      onComplete: () => {
        emit('close')
        emit('executing', false)
      },
      onError: (error) => {
        console.error('AI命令执行失败:', error)
        alert(error.message)
        emit('executing', false)
      }
    })
  } catch (error) {
    console.error('AI命令执行失败:', error)
    emit('executing', false)
  }
}
</script>

<style scoped>
.ai-bubble-menu {
  position: fixed;
  display: flex;
  gap: 4px;
  padding: 6px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bubble-button {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.bubble-button:hover {
  background: #f3f4f6;
  color: #3b82f6;
}
</style>
