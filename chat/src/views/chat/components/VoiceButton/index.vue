<script setup lang="ts">
import { fetchAsrAPI } from '@/api/voice'
import type { ResData } from '@/api/types'
import { useChatStore } from '@/store'
import { message } from '@/utils/message'
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'input', text: string): void
}>()

const chatStore = useChatStore()
const ms = message()

// 录音状态
const isRecording = ref(false)
const recordingDuration = ref(0)
const mediaRecorder = ref<MediaRecorder | null>(null)
const audioChunks = ref<Blob[]>([])
let recordTimer: ReturnType<typeof setInterval> | null = null

// 播放 TTS 状态
const playingMessageId = ref<string | null>(null)
const currentAudio = ref<HTMLAudioElement | null>(null)

function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia) {
    ms.error('您的浏览器不支持录音功能')
    return
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then(stream => {
      audioChunks.value = []
      mediaRecorder.value = new MediaRecorder(stream)

      mediaRecorder.value.ondataavailable = event => {
        if (event.data.size > 0) audioChunks.value.push(event.data)
      }

      mediaRecorder.value.onstop = async () => {
        const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' })
        // 转换为 File
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' })
        await sendAsr(file)
        // 停止所有音轨
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.value.start()
      isRecording.value = true
      recordingDuration.value = 0
      recordTimer = setInterval(() => {
        recordingDuration.value++
      }, 1000)
    })
    .catch(() => {
      ms.error('无法访问麦克风，请检查权限设置')
    })
}

function stopRecording() {
  if (mediaRecorder.value && isRecording.value) {
    mediaRecorder.value.stop()
    isRecording.value = false
    if (recordTimer) {
      clearInterval(recordTimer)
      recordTimer = null
    }
  }
}

async function sendAsr(file: File) {
  try {
    ms.info('语音识别中...')
    const res: ResData = await fetchAsrAPI(file, 'zh')
    if (res.data?.text) {
      emit('input', res.data.text)
      ms.success('识别成功')
    } else {
      ms.warning('未能识别到语音内容')
    }
  } catch (error: any) {
    ms.error(error.message || '识别失败')
  }
}

async function playTts(text: string, messageId: string) {
  // 如果当前正在播放同一条消息，则停止
  if (playingMessageId.value === messageId && currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value = null
    playingMessageId.value = null
    return
  }

  // 停止之前的播放
  if (currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value = null
  }

  try {
    ms.info('语音合成中...')
    const { fetchTtsAPI } = await import('@/api/voice')
    const res: ResData = await fetchTtsAPI({ text, voice: 'alloy' })
    if (res.data?.url) {
      const audio = new Audio(res.data.url)
      currentAudio.value = audio
      playingMessageId.value = messageId
      audio.onended = () => {
        playingMessageId.value = null
        currentAudio.value = null
      }
      audio.play()
      ms.success('开始播放')
    }
  } catch (error: any) {
    ms.error(error.message || '语音合成失败')
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

defineExpose({ playTts })
</script>

<template>
  <div class="relative">
    <!-- 录音按钮 -->
    <button
      class="p-2 rounded-lg transition-colors flex items-center justify-center"
      :class="
        isRecording
          ? 'bg-red-500 text-white animate-pulse'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
      "
      @mousedown.prevent="startRecording"
      @mouseup.prevent="stopRecording"
      @mouseleave.prevent="isRecording ? stopRecording() : null"
      @touchstart.prevent="startRecording"
      @touchend.prevent="stopRecording"
      title="长按录音"
    >
      <svg
        v-if="!isRecording"
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>
      <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
      </svg>
    </button>

    <!-- 录音中提示 -->
    <div
      v-if="isRecording"
      class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-red-500 text-white text-xs rounded-full whitespace-nowrap shadow-lg"
    >
      录音中 {{ formatDuration(recordingDuration) }}
    </div>
  </div>
</template>
