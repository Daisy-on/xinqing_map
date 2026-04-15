<template>
  <SplashAnimation v-if="isSplashVisible" :is-visible="!isSplashHiding" />
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
          <div class="firefly-icon-wrapper">
            <el-icon :size="18"><MagicStick /></el-icon>
            <span>萤火虫</span>
            <span v-if="letterStore.hasUnreadLetter" class="glowing-red-dot"></span>
          </div>
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

    <div ref="mapContainer" class="map-container" :class="{ 'is-ready': isMapReady }"></div>
    <div v-if="!isMapReady && !loadError" class="map-skeleton"></div>
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
      :landmark-detail="selectedLandmarkDetail"
      :loading="isLandmarkDetailLoading"
      :error="landmarkDetailError"
    />

    <!-- 心情胶囊入口悬浮图标 -->
    <button class="capsule-entry-btn" type="button" @click="router.push('/capsule')">
      <el-icon :size="24"><LocationInformation /></el-icon>
      <span class="capsule-text">心情胶囊</span>
    </button>
  </main>
</template>

<script setup lang="ts">
import { onActivated, onBeforeUnmount, onDeactivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { fetchLocationDetail, fetchLocationList } from '@/api/location'
import { loadBaiduMapGL } from '@/utils/baiduMapLoader'
import SplashAnimation from '@/components/common/SplashAnimation.vue'
import LandmarkCard from '@/components/map/LandmarkCard.vue'
import LandmarkDetailPanel from '@/components/map/LandmarkDetailPanel.vue'
import { ChatDotRound, UserFilled, LocationInformation, MagicStick } from '@element-plus/icons-vue'
import type { Location, LocationDetail, User } from '@/types/models'
import { AUTH_STORAGE_CHANGED_EVENT, getStoredUserInfo, getToken } from '@/utils/auth'
import { useLetterStore } from '@/stores/letter'

type BoundaryPoint = { lng: number; lat: number }

const router = useRouter()
const letterStore = useLetterStore()

const MAP_MIN_ZOOM = 18
const MAP_MAX_ZOOM = 22
const MAP_INIT_ZOOM = 19
const HOME_SPLASH_PLAYED_KEY = 'xinqing_map_home_splash_played'

function shouldPlayHomeSplashOnce() {
  try {
    return sessionStorage.getItem(HOME_SPLASH_PLAYED_KEY) !== '1'
  } catch {
    return true
  }
}

const shouldPlaySplash = shouldPlayHomeSplashOnce()

const isSplashVisible = ref(shouldPlaySplash)
const isSplashHiding = ref(!shouldPlaySplash)
const isMapReady = ref(false)

const mapContainer = ref<HTMLElement | null>(null)
const loadError = ref('')
const boundaryPoints = ref<BoundaryPoint[]>([])
const svgMaskPath = ref('')

let map: BMapGLMap | null = null
let mapApi: BMapGLNamespace | null = null
let maskUpdateFrame = 0
let landmarkUpdateFrame = 0
let maskOverlays: BMapGLPolygon[] = []
let boundaryBounds: { minLng: number; maxLng: number; minLat: number; maxLat: number } | null = null
let isAdjustingBounds = false
const landmarkLocations = ref<Location[]>([])
const landmarkPixels = ref<Record<number, { x: number; y: number }>>({})
let allLandmarkLocations: Location[] = []
let hasBoundMapEvents = false
let hasBoundUserEvents = false
let mapInitPromise: Promise<void> | null = null

const isDetailPanelVisible = ref(false)
const selectedLandmark = ref<Location | null>(null)
const selectedLandmarkDetail = ref<LocationDetail | null>(null)
const isLandmarkDetailLoading = ref(false)
const landmarkDetailError = ref('')
const landmarkDetailCache = new Map<number, LocationDetail>()
let landmarkDetailRequestSerial = 0
const currentUser = ref<User | null>(null)

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}

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
  letterStore.markAsRead()
  router.push('/firefly')
}

function handleXiaobanClick() {
  router.push('/match')
}

function handleAuthStorageChanged(event: Event) {
  if (event instanceof StorageEvent) {
    if (event.storageArea !== localStorage) return
    if (event.key !== 'token' && event.key !== 'userInfo') return
  }

  syncTopBarUser()
}

function bindUserEvents() {
  if (hasBoundUserEvents) return
  window.addEventListener('storage', handleAuthStorageChanged)
  window.addEventListener(AUTH_STORAGE_CHANGED_EVENT, handleAuthStorageChanged)
  window.addEventListener('focus', syncTopBarUser)
  hasBoundUserEvents = true
}

function unbindUserEvents() {
  if (!hasBoundUserEvents) return
  window.removeEventListener('storage', handleAuthStorageChanged)
  window.removeEventListener(AUTH_STORAGE_CHANGED_EVENT, handleAuthStorageChanged)
  window.removeEventListener('focus', syncTopBarUser)
  hasBoundUserEvents = false
}

