<template>
  <main class="scatter-page" :class="{ rainy: isRainy }">
    <canvas ref="rainCanvas" class="rain-canvas" aria-hidden="true"></canvas>
    <div class="weather-fog" aria-hidden="true"></div>

    <div class="header-nav">
      <el-button circle :icon="ArrowLeft" class="back-btn" @click="goBack" aria-label="返回地图" />
      <span class="page-title">
        {{ currentLocation?.name || '地点详情' }} · {{ currentLocation?.weatherText || '天气加载中' }}
      </span>
    </div>

    <div class="scatter-container" :class="{ blurred: !!selectedPost }">
      <div v-if="isLoadingPosts" class="state-card">正在加载帖子...</div>
      <div v-else-if="posts.length === 0" class="state-card">这里还没有留言，发一条成为第一位吧。</div>

      <button
        v-for="(post, index) in posts"
        :key="post.id"
        type="button"
        class="post-bubble"
        :class="bubbleClassByIndex(index)"
        :style="bubbleStyleByIndex(index)"
        @click="openPost(post, $event)"
      >
        <span class="bubble-tag" :style="{ backgroundColor: post.emotionTagColor || '#6AA6FF' }">
          {{ post.emotionTagName || '心情' }}
        </span>
        <p class="bubble-content">{{ post.content }}</p>
      </button>
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
            <span class="detail-tag" :style="{ backgroundColor: selectedPost.emotionTagColor || '#6AA6FF' }">
              {{ selectedPost.emotionTagName || '心情' }}
            </span>
            <time class="detail-time">{{ selectedPost.createTime }}</time>
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
            <button type="button" class="action-btn like" @click="likeSelected" aria-label="点赞">
              <el-icon><Star /></el-icon>
              <span>{{ selectedLikeCount }}</span>
            </button>

            <button type="button" class="action-btn" @click="react('support')" aria-label="支持">
              <el-icon><Pointer /></el-icon>
              <span>{{ selectedReactions.support }}</span>
            </button>

            <button type="button" class="action-btn" @click="react('relax')" aria-label="放松">
              <el-icon><Moon /></el-icon>
              <span>{{ selectedReactions.relax }}</span>
            </button>

            <button type="button" class="action-btn" @click="react('anxious')" aria-label="焦虑共鸣">
              <el-icon><Lightning /></el-icon>
              <span>{{ selectedReactions.anxious }}</span>
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
import { ArrowLeft, CloseBold, Lightning, Moon, Pointer, Star } from '@element-plus/icons-vue'
import { fetchLocationList } from '@/api/location'
import { fetchPostList } from '@/api/post'
import type { Location, PostItem, ReactionSummary } from '@/types/models'

type RainDrop = {
  x: number
  y: number
  len: number
  speed: number
  alpha: number
  thickness: number
}

type ReactionKey = keyof ReactionSummary

const route = useRoute()
const router = useRouter()

const spotId = computed(() => Number(route.params.spotId))
const currentLocation = ref<Location | null>(null)
const posts = ref<PostItem[]>([])
const isLoadingPosts = ref(false)
const selectedPost = ref<PostItem | null>(null)
const reactionDeltaMap = ref<Record<number, ReactionSummary>>({})
const likeDeltaMap = ref<Record<number, number>>({})
const detailCardRef = ref<HTMLElement | null>(null)
const isSharedAnimating = ref(false)
const sharedCardStyle = ref<Record<string, string>>({})
const lastBubbleRect = ref<DOMRect | null>(null)

const rainCanvas = ref<HTMLCanvasElement | null>(null)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

let rafId = 0
let resizeTimer = 0
let cardAnimation: Animation | null = null
let ctx: CanvasRenderingContext2D | null = null
let drops: RainDrop[] = []
let lightning = 0

const ENTER_DURATION = 460
const EXIT_DURATION = 280
const ENTER_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)'
const EXIT_EASING = 'cubic-bezier(0.7, 0, 0.84, 0)'

const isRainy = computed(() => {
  const loc = currentLocation.value
  if (!loc) return false
  return loc.weatherCode.includes('RAIN') || loc.weatherText.includes('雨')
})

const selectedLikeCount = computed(() => {
  if (!selectedPost.value) return 0
  const id = selectedPost.value.id
  return selectedPost.value.likeCount + (likeDeltaMap.value[id] || 0)
})

