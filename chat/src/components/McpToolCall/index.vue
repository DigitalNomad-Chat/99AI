<template>
  <div class="mcp-tool-call">
    <div v-for="(call, index) in parsedToolCalls" :key="index" class="tool-call-item">
      <div class="tool-call-header" @click="toggleExpand(index)">
        <span class="tool-icon">🔧</span>
        <span class="tool-name">{{ call.name }}</span>
        <span class="tool-status" :class="getStatusClass(call)">
          {{ getStatusText(call) }}
        </span>
      </div>
      <div v-if="expanded[index]" class="tool-call-detail">
        <pre class="tool-arguments">{{ JSON.stringify(call.arguments, null, 2) }}</pre>
        <div v-if="call.result" class="tool-result">
          <div class="tool-result-label">执行结果：</div>
          <pre>{{ call.result }}</pre>
        </div>
        <div v-if="call.error" class="tool-error">错误：{{ call.error }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface ToolCall {
  id: string
  name: string
  arguments: Record<string, any>
  result?: string
  error?: string
}

const props = defineProps<{
  toolCalls: string // JSON string
}>()

const expanded = ref<Record<number, boolean>>({})

const parsedToolCalls = computed<ToolCall[]>(() => {
  try {
    return JSON.parse(props.toolCalls)
  } catch {
    return []
  }
})

function toggleExpand(index: number) {
  expanded.value[index] = !expanded.value[index]
}

function getStatusClass(call: ToolCall) {
  if (call.error) return 'status-error'
  if (call.result) return 'status-success'
  return 'status-pending'
}

function getStatusText(call: ToolCall) {
  if (call.error) return '失败'
  if (call.result) return '完成'
  return '执行中...'
}
</script>

<style scoped>
.mcp-tool-call {
  margin-top: 8px;
  border-radius: 8px;
  background: #f5f5f5;
  padding: 8px;
}
.tool-call-item {
  margin-bottom: 4px;
}
.tool-call-header {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px;
}
.tool-name {
  font-weight: 500;
}
.tool-status {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
}
.status-pending {
  background: #fff3cd;
  color: #856404;
}
.status-success {
  background: #d4edda;
  color: #155724;
}
.status-error {
  background: #f8d7da;
  color: #721c24;
}
.tool-call-detail {
  margin-top: 4px;
  padding: 8px;
  background: white;
  border-radius: 4px;
}
pre {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
}
</style>