async function loadLandmarkDetail(locationId: number) {
  const cached = landmarkDetailCache.get(locationId)
  if (cached) {
    selectedLandmarkDetail.value = cached
    landmarkDetailError.value = ''
    isLandmarkDetailLoading.value = false
    return
  }

  isLandmarkDetailLoading.value = true
  landmarkDetailError.value = ''
  const currentSerial = ++landmarkDetailRequestSerial

  try {
    const detail = await fetchLocationDetail(locationId)
    if (currentSerial !== landmarkDetailRequestSerial || selectedLandmark.value?.id !== locationId) return
    landmarkDetailCache.set(locationId, detail)
    selectedLandmarkDetail.value = detail
  } catch (error) {
    if (currentSerial !== landmarkDetailRequestSerial || selectedLandmark.value?.id !== locationId) return
    const message = getErrorMessage(error, '地点详情加载失败，请稍后重试')
    landmarkDetailError.value = message
    selectedLandmarkDetail.value = null
    ElMessage.warning(message)
  } finally {
    if (currentSerial === landmarkDetailRequestSerial && selectedLandmark.value?.id === locationId) {
      isLandmarkDetailLoading.value = false
    }
  }
}

function handleLandmarkClick(loc: Location) {
  selectedLandmark.value = loc
  selectedLandmarkDetail.value = null
  landmarkDetailError.value = ''
  isDetailPanelVisible.value = true
  void loadLandmarkDetail(loc.id)
}

function clearMaskOverlays(instance: BMapGLMap) {
  if (maskOverlays.length === 0) return
  maskOverlays.forEach((overlay) => instance.removeOverlay(overlay))
  maskOverlays = []
}

function clearLandmarks() {
  allLandmarkLocations = []
  landmarkLocations.value = []
  landmarkPixels.value = {}
}

function applyVisibleLandmarks() {
  const visibleLocations = boundaryBounds
    ? allLandmarkLocations.filter(
        (location) =>
          location.lng >= boundaryBounds!.minLng &&
          location.lng <= boundaryBounds!.maxLng &&
          location.lat >= boundaryBounds!.minLat &&
          location.lat <= boundaryBounds!.maxLat,
      )
    : allLandmarkLocations

  landmarkLocations.value = visibleLocations
  scheduleLandmarkPixelsUpdate()
}

