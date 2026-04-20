<template>
  <main class="scatter-page" :class="weatherThemeClass">
    <!-- @vue-ignore -->
    <WeatherCanvas v-if="needsCanvas" :weather="canvasWeather" :config="canvasConfig" />
    <CloudOverlay :active="needsCloud" :type="activeWeatherCode" />

    <div class="header-nav">
      <el-button circle :icon="ArrowLeft" class="back-btn" @click="goBack" aria-label="返回地图" />
      <span class="page-title">
        {{ currentLocation?.name || '地点详情' }} · {{ currentLocation?.weatherText || '天气加载中' }}
      </span>
      <el-button class="compose-btn" @click="goCompose">记录心声</el-button>
    </div>

    <div class="scatter-container" :class="{ blurred: !!selectedPost }">
      <article v-if="isLoadingPosts" class="post-bubble empty-bubble">
        <span class="bubble-tag" style="background-color: #6AA6FF">加载中</span>
        <p class="bubble-content">正在加载帖子...</p>
      </article>
      <article v-else-if="posts.length === 0" class="post-bubble empty-bubble">
        <span class="bubble-tag" style="background-color: #6AA6FF">提示</span>
        <p class="bubble-content">这里还没有留言，发一条成为第一位吧。</p>
      </article>

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
              <span class="bubble-heart" aria-hidden="true">{{ post.liked ? '❤' : '♡' }}</span>
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
          <el-icon><ArrowLeft /></el-icon> 上一页
        </el-button>
        <span class="page-indicator">{{ currentPage }} / {{ Math.ceil(totalPosts / 10) }}</span>
        <el-button 
          :disabled="currentPage * 10 >= totalPosts" 
          @click="nextPage" 
          round
        >
          下一页 <el-icon><ArrowRight /></el-icon>
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
              <span class="heart-icon" aria-hidden="true">{{ selectedPost?.liked ? '❤' : '♡' }}</span>
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
import { ArrowLeft, ArrowRight, CloseBold, UserFilled } from '@element-plus/icons-vue'
import { fetchLocationList } from '@/api/location'
import { fetchPostDetail, fetchPostList, togglePostLike } from '@/api/post'
import type { Location, PostItem } from '@/types/models'
import CloudOverlay from '@/components/weather/CloudOverlay.vue'
import WeatherCanvas from '@/components/weather/WeatherCanvas.vue'
import { useWeatherAudio } from '@/composables/useWeatherAudio'

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

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let resizeTimer = 0
let cardAnimation: Animation | null = null

const { initAudio, triggerThunder, resumeAudio, setWeather, setConfig } = useWeatherAudio()
const unlockAudioOnFirstGesture = () => {
  void resumeAudio()
}

const ENTER_DURATION = 320
const EXIT_DURATION = 200
const ENTER_EASING = 'cubic-bezier(0.25, 1, 0.5, 1)'
const EXIT_EASING = 'ease-in'

const canvasWeather = computed(() => {
  switch (activeWeatherCode.value) {
    case 'light_rain':
    case 'heavy_rain':
    case 'thunderstorm':
      return 'rainy'
    case 'snow':
      return 'snowy'
    case 'cloudy':
    case 'overcast':
      return 'cloudy'
    default:
      return 'sunny'
  }
})

const canvasConfig = computed(() => {
  const code = activeWeatherCode.value
  const base = { speed: 1, wind: 0, intensity: 1, time: 12 }
  if (code === 'light_rain') {
    return { ...base, particleCount: 150 }
  } else if (code === 'heavy_rain') {
    return { ...base, particleCount: 400, speed: 1.5, wind: -0.1 }
  } else if (code === 'thunderstorm') {
    return { ...base, particleCount: 500, speed: 1.8, wind: -0.2, thunder: true }
  } else if (code === 'snow') {
    return { ...base, particleCount: 200, speed: 0.8 }
  } else if (code === 'clear_sky' || code === 'sunny') {
    return { ...base, particleCount: 0 }
  }
  return base
})

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
  return ['clear_sky', 'sunny', 'light_rain', 'heavy_rain', 'thunderstorm', 'snow'].includes(activeWeatherCode.value)
})

