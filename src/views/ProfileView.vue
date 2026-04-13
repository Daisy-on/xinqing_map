<template>
  <div class="profile-layout">
    <!-- Banner Area -->
    <div class="banner-area">
      <div class="banner-bg"></div>
      <!-- 悬浮返回按钮 -->
      <div class="top-nav">
        <div class="back-btn-glass" @click="router.push('/')">
          <el-icon><ArrowLeft /></el-icon>
        </div>
      </div>
    </div>

    <!-- User Information Section 交叠层 -->
    <div class="user-container">
      <div class="user-profile-header">
        <div class="avatar-area" @click="handleAvatarClick">
          <el-avatar 
            :size="112" 
            :src="userInfo?.avatar" 
            class="avatar-img"
          >
            <el-icon v-if="!userInfo?.avatar" :size="50"><UserFilled /></el-icon>
          </el-avatar>
        </div>
        
        <div class="user-info-actions-wrap">
          <div class="info-area">
            <div class="title-row">
              <h1 v-if="isLoggedIn" class="nickname">{{ userInfo?.nickname || '心晴用户' }}</h1>
              <button
                v-else
                type="button"
                class="login-entry"
                @click="router.push('/auth')"
              >
                点击登录
              </button>
              <span class="uid" v-if="isLoggedIn">UID: {{ userInfo?.account || '-' }}</span>
            </div>
            
            <p class="bio-text" v-if="!isLoggedIn">登录后体验更多功能，记录你的心情地图。</p>
          </div>

          <div class="actions-area" v-if="isLoggedIn">
            <div class="primary-actions">
              <el-button class="edit-btn trend-btn" round @click="router.push('/mood/trend')">
                心情趋势
              </el-button>
              <el-button class="edit-btn mood-btn" round @click="router.push('/mood/calendar')">心情打卡</el-button>
              <div class="firefly-icon-btn-wrapper">
                <el-button class="icon-btn firefly-btn" circle @click="handleFireflyClick">
                  <el-icon><MagicStick /></el-icon>
                </el-button>
                <span v-if="letterStore.hasUnreadLetter" class="glowing-red-dot"></span>
              </div>
            </div>

            <el-dropdown class="profile-more-dropdown" trigger="click" @command="onProfileActionCommand">
              <button type="button" class="profile-more-trigger" aria-label="更多操作">
                <el-icon><MoreFilled /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit-profile">修改个人信息</el-dropdown-item>
                  <el-dropdown-item command="logout" class="danger-dropdown-item">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <!-- 编辑资料弹窗 (TikTok 风格沉浸卡片) -->
      <EditProfileModal 
        v-model:visible="showEditModal"
        :user-info="userInfo"
        @success="handleEditSuccess"
      />

      <!-- 网格瀑布流区 -->
      <div class="content-area">
        <div class="section-title-row">
          <h2 class="section-title">我的动态</h2>
          <span class="section-count">{{ userPosts.length }}</span>
        </div>

        <div class="grid-list">
          <div v-if="!userPosts.length && !loadingPosts" class="empty-state-wrapper">
            <el-empty description="暂无动态" />
          </div>
          <div v-else-if="loadingPosts" class="empty-state-wrapper">
            <el-skeleton animated :rows="3" />
          </div>
          <div v-else class="content-card" v-for="post in userPosts" :key="'post-'+post.id" @click="router.push('/post/' + post.id)">
            <div class="card-header">
              <div class="header-left">
                <span class="date">{{ post.createTime.slice(5, 10).replace('-', '月') }}日</span>
                <span class="time">{{ post.createTime.slice(11, 16) }}</span>
                <span class="privacy-tag"><el-icon><Lock /></el-icon> 仅自己可见</span>
              </div>
              <div class="header-actions" @click.stop>
                <button class="edit-post-btn" type="button" :aria-label="`编辑帖子 ${post.id}`" @click="handleEditPost(post)">
                  <el-icon><EditPen /></el-icon>
                </button>
                <el-dropdown
                  trigger="click"
                  @command="onPostDropdownCommand($event, post)"
                  @click.stop
                >
                  <div class="header-right" @click.stop>
                    <el-icon><MoreFilled /></el-icon>
                  </div>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item
                        command="delete"
                        :disabled="isPostDeleting(post.id)"
                        class="danger-dropdown-item"
                      >
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
            </div>
            <div class="card-body">
              <h3 class="card-title"><el-icon style="margin-right:4px;vertical-align:-2px"><Location /></el-icon>{{ post.locationName || '分享瞬间' }}</h3>
              <p class="card-desc">{{ post.content || '...' }}</p>
              <div class="card-media" v-if="post.imageUrls && post.imageUrls.length > 0">
                <img :src="post.imageUrls[0]" class="post-img" alt="post cover" />
              </div>
            </div>
            <div class="card-footer">
              <div class="action-btn">
                <el-icon><Star /></el-icon> <span>{{ post.likeCount || 0 }}</span>
              </div>
              <div class="action-btn">
                <el-icon><ChatRound /></el-icon> <span>0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, UserFilled, Message, Lock, Star, MoreFilled, ChatRound, Location, EditPen, MagicStick } from '@element-plus/icons-vue'
