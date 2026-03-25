<template>
  <main class="home-view">
    <div ref="mapContainer" class="map-container"></div>
    <svg v-if="svgMaskPath" class="dom-mask" xmlns="http://www.w3.org/2000/svg">
      <path :d="svgMaskPath" fill="#ffffff" fill-rule="evenodd" />
    </svg>
    <div
      class="coord-panel"
      @click.stop
      @mousedown.stop
      @mouseup.stop
      @dblclick.stop
      @touchstart.stop
      @touchend.stop
    >
      <p class="panel-title">边界采样工具</p>
      <p>坐标系：BD-09（经纬度）</p>
      <p>点位数量：{{ boundaryPoints.length }}</p>
      <p v-if="lastPoint">最后一点：{{ lastPoint.lng }}, {{ lastPoint.lat }}</p>
      <p v-if="isClosed" class="status-ok">边界已闭合，可用于遮罩。</p>
      <div class="panel-actions">
        <button type="button" @click="loadBoundaryAndMask">读取边界并遮罩</button>
        <button type="button" @click="undoLastPoint" :disabled="boundaryPoints.length === 0">撤销</button>
        <button type="button" @click="clearPoints" :disabled="boundaryPoints.length === 0">清空</button>
        <button type="button" @click="toggleCloseBoundary" :disabled="boundaryPoints.length < 3">
          {{ isClosed ? '继续编辑' : '闭合边界' }}
        </button>
        <button type="button" @click="copyPoints" :disabled="boundaryPoints.length < 3">复制坐标</button>
      </div>
      <textarea readonly class="coord-output" :value="boundaryJson"></textarea>
    </div>
    <div v-if="loadError" class="map-error">{{ loadError }}</div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type BoundaryPoint = { lng: number; lat: number }

const MAP_MIN_ZOOM = 18
const MAP_MAX_ZOOM = 22
const MAP_INIT_ZOOM = 19

const mapContainer = ref<HTMLElement | null>(null)
const loadError = ref('')
const boundaryPoints = ref<BoundaryPoint[]>([])
const isClosed = ref(false)
const isMaskApplied = ref(false)
let map: BMapGLMap | null = null
let mapApi: BMapGLNamespace | null = null
let markerOverlays: BMapGLMarker[] = []
let polylineOverlay: BMapGLPolyline | null = null
let polygonOverlay: BMapGLPolygon | null = null
let maskOverlays: BMapGLPolygon[] = []
let clickHandler: ((event: BMapGLClickEvent) => void) | null = null

const svgMaskPath = ref('')
let maskUpdateFrame = 0
let boundaryBounds: { minLng: number; maxLng: number; minLat: number; maxLat: number } | null = null
let dragLimitHandler: (() => void) | null = null
let isAdjustingBounds = false

function enforceDragBounds() {
  if (!map || !boundaryBounds || isAdjustingBounds) return
  
  const center = map.getCenter()
  let constrainedLng = center.lng
  let constrainedLat = center.lat
  let needsAdjust = false
  
  // 检查并限制经度
  if (center.lng < boundaryBounds.minLng) {
    constrainedLng = boundaryBounds.minLng
    needsAdjust = true
  } else if (center.lng > boundaryBounds.maxLng) {
    constrainedLng = boundaryBounds.maxLng
    needsAdjust = true
  }
  
  // 检查并限制纬度
  if (center.lat < boundaryBounds.minLat) {
    constrainedLat = boundaryBounds.minLat
    needsAdjust = true
  } else if (center.lat > boundaryBounds.maxLat) {
    constrainedLat = boundaryBounds.maxLat
    needsAdjust = true
  }
  
  // 如果超出边界，平滑滚动回去，并保持当前缩放等级
  if (needsAdjust) {
    isAdjustingBounds = true
    map.panTo(new mapApi!.Point(constrainedLng, constrainedLat))
    
    // 短暂锁定避免事件死循环
    setTimeout(() => {
      isAdjustingBounds = false
    }, 500)
  }
}

