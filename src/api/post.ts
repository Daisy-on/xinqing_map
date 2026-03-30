import http from './http'
import type { EmotionTag, PagedResult, PostItem } from '@/types/models'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export async function fetchPostList(params: {
  locationId: number
  emotionTagId?: number
  pageNum?: number
  pageSize?: number
}): Promise<PagedResult<PostItem>> {
  const response = await http.get<ApiResponse<PagedResult<PostItem>>>('/post/list', { params })
  const payload = response.data

  if (payload && payload.data && Array.isArray(payload.data.records)) {
    return payload.data
  }

  return {
    total: 0,
    pageNum: params.pageNum ?? 1,
    pageSize: params.pageSize ?? 10,
    records: [],
  }
}

export async function fetchEmotionTagList(): Promise<EmotionTag[]> {
  const response = await http.get<ApiResponse<EmotionTag[]>>('/emotion-tag/list')
  const payload = response.data

  if (payload && Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

export interface PublishPostParams {
  locationId: number
  emotionTagId: number
  content: string
}

export interface PublishPostResult {
  postId: number
}

export async function publishPost(params: PublishPostParams): Promise<PublishPostResult> {
  const response = await http.post<ApiResponse<PublishPostResult>>('/post/publish', params)
  return response.data.data
}
