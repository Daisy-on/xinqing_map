export interface User {
  id: number
  account: string
  nickname: string
  avatar?: string
}

export interface Location {
  id: number
  name: string
  lng: number
  lat: number
  icon: string
  weatherCode: string
  weatherText: string
  moodText: string
  description?: string
  locationImage?: string
}

export interface EmotionTag {
  id: number
  name: string
  color: string
}

export interface ReactionSummary {
  support: number
  relax: number
  anxious: number
}

export interface PostItem {
  id: number
  locationId: number
  locationName?: string
  emotionTagId: number
  emotionTagName?: string
  emotionTagColor?: string
  content: string
  userId: number
  likeCount: number
  createTime: string
  imageUrls?: string[]
  reactionSummary?: ReactionSummary
}

export interface PagedResult<T> {
  total: number
  pageNum: number
  pageSize: number
  records: T[]
}
