import http from './http'
import type { ApiResponse } from '@/types/api'
import type { BackendLocationDetailItem, BackendLocationItem, Location, LocationDetail } from '@/types/models'

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

function normalizeLocationDetail(item: BackendLocationDetailItem): LocationDetail {
  return {
    id: Number(item.id),
    name: item.name ?? '未命名地点',
    lng: toFiniteNumber(item.longitude ?? item.lng),
    lat: toFiniteNumber(item.latitude ?? item.lat),
    weatherCode: item.weatherVO?.code ?? '',
    weatherText: item.weatherVO?.name ?? '未知天气',
    description: item.description ?? '暂无详细介绍',
    locationImage: item.locationImage ?? undefined,
    postCount: typeof item.postCount === 'number' ? item.postCount : 0,
    weatherUpdateTime: item.weatherUpdateTime ?? undefined,
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

export async function fetchLocationDetail(id: number): Promise<LocationDetail> {
  const response = await http.get<ApiResponse<BackendLocationDetailItem>>(`/location/${id}`)
  const payload = response.data

  if (payload?.data && typeof payload.data === 'object') {
    return normalizeLocationDetail(payload.data)
  }

  throw new Error('地点详情数据格式异常')
}
