<template>
  <main class="scatter-page" :class="weatherThemeClass">
    <canvas ref="weatherCanvas" class="weather-canvas" aria-hidden="true"></canvas>

    <div class="sun-layer" aria-hidden="true">
      <span class="sun-core"></span>
      <span class="sun-halo"></span>
    </div>

    <div class="cloud-layer" aria-hidden="true">
      <span class="fair-cloud cloud-a"></span>
      <span class="fair-cloud cloud-b"></span>
      <span class="dark-cloud cloud-c"></span>
      <span class="dark-cloud cloud-d"></span>
    </div>

    <div class="severe-layer" aria-hidden="true">
      <span class="storm-ring ring-a"></span>
      <span class="storm-ring ring-b"></span>
      <span class="storm-flash"></span>
    </div>
    <div class="weather-fog" aria-hidden="true"></div>

    <div class="header-nav">
      <el-button circle :icon="ArrowLeft" class="back-btn" @click="goBack" aria-label="返回地图" />
      <span class="page-title">
        {{ currentLocation?.name || '地点详情' }} · {{ currentLocation?.weatherText || '天气加载中' }}
      </span>
      <el-button class="compose-btn" @click="goCompose">记录心声</el-button>
    </div>

    <div class="scatter-container" :class="{ blurred: !!selectedPost }">
      <div v-if="isLoadingPosts" class="state-card">正在加载帖子...</div>
      <div v-else-if="posts.length === 0" class="state-card">这里还没有留言，发一条成为第一位吧。</div>

      <transition :name="slideDirection">
        <div v-if="posts.length > 0" class="bubbles-layer" :key="currentPage">
          <article
            v-for="(post, index) in posts"
            :key="post.id"
            class="post-bubble"
            :class="bubbleClassByIndex(index)"
            :style="bubbleStyleByIndex(index)"
            role="button"
            tabindex="0"
            @click="openPost(post, $event)"
            @keydown.enter.prevent="openPost(post, $event)"
            @keydown.space.prevent="openPost(post, $event)"
          >
            <span class="bubble-tag" :style="{ backgroundColor: post.emotionTagColor || '#6AA6FF' }">
              {{ post.emotionTagName || '心情' }}
            </span>
            <p class="bubble-content">{{ post.content }}</p>
            <time class="bubble-time">
              编辑于{{ formatPostTime(post.updateTime || post.createTime) }}
            </time>
            <button
              type="button"
              class="bubble-like-btn"
              :class="{ liked: !!post.liked }"
              :disabled="isPostLiking(post.id)"
              @click.stop="likeInBubble(post, $event)"
              aria-label="点赞"
            >
              <span class="bubble-heart" aria-hidden="true">❤</span>
              <span class="bubble-like-count">{{ post.likeCount ?? 0 }}</span>
            </button>
          </article>
        </div>
      </transition>
      
      <div v-if="totalPosts > 10" class="pagination-controls">
        <el-button 
          :disabled="currentPage === 1" 
          @click="prevPage" 
          round
        >
          上一页
        </el-button>
        <span class="page-indicator">{{ currentPage }} / {{ Math.ceil(totalPosts / 10) }}</span>
        <el-button 
          :disabled="currentPage * 10 >= totalPosts" 
          @click="nextPage" 
          round
        >
          下一页
        </el-button>
      </div>
    </div>

    <transition name="veil-fade">
      <div v-if="selectedPost" class="detail-veil" @click.self="closePost">
        <article
          ref="detailCardRef"
          class="detail-card"
          :class="{ 'shared-animating': isSharedAnimating }"
          :style="sharedCardStyle"
        >
          <button type="button" class="detail-close" @click="closePost" aria-label="关闭详情">
            <el-icon><CloseBold /></el-icon>
          </button>

          <header class="detail-header">
            <div class="publisher-info">
              <el-avatar :size="36" :src="selectedPost.avatar" class="publisher-avatar">
                <el-icon v-if="!selectedPost.avatar"><UserFilled /></el-icon>
              </el-avatar>
              <span class="publisher-nickname">{{ selectedPost.nickname || '心晴用户' }}</span>
            </div>
            <span class="detail-tag" :style="{ backgroundColor: selectedPost.emotionTagColor || '#6AA6FF' }">
              {{ selectedPost.emotionTagName || '心情' }}
            </span>
          </header>

          <p class="detail-content">{{ selectedPost.content }}</p>

          <div v-if="selectedPost.imageUrls?.length" class="detail-images" :class="{ single: selectedPost.imageUrls.length === 1 }">
            <img
              v-for="(url, idx) in selectedPost.imageUrls"
              :key="url + idx"
              :src="url"
              alt="帖子配图"
              loading="lazy"
            />
          </div>

          <footer class="detail-actions">
            <time class="detail-time">
              编辑于{{ formatPostTime(selectedPost.updateTime || selectedPost.createTime) }}
            </time>

            <button
              type="button"
              class="detail-like-btn"
              :class="{ liked: selectedPost?.liked }"
              :disabled="isLiking"
              @click="likeSelected"
              aria-label="点赞"
            >
              <span class="heart-icon" aria-hidden="true">❤</span>
              <span>{{ selectedLikeCount }}</span>
            </button>
          </footer>
        </article>
      </div>
    </transition>
  </main>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, CloseBold, UserFilled } from '@element-plus/icons-vue'