function markMapReady() {
  isMapReady.value = true
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

function scheduleLandmarkPixelsUpdate() {
  cancelAnimationFrame(landmarkUpdateFrame)
  landmarkUpdateFrame = requestAnimationFrame(() => {
    updateLandmarkPixels()
  })
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

function bindMapRuntimeEvents() {
  if (!map || hasBoundMapEvents) return

  map.addEventListener('zooming', updateSvgMask)
  map.addEventListener('zoomend', updateSvgMask)
  map.addEventListener('moving', updateSvgMask)
  map.addEventListener('moveend', updateSvgMask)
  map.addEventListener('resize', updateSvgMask)
  map.addEventListener('moveend', enforceDragBounds)
  map.addEventListener('zooming', scheduleLandmarkPixelsUpdate)
  map.addEventListener('zoomend', updateLandmarkPixels)
  map.addEventListener('moving', scheduleLandmarkPixelsUpdate)
  map.addEventListener('moveend', updateLandmarkPixels)
  map.addEventListener('resize', scheduleLandmarkPixelsUpdate)
  hasBoundMapEvents = true
}

function unbindMapRuntimeEvents(instance: BMapGLMap) {
  if (!hasBoundMapEvents) return

  instance.removeEventListener('zooming', updateSvgMask)
  instance.removeEventListener('zoomend', updateSvgMask)
  instance.removeEventListener('moving', updateSvgMask)
  instance.removeEventListener('moveend', updateSvgMask)
  instance.removeEventListener('resize', updateSvgMask)
  instance.removeEventListener('moveend', enforceDragBounds)
  instance.removeEventListener('zooming', scheduleLandmarkPixelsUpdate)
  instance.removeEventListener('zoomend', updateLandmarkPixels)
  instance.removeEventListener('moving', scheduleLandmarkPixelsUpdate)
  instance.removeEventListener('moveend', updateLandmarkPixels)
  instance.removeEventListener('resize', scheduleLandmarkPixelsUpdate)
  hasBoundMapEvents = false
}

async function loadBoundaryAndMask() {
  if (!map || !mapApi) return

  const response = await fetch('/data/campus-boundary.json')
  if (!response.ok) {
    throw new Error(`边界数据加载失败：${response.status}`)
  }

  const data = (await response.json()) as Array<{ lng: unknown; lat: unknown }>
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

  applyVisibleLandmarks()
  updateSvgMask()
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

  if (allValidLocations.length === 0) {
    throw new Error('地点坐标格式无效，无法渲染地标。')
  }

  allLandmarkLocations = allValidLocations
  applyVisibleLandmarks()
}

function finishSplash() {
  if (!shouldPlaySplash) return
  isSplashHiding.value = true
  setTimeout(() => {
    isSplashVisible.value = false
  }, 1200)
}

if (shouldPlaySplash) {
  try {
    sessionStorage.setItem(HOME_SPLASH_PLAYED_KEY, '1')
  } catch {
    // Ignore storage write errors and keep graceful fallback behavior.
  }
}

function restoreMapViewState() {
  if (!map) return
  updateSvgMask()
  scheduleLandmarkPixelsUpdate()
}

async function initMapIfNeeded() {
  if (map) {
    restoreMapViewState()
    return
  }

  if (mapInitPromise) {
    await mapInitPromise
    return
  }

  mapInitPromise = (async () => {
    if (!mapContainer.value) {
      throw new Error('地图容器初始化失败，请刷新页面重试。')
    }

    const ak = import.meta.env.VITE_BMAP_AK
    if (!ak) {
      throw new Error('未配置百度地图 AK，请检查环境变量。')
    }

    mapApi = await loadBaiduMapGL(ak)

    if (!mapApi) {
      throw new Error('百度地图对象未知错误。')
    }

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
    instance.addEventListener('tilesloaded', markMapReady)

    // 隐藏所有文字、POI图标（为了比赛隐藏真实校名和地标），保留地图底图几何轮廓
    instance.setMapStyleV2({
      styleJson: [
        {
          featureType: 'all',
          elementType: 'labels',
          stylers: { visibility: 'off' },
        },
        {
          featureType: 'all',
          elementType: 'icons',
          stylers: { visibility: 'off' },
        },
        {
          featureType: 'poi',
          elementType: 'all',
          stylers: { visibility: 'off' },
        },
        {
          featureType: 'education',
          elementType: 'all',
          stylers: { visibility: 'off' },
        },
      ],
    })

    map = instance
    bindMapRuntimeEvents()

    const splashTimer = shouldPlaySplash
      ? new Promise((resolve) => setTimeout(resolve, 1200))
      : Promise.resolve()

    await Promise.all([
      loadBoundaryAndMask(),
      loadLandmarks(),
      splashTimer,
    ])

    loadError.value = ''
    restoreMapViewState()
  })()
    .catch((error) => {
      loadError.value = error instanceof Error ? error.message : '地图数据加载失败，请稍后重试。'
    })
    .finally(() => {
      finishSplash()
      mapInitPromise = null
    })

  await mapInitPromise
}

onMounted(() => {
  syncTopBarUser()
  bindUserEvents()
  void initMapIfNeeded()
})

onActivated(() => {
  syncTopBarUser()
  bindUserEvents()
  if (map) {
    restoreMapViewState()
    return
  }
  void initMapIfNeeded()
})

onDeactivated(() => {
  unbindUserEvents()
})

onBeforeUnmount(() => {
  unbindUserEvents()

  if (!map) return

  cancelAnimationFrame(maskUpdateFrame)
  cancelAnimationFrame(landmarkUpdateFrame)
  svgMaskPath.value = ''
  isMapReady.value = false

  unbindMapRuntimeEvents(map)
  map.removeEventListener('tilesloaded', markMapReady)

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
  opacity: 0;
  transition: opacity 240ms ease;
}

.map-container.is-ready {
  opacity: 1;
}

.map-skeleton {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    linear-gradient(120deg, rgba(226, 232, 240, 0.9) 25%, rgba(241, 245, 249, 0.9) 38%, rgba(226, 232, 240, 0.9) 55%),
    linear-gradient(180deg, #dbeafe 0%, #eff6ff 45%, #f8fafc 100%);
  background-size: 260% 100%, 100% 100%;
  animation: mapSkeletonShimmer 1.15s linear infinite;
}

@keyframes mapSkeletonShimmer {
  0% { background-position: 100% 0, 0 0; }
  100% { background-position: -100% 0, 0 0; }
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

/* 心情胶囊悬浮按钮 */
.capsule-entry-btn {
  position: absolute;
  right: 24px;
  bottom: 80px; /* 避开可能有的底部控件或缩放尺 */
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 56px;
  height: 56px;
  border: none;
  border-radius: 50%;
  background: linear-gradient(135deg, #74ebd5 0%, #acb6e5 100%);
  color: #fff;
  box-shadow: 0 4px 16px rgba(116, 235, 213, 0.4);
  cursor: pointer;
  transition: all 0.3s ease;
}

.capsule-entry-btn:hover {
  transform: translateY(-4px) scale(1.05);
  box-shadow: 0 6px 20px rgba(116, 235, 213, 0.6);
}

.capsule-text {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.firefly-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
}

.glowing-red-dot {
  position: absolute;
  top: -2px;
  right: -8px;
  width: 8px;
  height: 8px;
  background-color: #ff4757;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(255, 71, 87, 0.6);
  animation: red-pulse 1.5s infinite;
}

@keyframes red-pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(255, 71, 87, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
}
</style>