function updateSvgMask() {
  if (!map || !mapApi || boundaryPoints.value.length < 3 || !isClosed.value) {
    svgMaskPath.value = ''
    return
  }

  cancelAnimationFrame(maskUpdateFrame)
  maskUpdateFrame = requestAnimationFrame(() => {
    if (!mapContainer.value || !map || !mapApi) return
    const width = mapContainer.value.clientWidth
    const height = mapContainer.value.clientHeight
    
    // SVG外环包裹整个地图容器空间
    let path = `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z `
    
    // 内环通过坐标转换将经纬度映射到屏幕像素
    const pixels = boundaryPoints.value.map(pt => {
      return map!.pointToPixel(new mapApi!.Point(pt.lng, pt.lat))
    })
    
    // 配合 fill-rule="evenodd"，内环会在外环上直接“挖洞”
    path += 'M ' + pixels.map(p => `${p.x} ${p.y}`).join(' L ') + ' Z'
    svgMaskPath.value = path
  })
}

const lastPoint = computed(() => {
  const point = boundaryPoints.value[boundaryPoints.value.length - 1]
  if (!point) return null
  return {
    lng: point.lng.toFixed(6),
    lat: point.lat.toFixed(6),
  }
})

const boundaryJson = computed(() => {
  const output = boundaryPoints.value.map((point) => ({
    lng: Number(point.lng.toFixed(6)),
    lat: Number(point.lat.toFixed(6)),
  }))
  return JSON.stringify(output, null, 2)
})

function redrawOverlays(instance: BMapGLMap, api: BMapGLNamespace) {
  markerOverlays.forEach((overlay) => instance.removeOverlay(overlay))
  markerOverlays = []

  if (polylineOverlay) {
    instance.removeOverlay(polylineOverlay)
    polylineOverlay = null
  }

  if (polygonOverlay) {
    instance.removeOverlay(polygonOverlay)
    polygonOverlay = null
  }

  const points = boundaryPoints.value.map((point) => new api.Point(point.lng, point.lat))
  if (!isMaskApplied.value) {
    markerOverlays = points.map((point) => new api.Marker(point))
    markerOverlays.forEach((overlay) => instance.addOverlay(overlay))
  }

  if (points.length >= 2) {
    polylineOverlay = new api.Polyline(points, {
      strokeColor: '#0ea5e9',
      strokeWeight: 3,
      strokeOpacity: 0.95,
    })
    instance.addOverlay(polylineOverlay)
  }

  if (isClosed.value && points.length >= 3) {
    polygonOverlay = new api.Polygon(points, {
      strokeColor: '#0284c7',
      strokeWeight: 2,
      strokeOpacity: 0.95,
      fillColor: '#0ea5e9',
      fillOpacity: 0.2,
    })
    instance.addOverlay(polygonOverlay)
  }
}

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
    // 部分环境不支持内外环，回退到矩形遮罩避免功能不可用。
    renderRectMaskFallback(instance, api, points)
  }
}

async function loadBoundaryAndMask() {
  if (!map || !mapApi) return

  try {
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

    isMaskApplied.value = true
    boundaryPoints.value = parsed
    isClosed.value = true
    redrawOverlays(map, mapApi)
    renderMaskOutsideBoundary(map, mapApi, parsed)

    // DOM层面的遮罩，用来物理掩盖超出范围的 POI 和 3D 楼块
    updateSvgMask()
    map.addEventListener('zooming', updateSvgMask)
    map.addEventListener('zoomend', updateSvgMask)
    map.addEventListener('moving', updateSvgMask)
    map.addEventListener('moveend', updateSvgMask)
    map.addEventListener('resize', updateSvgMask)

    // 计算边界矩形（bounding box），限制拖动范围
    const lngValues = parsed.map(p => p.lng)
    const latValues = parsed.map(p => p.lat)
    const minLng = Math.min(...lngValues)
    const maxLng = Math.max(...lngValues)
    const minLat = Math.min(...latValues)
    const maxLat = Math.max(...latValues)

    // 存储边界信息以供 enforceDragBounds 使用
    boundaryBounds = { minLng, maxLng, minLat, maxLat }

    // 添加缓冲区（放大 5% 的范围，防止边界紧绷）
    const lngBuffer = (maxLng - minLng) * 0.05
    const latBuffer = (maxLat - minLat) * 0.05
    boundaryBounds = {
      minLng: minLng - lngBuffer,
      maxLng: maxLng + lngBuffer,
      minLat: minLat - latBuffer,
      maxLat: maxLat + latBuffer,
    }

    // 使用 moveend 事件来检测拖动完成后强制边界约束
    dragLimitHandler = enforceDragBounds
    map.addEventListener('moveend', dragLimitHandler)

    // 启用拖动，有边界限制
    map.enableDragging()
    loadError.value = ''
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '边界加载失败，请检查 JSON 格式。'
  }
}

