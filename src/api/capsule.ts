import request from './http'
import type { CapsuleVO, CapsuleDTO } from '../types/models'

/**
 * 随机抽取情绪胶囊
 */
export function openCapsule() {
  return request.get<CapsuleVO>('/capsule/open')
}

/**
 * 发布情绪胶囊
 */
export function publishCapsule(data: CapsuleDTO) {
  // 返回值通常是一个通用的 string (Result<String>)
  return request.post<string>('/capsule/publish', data)
}
