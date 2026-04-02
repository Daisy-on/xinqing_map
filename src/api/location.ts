import http from './http'
import type { BackendLocationItem, Location } from '@/types/models'

interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function normalizeLocation(item: BackendLocationItem): Location {
  const weatherCode = item.weatherVO?.code ?? item.weatherCode ?? ''
  const weatherText = item.weatherVO?.name ?? item.weatherText ?? '未知天气'
  const moodText = item.moodText ?? ''

  return {
    id: Number(item.id),
    name: item.name ?? '未命名地点',
    lng: toFiniteNumber(item.longitude ?? item.lng),
    lat: toFiniteNumber(item.latitude ?? item.lat),
    icon: item.icon ?? 'POI',
    weatherCode,
    weatherText,
    moodText,
    description: item.description ?? undefined,
    locationImage: item.locationImage ?? undefined,
    postCount: typeof item.postCount === 'number' ? item.postCount : 0,
  }
}

export async function fetchLocationList(): Promise<Location[]> {
  const response = await http.get<ApiResponse<BackendLocationItem[]>>('/location/list')
  const payload = response.data

  if (payload && Array.isArray(payload.data)) {
    return payload.data.map(normalizeLocation)
  }

  return []
}