function undoLastPoint() {
  if (!map || !mapApi || boundaryPoints.value.length === 0) return
  boundaryPoints.value.pop()
  if (boundaryPoints.value.length < 3) {
    isClosed.value = false
  }
  redrawOverlays(map, mapApi)
}

function clearPoints() {
  if (!map || !mapApi) return
  isMaskApplied.value = false
  boundaryPoints.value = []
  isClosed.value = false
  redrawOverlays(map, mapApi)
  clearMaskOverlays(map)
  
  // 清除 DOM 掩膜及事件
  svgMaskPath.value = ''
  map.removeEventListener('zooming', updateSvgMask)
  map.removeEventListener('zoomend', updateSvgMask)
  map.removeEventListener('moving', updateSvgMask)
  map.removeEventListener('moveend', updateSvgMask)
  map.removeEventListener('resize', updateSvgMask)

  // 清除拖动限制
  if (dragLimitHandler) {
    map.removeEventListener('moveend', dragLimitHandler)
  }
  boundaryBounds = null
  dragLimitHandler = null

  map.enableDragging()
}

function toggleCloseBoundary() {
  if (!map || !mapApi || boundaryPoints.value.length < 3) return
  isClosed.value = !isClosed.value
  redrawOverlays(map, mapApi)
}

async function copyPoints() {
  if (boundaryPoints.value.length < 3) return
  try {
    await navigator.clipboard.writeText(boundaryJson.value)
    loadError.value = ''
  } catch {
    loadError.value = '复制失败，请手动复制下方坐标文本。'
  }
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
  const bmap = mapApi
  const { Map, Point, NavigationControl, ScaleControl } = bmap
  const center = new Point(106.796768, 29.719566)

  // 只保留一组缩放配置，避免多处配置互相覆盖。
  const instance = new Map(mapContainer.value, {
    minZoom: MAP_MIN_ZOOM,
    maxZoom: MAP_MAX_ZOOM,
  })

  instance.centerAndZoom(center, MAP_INIT_ZOOM)
  instance.enableScrollWheelZoom(true)

  // 双重保险：再通过方法设置一次
  instance.setMinZoom(MAP_MIN_ZOOM)
  instance.setMaxZoom(MAP_MAX_ZOOM)

  instance.addControl(new NavigationControl())
  instance.addControl(new ScaleControl())

  clickHandler = (event: BMapGLClickEvent) => {
    if (isClosed.value) {
      loadError.value = '边界已闭合，点击“继续编辑”后才能继续加点。'
      return
    }

    const source = event.latlng ?? event.point
    if (!source) {
      loadError.value = '未能读取点击坐标，请重试。'
      return
    }

    const { lng, lat } = source
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      loadError.value = '坐标解析失败，请重试。'
      return
    }

    // point 在某些场景可能是投影坐标；优先使用 latlng 作为标准经纬度。
    if (!event.latlng && (Math.abs(lng) > 180 || Math.abs(lat) > 90)) {
      loadError.value = '当前事件返回的是投影坐标，未拿到标准经纬度。请升级脚本版本或开启逆转换。'
      return
    }

    boundaryPoints.value.push({ lng, lat })
    redrawOverlays(instance, bmap)
    loadError.value = ''
  }

  instance.addEventListener('click', clickHandler)

  map = instance
})

onBeforeUnmount(() => {
  if (!map) return

  if (clickHandler) {
    map.removeEventListener('click', clickHandler)
  }

  map.clearOverlays()
  markerOverlays = []
  polylineOverlay = null
  polygonOverlay = null
  maskOverlays = []
  clickHandler = null
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
  z-index: 1200;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.85);
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.5;
}

.coord-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1100;
  pointer-events: auto;
  width: 320px;
  max-width: calc(100vw - 32px);
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.94);
  color: #0f172a;
  font-size: 13px;
  line-height: 1.5;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.15);
}

.coord-panel p {
  margin: 0;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
}

.status-ok {
  color: #0369a1;
  font-weight: 600;
}

.panel-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.panel-actions button {
  border: 0;
  border-radius: 8px;
  padding: 7px 10px;
  background: #0f172a;
  color: #fff;
  font-size: 12px;
  cursor: pointer;
}

.panel-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.coord-output {
  width: 100%;
  min-height: 120px;
  margin-top: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px;
  font-size: 12px;
  font-family: Consolas, Monaco, monospace;
  resize: vertical;
  background: #f8fafc;
  color: #0f172a;
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
