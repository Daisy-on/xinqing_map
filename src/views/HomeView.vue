<template>
  <main class="home-view">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="pickedPoint" class="coord-panel">
      <p>已选点位</p>
      <p>坐标系：BD-09（经纬度）</p>
      <p>lng: {{ pickedPoint.lng }}</p>
      <p>lat: {{ pickedPoint.lat }}</p>
    </div>
    <div v-if="loadError" class="map-error">{{ loadError }}</div>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const mapContainer = ref<HTMLElement | null>(null)
const loadError = ref('')
const pickedPoint = ref<{ lng: string; lat: string } | null>(null)
let map: BMapGLMap | null = null
let marker: BMapGLMarker | null = null
let clickHandler: ((event: BMapGLClickEvent) => void) | null = null

onMounted(() => {
  if (!mapContainer.value) {
    loadError.value = '地图容器初始化失败，请刷新页面重试。'
    return
  }

  if (!window.BMapGL) {
    loadError.value = '百度地图脚本加载失败，请检查网络或 AK 配置。'
    return
  }

  const { Map, Point, Marker, NavigationControl, ScaleControl } = window.BMapGL
  const center = new Point(106.791034, 29.712457)
  const instance = new Map(mapContainer.value)

  instance.centerAndZoom(center, 14)
  instance.enableScrollWheelZoom(true)
  instance.addControl(new NavigationControl())
  instance.addControl(new ScaleControl())

  clickHandler = (event: BMapGLClickEvent) => {
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

    const normalizedLng = lng
    const normalizedLat = lat
    const point = new Point(normalizedLng, normalizedLat)

    if (marker) {
      instance.removeOverlay(marker)
    }

    marker = new Marker(point)
    instance.addOverlay(marker)
    pickedPoint.value = {
      lng: normalizedLng.toFixed(6),
      lat: normalizedLat.toFixed(6),
    }
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
  marker = null
  clickHandler = null
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

.coord-panel {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  font-size: 13px;
  line-height: 1.5;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.15);
}

.coord-panel p {
  margin: 0;
}
</style>
