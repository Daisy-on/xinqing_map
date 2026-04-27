export interface User {
  id: number
  account: string
  nickname: string
  avatar?: string
  gender?: number
  createTime?: string
}

export interface AvatarPreset {
  id: number
  avatarName: string
  avatarUrl: string
}

export interface CapsuleDTO {
  content: string
  type: number
}

export interface CapsuleVO {
  id: number
  content: string
  type: number
  creatorName: string
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
  postCount?: number
}

export interface WeatherVO {
  code?: string | null
  name?: string | null
  icon?: string | null
  description?: string | null
}

export interface BackendLocationItem {
  id: number
  name: string
  description?: string | null
  longitude?: number | null
  latitude?: number | null
  lng?: number | null
  lat?: number | null
  icon?: string | null
  weatherVO?: WeatherVO | null
  weatherCode?: string | null
  weatherText?: string | null
  moodText?: string | null
  locationImage?: string | null
  postCount?: number | null
}

export interface BackendLocationDetailItem {
  id: number
  name?: string | null
  description?: string | null
  locationImage?: string | null
  longitude?: number | null
  latitude?: number | null
  lng?: number | null
  lat?: number | null
  weatherVO?: WeatherVO | null
  postCount?: number | null
  weatherUpdateTime?: string | null
}

export interface LocationDetail {
  id: number
  name: string
  lng: number
  lat: number
  weatherCode: string
  weatherText: string
  description: string
  locationImage?: string
  postCount: number
  weatherUpdateTime?: string
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
  nickname?: string
  avatar?: string
  likeCount: number
  liked?: boolean
  createTime: string
  updateTime?: string
  image?: string
  imageUrls?: string[]
  reactionSummary?: ReactionSummary
}

export interface PagedResult<T> {
  total: number
  pageNum: number
  pageSize: number
  records: T[]
}

export interface MoodDiaryCheckInDTO {
  emotionTagId: number
  note?: string
}

export interface MoodDiaryBackfillDTO {
  diaryDate: string
  emotionTagId: number
  note?: string
}

export interface MoodDiaryMonthQueryDTO {
  year: number
  month: number
}

export interface MoodDiaryVO {
  id: number
  diaryDate: string
  emotionTagId: number
  emotionTagName: string
  emotionTagColor: string
  note: string
  isAutoFilled: number
  createTime: string
  updateTime: string
}

export interface MoodDiaryMonthVO {
  diaryDate: string
  hasRecord: boolean
  emotionTagId: number | null
  emotionTagName: string | null
  emotionTagColor: string | null
  isAutoFilled: number | null
  isFuture: boolean
  canBackfill: boolean
}
