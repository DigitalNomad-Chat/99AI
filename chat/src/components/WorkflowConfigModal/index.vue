<script setup lang="ts">
  import { Close, Delete, Upload } from '@icon-park/vue-next'
  import { message } from '@/utils/message'
  import { computed, ref } from 'vue'

  interface FormField {
    id: string
    type: 'input' | 'select' | 'file' | 'image'
    title: string
    placeholder: string
    options?: string[]
    isVariable?: boolean
    variableName?: string
    required?: boolean
  }

  interface App {
    id: number
    name: string
    appType: number
    des: string
    coverImg: string
    prompt?: string
  }

  interface Props {
    app: App
    formSchema: FormField[]
  }

  interface Emits {
    (e: 'submit', data: Record<string, string | File>): void
    (e: 'close'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const formData = ref<Record<string, string | File>>({})
  const filePreviews = ref<Record<string, { name: string; url: string }>>({})
  const uploading = ref(false)

  const isValid = computed(() => {
    // 检查所有必填字段是否已填写
    for (const field of props.formSchema) {
      if (field.required && !formData.value[field.id]) {
        return false
      }
    }
    return true
  })

  function handleInputChange(fieldId: string, value: string) {
    formData.value[fieldId] = value
  }

  function handleFileChange(fieldId: string, file: File) {
    formData.value[fieldId] = file

    // 创建预览
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        filePreviews.value[fieldId] = {
          name: file.name,
          url: e.target?.result as string,
        }
      }
      reader.readAsDataURL(file)
    } else {
      filePreviews.value[fieldId] = {
        name: file.name,
        url: '',
      }
    }
  }

  function removeFile(fieldId: string) {
    delete formData.value[fieldId]
    delete filePreviews.value[fieldId]
  }

  function handleSubmit() {
    if (!isValid.value) {
      message().warning('请填写所有必填字段')
      return
    }
    emit('submit', formData.value)
  }

  function handleClose() {
    emit('close')
  }

  function getVariableName(field: FormField): string {
    return field.variableName || field.id
  }
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
      <!-- 头部 -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-4">
          <img
            v-if="app.coverImg"
            :src="app.coverImg"
            class="w-12 h-12 rounded-full"
            alt="App Icon"
          />
          <div>
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {{ app.name }}
            </h2>
            <div class="flex items-center gap-2 mt-1">
              <span class="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300">
                {{ app.appType === 1 ? 'FastGPT' : app.appType === 2 ? 'Dify' : app.appType === 3 ? 'n8n' : '' }} 工作流
              </span>
              <span v-if="formSchema.length > 0" class="text-xs text-gray-500">
                需要配置 {{ formSchema.length }} 个参数
              </span>
            </div>
          </div>
        </div>
        <button
          @click="handleClose"
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <Close theme="filled" />
        </button>
      </div>

      <!-- 主体 -->
      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="formSchema.length === 0" class="text-center text-gray-500 py-8">
          此工作流无需配置参数，可直接运行
        </div>

        <div v-else class="space-y-6">
          <div
            v-for="field in formSchema"
            :key="field.id"
            class="space-y-2"
          >
            <label class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ field.title }}
              <span v-if="field.required" class="text-red-500">*</span>
              <span v-if="field.variableName" class="text-xs text-gray-400">
                (变量: {{ field.variableName }})
              </span>
            </label>

            <!-- 输入框 -->
            <input
              v-if="field.type === 'input'"
              :type="getVariableName(field) === 'password' ? 'password' : 'text'"
              :value="formData[field.id] as string || ''"
              @input="(e) => handleInputChange(field.id, (e.target as HTMLInputElement).value)"
              :placeholder="field.placeholder"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />

            <!-- 下拉选择 -->
            <select
              v-if="field.type === 'select'"
              :value="formData[field.id] as string || ''"
              @change="(e) => handleInputChange(field.id, (e.target as HTMLSelectElement).value)"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">{{ field.placeholder }}</option>
              <option v-for="option in field.options" :key="option" :value="option">
                {{ option }}
              </option>
            </select>

            <!-- 文件上传 -->
            <div v-if="field.type === 'file' || field.type === 'image'">
              <div v-if="!formData[field.id]" class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <label class="flex flex-col items-center justify-center cursor-pointer">
                  <Upload class="w-8 h-8 text-gray-400 mb-2" />
                  <span class="text-sm text-gray-600 dark:text-gray-400">
                    点击上传 {{ field.type === 'image' ? '图片' : '文件' }}
                  </span>
                  <span class="text-xs text-gray-400 mt-1">
                    {{ field.type === 'image' ? '支持 JPG, PNG, GIF, WEBP' : '支持 PDF, DOC, TXT, MD等' }}
                  </span>
                  <input
                    :type="field.type === 'image' ? 'file' : 'file'"
                    :accept="field.type === 'image' ? 'image/*' : '.pdf,.doc,.docx,.txt,.md,.markdown'"
                    class="hidden"
                    @change="(e) => {
                      const target = e.target as HTMLInputElement
                      const file = target.files?.[0]
                      if (file) handleFileChange(field.id, file)
                    }"
                  />
                </label>
              </div>

              <!-- 文件预览 -->
              <div
                v-else
                class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div class="flex-shrink-0">
                  <img
                    v-if="field.type === 'image' && filePreviews[field.id]?.url"
                    :src="filePreviews[field.id].url"
                    class="w-12 h-12 object-cover rounded"
                    alt="Preview"
                  />
                  <div v-else class="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                    <span class="text-xs text-gray-500">
                      {{ field.type === 'image' ? 'IMG' : 'FILE' }}
                    </span>
                  </div>
                </div>
                <div class="flex-grow min-w-0">
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {{ filePreviews[field.id]?.name || (formData[field.id] as File)?.name }}
                  </div>
                </div>
                <button
                  @click="removeFile(field.id)"
                  class="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                  <Delete class="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <p v-if="field.placeholder && field.type !== 'file' && field.type !== 'image'" class="text-xs text-gray-500">
              {{ field.placeholder }}
            </p>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="handleClose"
          class="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          取消
        </button>
        <button
          @click="handleSubmit"
          :disabled="!isValid || uploading"
          class="px-6 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ uploading ? '提交中...' : '开始运行' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 自定义滚动条 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
