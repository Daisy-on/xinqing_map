<template>
  <main class="scatter-page" :class="{ rainy: isRainy }">
    <canvas ref="rainCanvas" class="rain-canvas" aria-hidden="true"></canvas>
    <div class="weather-fog" aria-hidden="true"></div>

    <div class="header-nav">
      <el-button circle :icon="ArrowLeft" class="back-btn" @click="goBack" />
      <span class="page-title">
        {{ currentLocation?.name || '地点详情' }} · {{ currentLocation?.weatherText || '天气加载中' }}
      </span>
    </div>

    <div class="scatter-container">
      <div class="placeholder-bubble bubble-1">今天真的很开心，阳光很好！</div>
      <div class="placeholder-bubble bubble-2">图书馆复习到好晚，终于弄懂了这道题。</div>
      <div class="placeholder-bubble bubble-3">有人掉了一把雨伞在食堂二楼哦！</div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { fetchLocationList } from '@/api/location'
import type { Location } from '@/types/models'

type RainDrop = {
  x: number
  y: number
  len: number
  speed: number
  alpha: number
  thickness: number
}

const route = useRoute()
const router = useRouter()

const spotId = computed(() => Number(route.params.spotId))
const currentLocation = ref<Location | null>(null)
const rainCanvas = ref<HTMLCanvasElement | null>(null)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let rafId = 0
let resizeTimer = 0
let ctx: CanvasRenderingContext2D | null = null
let drops: RainDrop[] = []
let lightning = 0

const isRainy = computed(() => {
  const loc = currentLocation.value
  if (!loc) return false
  return loc.weatherCode.includes('RAIN') || loc.weatherText.includes('雨')
})

const goBack = () => {
  router.push('/')
}

const createDrops = (width: number, height: number) => {
  const density = reducedMotion ? 0.00006 : width < 768 ? 0.00018 : 0.00024
  const count = Math.min(260, Math.max(90, Math.floor(width * height * density)))

  drops = Array.from({ length: count }).map(() => ({
    x: Math.random() * width,
    y: Math.random() * height,
    len: 16 + Math.random() * 18,
    speed: 10 + Math.random() * 8,
    alpha: 0.26 + Math.random() * 0.24,
    thickness: 1.2 + Math.random() * 1,
  }))
}

const resizeCanvas = () => {
  const canvas = rainCanvas.value
  if (!canvas) return

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const width = Math.floor(window.innerWidth)
  const height = Math.floor(window.innerHeight)

  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  canvas.width = Math.floor(width * dpr)
  canvas.height = Math.floor(height * dpr)

  ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  createDrops(width, height)
}

const drawRainFrame = () => {
  if (!ctx || !isRainy.value) return

  const width = window.innerWidth
  const height = window.innerHeight
  const wind = -2.8

  ctx.clearRect(0, 0, width, height)

  for (const d of drops) {
    ctx.beginPath()
    ctx.lineWidth = d.thickness
    ctx.lineCap = 'round'
    ctx.strokeStyle = `rgba(204, 224, 255, ${d.alpha})`
    ctx.moveTo(d.x, d.y)
    ctx.lineTo(d.x + wind, d.y + d.len)
    ctx.stroke()

    d.y += d.speed
    d.x += wind * 0.06

    if (d.y > height + 20 || d.x < -20) {
      d.y = -20 - Math.random() * 120
      d.x = Math.random() * (width + 100)
    }
  }

  if (!reducedMotion && Math.random() < 0.004) {
    lightning = 0.08 + Math.random() * 0.06
  }
  if (lightning > 0.001) {
    ctx.fillStyle = `rgba(220, 235, 255, ${lightning})`
    ctx.fillRect(0, 0, width, height)
    lightning *= 0.88
  }

  rafId = window.requestAnimationFrame(drawRainFrame)
}

const stopRain = () => {
  if (rafId) {
    window.cancelAnimationFrame(rafId)
    rafId = 0
  }
  if (ctx) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  }
}

const startRain = async () => {
  if (!isRainy.value) return
  await nextTick()
  resizeCanvas()
  stopRain()
  rafId = window.requestAnimationFrame(drawRainFrame)
}

const handleResize = () => {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    resizeCanvas()
  }, 120)
}

const loadLocation = async () => {
  const locations = await fetchLocationList()
  currentLocation.value = locations.find((it) => it.id === spotId.value) ?? null
}

onMounted(async () => {
  await loadLocation()
  if (isRainy.value) {
    await startRain()
  }
  window.addEventListener('resize', handleResize)
})

watch(isRainy, async (rain) => {
  if (rain) {
    await startRain()
  } else {
    stopRain()
  }
})

onBeforeUnmount(() => {
  stopRain()
  window.removeEventListener('resize', handleResize)
  window.clearTimeout(resizeTimer)
})
</script>

<style scoped>
.scatter-page {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: radial-gradient(130% 100% at 50% 8%, #d7e5f4 0%, #98aec8 48%, #50657d 100%);
}

.scatter-page.rainy {
  background: radial-gradient(130% 120% at 50% 0%, #9fb3c9 0%, #5c7289 42%, #2f3f52 100%);
}

.rain-canvas {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 0;
  transition: opacity 280ms ease;
}

.scatter-page.rainy .rain-canvas {
  opacity: 1;
}

.weather-fog {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    radial-gradient(100% 70% at 50% 15%, rgba(233, 242, 250, 0.12) 0%, rgba(233, 242, 250, 0) 70%),
    linear-gradient(to bottom, rgba(14, 23, 37, 0.04), rgba(14, 23, 37, 0.14));
  backdrop-filter: blur(1px);
}

.header-nav {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 10;
  background: linear-gradient(to bottom, rgba(248, 252, 255, 0.48) 0%, transparent 100%);
  pointer-events: none;
}

.back-btn {
  pointer-events: auto;
  box-shadow: 0 6px 16px rgba(15, 29, 47, 0.2);
  transition: transform 0.2s ease;
}

.back-btn:hover {
  transform: scale(1.05);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #f6fbff;
  text-shadow: 0 2px 8px rgba(9, 16, 26, 0.45);
}

.scatter-container {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 6;
}

.placeholder-bubble {
  position: absolute;
  padding: 12px 20px;
  max-width: 220px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  background: rgba(247, 252, 255, 0.72);
  box-shadow: 0 12px 28px rgba(13, 23, 39, 0.2);
  color: #304457;
  line-height: 1.5;
  font-size: 14px;
  backdrop-filter: blur(9px);
  animation: float 6s ease-in-out infinite alternate;
}

.bubble-1 {
  top: 30%;
  left: 14%;
  animation-delay: 0s;
}

.bubble-2 {
  top: 50%;
  right: 18%;
  animation-delay: -2s;
}

.bubble-3 {
  bottom: 20%;
  left: 34%;
  animation-delay: -4s;
}

@keyframes float {
  0% {
    transform: translateY(0);
  }

  100% {
    transform: translateY(-16px);
  }
}

@media (max-width: 767px) {
  .page-title {
    font-size: 16px;
    max-width: 72vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .placeholder-bubble {
    max-width: 64vw;
    font-size: 13px;
  }

  .bubble-1 {
    top: 34%;
    left: 7%;
  }

  .bubble-2 {
    top: 56%;
    right: 8%;
  }

  .bubble-3 {
    bottom: 16%;
    left: 20%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .placeholder-bubble {
    animation: none;
  }
}
</style>
