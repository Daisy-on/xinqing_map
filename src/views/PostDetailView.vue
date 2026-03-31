<template>
  <div class="post-detail-layout">
    <!-- Top Nav -->
    <div class="header-nav">
      <div class="icon-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
      </div>
      <div class="icon-btn">
        <el-icon><MoreFilled /></el-icon>
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="main-content">
      <div v-if="loading" class="loading-state">
        <el-skeleton animated :rows="5" />
      </div>
      
      <div v-else-if="post" class="post-container">
        <!-- Author Info -->
        <div class="author-info">
          <el-avatar :size="44" :src="author?.avatar" class="avatar">
            <el-icon v-if="!author?.avatar" :size="24"><UserFilled /></el-icon>
          </el-avatar>
          <div class="author-meta">
            <div class="author-name-row">
              <span class="nickname">{{ author?.nickname || '心晴用户' }}</span>
              <!-- Mock gender -->
              <el-icon v-if="(author?.id || 1) % 2 === 1" class="gender-icon male"><Male /></el-icon>
              <el-icon v-else class="gender-icon female"><Female /></el-icon>
            </div>
            <div class="author-time-loc">
              <span>{{ formattedTime }}</span>
              <span v-if="post.locationName" class="dot-separator">&nbsp;</span>
              <span v-if="post.locationName">{{ post.locationName }}</span>
            </div>
          </div>
        </div>

        <!-- Post Content -->
        <div class="post-body">
          <div class="post-text">{{ post.content }}</div>
          <div v-if="post.imageUrls && post.imageUrls.length > 0" class="post-images">
            <template v-for="(img, idx) in post.imageUrls" :key="idx">
              <el-image 
                :src="img" 
                class="post-image-item" 
                fit="cover" 
                :preview-src-list="post.imageUrls" 
                :initial-index="idx"
                hide-on-click-modal
              >
                <template #placeholder>
                  <div class="image-placeholder"><el-skeleton-item variant="image" style="width: 100%; height: 100%;" /></div>
                </template>
              </el-image>
            </template>
          </div>
        </div>

        <!-- Meta Footer -->
        <div class="post-meta-footer">
          <span class="read-count">阅读 {{ mockReadCount }}</span>
        </div>

        <div class="divider"></div>

        <!-- Comments Section -->
        <div class="comments-section">
          <h3 class="comments-title">0 评论</h3>
          
          <div class="empty-comments">
            <div class="lamp-illustration">
              <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
                <path d="M35 50 Q60 10 85 50" fill="#f8cd9a" />
                <path d="M30 50 L90 50 L90 55 L30 55 Z" fill="#e99e63" />
                <circle cx="60" cy="55" r="9" fill="#fcea79" />
                <path d="M45 64 L75 64 L100 110 L20 110 Z" fill="url(#grad-light)" />
                <path d="M40 80 Q43 80 43 83 Q43 80 46 80 Q43 80 43 77 Q43 80 40 80 Z" fill="#fff" />
                <path d="M75 90 Q77 90 77 92 Q77 90 79 90 Q77 90 77 88 Q77 90 75 90 Z" fill="#fff" opacity="0.8"/>
                <defs>
                  <linearGradient id="grad-light" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#fcea79" stop-opacity="0.4" />
                    <stop offset="100%" stop-color="#fcea79" stop-opacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p class="empty-text">还没有评论</p>
          </div>
        </div>
      </div>
      
      <div v-else class="error-state">
        <el-empty description="文章不存在或已被删除" />
      </div>
    </div>

    <!-- Bottom Action Bar (Fixed) -->
    <div class="bottom-action-bar">
      <div class="action-bar-inner">
        <div class="comment-input-btn">
          <span>我来评论...</span>
        </div>
        <div class="action-icons">
          <div class="action-item">
            <el-icon class="icon"><Star /></el-icon>
            <span class="count">{{ post?.likeCount || 0 }}</span>
          </div>
          <div class="action-item">
            <el-icon class="icon"><ChatRound /></el-icon>
            <span class="count">0</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, MoreFilled, UserFilled, Star, ChatRound, Male, Female } from '@element-plus/icons-vue'
