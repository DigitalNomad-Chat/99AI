import request from '@/utils/request'

export function fetchTtsAPI(data: { text: string; model?: string; voice?: string }) {
  return request.post('/voice/tts', data)
}

export function fetchAsrAPI(file: File, language?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (language) formData.append('language', language)
  return request.post('/voice/asr', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
