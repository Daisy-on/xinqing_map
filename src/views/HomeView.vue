<template>
  <main class="home-view">
    <div ref="mapContainer" class="map-container"></div>
    <div v-if="loadError" class="map-error">{{ loadError }}</div>
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const mapContainer = ref<HTMLElement | null>(null)
const loadError = ref('')
let map: BMapGLMap | null = null

onMounted(() => {
  if (!mapContainer.value) {
    loadError.value = '地图容器初始化失败，请刷新页面重试。'
    return
  }

  if (!window.BMapGL) {
    loadError.value = '百度地图脚本加载失败，请检查网络或 AK 配置。'
    return
  }

  const { Map, Point, NavigationControl, ScaleControl } = window.BMapGL
  const center = new Point(106.791034, 29.712457)
  const instance = new Map(mapContainer.value)

  instance.centerAndZoom(center, 14)
  instance.enableScrollWheelZoom(true)
  instance.addControl(new NavigationControl())
  instance.addControl(new ScaleControl())

  map = instance
})

onBeforeUnmount(() => {
  if (!map) return

  map.clearOverlays()
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

</style>
