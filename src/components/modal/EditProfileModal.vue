<template>
  <Transition name="fade-scale">
    <div v-if="visible" class="edit-modal-overlay" @click.self="handleClose">
      <div class="edit-modal-card">
        <!-- Header -->
        <div class="modal-header">
          <div class="header-left"></div>
          <div class="header-title">编辑资料</div>
          <div class="header-right" @click="handleClose">
            <el-icon :size="20"><Close /></el-icon>
          </div>
        </div>

        <!-- Scrollable Body -->
        <div class="modal-body">
          <div class="avatar-section">
            <div class="avatar-wrapper" @click="onAvatarClick">
              <el-avatar :size="80" :src="formData.avatar || ''" class="avatar-el">
                <el-icon v-if="!formData.avatar"><UserFilled /></el-icon>
              </el-avatar>
              <div class="avatar-camera-mask">
                <el-icon :size="24" class="camera-icon"><CameraFilled /></el-icon>
              </div>
            </div>
            <div class="avatar-hint">点击修改头像</div>
          </div>

          <div class="form-section">
            <div class="form-item">
              <label class="item-label">名字</label>
              <div class="input-container">
                <input 
                  type="text" 
                  v-model="formData.nickname" 
                  maxlength="20"
                  class="custom-input"
                  autofocus
                />
                <span class="word-count">{{ nicknameLength }}/20</span>
              </div>
            </div>
            
            <div class="form-item">
              <label class="item-label">性别</label>
              <el-select 
                v-model="formData.gender" 
                placeholder="请选择性别" 
                class="gender-select"
                popper-class="custom-gender-popper"
              >
                <el-option :value="0" label="保密" />
                <el-option :value="1" label="男" />
                <el-option :value="2" label="女" />
              </el-select>
            </div>

            <div class="form-item">
              <label class="item-label">简介</label>
              <div class="input-container read-only">
                <textarea 
                  class="custom-textarea" 
                  readonly 
                  rows="3"
                >这个人很懒，什么也没有留下~</textarea>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="footer-btn btn-cancel" @click="handleClose">取消</button>
          <button class="footer-btn btn-save" :disabled="loading" @click="submitSave">
            <span v-if="!loading">保存</span>
            <el-icon v-else class="is-loading"><Loading /></el-icon>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Close, CameraFilled, UserFilled, Loading } from '@element-plus/icons-vue'
import { updateUserInfo } from '@/api/user'
import type { User } from '@/types/models'

const props = defineProps<{
  visible: boolean
  userInfo: User | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'success', updatedUser: User): void
}>()

const loading = ref(false)

const formData = ref({
  nickname: '',
  avatar: '',
  gender: 0
})

watch(() => props.visible, (newVal) => {
  if (newVal && props.userInfo) {
    formData.value.nickname = props.userInfo.nickname || ''
    formData.value.avatar = props.userInfo.avatar || ''
    formData.value.gender = props.userInfo.gender ?? 0
  }
})

const nicknameLength = computed(() => {
  return formData.value.nickname?.length || 0
})

const handleClose = () => {
  if (loading.value) return
  emit('update:visible', false)
}

const onAvatarClick = () => {
  ElMessage.warning('预设头像库开发中~')
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
      gender: formData.value.gender
      // avatar is omitted until preset avatars are supported by backend properly
    })
    ElMessage.success('资料已更新')
    emit('success', res)
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

/* 核心亮色卡片 */
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
}

/* 顶部 Header */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  font-size: 17px;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
}
.header-left, .header-right {
  width: 24px;
}
.header-right {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  transition: color 0.2s;
}
.header-right:hover {
  color: #333;
}

/* 身体区配置 */
.modal-body {
  padding: 24px 24px 12px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 头像中心区域 */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.avatar-wrapper {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  background-color: #f5f5f5;
  border: 2px solid #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.avatar-el {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.avatar-camera-mask {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.avatar-wrapper:hover .avatar-camera-mask {
  opacity: 1;
}
.camera-icon {
  color: #fff;
}
.avatar-hint {
  font-size: 12px;
  color: #999;
}

/* 表单输入区域 */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.item-label {
  font-size: 13px;
  color: #666;
  font-weight: 500;
  padding-left: 2px;
}
.input-container {
  display: flex;
  align-items: center;
  background-color: #f7f8fa;
  border-radius: 10px;
  padding: 0 14px;
  height: 46px;
  position: relative;
  transition: all 0.2s;
  border: 1px solid transparent;
}
.input-container:focus-within {
  background-color: #fff;
  border-color: #e63f52;
  box-shadow: 0 0 0 3px rgba(230, 63, 82, 0.1);
}
.custom-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #333;
  font-size: 14px;
  width: 100%;
}
.custom-input::placeholder {
  color: #bbb;
}
.gender-select {
  width: 100%;
}
:deep(.el-select) {
  width: 100%;
}
:deep(.el-select .el-input__wrapper) {
  background-color: #f7f8fa !important;
  box-shadow: none !important;
  border-radius: 10px;
  padding: 0 14px !important;
  height: 46px;
  border: 1px solid transparent;
  transition: all 0.2s;
}
:deep(.el-select .el-input__wrapper:hover) {
  background-color: #f0f1f4 !important;
}
:deep(.el-select .el-input.is-focus .el-input__wrapper) {
  background-color: #fff !important;
  border-color: #e63f52 !important;
  box-shadow: 0 0 0 3px rgba(230, 63, 82, 0.1) !important;
}
:deep(.el-input__inner) {
  color: #333 !important;
  font-size: 14px;
}

/* 下拉菜单弹出层样式 */
:global(.custom-gender-popper) {
  z-index: 10000 !important;
  border-radius: 12px !important;
  overflow: hidden;
  border: none !important;
  box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important;
}
:global(.custom-gender-popper .el-select-dropdown__item) {
  padding: 10px 16px;
  height: auto;
  line-height: normal;
  color: #333;
}
:global(.custom-gender-popper .el-select-dropdown__item.selected) {
  color: #e63f52 !important;
  font-weight: 600;
}

.word-count {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}

/* 简介不可编辑态 */
.input-container.read-only {
  height: auto;
  min-height: 80px;
  padding: 12px 14px;
  background-color: #f9f9f9;
  cursor: not-allowed;
}
.custom-textarea {
  width: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #999;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  cursor: not-allowed;
}

/* 底部功能区 */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
}
.footer-btn {
  flex: 1;
  height: 46px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.footer-btn:active {
  transform: scale(0.98);
}
.btn-cancel {
  background-color: #f0f0f0;
  color: #666;
}
.btn-cancel:hover {
  background-color: #e8e8e8;
}
.btn-save {
  background-color: #e63f52;
  color: #fff;
}
.btn-save:hover {
  filter: brightness(1.05);
}
.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 渐隐过渡动画 */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
}
.fade-scale-enter-from .edit-modal-card {
  transform: scale(0.95) translateY(10px);
}
.fade-scale-leave-to .edit-modal-card {
  transform: scale(0.95);
}
</style>