const needsCloud = computed(() => {
  return ['sunny', 'cloudy', 'overcast', 'light_rain', 'heavy_rain', 'thunderstorm', 'snow'].includes(activeWeatherCode.value)
})

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
        transform: 	`translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
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
        transform: 	`translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
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
  const presets = [
    { top: '10%', left: '4%' },
    { top: '14%', left: '56%' },
    { top: '28%', left: '14%' },
    { top: '30%', left: '60%' },
    { top: '44%', left: '6%' },
    { top: '48%', left: '52%' },
    { top: '62%', left: '20%' },
    { top: '60%', left: '56%' },
    { top: '78%', left: '10%' },
    { top: '78%', left: '60%' },
  ]

  const value = presets[index % presets.length] ?? { top: '26%', left: '10%' }
  return {
    top: value.top,
    left: value.left,
    '--tx': `${Math.sin(index * 13) * 12}px`,
    '--ty': `${Math.cos(index * 17) * 12}px`,
  }
}

const bubbleClassByIndex = (index: number) => {
  const classes = ['bubble-a', 'bubble-b', 'bubble-c']
  return classes[index % classes.length]
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

  if (currentLocation.value) {
    initAudio()
    setWeather(activeWeatherCode.value)
    setConfig(canvasConfig.value)
    void resumeAudio()
    if (activeWeatherCode.value === 'thunderstorm') {
      triggerThunder()
    }
  }

  window.addEventListener('pointerdown', unlockAudioOnFirstGesture, { once: true, passive: true })
  window.addEventListener('keydown', unlockAudioOnFirstGesture, { once: true })

  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      // Handle resize if needed for new components
    }, 120)
  })
})

watch(activeWeatherCode, (newCode) => {
  setWeather(newCode)
  setConfig(canvasConfig.value)
  if (newCode === 'thunderstorm') {
    triggerThunder()
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(resizeTimer)
  window.removeEventListener('pointerdown', unlockAudioOnFirstGesture)
  window.removeEventListener('keydown', unlockAudioOnFirstGesture)
  cancelCardAnimation()
})
</script>

<style scoped>
.scatter-page {
  transition: background 0.8s ease;
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: radial-gradient(130% 100% at 50% 8%, #d7e5f4 0%, #98aec8 48%, #50657d 100%);
}

.scatter-page.weather-clear_sky,
.scatter-page.weather-sunny,
.scatter-page.weather-cloudy {
  background: radial-gradient(130% 100% at 50% 100%, #87c3ef 0%, #4a90e2 50%, #2f69b8 100%);
}

.scatter-page.weather-overcast,
.scatter-page.weather-heavy_rain,
.scatter-page.weather-thunderstorm {
  background: radial-gradient(150% 100% at 50% 100%, #3e4650 0%, #2c343d 50%, #1a1f26 100%);
}

.scatter-page.weather-light_rain {
  background: radial-gradient(150% 100% at 50% 100%, #8c96a3 0%, #5a6470 50%, #3e4650 100%);
}

.scatter-page.weather-snow {
  background: radial-gradient(150% 100% at 50% 100%, #e1e6eb 0%, #bac4cd 50%, #909ba7 100%);
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
  background: transparent;
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
  padding: 6px 12px;
  border-radius: 20px;
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
  z-index: 50;
  box-shadow: 0 16px 30px rgba(9, 19, 34, 0.3);
}

.empty-bubble {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) !important;
  width: min(320px, 80vw);
  z-index: 60;
  pointer-events: auto;
  cursor: default;
}

.empty-bubble:hover {
  transform: translate(-50%, -50%) scale(1.02) !important;
  z-index: 60;
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
  opacity: 1;
}

.bubble-like-btn.liked {
  background: rgba(255, 221, 230, 0.96);
  border-color: rgba(224, 81, 118, 0.52);
  color: #b82e55;
  animation: liked-pulse 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.bubble-like-btn::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle, rgba(224, 81, 118, 0.4) 0%, transparent 70%);
  transform: scale(0);
  opacity: 0;
  pointer-events: none;
}

.bubble-like-btn.liked::after {
  animation: ripple 0.5s ease-out;
}

@keyframes liked-pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

@keyframes ripple {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(2.2); opacity: 0; }
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
  opacity: 1;
}

.detail-like-btn.liked {
  color: #b73557;
  animation: liked-pulse 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.detail-like-btn::after {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  width: 40px;
  height: 40px;
  transform: translate(-50%, -50%) scale(0);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(224, 81, 118, 0.3) 0%, transparent 70%);
  opacity: 0;
  pointer-events: none;
}

.detail-like-btn.liked::after {
  animation: ripple 0.5s ease-out;
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
}
</style>