import { fetchLocationList } from '@/api/location'
import { fetchPostDetail, fetchPostList, togglePostLike } from '@/api/post'
import type { Location, PostItem } from '@/types/models'

type Particle = {
  x: number
  y: number
  speedY: number
  alpha: number
  // Rain
  len?: number
  thickness?: number
  wind?: number
  // Snow
  radius?: number
  phase?: number
  swing?: number
}

type WeatherCode = 'clear_sky' | 'sunny' | 'cloudy' | 'overcast' | 'light_rain' | 'heavy_rain' | 'thunderstorm' | 'snow'

const route = useRoute()
const router = useRouter()

const spotId = computed(() => Number(route.params.spotId))
const currentLocation = ref<Location | null>(null)
const posts = ref<PostItem[]>([])
const isLoadingPosts = ref(false)
const currentPage = ref(1)
const totalPosts = ref(0)
const slideDirection = ref('slide-left')
const selectedPost = ref<PostItem | null>(null)
const isLiking = ref(false)
const likingPostIds = ref<number[]>([])
const detailCardRef = ref<HTMLElement | null>(null)
const isSharedAnimating = ref(false)
const sharedCardStyle = ref<Record<string, string>>({})
const lastBubbleRect = ref<DOMRect | null>(null)
const postDetailCache = ref<Record<number, PostItem>>({})

const weatherCanvas = ref<HTMLCanvasElement | null>(null)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let rafId = 0
let resizeTimer = 0
let cardAnimation: Animation | null = null
let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let lightning = 0

const ENTER_DURATION = 320
const EXIT_DURATION = 200
const ENTER_EASING = 'cubic-bezier(0.25, 1, 0.5, 1)'
const EXIT_EASING = 'ease-in'

const activeWeatherCode = computed<WeatherCode>(() => {
  const code = currentLocation.value?.weatherCode as WeatherCode
  const validCodes: WeatherCode[] = [
    'clear_sky', 'sunny', 'cloudy', 'overcast',
    'light_rain', 'heavy_rain', 'thunderstorm', 'snow'
  ]
  return validCodes.includes(code) ? code : 'sunny'
})

const weatherThemeClass = computed(() => `weather-${activeWeatherCode.value}`)

const needsCanvas = computed(() => {
  return ['light_rain', 'heavy_rain', 'thunderstorm', 'snow'].includes(activeWeatherCode.value)
})

const isThunderstorm = computed(() => activeWeatherCode.value === 'thunderstorm')
const particleType = computed(() => activeWeatherCode.value === 'snow' ? 'snow' : 'rain')


const formatPostTime = (timeStr: string | undefined) => {
  if (!timeStr) return ''
  try {
    const date = new Date(timeStr)
    if (isNaN(date.getTime())) return timeStr
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
  } catch {
    return timeStr
  }
}

const selectedLikeCount = computed(() => {
  if (!selectedPost.value) return 0
  return selectedPost.value.likeCount ?? 0
})

const goBack = () => {
  router.push('/')
}

const goCompose = () => {
  if (!Number.isFinite(spotId.value)) {
    router.push('/compose')
    return
  }

  router.push({
    path: '/compose',
    query: {
      spotId: String(spotId.value),
      from: 'spot-detail',
    },
  })
}

const cancelCardAnimation = () => {
  if (!cardAnimation) return
  cardAnimation.cancel()
  cardAnimation = null
}

const resetSharedCardState = () => {
  sharedCardStyle.value = {}
  isSharedAnimating.value = false
}

const runCardAnimation = async (
  card: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
) => {
  cancelCardAnimation()
  cardAnimation = card.animate(keyframes, {
    fill: 'forwards',
    ...options,
  })

  try {
    await cardAnimation.finished
  } catch {
    // Ignore aborted animation errors.
  }

  cardAnimation = null
}

