<template>
  <main class="home-view">
    <div ref="mapContainer" class="map-container"></div>
    <svg v-if="svgMaskPath" class="dom-mask" xmlns="http://www.w3.org/2000/svg">
      <path :d="svgMaskPath" fill="#ffffff" fill-rule="evenodd" />
    </svg>
    <div v-if="loadError" class="map-error">{{ loadError }}</div>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

type BoundaryPoint = { lng: number; lat: number }

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

function clearMaskOverlays(instance: BMapGLMap) {
  if (maskOverlays.length === 0) return
  maskOverlays.forEach((overlay) => instance.removeOverlay(overlay))
  maskOverlays = []
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

async function loadBoundaryAndMask() {
  if (!map || !mapApi) return

  const response = await fetch('/data/campus-boundary.json')
  if (!response.ok) {
    throw new Error('读取边界文件失败')
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
  const lngBuffer = (maxLng - minLng) * 0.05
  const latBuffer = (maxLat - minLat) * 0.05

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

onMounted(() => {
  if (!mapContainer.value) {
    loadError.value = '地图容器初始化失败，请刷新页面重试。'
    return
  }

  if (!window.BMapGL) {
    loadError.value = '百度地图脚本加载失败，请检查网络或 AK 配置。'
    return
  }

  mapApi = window.BMapGL
  const { Map, Point, NavigationControl, ScaleControl } = mapApi
  const center = new Point(106.796971, 29.719559)
  const instance = new Map(mapContainer.value, {
    minZoom: MAP_MIN_ZOOM,
    maxZoom: MAP_MAX_ZOOM,
  })

  instance.centerAndZoom(center, MAP_INIT_ZOOM)
  instance.enableScrollWheelZoom(true)
  instance.setMinZoom(MAP_MIN_ZOOM)
  instance.setMaxZoom(MAP_MAX_ZOOM)
  instance.addControl(new NavigationControl())
  instance.addControl(new ScaleControl())

  map = instance

  loadBoundaryAndMask()
    .then(() => {
      loadError.value = ''
    })
    .catch((error) => {
      loadError.value = error instanceof Error ? error.message : '边界加载失败，请检查 JSON 格式。'
    })
})

onBeforeUnmount(() => {
  if (!map) return

  cancelAnimationFrame(maskUpdateFrame)
  svgMaskPath.value = ''

  map.removeEventListener('zooming', updateSvgMask)
  map.removeEventListener('zoomend', updateSvgMask)
  map.removeEventListener('moving', updateSvgMask)
  map.removeEventListener('moveend', updateSvgMask)
  map.removeEventListener('resize', updateSvgMask)
  map.removeEventListener('moveend', enforceDragBounds)

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
  z-index: 1000;
}

</style>
