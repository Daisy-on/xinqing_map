<template>
  <el-drawer
    v-model="drawerVisible"
    :direction="drawerDirection"
    :size="drawerSize"
    :with-header="false"
    class="landmark-detail-drawer"
  >
    <div v-if="landmark" class="drawer-content">
      <div class="drawer-header">
        <div class="header-image-placeholder">
          <!-- Placeholder for image, or use dummy image -->
          <el-icon class="image-icon"><Picture /></el-icon>
        </div>
        <div class="close-btn" @click="closeDrawer">
          <el-icon><Close /></el-icon>
        </div>
      </div>
      
      <div class="drawer-body">
        <h2 class="title">{{ landmark.name }}</h2>
        <div class="tags">
          <el-tag size="small" type="info" effect="plain" round>
            {{ landmark.weatherText }}
          </el-tag>
          <el-tag size="small" type="primary" effect="plain" round>
            {{ landmark.moodText }}
          </el-tag>
        </div>
        <p class="description">{{ landmark.description || '暂无详细介绍' }}</p>
      </div>

      <div class="drawer-footer">
        <el-button type="primary" size="large" class="action-btn" @click="viewPosts" round>
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
import type { Location } from '@/types/models'

const props = defineProps<{
  modelValue: boolean
  landmark: Location | null
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
})

// PC: ltr, Mobile: btt
const isMobile = computed(() => windowWidth.value < 768)
const drawerDirection = computed(() => isMobile.value ? 'btt' : 'ltr')
const drawerSize = computed(() => isMobile.value ? '60%' : '400px')

const closeDrawer = () => {
  drawerVisible.value = false
}

const viewPosts = () => {
  if (props.landmark) {
    drawerVisible.value = false
    router.push({ name: 'spot-detail', params: { spotId: props.landmark.id } })
  }
}
</script>

<style scoped>
.drawer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.drawer-header {
  position: relative;
  height: 240px;
  background-color: #f5f7fa;
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
/* 适配移动端圆角 */
@media screen and (max-width: 767px) {
  .landmark-detail-drawer {
    border-top-left-radius: 16px !important;
    border-top-right-radius: 16px !important;
  }
}
</style>