import { deletePost } from '@/api/post'
import { fetchCurrentUser, fetchUserPosts, type UserPostItem } from '@/api/user'
import type { User } from '@/types/models'
import EditProfileModal from '@/components/profile/EditProfileModal.vue'
import { useLetterStore } from '@/stores/letter'
import {
  AUTH_STORAGE_CHANGED_EVENT,
  clearAuthSession,
  getStoredUserInfo,
  getToken,
  setStoredUserInfo,
  syncAuthStorageState,
} from '@/utils/auth'

const router = useRouter()
const letterStore = useLetterStore()

const handleFireflyClick = () => {
  letterStore.markAsRead()
  router.push('/firefly')
}

const handleFrontendLogout = () => {
  clearAuthSession()
  resetProfileState()
  ElMessage.success('已退出登录')
  router.push('/auth')
}

const onProfileActionCommand = (command: string | number | Record<string, unknown>) => {
  const normalized = String(command)
  if (normalized === 'edit-profile') {
    showEditModal.value = true
    return
  }

  if (normalized === 'logout') {
    handleFrontendLogout()
  }
}

const isLoggedIn = ref(false)
const userInfo = ref<User | null>(null)
const showEditModal = ref(false)

const userPosts = ref<UserPostItem[]>([])
const loadingPosts = ref(false)
const deletingPostIds = ref<number[]>([])

const resetProfileState = () => {
  isLoggedIn.value = false
  userInfo.value = null
  userPosts.value = []
  showEditModal.value = false
}

const handleEditSuccess = (updatedUser: User) => {
  if (userInfo.value && getToken()) {
    userInfo.value = {
      ...userInfo.value,
      ...updatedUser,
    }
    setStoredUserInfo(userInfo.value)
  }
}

const sortPostsByTimeDesc = (posts: UserPostItem[]) => {
  return [...posts].sort((left, right) => {
    return new Date(right.createTime).getTime() - new Date(left.createTime).getTime()
  })
}

const loadUserPosts = async () => {
  loadingPosts.value = true
  try {
    const posts = await fetchUserPosts()
    userPosts.value = sortPostsByTimeDesc(posts)
  } catch (error) {
    console.error('Failed to fetch user posts', error)
    userPosts.value = []
  } finally {
    loadingPosts.value = false
  }
}

const bootstrapProfile = async () => {
  if (!syncAuthStorageState()) {
    resetProfileState()
    return
  }

  isLoggedIn.value = true
  const cachedUser = getStoredUserInfo()
  if (cachedUser?.id) {
    userInfo.value = cachedUser
  }

  try {
    const currentUser = await fetchCurrentUser()
    userInfo.value = {
      ...(cachedUser || {}),
      ...currentUser,
    }
    setStoredUserInfo(userInfo.value)
    await loadUserPosts()
  } catch (error: any) {
    console.error('Failed to fetch current user', error)
    const status = error?.response?.status
    const code = error?.response?.data?.code

    if (status === 401 || code === 401) {
      clearAuthSession()
      resetProfileState()
      return
    }

    if (cachedUser?.id) {
      userInfo.value = cachedUser
      await loadUserPosts()
      return
    }

    resetProfileState()
  }
}

const syncProfileAuthState = () => {
  if (!getToken()) {
    syncAuthStorageState()
    resetProfileState()
    return
  }

  if (!isLoggedIn.value) {
    void bootstrapProfile()
  }
}