import { fetchPostDetail } from '@/api/post'
import { fetchUserInfo } from '@/api/user'
import type { PostItem, User } from '@/types/models'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const post = ref<PostItem | null>(null)
const author = ref<User | null>(null)

const mockReadCount = computed(() => {
  if (!post.value) return 1
  return (post.value.id * 17 % 150) + 12
})

const formattedTime = computed(() => {
  if (!post.value?.createTime) return '未知时间'
  const d = new Date(post.value.createTime)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
})

const goBack = () => {
  if (window.history.state && window.history.state.back) {
    router.back()
  } else {
    router.replace('/profile')
  }
}

onMounted(async () => {
  const idStr = route.params.id as string
  if (!idStr) {
    loading.value = false
    return
  }
  
  const id = parseInt(idStr, 10)
  try {
    const postData = await fetchPostDetail(id)
    post.value = postData
    
    if (postData.userId) {
      try {
        const userData = await fetchUserInfo(postData.userId)
        author.value = userData
      } catch (err) {
        console.warn('Failed to fetch user info', err)
      }
    }
  } catch (error) {
    console.error('Failed to load post detail:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.post-detail-layout {
  min-height: 100vh;
  background-color: var(--el-bg-color);
  position: relative;
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .post-detail-layout {
    background-color: var(--el-bg-color-page);
    align-items: center;
  }
  .header-nav, .main-content, .bottom-action-bar {
    width: 100%;
    max-width: 640px;
    background-color: var(--el-bg-color);
  }
  .main-content {
    min-height: 100vh;
    border-left: 1px solid var(--el-border-color-light);
    border-right: 1px solid var(--el-border-color-light);
  }
  .header-nav {
    border-left: 1px solid var(--el-border-color-light);
    border-right: 1px solid var(--el-border-color-light);
  }
  .bottom-action-bar {
    border-left: 1px solid var(--el-border-color-light);
    border-right: 1px solid var(--el-border-color-light);
    left: 50% !important;
    transform: translateX(-50%);
  }
}

.header-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  height: 56px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  background-color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
}

.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.icon-btn:hover {
  background-color: var(--el-fill-color-light);
}

.main-content {
  flex: 1;
  padding: 16px 20px 80px 20px;
}

.loading-state, .error-state {
  padding-top: 40px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.author-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nickname {
  font-size: 16px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.gender-icon {
  font-size: 14px;
}
.gender-icon.male {
  color: #409eff;
}
.gender-icon.female {
  color: #ff75c3;
}

.author-time-loc {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  display: flex;
  align-items: center;
}

.dot-separator {
  color: var(--el-text-color-placeholder);
}

.post-body {
  margin-bottom: 24px;
}

.post-text {
  font-size: 16px;
  line-height: 1.6;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 12px;
}

.post-images {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.post-image-item {
  width: 100%;
  max-height: 400px;
  border-radius: 12px;
  overflow: hidden;
}

.post-meta-footer {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.read-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.divider {
  height: 1px;
  background-color: var(--el-border-color-lighter);
  margin: 0 -20px 20px -20px;
}

.comments-section {
  padding-bottom: 20px;
}

.comments-title {
  margin: 0 0 24px 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.empty-comments {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: var(--el-text-color-secondary);
}

.lamp-illustration {
  width: 120px;
  height: 120px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 14px;
}

.bottom-action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 20;
}

.action-bar-inner {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  gap: 16px;
}

.comment-input-btn {
  flex: 1;
  height: 36px;
  background-color: var(--el-fill-color-light);
  border-radius: 18px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  color: var(--el-text-color-placeholder);
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.comment-input-btn:hover {
  background-color: var(--el-fill-color);
}

.action-icons {
  display: flex;
  align-items: center;
  gap: 20px;
}

.action-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: color 0.2s;
}

.action-item:hover {
  color: var(--el-color-primary);
}

.action-item .icon {
  font-size: 20px;
}

.action-item .count {
  font-size: 14px;
  font-weight: 500;
}
</style>
