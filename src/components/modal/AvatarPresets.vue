<template>
  <div class="route-view-container">
    <div class="modal-header">
      <div class="header-left">
        <el-icon class="icon-btn" @click="handleBack"><ArrowLeft /></el-icon>
      </div>
      <div class="header-title">{{ step === 'list' ? '查看头像' : '头像预览' }}</div>
      <div class="header-right"></div>
    </div>

    <!-- 状态一：头像列表库 -->
    <template v-if="step === 'list'">
      <div class="modal-body list-body">
        <div class="current-avatar-section">
          <el-avatar :size="80" :src="currentAvatar" class="avatar-big">
            <el-icon v-if="!currentAvatar"><UserFilled /></el-icon>
          </el-avatar>
          <div class="current-label">当前头像</div>
        </div>

        <div class="presets-section">
          <div class="section-title">可选头像</div>
          <div class="presets-grid" v-if="!loadingPresets">
            <div
              v-for="preset in presetList"
              :key="preset.id"
              class="preset-item"
              :class="{ 'is-active': preset.avatarUrl === currentAvatar }"
              @click="handlePreview(preset)"
            >
              <img :src="preset.avatarUrl" :alt="preset.avatarName" class="preset-img" />
            </div>
            <div v-if="presetList.length === 0" class="empty-data">
              暂无预设头像
            </div>
          </div>
          <div v-else class="loading-data">
            <el-icon class="is-loading" :size="24"><Loading /></el-icon>
            <p>正在加载头像库...</p>
          </div>
        </div>
      </div>
    </template>

    <!-- 状态二：大图预览 -->
    <template v-if="step === 'preview'">
      <div class="modal-body preview-body">
        <div class="preview-stage">
          <img :src="previewUrl" class="preview-img" :alt="previewName" />
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="set-avatar-btn"
          :disabled="saving"
          @click="handleSetAvatar"
        >
          <span v-if="!saving">设为头像</span>
          <el-icon v-else class="is-loading"><Loading /></el-icon>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowLeft, UserFilled, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { fetchAvatarList, updateUserInfo } from '@/api/user'
import type { AvatarPreset } from '@/types/models'

const props = defineProps<{
  currentAvatar: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
  (e: 'success', newAvatarUrl: string): void
}>()

const step = ref<'list' | 'preview'>('list')
const loadingPresets = ref(false)
const presetList = ref<AvatarPreset[]>([])
const previewUrl = ref('')
const previewName = ref('')
const saving = ref(false)

onMounted(() => {
  loadPresets()
})

const loadPresets = async () => {
  loadingPresets.value = true
  try {
    const list = await fetchAvatarList()
    presetList.value = list
  } catch (err) {
    console.error('Failed to load avatars', err)
    ElMessage.error('获取头像列表失败')
  } finally {
    loadingPresets.value = false
  }
}

const handleBack = () => {
  if (step.value === 'preview') {
    step.value = 'list'
  } else {
    emit('back')
  }
}

const handlePreview = (preset: AvatarPreset) => {
  previewUrl.value = preset.avatarUrl
  previewName.value = preset.avatarName
  step.value = 'preview'
}

const handleSetAvatar = async () => {
  saving.value = true
  try {
    await updateUserInfo({ avatar: previewUrl.value })
    ElMessage.success('头像修改成功！')
    
    // 直接向上抛出更新事件，父容器会处理组件切换
    emit('success', previewUrl.value)
  } catch (err) {
    console.error('Failed to set avatar', err)
    ElMessage.error('修改头像失败')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* 顶部 Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
  background: #ffffff;
  flex-shrink: 0;
}
.header-left, .header-right {
  width: 24px;
  display: flex;
  align-items: center;
}
.icon-btn {
  font-size: 20px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}
.icon-btn:hover {
  color: #333;
}

/* 滚动内容区 */
.modal-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* --- 状态一：头像列表库 --- */
.list-body {
  background: #f7f8fa;
}

.current-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 20px;
  background: #ffffff;
}

.avatar-big {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  font-size: 36px;
  background: #f0f2f5;
  color: #999;
}

.current-label {
  margin-top: 12px;
  font-size: 14px;
  color: #666;
}

.presets-section {
  flex: 1;
  background: #ffffff;
  margin-top: 12px;
  padding: 20px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.preset-item {
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: #f4f5f7;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 2px solid transparent;
}

.preset-item:active, .preset-item:hover {
  transform: scale(0.96);
}

.preset-item.is-active {
  border-color: var(--el-color-primary);
}

.preset-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.loading-data, .empty-data {
  text-align: center;
  color: #999;
  font-size: 14px;
  padding: 40px 0;
}
.loading-data .is-loading {
  margin-bottom: 8px;
}

/* --- 状态二：大图预览 --- */
.preview-body {
  background: #ffffff;
  padding: 20px;
  align-items: center;
  justify-content: center;
}

.preview-stage {
  width: 100%;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.preview-img {
  width: 100%;
  max-width: 260px;
  aspect-ratio: 1;
  object-fit: contain;
  border-radius: 20px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
}

/* Footer (预览状态) */
.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #f0f0f0;
  background: #ffffff;
  flex-shrink: 0;
}

.set-avatar-btn {
  width: 100%;
  background: var(--el-color-primary, #409EFF);
  color: #ffffff;
  border: none;
  border-radius: 24px;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.set-avatar-btn:active {
  transform: scale(0.96);
}
.set-avatar-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
</style>
