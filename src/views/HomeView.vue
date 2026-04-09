<template>
  <main class="home-view">
    <header class="top-nav-bar">
      <button class="project-brand" type="button" @click="router.push('/')">
        <span class="brand-mark" aria-hidden="true">
          <span class="brand-core"></span>
        </span>
        <span class="brand-text-wrap">
          <span class="brand-title">心晴地图</span>
          <span class="brand-subtitle">XINQING MAP</span>
        </span>
      </button>

      <div class="nav-right-actions">
        <button class="feature-link firefly-link" type="button" @click="handleFireflyClick">
          萤火虫
        </button>

        <button class="feature-link xiaoban-link" type="button" @click="handleXiaobanClick">
          <el-icon :size="18"><ChatDotRound /></el-icon>
          <span>小伴</span>
        </button>

        <button class="avatar-entry" type="button" aria-label="个人中心" @click="handleProfileEntry">
          <el-avatar :size="42" :src="currentUser?.avatar || ''" class="profile-avatar">
            <el-icon :size="22"><UserFilled /></el-icon>
          </el-avatar>
        </button>
      </div>
    </header>

    <div ref="mapContainer" class="map-container"></div>
    <div v-if="landmarkLocations.length > 0" class="landmark-layer">
      <div
        v-for="location in landmarkLocations"
        :key="location.id"
        class="landmark-anchor"
        :style="getLandmarkStyle(location.id)"
      >
        <LandmarkCard :location="location" @click="handleLandmarkClick" />
      </div>
    </div>
    <svg v-if="svgMaskPath" class="dom-mask" xmlns="http://www.w3.org/2000/svg">
      <path :d="svgMaskPath" fill="#ffffff" fill-rule="evenodd" />
    </svg>
    <div v-if="loadError" class="map-error">{{ loadError }}</div>

    <LandmarkDetailPanel
      v-model="isDetailPanelVisible"
      :landmark="selectedLandmark"
    />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchLocationList } from '@/api/location'
import LandmarkCard from '@/components/map/LandmarkCard.vue'
import LandmarkDetailPanel from '@/components/map/LandmarkDetailPanel.vue'
import { ChatDotRound, UserFilled } from '@element-plus/icons-vue'
import type { Location, User } from '@/types/models'
import { AUTH_STORAGE_CHANGED_EVENT, getStoredUserInfo, getToken } from '@/utils/auth'

type BoundaryPoint = { lng: number; lat: number }

const router = useRouter()

const MAP_MIN_ZOOM = 18
const MAP_MAX_ZOOM = 22
const MAP_INIT_ZOOM = 19

const mapContainer = ref<HTMLElement | null>(null)
const loadError = ref('')
const boundaryPoints = ref<BoundaryPoint[]>([])
const svgMaskPath = ref('')

let map: BMapGLMap | null = null
let mapApi: BMapGLNamespace | null = null
let maskUpdateFrame = 0
let maskOverlays: BMapGLPolygon[] = []
let boundaryBounds: { minLng: number; maxLng: number; minLat: number; maxLat: number } | null = null
let isAdjustingBounds = false
const landmarkLocations = ref<Location[]>([])
const landmarkPixels = ref<Record<number, { x: number; y: number }>>({})

const isDetailPanelVisible = ref(false)
const selectedLandmark = ref<Location | null>(null)
const currentUser = ref<User | null>(null)

function syncTopBarUser() {
  if (!getToken()) {
    currentUser.value = null
    return
  }

  currentUser.value = getStoredUserInfo()
}

function handleProfileEntry() {
  if (getToken()) {
    router.push('/profile')
    return
  }

  router.push('/auth')
}

function handleFireflyClick() {
  ElMessage.info('萤火虫功能正在准备中，敬请期待')
}

function handleXiaobanClick() {
  ElMessage.info('“小伴”匿名聊天功能即将上线')
}

function handleAuthStorageChanged(event: Event) {
  if (event instanceof StorageEvent) {
    if (event.storageArea !== localStorage) return
    if (event.key !== 'token' && event.key !== 'userInfo') return
  }

  syncTopBarUser()
}

function handleLandmarkClick(loc: Location) {
  selectedLandmark.value = loc
  isDetailPanelVisible.value = true
}

function clearMaskOverlays(instance: BMapGLMap) {
  if (maskOverlays.length === 0) return
  maskOverlays.forEach((overlay) => instance.removeOverlay(overlay))
  maskOverlays = []
}

