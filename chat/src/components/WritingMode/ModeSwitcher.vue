<template>
  <div class="mode-switcher">
    <button
      v-for="[key, config] in allModes"
      :key="key"
      class="mode-button"
      :class="{ active: mode === key }"
      @click="handleModeChange(key as ChatMode)"
      :title="config.label"
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
