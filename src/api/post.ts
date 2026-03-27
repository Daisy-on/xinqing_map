import http from './http'
import type { PagedResult, PostItem } from '@/types/models'

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