const selectedReactions = computed<ReactionSummary>(() => {
  if (!selectedPost.value) {
    return { support: 0, relax: 0, anxious: 0 }
  }
  const id = selectedPost.value.id
  const base = selectedPost.value.reactionSummary || { support: 0, relax: 0, anxious: 0 }
  const delta = reactionDeltaMap.value[id] || { support: 0, relax: 0, anxious: 0 }
  return {
    support: base.support + delta.support,
    relax: base.relax + delta.relax,
    anxious: base.anxious + delta.anxious,
  }
})

const goBack = () => {
  router.push('/')
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

const openPost = async (post: PostItem, event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement | null
  lastBubbleRect.value = target?.getBoundingClientRect() || null

  selectedPost.value = post

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
        opacity: 0.58,
        filter: 'blur(4px)',
      },
      {
        transform: 'translate(0px, 0px) scale(1.012, 1.012)',
        opacity: 1,
        filter: 'blur(0px)',
        offset: 0.78,
      },
      {
        transform: 'translate(0px, 0px) scale(1, 1)',
        opacity: 1,
        filter: 'blur(0px)',
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
        filter: 'blur(0px)',
      },
      {
        transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        opacity: 0.18,
        filter: 'blur(2px)',
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

const likeSelected = () => {
  if (!selectedPost.value) return
  const id = selectedPost.value.id
  likeDeltaMap.value[id] = (likeDeltaMap.value[id] || 0) + 1
}

const react = (type: ReactionKey) => {
  if (!selectedPost.value) return
  const id = selectedPost.value.id
  const current = reactionDeltaMap.value[id] || { support: 0, relax: 0, anxious: 0 }
  reactionDeltaMap.value[id] = {
    ...current,
    [type]: current[type] + 1,
  }
}

const bubbleStyleByIndex = (index: number) => {
  const presets = [
    { top: '26%', left: '10%' },
    { top: '48%', left: '62%' },
    { top: '62%', left: '24%' },
    { top: '35%', left: '54%' },
    { top: '72%', left: '58%' },
    { top: '18%', left: '38%' },
  ]

  const value = presets[index % presets.length] ?? { top: '26%', left: '10%' }
  return {
    top: value.top,
    left: value.left,
  }
}

const bubbleClassByIndex = (index: number) => {
  const classes = ['bubble-a', 'bubble-b', 'bubble-c']
  return classes[index % classes.length]
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
  currentLocation.value = locations.find((item) => item.id === spotId.value) ?? null
}

const loadPosts = async () => {
  isLoadingPosts.value = true
  try {
    const result = await fetchPostList({
      locationId: spotId.value,
      pageNum: 1,
      pageSize: 12,
    })
    posts.value = result.records
  } finally {
    isLoadingPosts.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadLocation(), loadPosts()])

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
  cancelCardAnimation()
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

.scatter-container {
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 6;
  transition: filter 260ms ease, transform 260ms ease;
}

.scatter-container.blurred {
  filter: blur(6px) brightness(0.76);
  transform: scale(0.985);
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
  padding: 12px 14px;
  cursor: pointer;
  transition: transform 220ms ease, box-shadow 220ms ease;
}

.post-bubble:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 30px rgba(9, 19, 34, 0.3);
}

.bubble-a {
  transform: rotate(-2deg);
}

.bubble-b {
  transform: rotate(1.2deg);
}

.bubble-c {
  transform: rotate(-0.6deg);
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
  background: rgba(218, 232, 248, 0.92);
  cursor: pointer;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-right: 42px;
}

.detail-tag {
  color: #fff;
  font-size: 12px;
  line-height: 1;
  padding: 6px 10px;
  border-radius: 999px;
}

.detail-time {
  color: #54708c;
  font-size: 12px;
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
  flex-wrap: wrap;
  gap: 10px;
}

.action-btn {
  border: 1px solid rgba(82, 109, 133, 0.24);
  background: rgba(239, 248, 255, 0.9);
  color: #24405c;
  border-radius: 999px;
  height: 36px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  transition: transform 180ms ease, background-color 180ms ease;
}

.action-btn:hover {
  transform: translateY(-1px);
  background: rgba(225, 241, 255, 0.96);
}

.action-btn.like {
  background: rgba(255, 238, 198, 0.94);
  border-color: rgba(233, 180, 67, 0.36);
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
    max-width: 70vw;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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
