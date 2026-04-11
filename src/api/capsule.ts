import request from './http'
import type { CapsuleVO, CapsuleDTO } from '../types/models'

/**
 * 随机抽取情绪胶囊
 */
export async function openCapsule(): Promise<CapsuleVO | null> {
  const response = await request.get<{ code: number; message: string; data: CapsuleVO | null }>('/capsule/open')
  return response.data.data ?? null
}

/**
 * 发布情绪胶囊
 */
export async function publishCapsule(data: CapsuleDTO): Promise<string> {
  const response = await request.post<{ code: number; message: string; data: string | null }>('/capsule/publish', data)
  return response.data.data ?? ''
}