function clearLandmarks() {
  landmarkLocations.value = []
  landmarkPixels.value = {}
}

function updateLandmarkPixels() {
  if (!map || !mapApi || landmarkLocations.value.length === 0) return

  const nextPixels: Record<number, { x: number; y: number }> = {}
  landmarkLocations.value.forEach((location) => {
    const pixel = map!.pointToPixel(new mapApi!.Point(location.lng, location.lat))
    nextPixels[location.id] = {
      x: pixel.x,
      y: pixel.y,
    }
  })

  landmarkPixels.value = nextPixels
}

function getLandmarkStyle(locationId: number) {
  const pixel = landmarkPixels.value[locationId]
  if (!pixel) {
    return {
      display: 'none',
    }
  }

  return {
    left: `${pixel.x}px`,
    top: `${pixel.y}px`,
  }
}

function renderRectMaskFallback(instance: BMapGLMap, api: BMapGLNamespace, points: BoundaryPoint[]) {
  const lngValues = points.map((point) => point.lng)
  const latValues = points.map((point) => point.lat)
  const west = Math.min(...lngValues)
  const east = Math.max(...lngValues)
  const south = Math.min(...latValues)
  const north = Math.max(...latValues)

  const worldWest = -180
  const worldEast = 180
  const worldSouth = -74
  const worldNorth = 74

  const rawMasks: Array<Array<[number, number]>> = [
    [
      [worldWest, worldNorth],
      [worldEast, worldNorth],
      [worldEast, north],
      [worldWest, north],
    ],
    [
      [worldWest, south],
      [worldEast, south],
      [worldEast, worldSouth],
      [worldWest, worldSouth],
    ],
    [
      [worldWest, north],
      [west, north],
      [west, south],
      [worldWest, south],
    ],
    [
      [east, north],
      [worldEast, north],
      [worldEast, south],
      [east, south],
    ],
  ]

  maskOverlays = rawMasks.map((ring) => {
    const ringPoints = ring.map(([lng, lat]) => new api.Point(lng, lat))
    const polygon = new api.Polygon(ringPoints, {
      strokeWeight: 0,
      fillColor: '#ffffff',
      fillOpacity: 1,
    })
    instance.addOverlay(polygon)
    return polygon
  })
}

function renderMaskOutsideBoundary(instance: BMapGLMap, api: BMapGLNamespace, points: BoundaryPoint[]) {
  clearMaskOverlays(instance)
  if (points.length < 3) return

  const worldRing = [
    new api.Point(-180, 74),
    new api.Point(180, 74),
    new api.Point(180, -74),
    new api.Point(-180, -74),
  ]
  const boundaryRing = points
    .slice()
    .reverse()
    .map((point) => new api.Point(point.lng, point.lat))

  try {
    const irregularMask = new api.Polygon([worldRing, boundaryRing], {
      strokeWeight: 0,
      fillColor: '#ffffff',
      fillOpacity: 1,
    })
    instance.addOverlay(irregularMask)
    maskOverlays = [irregularMask]
  } catch {
    renderRectMaskFallback(instance, api, points)
  }
}

