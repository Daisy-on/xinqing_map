import http from './http'

export interface AiLetterVO {
  emotion_tag: string
  letter_content: string
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/**
 * 获取当前用户的AI私信信件列表
 */
export async function getAiLetters(): Promise<AiLetterVO[]> {
  const response = await http.get<ApiResponse<AiLetterVO[]>>('/ai/letters')
  const payload = response.data

  if (payload && Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}
