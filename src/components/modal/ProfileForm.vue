<template>
  <div class="route-view-container">
  <!-- 顶部栏 -->
  <div class="modal-header">
    <div class="header-left"></div>
    <div class="header-title">编辑资料</div>
    <div class="header-right" @click="$emit('close')">
      <el-icon :size="20"><Close /></el-icon>
    </div>
  </div>

  <!-- 可滚动主体 -->
  <div class="modal-body">
    <div class="avatar-section">
      <div class="avatar-wrapper" @click="$emit('open-avatar')">
        <el-avatar :size="80" :src="modelValue.avatar || ''" class="avatar-el">
          <el-icon v-if="!modelValue.avatar"><UserFilled /></el-icon>
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
            v-model="modelValue.nickname" 
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
          v-model="modelValue.gender" 
          placeholder="请选择性别" 
          class="gender-select"
          popper-class="custom-gender-popper"
        >
          <el-option :value="0" label="保密" />
          <el-option :value="1" label="男" />
          <el-option :value="2" label="女" />
        </el-select>
      </div>
    </div>
  </div>

  <!-- 底部栏 -->
  <div class="modal-footer">
    <button class="footer-btn btn-cancel" @click="$emit('close')">取消</button>
    <button class="footer-btn btn-save" :disabled="loading" @click="$emit('save')">
      <span v-if="!loading">保存</span>
      <el-icon v-else class="is-loading"><Loading /></el-icon>
    </button>
  </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Close, CameraFilled, UserFilled, Loading } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: {
    nickname: string
    avatar: string
    gender: number
  }
  loading: boolean
}>()

// 使用 defineModel，或者显式 emit
const emit = defineEmits<{
  (e: 'update:modelValue', val: any): void
  (e: 'close'): void
  (e: 'save'): void
  (e: 'open-avatar'): void
}>()

const nicknameLength = computed(() => {
  return props.modelValue.nickname?.length || 0
})
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
.header-right {
  cursor: pointer;
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
  flex: 1;
  overflow-y: auto;
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
  color: #c0c4cc;
}
.word-count {
  font-size: 12px;
  color: #999;
  margin-left: 8px;
}
.gender-select {
  width: 100%;
}
:deep(.el-select__wrapper) {
  background-color: #f7f8fa;
  border-radius: 10px;
  height: 46px;
  box-shadow: none !important;
}
:deep(.el-select__wrapper.is-focused) {
  background-color: #fff;
  box-shadow: 0 0 0 1px #e63f52 !important;
}

/* Footer 配置 */
.modal-footer {
  padding: 16px 24px;
  display: flex;
  gap: 12px;
  border-top: 1px solid #f0f0f0;
  background: #ffffff;
  flex-shrink: 0;
}
.footer-btn {
  flex: 1;
  height: 40px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.footer-btn:active {
  transform: scale(0.96);
}
.btn-cancel {
  background-color: #f2f3f5;
  color: #666;
}
.btn-cancel:hover {
  background-color: #e5e6eb;
}
.btn-save {
  background-color: var(--el-color-primary, #409EFF);
  color: #fff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2);
}
.btn-save:hover {
  opacity: 0.9;
}
.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<style scoped>.route-view-container { height: 100%; display: flex; flex-direction: column; }</style>