function updateSvgMask() {
  if (!map || !mapApi || !mapContainer.value || boundaryPoints.value.length < 3) {
    svgMaskPath.value = ''
    return
  }

  cancelAnimationFrame(maskUpdateFrame)
  maskUpdateFrame = requestAnimationFrame(() => {
    if (!map || !mapApi || !mapContainer.value) return
    const width = mapContainer.value.clientWidth
    const height = mapContainer.value.clientHeight

    let path = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z `
    const pixels = boundaryPoints.value.map((point) => map!.pointToPixel(new mapApi!.Point(point.lng, point.lat)))
    path += 'M ' + pixels.map((pixel) => `${pixel.x} ${pixel.y}`).join(' L ') + ' Z'
    svgMaskPath.value = path
  })
}

function enforceDragBounds() {
  if (!map || !mapApi || !boundaryBounds || isAdjustingBounds) return

  const center = map.getCenter()
  let constrainedLng = center.lng
  let constrainedLat = center.lat
  let needsAdjust = false

  if (center.lng < boundaryBounds.minLng) {
    constrainedLng = boundaryBounds.minLng
    needsAdjust = true
  } else if (center.lng > boundaryBounds.maxLng) {
    constrainedLng = boundaryBounds.maxLng
    needsAdjust = true
  }

  if (center.lat < boundaryBounds.minLat) {
    constrainedLat = boundaryBounds.minLat
    needsAdjust = true
  } else if (center.lat > boundaryBounds.maxLat) {
    constrainedLat = boundaryBounds.maxLat
    needsAdjust = true
  }

  if (needsAdjust) {
    isAdjustingBounds = true
    map.panTo(new mapApi.Point(constrainedLng, constrainedLat))
    setTimeout(() => {
      isAdjustingBounds = false
    }, 400)
  }
}

import boundaryData from '../../public/data/campus-boundary.json'

async function loadBoundaryAndMask() {
  if (!map || !mapApi) return

  const data = boundaryData as Array<{ lng: unknown; lat: unknown }>
  const parsed = data
    .map((point) => ({ lng: Number(point.lng), lat: Number(point.lat) }))
    .filter((point) => Number.isFinite(point.lng) && Number.isFinite(point.lat))

  if (parsed.length < 3) {
    throw new Error('边界点位数量不足，至少需要 3 个点。')
  }

  boundaryPoints.value = parsed
  renderMaskOutsideBoundary(map, mapApi, parsed)

  const lngValues = parsed.map((point) => point.lng)
  const latValues = parsed.map((point) => point.lat)
  const minLng = Math.min(...lngValues)
  const maxLng = Math.max(...lngValues)
  const minLat = Math.min(...latValues)
  const maxLat = Math.max(...latValues)
  const boundaryPaddingRate = 0.0075
  const lngBuffer = (maxLng - minLng) * boundaryPaddingRate
  const latBuffer = (maxLat - minLat) * boundaryPaddingRate

  boundaryBounds = {
    minLng: minLng - lngBuffer,
    maxLng: maxLng + lngBuffer,
    minLat: minLat - latBuffer,
    maxLat: maxLat + latBuffer,
  }

  updateSvgMask()
  map.addEventListener('zooming', updateSvgMask)
  map.addEventListener('zoomend', updateSvgMask)
  map.addEventListener('moving', updateSvgMask)
  map.addEventListener('moveend', updateSvgMask)
  map.addEventListener('resize', updateSvgMask)
  map.addEventListener('moveend', enforceDragBounds)
}

async function loadLandmarks() {
  if (!map || !mapApi) return

  const locationList = await fetchLocationList()
  if (locationList.length === 0) {
    return
  }

  const allValidLocations = locationList.filter(
    (location) => Number.isFinite(location.lng) && Number.isFinite(location.lat),
  )

  const visibleLocations = boundaryBounds
    ? allValidLocations.filter(
        (location) =>
          location.lng >= boundaryBounds!.minLng &&
          location.lng <= boundaryBounds!.maxLng &&
          location.lat >= boundaryBounds!.minLat &&
          location.lat <= boundaryBounds!.maxLat,
      )
    : allValidLocations

  if (visibleLocations.length === 0) {
    throw new Error('地点坐标格式无效，无法渲染地标。')
  }

  landmarkLocations.value = visibleLocations
  updateLandmarkPixels()

  map.addEventListener('zooming', updateLandmarkPixels)
  map.addEventListener('zoomend', updateLandmarkPixels)
  map.addEventListener('moving', updateLandmarkPixels)
  map.addEventListener('moveend', updateLandmarkPixels)
  map.addEventListener('resize', updateLandmarkPixels)
}

onMounted(() => {
  syncTopBarUser()
  window.addEventListener('storage', handleAuthStorageChanged)
  window.addEventListener(AUTH_STORAGE_CHANGED_EVENT, handleAuthStorageChanged)
  window.addEventListener('focus', syncTopBarUser)

  if (!mapContainer.value) {
    loadError.value = '地图容器初始化失败，请刷新页面重试。'
    return
  }

  if (!window.BMapGL) {
    loadError.value = '百度地图脚本加载失败，请检查网络或 AK 配置。'
    return
  }

  mapApi = window.BMapGL
  const { Map, Point, ScaleControl } = mapApi
  const center = new Point(106.796971, 29.719559)
  const instance = new Map(mapContainer.value, {
    minZoom: MAP_MIN_ZOOM,
    maxZoom: MAP_MAX_ZOOM,
  })

  instance.centerAndZoom(center, MAP_INIT_ZOOM)
  instance.enableScrollWheelZoom(true)
  instance.setMinZoom(MAP_MIN_ZOOM)
  instance.setMaxZoom(MAP_MAX_ZOOM)
  instance.addControl(new ScaleControl())

  map = instance

  loadBoundaryAndMask()
    .then(() => loadLandmarks())
    .then(() => {
      loadError.value = ''
    })
    .catch((error) => {
      loadError.value = error instanceof Error ? error.message : '地图数据加载失败，请稍后重试。'
    })
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleAuthStorageChanged)
  window.removeEventListener(AUTH_STORAGE_CHANGED_EVENT, handleAuthStorageChanged)
  window.removeEventListener('focus', syncTopBarUser)

  if (!map) return

  cancelAnimationFrame(maskUpdateFrame)
  svgMaskPath.value = ''

  map.removeEventListener('zooming', updateSvgMask)
  map.removeEventListener('zoomend', updateSvgMask)
  map.removeEventListener('moving', updateSvgMask)
  map.removeEventListener('moveend', updateSvgMask)
  map.removeEventListener('resize', updateSvgMask)
  map.removeEventListener('moveend', enforceDragBounds)
  map.removeEventListener('zooming', updateLandmarkPixels)
  map.removeEventListener('zoomend', updateLandmarkPixels)
  map.removeEventListener('moving', updateLandmarkPixels)
  map.removeEventListener('moveend', updateLandmarkPixels)
  map.removeEventListener('resize', updateLandmarkPixels)

  clearLandmarks()
  map.clearOverlays()
  maskOverlays = []
  boundaryBounds = null
  mapApi = null
  map = null
})
</script>

<style scoped>
.home-view {
  position: relative;
  width: 100%;
  height: 100vh;
}

.map-container {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.landmark-layer {
  position: absolute;
  inset: 0;
  z-index: 900;
  pointer-events: none;
}

.landmark-anchor {
  position: absolute;
  transform: translate(-50%, calc(-100% - 14px));
  pointer-events: auto;
}

.map-error {
  position: absolute;
  inset: auto 16px 16px 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.85);
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.5;
}

.dom-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 900;
}

.top-nav-bar {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 12px 26px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 1000;
  background: #ffffff;
  border-bottom: 1px solid rgba(20, 33, 53, 0.08);
  box-shadow: 0 8px 24px rgba(16, 28, 44, 0.04);
}

.project-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.brand-mark {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  position: relative;
  background: linear-gradient(145deg, #ff6f4a 0%, #ff9a44 60%, #ffd166 100%);
  box-shadow: 0 6px 14px rgba(255, 111, 74, 0.35);
}

.brand-core {
  position: absolute;
  top: 9px;
  left: 9px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: radial-gradient(circle at 35% 35%, #fffad8 0%, #ffe27b 40%, #ffc145 100%);
}

.brand-text-wrap {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
}

.brand-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #152844;
}

.brand-subtitle {
  margin-top: 3px;
  font-size: 10px;
  letter-spacing: 0.18em;
  color: #6f7f93;
}

.nav-right-actions {
  display: flex;
  align-items: center;
  gap: 18px;
}

.feature-link {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #172b45;
  transition: color 0.2s ease, transform 0.2s ease;
}

.feature-link:hover {
  color: #3f66d5;
}

.feature-link:focus-visible,
.project-brand:focus-visible,
.avatar-entry:focus-visible {
  outline: 2px solid rgba(63, 102, 213, 0.5);
  outline-offset: 4px;
  border-radius: 10px;
}

.firefly-link {
  font-size: 16px;
  font-weight: 600;
}

.xiaoban-link {
  width: 44px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 600;
}

.xiaoban-link .el-icon {
  color: #284e97;
}

.avatar-entry {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.profile-avatar {
  border: 2px solid rgba(18, 35, 56, 0.08);
  box-shadow: 0 6px 16px rgba(15, 31, 52, 0.12);
}

.avatar-entry:hover {
  transform: translateY(-1px);
}

@media (max-width: 768px) {
  .top-nav-bar {
    padding: 10px 14px;
  }

  .brand-mark {
    width: 30px;
    height: 30px;
  }

  .brand-core {
    top: 8px;
    left: 8px;
    width: 14px;
    height: 14px;
  }

  .brand-title {
    font-size: 17px;
  }

  .brand-subtitle,
  .firefly-link {
    display: none;
  }

  .nav-right-actions {
    gap: 10px;
  }

  .xiaoban-link {
    width: 38px;
    font-size: 10px;
  }

  :deep(.profile-avatar) {
    width: 36px;
    height: 36px;
  }
}
</style>
