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
  sortNum: number
}

export interface PostItem {
  id: number
  locationId: number
  emotionTagId: number
  content: string
  userId: number
  likeCount: number
  createTime: string
}
