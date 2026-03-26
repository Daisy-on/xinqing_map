import http from './http'
import type { Location } from '@/types/models'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export async function fetchLocationList(): Promise<Location[]> {
  const response = await http.get<ApiResponse<Location[]>>('/location/list')
  const payload = response.data

  if (payload && Array.isArray(payload.data)) {
    return payload.data
  }

  return []
}
