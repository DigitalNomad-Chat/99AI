import type { Editor } from '@tiptap/core'
import { fetchAiEditAPI, fetchAiContinueAPI } from '@/api/aiEditor'

export interface AiExecuteOptions {
  editor: Editor
  command: string
  prompt?: string
  onStream?: (chunk: string) => void
  onComplete?: (result: string) => void
  onError?: (error: Error) => void
}

/**
 * 执行AI编辑命令
 */
export async function executeAiCommand(options: AiExecuteOptions) {
  const { editor, command, prompt, onStream, onComplete, onError } = options

  // 获取选中的文本，如果没有选中则获取全文
  const { from, to, empty } = editor.state.selection
  let selectedText = ''

  if (empty) {
    selectedText = editor.getText()
  } else {
    selectedText = editor.state.doc.textBetween(from, to)
  }

  if (!selectedText) {
    onError?.(new Error('没有选中文本'))
    return
  }

  try {
    const response = await fetchAiEditAPI({
      content: selectedText,
      command,
      prompt,
    })

    if (response.success) {
      const result = response.data.result

      // 替换选中的文本
      if (!empty) {
        editor.chain().focus().deleteSelection().insertContent(result).run()
      } else {
        // 在光标位置插入
        editor.chain().focus().insertContent(result).run()
      }

      onComplete?.(result)
    } else {
      onError?.(new Error('AI处理失败'))
    }
  } catch (error) {
    onError?.(error as Error)
  }
}

/**
 * AI续写
 */
export async function aiContinue(editor: Editor): Promise<string> {
  const content = editor.getText()

  if (!content) {
    throw new Error('文档为空')
  }

  const response = await fetchAiContinueAPI(content)

  if (response.success) {
    const result = response.data.result
    editor.chain().focus().insertContent(result).run()
    return result
  }

  throw new Error('AI续写失败')
}
