<template>
  <div>
    <div class="banner-area">
      <div class="banner-bg"></div>
      <div class="top-nav">
        <div class="back-btn-glass" @click="emit('back')">
          <el-icon><ArrowLeft /></el-icon>
        </div>
      </div>
    </div>

    <div class="user-container">
      <div class="user-profile-header">
        <div class="avatar-area" @click="emit('avatar-click')">
          <el-avatar :size="112" :src="userInfo?.avatar" class="avatar-img">
            <el-icon v-if="!userInfo?.avatar" :size="50"><UserFilled /></el-icon>
          </el-avatar>
        </div>

        <div class="user-info-actions-wrap">
          <div class="info-area">
            <div class="title-row">
              <h1 v-if="isLoggedIn" class="nickname">{{ userInfo?.nickname || '心晴用户' }}</h1>
              <button v-else type="button" class="login-entry" @click="emit('login')">点击登录</button>
              <span class="uid" v-if="isLoggedIn">UID: {{ userInfo?.account || '-' }}</span>
            </div>

            <p class="bio-text" v-if="!isLoggedIn">登录后体验更多功能，开启你的心晴之旅。</p>
          </div>

          <div class="actions-area" v-if="isLoggedIn">
            <el-dropdown 
              class="profile-more-dropdown" 
              trigger="click" 
              @command="onProfileActionCommand"
              popper-class="profile-action-popper"
            >
              <button type="button" class="profile-more-trigger" aria-label="更多操作">
                <el-icon><MoreFilled /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit-profile">
                    <img src="@/assets/icon/edit.svg" class="dropdown-icon" alt="" />
                    <span>修改个人信息</span>
                  </el-dropdown-item>
                  <el-dropdown-item command="logout" class="danger-dropdown-item">
                    <img src="@/assets/icon/exit.svg" class="dropdown-icon" alt="" />
                    <span>退出登录</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, MoreFilled, UserFilled } from '@element-plus/icons-vue'
import type { User } from '@/types/models'

interface ProfileActionEventMap {
  'edit-profile': 'edit-profile'
  logout: 'logout'
}

defineProps<{
  isLoggedIn: boolean
  userInfo: User | null
}>()

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'avatar-click'): void
  (event: 'login'): void
  (event: 'profile-action', action: 'edit-profile' | 'logout'): void
}>()

const onProfileActionCommand = (command: string | number | Record<string, unknown>) => {
  const normalized = String(command) as keyof ProfileActionEventMap
  if (normalized === 'edit-profile' || normalized === 'logout') {
    emit('profile-action', normalized)
  }
}
</script>

<style scoped>
.banner-area {
  position: relative;
  width: 100%;
  height: 240px;
}

.banner-bg {
  width: 100%;
  height: 100%;
  background-image: url('@/assets/images/profile-bgc.png');
  background-size: cover;
  background-position: center 53%;
  background-repeat: no-repeat;
}

.top-nav {
  position: absolute;
  top: 24px;
  left: 24px;
  z-index: 10;
}

.back-btn-glass {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-primary);
  font-size: 20px;
  transition: all 0.3s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.back-btn-glass:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: scale(1.05);
}

.user-container {
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  background-color: transparent;
  padding: 0 24px;
}

.user-profile-header {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  position: relative;
  z-index: 5;
  margin-bottom: 24px;
}

.avatar-area {
  margin-top: -56px;
  cursor: pointer;
  flex-shrink: 0;
}

.avatar-img {
  border: 4px solid var(--el-bg-color-page);
  background-color: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.user-info-actions-wrap {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding-top: 12px;
}

.info-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.nickname {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.login-entry {
  border: none;
  background: transparent;
  margin: 0;
  padding: 0;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.login-entry:hover {
  color: var(--el-color-primary);
}

.login-entry:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 4px;
  border-radius: 6px;
}

.uid {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  padding: 2px 8px;
  border-radius: 12px;
}

.bio-text {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.actions-area {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 4px;
}

.primary-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-more-trigger {
  width: 32px;
  height: 32px;
  border: 1px solid var(--el-border-color);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.75);
  color: var(--el-text-color-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.profile-more-trigger:hover {
  color: var(--el-text-color-primary);
  background: rgba(255, 255, 255, 0.96);
  border-color: var(--el-border-color-dark);
}

.profile-more-trigger:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 2px;
}

.edit-btn {
  font-weight: 500;
}

.firefly-icon-btn-wrapper {
  position: relative;
  display: inline-flex;
}

.firefly-svg-icon {
  width: 20px;
  height: 20px;
  display: block;
  object-fit: contain;
}

.glowing-red-dot {
  position: absolute;
  top: 0;
  right: 0;
  width: 10px;
  height: 10px;
  background-color: #ff4757;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(255, 71, 87, 0.6);
  animation: red-pulse 1.5s infinite;
  pointer-events: none;
}

:deep(.danger-dropdown-item) {
  color: var(--el-color-danger);
}

.dropdown-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  vertical-align: middle;
  object-fit: contain;
}
</style>

<style>
/* 全局样式覆盖，用于设置 el-dropdown 的圆角 */
.profile-action-popper.el-popper {
  border-radius: 12px !important;
  overflow: hidden;
}

.profile-action-popper .el-dropdown-menu {
  padding: 6px 0;
}

.profile-action-popper .el-dropdown-menu__item {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  font-size: 14px;
}
</style>

<style scoped>
@media (max-width: 768px) {
  .banner-area {
    height: 150px;
  }

  .user-container {
    padding: 0 16px;
  }

  .user-profile-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 24px;
  }

  .avatar-area {
    margin-top: -42px;
  }

  :deep(.el-avatar) {
    width: 84px !important;
    height: 84px !important;
  }

  .user-info-actions-wrap {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    padding-top: 0;
    gap: 16px;
  }

  .info-area {
    flex: none;
    width: 100%;
  }

  .actions-area {
    width: 100%;
    justify-content: flex-end;
    position: absolute;
    top: 0;
    right: 0;
    margin-top: 12px;
  }

  .primary-actions {
    gap: 8px;
  }

  .nickname {
    font-size: 20px;
    white-space: nowrap;
  }

  .login-entry {
    font-size: 20px;
    white-space: nowrap;
  }
}

@keyframes red-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7);
  }

  70% {
    box-shadow: 0 0 0 6px rgba(255, 71, 87, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(255, 71, 87, 0);
  }
}
</style>