const loadPostDetailById = async (postId: number) => {
  const cached = postDetailCache.value[postId]
  if (cached) {
    if (selectedPost.value?.id === postId) {
      selectedPost.value = cached
    }
    return
  }

  try {
    const detail = await fetchPostDetail(postId)
    postDetailCache.value[postId] = detail
    if (selectedPost.value?.id === postId) {
      selectedPost.value = detail
    }
  } catch (error) {
    console.warn('Failed to load post detail by id', error)
  }
}

const openPost = async (post: PostItem, event: MouseEvent | KeyboardEvent) => {
  const target = event.currentTarget as HTMLElement | null
  lastBubbleRect.value = target?.getBoundingClientRect() || null

  selectedPost.value = postDetailCache.value[post.id] || post
  void loadPostDetailById(post.id)

  if (reducedMotion || !lastBubbleRect.value) {
    resetSharedCardState()
    return
  }

  await nextTick()
  const card = detailCardRef.value
  if (!card) return

  const from = lastBubbleRect.value
  const to = card.getBoundingClientRect()
  const dx = from.left - to.left
  const dy = from.top - to.top
  const sx = Math.max(0.22, from.width / to.width)
  const sy = Math.max(0.2, from.height / to.height)

  isSharedAnimating.value = true
  sharedCardStyle.value = {
    transformOrigin: 'top left',
  }

  await runCardAnimation(
    card,
    [
      {
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        opacity: 0,
      },
      {
        transform: 'translate(0px, 0px) scale(1, 1)',
        opacity: 1,
      },
    ],
    {
      duration: ENTER_DURATION,
      easing: ENTER_EASING,
    },
  )

  resetSharedCardState()
}

const closePost = async () => {
  const card = detailCardRef.value
  const target = lastBubbleRect.value

  if (reducedMotion || !card || !target) {
    selectedPost.value = null
    resetSharedCardState()
    return
  }

  const from = card.getBoundingClientRect()
  const dx = target.left - from.left
  const dy = target.top - from.top
  const sx = Math.max(0.22, target.width / from.width)
  const sy = Math.max(0.2, target.height / from.height)

  isSharedAnimating.value = true
  sharedCardStyle.value = {
    transformOrigin: 'top left',
  }

  await runCardAnimation(
    card,
    [
      {
        transform: 'translate(0px, 0px) scale(1, 1)',
        opacity: 1,
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        opacity: 0,
      },
    ],
    {
      duration: EXIT_DURATION,
      easing: EXIT_EASING,
    },
  )

  selectedPost.value = null
  resetSharedCardState()
}

const applyLikeResult = (postId: number, likeCount: number, liked: boolean) => {
  posts.value = posts.value.map((post) => {
    if (post.id !== postId) return post
    return {
      ...post,
      likeCount,
      liked,
    }
  })

  const cached = postDetailCache.value[postId]
  if (cached) {
    postDetailCache.value[postId] = {
      ...cached,
      likeCount,
      liked,
    }
  }

  if (selectedPost.value?.id === postId) {
    selectedPost.value = {
      ...selectedPost.value,
      likeCount,
      liked,
    }
  }
}

const likeSelected = async () => {
  if (!selectedPost.value || isLiking.value) return

  isLiking.value = true
  try {
    const result = await togglePostLike(selectedPost.value.id)
    applyLikeResult(result.postId, result.likeCount, result.liked)
  } catch (error: any) {
    const status = error?.response?.status
    if (status === 401) {
      ElMessage.warning('请先登录后再点赞')
      return
    }
    ElMessage.error('点赞失败，请稍后重试')
    console.error('Failed to like post', error)
  } finally {
    isLiking.value = false
  }
}

const isPostLiking = (postId: number) => likingPostIds.value.includes(postId)

const likeInBubble = async (post: PostItem, event: MouseEvent) => {
  event.stopPropagation()
  if (isPostLiking(post.id)) return

  likingPostIds.value = [...likingPostIds.value, post.id]
  try {
    const result = await togglePostLike(post.id)
    applyLikeResult(result.postId, result.likeCount, result.liked)
  } catch (error: any) {
    const status = error?.response?.status
    if (status === 401) {
      ElMessage.warning('请先登录后再点赞')
      return
    }
    ElMessage.error('点赞失败，请稍后重试')
    console.error('Failed to like bubble post', error)
  } finally {
    likingPostIds.value = likingPostIds.value.filter((id) => id !== post.id)
  }
}

