<template>
  <el-drawer
    v-model="drawerVisible"
    :direction="drawerDirection"
    :size="drawerSize"
    :with-header="false"
    :append-to-body="true"
    :lock-scroll="true"
    class="landmark-detail-drawer"
  >
    <div v-if="landmark || landmarkDetail" class="drawer-content">
      <div class="drawer-header">
        <img
          v-if="displayImage && !imageLoadFailed"
          :src="displayImage"
          :alt="displayName"
          class="header-image"
          @error="handleImageError"
        />
        <div v-else class="header-image-placeholder">
          <el-icon class="image-icon"><Picture /></el-icon>
        </div>
        <div class="close-btn" @click="closeDrawer">
          <el-icon><Close /></el-icon>
        </div>
      </div>
      
      <div class="drawer-body">
        <template v-if="loading">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="text" style="width: 60%; height: 32px; margin-bottom: 18px" />
              <el-skeleton-item variant="text" style="width: 28%; height: 24px; margin-bottom: 24px" />
              <el-skeleton-item variant="text" style="width: 100%; height: 20px; margin-bottom: 12px" />
              <el-skeleton-item variant="text" style="width: 100%; height: 20px; margin-bottom: 12px" />
              <el-skeleton-item variant="text" style="width: 76%; height: 20px" />
            </template>
          </el-skeleton>
        </template>
        <template v-else>
          <h2 class="title">{{ displayName }}</h2>
          <div class="tags">
            <el-tag size="small" type="info" effect="plain" round>
              {{ displayWeatherText }}
            </el-tag>
          </div>
          <p v-if="error" class="error-tip">{{ error }}</p>
          <p class="description">{{ displayDescription }}</p>
        </template>
      </div>

      <div class="drawer-footer">
        <el-button type="primary" size="large" class="action-btn" :disabled="!targetSpotId" @click="viewPosts" round>
          查看心声
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Picture, Close } from '@element-plus/icons-vue'
import type { Location, LocationDetail } from '@/types/models'

const props = defineProps<{
  modelValue: boolean
  landmark: Location | null
  landmarkDetail: LocationDetail | null
  loading: boolean
  error?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const router = useRouter()

const drawerVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const windowWidth = ref(window.innerWidth)

const updateWidth = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', updateWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
  unlockPageScroll()
})

const isMobile = computed(() => windowWidth.value <= 767)
const drawerDirection = computed(() => (isMobile.value ? 'btt' : 'ltr'))
const drawerSize = computed(() => (isMobile.value ? '100dvh' : '400px'))
const imageLoadFailed = ref(false)
let lockedScrollTop = 0

const displayName = computed(() => props.landmarkDetail?.name ?? props.landmark?.name ?? '未命名地点')
const displayWeatherText = computed(() => props.landmarkDetail?.weatherText ?? props.landmark?.weatherText ?? '未知天气')
const displayDescription = computed(
  () => props.landmarkDetail?.description ?? props.landmark?.description ?? '暂无详细介绍',
)
const displayImage = computed(() => props.landmarkDetail?.locationImage ?? props.landmark?.locationImage ?? '')
const targetSpotId = computed(() => props.landmarkDetail?.id ?? props.landmark?.id)

watch(displayImage, () => {
  imageLoadFailed.value = false
})

function lockPageScroll() {
  if (!isMobile.value) return
  lockedScrollTop = window.scrollY || window.pageYOffset || 0

  document.documentElement.style.overflow = 'hidden'
  document.documentElement.style.overscrollBehavior = 'none'
  document.body.style.overflow = 'hidden'
  document.body.style.overscrollBehavior = 'none'
  document.body.style.position = 'fixed'
  document.body.style.top = `-${lockedScrollTop}px`
  document.body.style.left = '0'
  document.body.style.right = '0'
  document.body.style.width = '100%'
  document.body.style.touchAction = 'none'
}

function unlockPageScroll() {
  document.documentElement.style.overflow = ''
  document.documentElement.style.overscrollBehavior = ''
  document.body.style.overflow = ''
  document.body.style.overscrollBehavior = ''
  document.body.style.position = ''
  document.body.style.top = ''
  document.body.style.left = ''
  document.body.style.right = ''
  document.body.style.width = ''
  document.body.style.touchAction = ''

  if (lockedScrollTop > 0) {
    window.scrollTo(0, lockedScrollTop)
    lockedScrollTop = 0
  }
}

watch(
  drawerVisible,
  (visible) => {
    if (visible) {
      lockPageScroll()
      return
    }
    unlockPageScroll()
  },
  { immediate: true },
)

function handleImageError() {
  imageLoadFailed.value = true
}

const closeDrawer = () => {
  drawerVisible.value = false
}

const viewPosts = () => {
  if (targetSpotId.value) {
    drawerVisible.value = false
    router.push({ name: 'spot-detail', params: { spotId: targetSpotId.value } })
  }
}
</script>

<style scoped>
.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.drawer-header {
  position: relative;
  height: 300px;
  background-color: #f5f7fa;
}

.header-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.header-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e0eaf5 0%, #c4e0e5 100%);
  color: #909399;
  font-size: 48px;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 1);
  transform: scale(1.05);
}

.drawer-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;
}

.title {
  margin: 0 0 12px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.tags {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}

.description {
  font-size: 15px;
  line-height: 1.6;
  color: #606266;
}

.error-tip {
  margin: 0 0 12px;
  color: #b42318;
  font-size: 13px;
  line-height: 1.5;
}

.drawer-footer {
  padding: 16px 24px;
  border-top: 1px solid #ebeef5;
  background: #fff;
}

.action-btn {
  width: 100%;
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 1px;
}
</style>

<style>
/* 覆盖 el-drawer 的默认 padding */
.landmark-detail-drawer .el-drawer__body {
  padding: 0 !important;
  overflow: hidden;
}
/* 适配移动端全屏 */
@media screen and (max-width: 767px) {
  .landmark-detail-drawer,
  .landmark-detail-drawer.el-drawer,
  .landmark-detail-drawer .el-drawer {
    width: 100vw !important;
    max-width: 100vw !important;
    max-height: 100dvh !important;
    height: 100dvh !important;
    top: auto !important;
    bottom: 0 !important;
    left: 0 !important;
    margin: 0 !important;
    border-radius: 0 !important;
    overflow: hidden !important;
  }

  .landmark-detail-drawer .el-drawer__body,
  .landmark-detail-drawer.el-drawer .el-drawer__body {
    height: 100% !important;
    padding: 0 !important;
    overflow: hidden !important;
    display: flex;
    flex-direction: column;
  }

  .drawer-content {
    height: 100dvh;
    overscroll-behavior: none;
  }

  .drawer-header {
    height: 34dvh;
    max-height: 260px;
    min-height: 180px;
  }

  .drawer-body {
    padding: 16px 16px 12px;
  }

  .title {
    font-size: 20px;
    margin-bottom: 10px;
  }

  .tags {
    margin-bottom: 16px;
  }

  .description {
    font-size: 14px;
    line-height: 1.58;
  }

  .drawer-footer {
    padding: 12px 16px calc(16px + env(safe-area-inset-bottom));
    position: sticky;
    bottom: 0;
    z-index: 2;
    box-shadow: 0 -8px 18px rgba(15, 23, 42, 0.06);
  }

  .action-btn {
    height: 44px;
    font-size: 15px;
  }
}
</style>