const handleStorageEvent = (event: StorageEvent) => {
  if (event.storageArea !== localStorage) return
  if (event.key !== 'token' && event.key !== 'userInfo') return
  syncProfileAuthState()
}

onMounted(() => {
  void bootstrapProfile()
  window.addEventListener('storage', handleStorageEvent)
  window.addEventListener(AUTH_STORAGE_CHANGED_EVENT, syncProfileAuthState)
  window.addEventListener('focus', syncProfileAuthState)
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleStorageEvent)
  window.removeEventListener(AUTH_STORAGE_CHANGED_EVENT, syncProfileAuthState)
  window.removeEventListener('focus', syncProfileAuthState)
})

const handleAvatarClick = () => {
  if (!isLoggedIn.value) {
    router.push('/auth')
  }
}

const isPostDeleting = (postId: number) => deletingPostIds.value.includes(postId)

const handleEditPost = (post: UserPostItem) => {
  router.push({
    path: '/compose',
    query: {
      postId: String(post.id),
      from: '/profile',
    },
  })
}

const handlePostMenuCommand = async (command: string, post: UserPostItem) => {
  if (command !== 'delete') {
    return
  }

  if (isPostDeleting(post.id)) {
    return
  }

  try {
    await ElMessageBox.confirm('删除后不可恢复，确认删除这条动态吗？', '删除动态', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
      distinguishCancelAndClose: true,
    })
  } catch {
    return
  }

  deletingPostIds.value = [...deletingPostIds.value, post.id]
  try {
    await deletePost(post.id)
    userPosts.value = userPosts.value.filter((item) => item.id !== post.id)
    ElMessage.success('删除成功')
  } catch (error) {
    console.error('Failed to delete post', error)
    ElMessage.error('删除失败，请稍后重试')
  } finally {
    deletingPostIds.value = deletingPostIds.value.filter((id) => id !== post.id)
  }
}

const onPostDropdownCommand = (command: string | number | Record<string, unknown>, post: UserPostItem) => {
  return handlePostMenuCommand(String(command), post)
}

const getMockColor = (index: number) => {
  const colors = ['#eef2ff', '#fdf4ff', '#f0fdf4', '#fffbeb', '#f8fafc']
  return colors[index % colors.length]
}
</script>

<style scoped>
.profile-layout {
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
}

.banner-area {
  position: relative;
  width: 100%;
  height: 240px;
}

.banner-bg {
  width: 100%;
  height: 100%;
  background: linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%);
  object-fit: cover;
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

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 2px 2px 0;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  letter-spacing: 0.02em;
}

.section-count {
  min-width: 28px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.content-area {
  min-height: 400px;
}

.grid-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding-bottom: 40px;
}

.content-card {
  background: var(--el-bg-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.content-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.privacy-tag {
  display: flex;
  align-items: center;
  gap: 2px;
  background: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.header-right {
  color: var(--el-text-color-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.header-right:hover {
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-light);
}

.edit-post-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.edit-post-btn:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}

.edit-post-btn:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 2px;
}

:deep(.danger-dropdown-item) {
  color: var(--el-color-danger);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  margin: 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.card-media {
  margin-top: 4px;
  width: 100%;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.post-img {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
.edit-post-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.edit-post-btn:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color-light);
}
.edit-post-btn:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 2px;
}
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding-top: 12px;
  margin-top: 4px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  transition: color 0.2s;
}

.action-btn:hover {
  color: var(--el-color-primary);
}

.empty-state-wrapper {
  padding: 60px 0;
}

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
  }

  .primary-actions {
    gap: 8px;
  }

  /* Or position actions next to avatar */
  .actions-area {
    position: absolute;
    top: 0;
    right: 0;
    margin-top: 12px;
  }
  
  .nickname {
    font-size: 20px;
    white-space: nowrap;
  }

  .login-entry {
    font-size: 20px;
    white-space: nowrap;
  }
  
  .grid-list {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}

.firefly-icon-btn-wrapper {
  position: relative;
  display: inline-flex;
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

.icon-btn.firefly-btn {
  /* give it a slight glow if we want, or keep it standard */
}

@keyframes red-pulse {
  0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(255, 71, 87, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
}
</style>


