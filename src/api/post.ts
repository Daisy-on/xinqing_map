import http from './http'
import type { ApiResponse } from '@/types/api'
import type { EmotionTag, PagedResult, PostItem } from '@/types/models'

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

function normalizeImageUrl(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''

  return value
    .trim()
    .replace(/^['"`]+/, '')
    .replace(/['"`]+$/, '')
    .trim()
}

function setPostImageCache(cache: Record<string, string>) {
  try {
    sessionStorage.setItem(POST_IMAGE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // 忽略缓存写入失败。
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
  return normalizeImageUrl(value)
}

export function getPostCoverImage(postId: number): string {
  return getCachedPostImage(postId)
}

function normalizePostItem(item: BackendPostItem): PostItem {
  const imageUrls = Array.isArray(item.imageUrls)
    ? item.imageUrls
      .map((value) => normalizeImageUrl(value))
      .filter((value): value is string => value.length > 0)
    : []

  const image = normalizeImageUrl(item.image)
  const cachedImage = Number.isFinite(item.id) ? getCachedPostImage(item.id) : ''
  const finalImage = image || cachedImage

  if (!imageUrls.length && finalImage) {
    imageUrls.push(finalImage)
  }

  if (Number.isFinite(item.id)) {
    const cacheableImage = imageUrls[0] || finalImage
    if (cacheableImage) {
      cachePostImage(item.id, cacheableImage)
    }
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
  locationName: string
  emotionTagId: number
  emotionTagName: string
  emotionTagColor: string
  content: string
  image?: string
}

export interface PublishPostResult {
  postId: number
}

export interface PostLikeResult {
  postId: number
  liked: boolean
  likeCount: number
}

export async function uploadPostImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await http.post<ApiResponse<string>>('/file/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  const imageUrl = normalizeImageUrl(response.data?.data)
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
  await http.delete<ApiResponse<null>>('/post/delete/' + postId)
}

export async function togglePostLike(postId: number): Promise<PostLikeResult> {
  const response = await http.post<ApiResponse<PostLikeResult>>('/post/like', null, {
    params: { postId },
  })
  return response.data.data
}
