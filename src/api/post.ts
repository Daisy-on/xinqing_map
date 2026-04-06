import http from './http'
import type { EmotionTag, PagedResult, PostItem } from '@/types/models'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

type BackendPostItem = PostItem & {
  image?: string | null
  imageUrls?: Array<string | null> | null
}

const POST_IMAGE_CACHE_KEY = 'xinqing_post_image_cache'

function getPostImageCache(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(POST_IMAGE_CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

function setPostImageCache(cache: Record<string, string>) {
  try {
    sessionStorage.setItem(POST_IMAGE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore cache write failures.
  }
}

function cachePostImage(postId: number, imageUrl: string) {
  if (!Number.isFinite(postId) || !imageUrl) return
  const cache = getPostImageCache()
  cache[String(postId)] = imageUrl
  setPostImageCache(cache)
}

function getCachedPostImage(postId: number): string {
  const cache = getPostImageCache()
  const value = cache[String(postId)]
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePostItem(item: BackendPostItem): PostItem {
  const imageUrls = Array.isArray(item.imageUrls)
    ? item.imageUrls.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    : []

  const image = typeof item.image === 'string' ? item.image.trim() : ''
  const cachedImage = Number.isFinite(item.id) ? getCachedPostImage(item.id) : ''
  const finalImage = image || cachedImage

  if (!imageUrls.length && finalImage) {
    imageUrls.push(finalImage)
  }

  return {
    ...item,
    image: finalImage || undefined,
    imageUrls: imageUrls.length ? imageUrls : undefined,
  }
}

export async function fetchPostList(params: {
  locationId?: number
  userId?: number
  emotionTagId?: number
  pageNum?: number
  pageSize?: number
}): Promise<PagedResult<PostItem>> {
  const response = await http.get<ApiResponse<PagedResult<BackendPostItem>>>('/post/list', { params })
  const payload = response.data

  if (payload && payload.data && Array.isArray(payload.data.records)) {
    return {
      ...payload.data,
      records: payload.data.records.map(normalizePostItem),
    }
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
  image?: string
}

export interface PublishPostResult {
  postId: number
}

export async function uploadPostImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await http.post<ApiResponse<string>>('/image/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  const imageUrl = typeof response.data?.data === 'string' ? response.data.data.trim() : ''
  if (!imageUrl) {
    throw new Error('图片上传失败，请稍后重试')
  }

  return imageUrl
}

export async function publishPost(params: PublishPostParams): Promise<PublishPostResult> {
  const response = await http.post<ApiResponse<PublishPostResult>>('/post/publish', params)
  const result = response.data.data

  if (params.image && result && Number.isFinite(result.postId)) {
    cachePostImage(result.postId, params.image)
  }

  return result
}

export async function fetchPostDetail(postId: number): Promise<PostItem> {
  const response = await http.get<ApiResponse<BackendPostItem>>('/post/' + postId)
  return normalizePostItem(response.data.data)
}

export async function deletePost(postId: number): Promise<void> {
  await http.delete<ApiResponse<null>>('/post/' + postId)
}

