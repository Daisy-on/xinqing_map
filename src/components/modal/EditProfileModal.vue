<template>
  <Transition name="fade-scale">
    <div v-if="visible" class="edit-modal-overlay" @click.self="handleClose">
      <!-- 统一核心亮色卡片：根据路由动态改变是否定高（例如选头像时强制铺满） -->
      <div class="edit-modal-card" :class="{'is-fixed-height': currentView === 'avatarPresets'}">
        <Transition name="slide-fade" mode="out-in">
          <!-- 路由一：资料编辑表单 -->
          <ProfileForm 
            v-if="currentView === 'profileForm'"
            v-model="formData"
            :loading="loading"
            @close="handleClose"
            @save="submitSave"
            @open-avatar="currentView = 'avatarPresets'"
          />
          
          <!-- 路由二：头像选择与预览 -->
          <AvatarPresets 
            v-else-if="currentView === 'avatarPresets'"
            :current-avatar="formData.avatar"
            @back="currentView = 'profileForm'"
            @success="handleAvatarSuccess"
          />
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { updateUserInfo } from '@/api/user'
import type { User } from '@/types/models'
import ProfileForm from './ProfileForm.vue'
import AvatarPresets from './AvatarPresets.vue'

const props = defineProps<{
  visible: boolean
  userInfo: User | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'success', updatedUser: User): void
}>()

const loading = ref(false)

// 内部“路由”状态：profileForm (资料) | avatarPresets (头像库)
const currentView = ref<'profileForm' | 'avatarPresets'>('profileForm')

const formData = ref({
  nickname: '',
  avatar: '',
  gender: 0
})

// 当外部可见性变化时重置状态
watch(() => props.visible, (newVal) => {
  if (newVal && props.userInfo) {
    currentView.value = 'profileForm' // 每次打开重置为资料编辑首页
    formData.value.nickname = props.userInfo.nickname || ''
    formData.value.avatar = props.userInfo.avatar || ''
    formData.value.gender = props.userInfo.gender ?? 0
  }
})

const handleClose = () => {
  if (loading.value) return
  emit('update:visible', false)
}

const handleAvatarSuccess = (newAvatarUrl: string) => {
  formData.value.avatar = newAvatarUrl
  if (props.userInfo) {
    emit('success', {
      ...props.userInfo,
      avatar: newAvatarUrl,
    })
  }
  // 修改成功后跳转回首页继续完善
  currentView.value = 'profileForm'
}

const submitSave = async () => {
  if (!formData.value.nickname.trim()) {
    ElMessage.warning('名字不能为空')
    return
  }
  
  loading.value = true
  try {
    const res = await updateUserInfo({
      nickname: formData.value.nickname.trim(),
      gender: formData.value.gender,
      avatar: formData.value.avatar || undefined,
    })
    // 补齐传出信息，保证视图更新
    const completeUser: User = { ...props.userInfo, ...res, avatar: formData.value.avatar }
    
    ElMessage.success('资料已更新')
    emit('success', completeUser)
    handleClose()
  } catch (error) {
    ElMessage.error('保存失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* 弹窗遮罩（全屏背景黑透） */
.edit-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 统一核心亮色卡片 */
.edit-modal-card {
  width: 90%;
  max-width: 400px;
  background-color: #ffffff;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  color: #333;
  overflow: hidden;
  margin: auto;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  min-height: 480px; /* 给表单一个保底高度 */
}

/* 根据内部路由判断是否需要拉高容器（比如头像库需要 80vh 滚动展示） */
.edit-modal-card.is-fixed-height {
  height: 80vh;
  max-height: 640px;
}

/* 组件间切换的过渡动画 */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}
.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}

/* 弹窗出入过渡动画 */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}
</style>
