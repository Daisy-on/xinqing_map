import http from './http'
import type { ApiResponse } from '@/types/api'
import type { User } from '@/types/models'

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