const bubbleStyleByIndex = (index: number) => {
  // 妙招 1: 提供足够多的预设点位(大于等于 pageSize 10)，彻底消灭百分百同位置覆盖
  // 并采用左右错落的黄金分布规律
  const presets = [
    { top: '14%', left: '4%' },
    { top: '18%', left: '56%' },
    { top: '34%', left: '14%' },
    { top: '38%', left: '62%' },
    { top: '50%', left: '6%' },
    { top: '56%', left: '52%' },
    { top: '70%', left: '20%' },
    { top: '74%', left: '58%' },
    { top: '86%', left: '10%' },
    { top: '86%', left: '60%' },
  ]

  const value = presets[index % presets.length] ?? { top: '26%', left: '10%' }
  return {
    top: value.top,
    left: value.left,
    // 注入随机偏移量给 CSS 计算使用
    '--tx': `${Math.sin(index * 13) * 12}px`,
    '--ty': `${Math.cos(index * 17) * 12}px`,
  }
}

const bubbleClassByIndex = (index: number) => {
  const classes = ['bubble-a', 'bubble-b', 'bubble-c']
  return classes[index % classes.length]
}

const createParticles = (width: number, height: number) => {
  const code = activeWeatherCode.value
  const type = particleType.value
  
  let density = reducedMotion ? 0.00003 : width < 768 ? 0.0001 : 0.00015
  if (code === 'light_rain') density *= 0.5
  if (code === 'heavy_rain' || code === 'thunderstorm') density *= 1.8
  if (code === 'snow') density *= 0.4

  const count = Math.min(type === 'snow' ? 120 : 350, Math.max(50, Math.floor(width * height * density)))

  particles = Array.from({ length: count }).map(() => {
    const x = Math.random() * width
    const y = Math.random() * height
    const alpha = 0.2 + Math.random() * 0.3

    if (type === 'snow') {
      return {
        x, y, alpha, 
        speedY: 1 + Math.random() * 2, 
        radius: 1.5 + Math.random() * 2, 
        phase: Math.random() * Math.PI * 2, 
        swing: 0.5 + Math.random() * 1.5
      }
    } else {
      const isHeavy = code === 'heavy_rain' || code === 'thunderstorm'
      const isLight = code === 'light_rain'
      const speedY = isLight ? 6 + Math.random() * 4 : isHeavy ? 14 + Math.random() * 10 : 10 + Math.random() * 8
      const len = isLight ? 8 + Math.random() * 10 : isHeavy ? 20 + Math.random() * 20 : 16 + Math.random() * 18
      const thickness = isLight ? 0.8 : isHeavy ? 1.5 + Math.random() * 1 : 1.2 + Math.random() * 1
      const wind = isLight ? -1 : isHeavy ? -4 : -2.8
      return { x, y, alpha, speedY, len, thickness, wind }
    }
  })
}

const resizeCanvas = () => {
  const canvas = weatherCanvas.value
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

  createParticles(width, height)
}

