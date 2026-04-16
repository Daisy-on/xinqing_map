import http from './http'
import type { ApiResponse } from '@/types/api'
import type { AvatarPreset, User } from '@/types/models'
import type { PublishPostParams } from './post'

export interface RegisterParams {
  account: string
  nickname: string
  password: string
}

export interface RegisterResult {
  userId: number
}

export interface LoginParams {
  account: string
  password: string
}

export interface LoginResult {
  token: string
  userInfo: User
}

export async function registerUser(params: RegisterParams): Promise<RegisterResult> {
  const response = await http.post<ApiResponse<RegisterResult>>('/user/register', params)
  return response.data.data
}

export async function loginUser(params: LoginParams): Promise<LoginResult> {
  const response = await http.post<ApiResponse<LoginResult>>('/user/login', params)
  return response.data.data
}

export async function fetchCurrentUser(): Promise<User & { status?: number }> {
  const response = await http.get<ApiResponse<User & { status?: number }>>('/user/me')
  return response.data.data
}

export interface UserUpdateParams {
  nickname?: string
  avatar?: string
  gender?: number
}

export interface UserPostItem {
  id: number
  locationId: number
  locationName: string
  emotionTagId: number
  emotionTagName: string
  emotionTagColor: string
  content: string
  likeCount: number
  createTime: string
  liked?: boolean
  imageUrls?: string[]
}

export async function updateUserInfo(params: UserUpdateParams): Promise<User> {
  const response = await http.put<ApiResponse<User>>('/user/update', params)
  return response.data.data
}

export async function fetchUserPosts(): Promise<UserPostItem[]> {
  const response = await http.get<ApiResponse<UserPostItem[]>>('/user/posts')
  const payload = response.data

  if (payload && Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}

export async function updateUserPost(postId: number, params: PublishPostParams): Promise<string> {
  const response = await http.put<ApiResponse<string>>(`/user/posts/${postId}`, params)
  return response.data.data
}

// 保留给后续查看他人资料使用。
export async function fetchUserDetailById(userId: number): Promise<User> {
  const response = await http.get<User>('/users/' + userId)
  return response.data
}

export const fetchUserInfo = fetchUserDetailById

export async function fetchAvatarList(): Promise<AvatarPreset[]> {
  const response = await http.get<ApiResponse<AvatarPreset[]>>('/avatar/list')
  return response.data.data || []
}