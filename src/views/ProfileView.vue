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
            <el-button class="edit-btn" round>编辑资料</el-button>
            <el-button class="icon-btn" circle @click="handleInbox">
              <el-icon><Message /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <!-- 纯净风格导航 Tabs -->
      <div class="custom-tabs">
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'posts' }"
          @click="activeTab = 'posts'"
        >
          动态 {{ userPosts.length }}
        </div>
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'likes' }"
          @click="activeTab = 'likes'"
        >
          <el-icon class="tab-icon" v-if="activeTab !== 'likes'" style="margin-right: 4px"><Lock /></el-icon> 喜欢
        </div>
        <div 
          class="tab-item" 
          :class="{ active: activeTab === 'favorites' }"
          @click="activeTab = 'favorites'"
        >
          收藏
        </div>
      </div>

      <!-- 网格瀑布流区 -->
      <div class="content-area">
        <Transition name="el-fade-in-linear" mode="out-in">
          <!-- 动态（作品） -->
          <div v-if="activeTab === 'posts'" class="grid-list">
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
                <div class="header-right" @click.stop>
                  <el-icon><MoreFilled /></el-icon>
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

          <!-- 喜欢 -->
          <div v-else-if="activeTab === 'likes'" class="empty-state-wrapper">
             <el-empty description="仅自己可见" />
          </div>

          <!-- 收藏 -->
          <div v-else-if="activeTab === 'favorites'" class="empty-state-wrapper">
             <el-empty description="暂无收藏" />
          </div>
        </Transition>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, UserFilled, Message, Lock, Star, MoreFilled, ChatRound, Location } from '@element-plus/icons-vue'
import { fetchPostList } from '@/api/post'
import { fetchCurrentUser } from '@/api/user'
import { fetchLocationList } from '@/api/location'
import type { PostItem } from '@/types/models'

const router = useRouter()

const isLoggedIn = ref(false)
const userInfo = ref<any>(null)
const activeTab = ref('posts')

const userPosts = ref<PostItem[]>([])
const loadingPosts = ref(false)

const sortPostsByTimeDesc = (posts: PostItem[]) => {
  return [...posts].sort((left, right) => {
    return new Date(right.createTime).getTime() - new Date(left.createTime).getTime()
  })
}

const loadPostsByLocations = async (userId: number) => {
  const locations = await fetchLocationList()
  const allPostLists = await Promise.all(
    locations.map(async (location) => {
      const result = await fetchPostList({ locationId: location.id, pageSize: 100 })
      return result.records
    }),
  )

  return sortPostsByTimeDesc(allPostLists.flat().filter((post) => post.userId === userId))
}

const loadUserPosts = async () => {
  if (!userInfo.value?.id) return
  loadingPosts.value = true
  try {
    const res = await fetchPostList({ userId: userInfo.value.id })
    if (res.records.length > 0) {
      userPosts.value = sortPostsByTimeDesc(res.records)
      return
    }

    userPosts.value = await loadPostsByLocations(userInfo.value.id)
  } catch (error) {
    console.warn('Direct userId post query failed, falling back to location-based aggregation', error)
    try {
      userPosts.value = await loadPostsByLocations(userInfo.value.id)
    } catch (fallbackError) {
      console.error('Failed to fetch user posts by fallback path', fallbackError)
      userPosts.value = []
    }
  } finally {
    loadingPosts.value = false
  }
}

onMounted(() => {
  const token = localStorage.getItem('token')
  if (token) {
    isLoggedIn.value = true
    try {
      const storedUser = localStorage.getItem('userInfo')
      if (storedUser) {
        userInfo.value = JSON.parse(storedUser)
        if (userInfo.value?.id) {
          loadUserPosts()
        } else {
          fetchCurrentUser()
            .then((currentUser) => {
              userInfo.value = currentUser
              localStorage.setItem('userInfo', JSON.stringify(currentUser))
              return loadUserPosts()
            })
            .catch((error) => {
              console.error('Failed to fetch current user', error)
            })
        }
      } else {
        fetchCurrentUser()
          .then((currentUser) => {
            userInfo.value = currentUser
            localStorage.setItem('userInfo', JSON.stringify(currentUser))
            return loadUserPosts()
          })
          .catch((error) => {
            console.error('Failed to fetch current user', error)
          })
      }
    } catch (e) {
      console.error('Failed to parse userInfo from localStorage')
    }
  }
})

const handleAvatarClick = () => {
  if (!isLoggedIn.value) {
    router.push('/auth')
  }
}

const handleInbox = () => {
  ElMessage.info('消息通知功能开发中')
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
  gap: 12px;
  align-items: center;
  margin-top: 4px; /* Added slight top margin instead of padding-bottom for better alignment with text */
}

.edit-btn {
  font-weight: 500;
}

.custom-tabs {
  display: flex;
  gap: 32px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 24px;
}

.tab-item {
  position: relative;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  padding: 12px 0;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
}

.tab-item:hover {
  color: var(--el-text-color-primary);
}

.tab-item.active {
  color: var(--el-text-color-primary);
  font-weight: 600;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 3px;
  border-radius: 2px;
  background-color: var(--el-color-primary);
}

.tab-icon {
  font-size: 14px;
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
}
.header-right:hover {
  color: var(--el-text-color-primary);
  background: var(--el-fill-color-light);
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

.post-img {
  width: 100%;
  max-height: 220px;
  object-fit: cover;
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
</style>