const drawWeatherFrame = () => {
  if (!ctx || !needsCanvas.value) return

  const width = window.innerWidth
  const height = window.innerHeight
  const type = particleType.value

  ctx.clearRect(0, 0, width, height)

  for (const p of particles) {
    ctx.beginPath()

    if (type === 'snow') {
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`
      ctx.arc(p.x, p.y, p.radius || 2, 0, Math.PI * 2)
      ctx.fill()
      
      p.y += p.speedY
      p.x += Math.sin(p.y / 30 + (p.phase || 0)) * (p.swing || 1)
    } else {
      const w = p.wind || -2.8
      ctx.lineWidth = p.thickness || 1.2
      ctx.lineCap = 'round'
      ctx.strokeStyle = activeWeatherCode.value === 'light_rain' ? `rgba(224, 235, 255, ${p.alpha})` : `rgba(204, 224, 255, ${p.alpha})`
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x + w, p.y + (p.len || 16))
      ctx.stroke()
      
      p.y += p.speedY
      p.x += w * 0.06
    }

    if (p.y > height + 20 || p.x < -20 || p.x > width + 20) {
      p.y = -20 - Math.random() * 120
      p.x = Math.random() * (width + 100)
    }
  }

  if (isThunderstorm.value && !reducedMotion && Math.random() < 0.003) {
    lightning = 0.08 + Math.random() * 0.06
  }
  if (lightning > 0.001) {
    ctx.fillStyle = `rgba(220, 235, 255, ${lightning})`
    ctx.fillRect(0, 0, width, height)
    lightning *= 0.88
  }

  rafId = window.requestAnimationFrame(drawWeatherFrame)
}

const stopWeather = () => {
  if (rafId) {
    window.cancelAnimationFrame(rafId)
    rafId = 0
  }
  if (ctx) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
  }
}

const startWeather = async () => {
  if (!needsCanvas.value) return
  await nextTick()
  resizeCanvas()
  stopWeather()
  rafId = window.requestAnimationFrame(drawWeatherFrame)
}

const handleResize = () => {
  window.clearTimeout(resizeTimer)
  resizeTimer = window.setTimeout(() => {
    resizeCanvas()
  }, 120)
}

const loadLocation = async () => {
  const locations = await fetchLocationList()
  currentLocation.value = locations.find((item) => item.id === spotId.value) ?? null
}

const loadPosts = async (pageArg?: number) => {
  const targetPage = pageArg ?? currentPage.value
  if (posts.value.length === 0) {
    isLoadingPosts.value = true
  }
  try {
    const result = await fetchPostList({
      locationId: spotId.value,
      pageNum: targetPage,
      pageSize: 10,
    })
    posts.value = result.records
    totalPosts.value = result.total
    currentPage.value = targetPage
  } finally {
    isLoadingPosts.value = false
  }
}

const nextPage = () => {
  if (currentPage.value * 10 < totalPosts.value) {
    slideDirection.value = 'slide-left'
    loadPosts(currentPage.value + 1)
  }
}

const prevPage = () => {
  if (currentPage.value > 1) {
    slideDirection.value = 'slide-right'
    loadPosts(currentPage.value - 1)
  }
}

onMounted(async () => {
  await Promise.all([loadLocation(), loadPosts()])

  if (needsCanvas.value) {
    await startWeather()
  }

  window.addEventListener('resize', handleResize)
})

watch(needsCanvas, async (needed) => {
  if (needed) {
    await startWeather()
  } else {
    stopWeather()
  }
})

onBeforeUnmount(() => {
  stopWeather()
  window.removeEventListener('resize', handleResize)
  window.clearTimeout(resizeTimer)
  cancelCardAnimation()
})
</script>

<style scoped>
/* CSS Var transitions */
.scatter-page {
  transition: background 0.8s ease;
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: radial-gradient(130% 100% at 50% 8%, #d7e5f4 0%, #98aec8 48%, #50657d 100%);
}

.scatter-page.weather-clear_sky {
  background: radial-gradient(130% 110% at 50% 0%, #fffbf0 0%, #ffeaa7 40%, #fdc830 100%);
}
.scatter-page.weather-sunny {
  background: radial-gradient(130% 110% at 50% 0%, #fff2b8 0%, #ffc971 45%, #e4a95a 100%);
}
.scatter-page.weather-cloudy {
  background: radial-gradient(130% 100% at 50% 8%, #eef2f3 0%, #bdc3c7 48%, #8e9eab 100%);
}
.scatter-page.weather-overcast {
  background: radial-gradient(130% 120% at 50% 0%, #8ca1a5 0%, #5d6d7e 42%, #34495e 100%);
}
.scatter-page.weather-light_rain, .scatter-page.weather-heavy_rain {
  background: radial-gradient(130% 120% at 50% 0%, #9fb3c9 0%, #5c7289 42%, #2f3f52 100%);
}
.scatter-page.weather-thunderstorm {
  background: radial-gradient(130% 120% at 50% 0%, #6b7685 0%, #3d4958 42%, #202a37 100%);
}
.scatter-page.weather-snow {
  background: radial-gradient(130% 110% at 50% 0%, #f1f2b5 0%, #e0eafc 45%, #cfdef3 100%);
}

.weather-canvas {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 0;
  transition: opacity 280ms ease;
}

.scatter-page.weather-light_rain .weather-canvas,
.scatter-page.weather-heavy_rain .weather-canvas,
.scatter-page.weather-thunderstorm .weather-canvas,
.scatter-page.weather-snow .weather-canvas {
  opacity: 1;
}

/* Layers */
.sun-layer,
.cloud-layer,
.severe-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0;
  transition: opacity 600ms ease;
}

.scatter-page.weather-clear_sky .sun-layer,
.scatter-page.weather-sunny .sun-layer { opacity: 1; }

.scatter-page.weather-sunny .cloud-layer,
.scatter-page.weather-cloudy .cloud-layer { opacity: 1; }

/* Override logic to show different clouds */
.scatter-page.weather-sunny .dark-cloud { display: none; }
.scatter-page.weather-cloudy .dark-cloud { opacity: 0.3; }
.scatter-page.weather-overcast .cloud-layer { opacity: 1; }
.scatter-page.weather-overcast .fair-cloud { opacity: 0; }
.scatter-page.weather-overcast .dark-cloud { opacity: 0.8; }
.scatter-page.weather-light_rain .cloud-layer { opacity: 1; }
.scatter-page.weather-light_rain .fair-cloud { display: none; }
.scatter-page.weather-light_rain .dark-cloud { opacity: 0.9; }
.scatter-page.weather-heavy_rain .cloud-layer,
.scatter-page.weather-thunderstorm .cloud-layer,
.scatter-page.weather-snow .cloud-layer { opacity: 1; }
.scatter-page.weather-heavy_rain .fair-cloud,
.scatter-page.weather-thunderstorm .fair-cloud,
.scatter-page.weather-snow .fair-cloud { display: none; }
.scatter-page.weather-heavy_rain .dark-cloud,
.scatter-page.weather-thunderstorm .dark-cloud { opacity: 1; }
.scatter-page.weather-snow .dark-cloud { opacity: 0.3; }

.scatter-page.weather-thunderstorm .severe-layer { opacity: 1; }

/* Elements */
.sun-core {
  position: absolute;
  top: 10%;
  right: 12%;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,244,181,0.95) 0%, rgba(255,214,126,0.85) 65%, rgba(255,214,126,0) 100%);
  animation: sunny-breathe 4.2s ease-in-out infinite;
}
.scatter-page.weather-clear_sky .sun-core {
  background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,230,150,0.85) 55%, transparent 100%);
  transform: scale(1.2);
}

.sun-halo {
  position: absolute;
  top: 4%;
  right: 6%;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,236,165,0.4) 0%, rgba(255,236,165,0) 72%);
  animation: halo-drift 6s ease-in-out infinite;
}
.scatter-page.weather-clear_sky .sun-halo {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(255,250,200,0.6) 0%, transparent 60%);
}

.fair-cloud, .dark-cloud {
  position: absolute;
  width: 260px;
  height: 70px;
  border-radius: 999px;
  filter: blur(1px);
}
.fair-cloud { background: linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0.1)); }
.dark-cloud { background: linear-gradient(180deg, rgba(90,105,120,0.7), rgba(40,50,60,0.3)); }

.cloud-a { top: 18%; left: -10%; animation: cloud-move-a 20s linear infinite; }
.cloud-b { top: 30%; left: -15%; opacity: 0.8; animation: cloud-move-b 28s linear infinite; }
.cloud-c { top: 12%; left: -20%; animation: cloud-move-b 25s linear infinite reverse; }
.cloud-d { top: -2%; right: -10%; animation: cloud-move-a 22s linear infinite reverse; }


.storm-ring {
  position: absolute;
  width: 44vw;
  height: 44vw;
  max-width: 460px;
  max-height: 460px;
  border-radius: 50%;
  border: 1px solid rgba(199, 219, 255, 0.18);
  filter: blur(0.2px);
}

.ring-a { top: -8%; right: -8%; animation: storm-spin-a 13s linear infinite; }
.ring-b { top: -4%; right: -2%; border-color: rgba(168, 192, 232, 0.12); animation: storm-spin-b 9s linear infinite reverse; }

.storm-flash {
  position: absolute;
  inset: 0;
  background: radial-gradient(80% 45% at 75% 10%, rgba(214, 229, 255, 0.12), rgba(214, 229, 255, 0));
  animation: storm-flash 2.4s ease-in-out infinite;
}

.weather-fog {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(100% 70% at 50% 15%, rgba(233, 242, 250, 0.12) 0%, rgba(233, 242, 250, 0) 70%), linear-gradient(to bottom, rgba(14, 23, 37, 0.04), rgba(14, 23, 37, 0.14));
  backdrop-filter: blur(1px);
}

.scatter-page.weather-sunny .weather-fog {
  background: radial-gradient(100% 70% at 50% 15%, rgba(255, 248, 214, 0.18) 0%, rgba(255, 248, 214, 0) 70%), linear-gradient(to bottom, rgba(124, 90, 25, 0.04), rgba(124, 90, 25, 0.12));
}

.scatter-page.weather-clear_sky .weather-fog {
  background: radial-gradient(100% 70% at 50% 10%, rgba(255, 253, 238, 0.4) 0%, rgba(255, 253, 238, 0) 50%), linear-gradient(to bottom, rgba(200, 160, 50, 0.02), rgba(200, 160, 50, 0.08));
}

.scatter-page.weather-thunderstorm .weather-fog,
.scatter-page.weather-heavy_rain .weather-fog,
.scatter-page.weather-overcast .weather-fog {
  background: radial-gradient(100% 70% at 50% 10%, rgba(205, 220, 245, 0.12) 0%, rgba(205, 220, 245, 0) 70%), linear-gradient(to bottom, rgba(12, 19, 31, 0.1), rgba(12, 19, 31, 0.28));
}

.scatter-page.weather-snow .weather-fog {
  background: radial-gradient(100% 70% at 50% 20%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 70%), linear-gradient(to bottom, rgba(150, 170, 190, 0.05), rgba(150, 170, 190, 0.15));
}

@keyframes sunny-breathe {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.9;
  }
  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}

@keyframes halo-drift {
  0%,
  100% {
    transform: translate(0, 0);
  }
  50% {
    transform: translate(-8px, 6px);
  }
}

@keyframes cloud-move-a {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(122vw);
  }
}

@keyframes cloud-move-b {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(132vw);
  }
}

@keyframes storm-spin-a {
  0% {
    transform: rotate(0deg);
    opacity: 0.28;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    transform: rotate(360deg);
    opacity: 0.28;
  }
}

@keyframes storm-spin-b {
  0% {
    transform: rotate(0deg) scale(0.94);
    opacity: 0.2;
  }
  50% {
    opacity: 0.44;
  }
  100% {
    transform: rotate(360deg) scale(1.04);
    opacity: 0.2;
  }
}

@keyframes storm-flash {
  0%,
  100% {
    opacity: 0.08;
  }
  46% {
    opacity: 0.12;
  }
  50% {
    opacity: 0.34;
  }
  56% {
    opacity: 0.1;
  }
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
  z-index: 12;
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

.compose-btn {
  margin-left: auto;
  pointer-events: auto;
  border: 1px solid rgba(255, 255, 255, 0.44);
  background: rgba(240, 248, 255, 0.18);
  color: #f2f8ff;
  box-shadow: 0 10px 24px rgba(15, 29, 47, 0.2);
  backdrop-filter: blur(8px);
}

.compose-btn:hover {
  background: rgba(240, 248, 255, 0.28);
  color: #ffffff;
}

.scatter-container {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 6;
  transition: filter 300ms cubic-bezier(0.25, 1, 0.5, 1), transform 300ms cubic-bezier(0.25, 1, 0.5, 1);
}

.scatter-container.blurred {
  filter: blur(4px) brightness(0.85);
  transform: scale(0.985);
}

.pagination-controls {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  padding: 8px 24px;
  border-radius: 30px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.page-indicator {
  font-size: 14px;
  font-weight: 500;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.bubbles-layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  will-change: transform, opacity;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.65s cubic-bezier(0.25, 1, 0.3, 1), opacity 0.65s cubic-bezier(0.25, 1, 0.3, 1);
}

.slide-left-enter-from {
  transform: translateX(40px) scale(0.96);
  opacity: 0;
}
.slide-left-leave-to {
  transform: translateX(-40px) scale(0.96);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-40px) scale(0.96);
  opacity: 0;
}
.slide-right-leave-to {
  transform: translateX(40px) scale(0.96);
  opacity: 0;
}

.state-card {
  position: absolute;
  left: 50%;
  top: 54%;
  transform: translate(-50%, -50%);
  padding: 12px 16px;
  border-radius: 12px;
  color: #e9f2fb;
  background: rgba(21, 33, 51, 0.5);
  border: 1px solid rgba(216, 231, 247, 0.25);
}

.post-bubble {
  position: absolute;
  width: min(280px, 40vw);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 18px;
  background: rgba(247, 252, 255, 0.74);
  box-shadow: 0 12px 28px rgba(13, 23, 39, 0.24);
  color: #2d4258;
  backdrop-filter: blur(9px);
  text-align: left;
  padding: 12px 14px 44px;
  cursor: pointer;
  z-index: 5;
  transition: transform 220ms ease, box-shadow 220ms ease, z-index 0ms;
}

.post-bubble:hover {
  z-index: 50; /* 妙招 3：hover 时将层级提到最高，即使有交叠遮挡，也能看清被压在下面的卡片 */
  box-shadow: 0 16px 30px rgba(9, 19, 34, 0.3);
}

.bubble-a {
  transform: translate(var(--tx, 0), var(--ty, 0)) rotate(-2deg);
}
.bubble-a:hover {
  transform: translate(var(--tx, 0), calc(var(--ty, 0) - 4px)) rotate(-2deg) scale(1.02);
}

.bubble-b {
  transform: translate(var(--tx, 0), var(--ty, 0)) rotate(1.2deg);
}
.bubble-b:hover {
  transform: translate(var(--tx, 0), calc(var(--ty, 0) - 4px)) rotate(1.2deg) scale(1.02);
}

.bubble-c {
  transform: translate(var(--tx, 0), var(--ty, 0)) rotate(-0.6deg);
}
.bubble-c:hover {
  transform: translate(var(--tx, 0), calc(var(--ty, 0) - 4px)) rotate(-0.6deg) scale(1.02);
}

.bubble-tag {
  display: inline-block;
  color: #fff;
  font-size: 12px;
  line-height: 1;
  padding: 5px 9px;
  border-radius: 999px;
  margin-bottom: 8px;
}

.bubble-content {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.bubble-time {
  position: absolute;
  left: 14px;
  bottom: 12px;
  color: rgba(45, 66, 88, 0.62);
  font-size: 11px;
  line-height: 1;
  letter-spacing: 0.2px;
}

.bubble-like-btn {
  position: absolute;
  right: 12px;
  bottom: 10px;
  border: none;
  background: rgba(255, 240, 244, 0.78);
  color: #c43b62;
  border-radius: 999px;
  min-height: 26px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(188, 75, 109, 0.08);
  transition: transform 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
}

.bubble-like-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 230, 236, 0.98);
  box-shadow: 0 4px 10px rgba(188, 75, 109, 0.12);
}

.bubble-like-btn:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.bubble-like-btn.liked {
  background: rgba(255, 221, 230, 0.96);
  border-color: rgba(224, 81, 118, 0.52);
  color: #b82e55;
}

.bubble-heart {
  font-size: 13px;
  line-height: 1;
}

.bubble-like-count {
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
}

.detail-veil {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(3, 10, 20, 0.48);
  display: grid;
  place-items: center;
  padding: 72px 16px 20px;
}

.detail-card {
  position: relative;
  width: min(680px, 100%);
  max-height: min(78vh, 820px);
  overflow: auto;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  background: rgba(247, 252, 255, 0.9);
  backdrop-filter: blur(12px);
  box-shadow: 0 26px 46px rgba(7, 16, 30, 0.34);
  padding: 20px;
  transform-origin: top left;
  will-change: transform, opacity;
  transition: box-shadow 240ms ease;
}

.detail-card.shared-animating {
  pointer-events: none;
}

.detail-close {
  position: absolute;
  right: 12px;
  top: 12px;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  color: #2c4763;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  outline: none;
  transition: all 0.2s;
}

.detail-close:hover {
  background: rgba(218, 232, 248, 0.4);
  transform: rotate(90deg);
}

.detail-close:focus {
  outline: none;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-right: 36px;
}

.publisher-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.publisher-avatar {
  background-color: #f0f4f8;
  color: #7189a1;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 2px 6px rgba(11, 23, 39, 0.08);
}

.publisher-nickname {
  font-size: 15px;
  font-weight: 500;
  color: #24374a;
}

.detail-tag {
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  padding: 6px 12px;
  border-radius: 999px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.detail-content {
  margin: 0;
  color: #24374a;
  font-size: 16px;
  line-height: 1.75;
  white-space: pre-wrap;
}

.detail-images {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.detail-images.single {
  grid-template-columns: 1fr;
}

.detail-images img {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid rgba(113, 137, 161, 0.26);
}

.detail-actions {
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-time {
  color: #7a8f9c;
  font-size: 13px;
  line-height: 1;
  letter-spacing: 0.2px;
}

.detail-like-btn {
  border: none;
  background: transparent;
  color: #24405c;
  border-radius: 999px;
  height: 32px;
  padding: 0 2px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  transition: transform 180ms ease, color 180ms ease, opacity 180ms ease;
}

.detail-like-btn:hover {
  transform: translateY(-1px);
}

.detail-like-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.detail-like-btn.liked {
  color: #b73557;
}

.heart-icon {
  font-size: 16px;
  line-height: 1;
}

.veil-fade-enter-active,
.veil-fade-leave-active {
  transition: opacity 280ms cubic-bezier(0.22, 1, 0.36, 1);
}

.veil-fade-enter-from,
.veil-fade-leave-to {
  opacity: 0;
}

@media (max-width: 767px) {
  .page-title {
    font-size: 16px;
    max-width: 44vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .compose-btn {
    padding: 0 12px;
    height: 34px;
    border-radius: 999px;
    font-size: 13px;
  }

  .post-bubble {
    width: min(260px, 66vw);
  }

  .detail-veil {
    padding: 80px 12px 14px;
  }

  .detail-card {
    max-height: min(80dvh, 900px);
    padding: 16px;
  }

  .detail-content {
    font-size: 15px;
  }

  .detail-images {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .post-bubble,
  .scatter-container,
  .action-btn {
    transition: none;
  }

  .sunny-layer *,
  .severe-layer * {
    animation: none !important;
  }
}
</style>
