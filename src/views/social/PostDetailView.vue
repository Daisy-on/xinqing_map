<template>
  <div class="post-detail-layout">
    <!-- Top Nav -->
    <div class="header-nav">
      <div class="icon-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
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
      </div>
      
      <div v-else class="error-state">
        <el-empty description="文章不存在或已被删除" />
      </div>
    </div>

    <!-- Bottom Action Bar (Fixed) -->
    <div class="bottom-action-bar">
      <div class="action-bar-inner">
        <div class="like-action-btn" aria-label="点赞数">
          <svg class="like-icon" viewBox="0 0 1024 1024" aria-hidden="true">
            <path d="M512 917.6 123.4 518.8c-85.2-87.2-81-227.3 9.4-309.1 86.6-78.5 218.8-73.2 300.1 9.9L512 245.4l79.1-25.8c81.3-83.1 213.5-88.4 300.1-9.9 90.4 81.8 94.6 221.9 9.4 309.1L512 917.6z" />
          </svg>
          <span class="count">{{ post?.likeCount || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, UserFilled, Male, Female } from '@element-plus/icons-vue'
import { fetchPostDetail } from '@/api/post'
import type { PostItem, User } from '@/types/models'
import { getStoredUserInfo } from '@/utils/auth'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const post = ref<PostItem | null>(null)
type PostAuthorInfo = Pick<User, 'id' | 'nickname' | 'avatar'>

const author = ref<PostAuthorInfo | null>(null)

const mockReadCount = computed(() => {
  if (!post.value) return 1
  return (post.value.id * 17 % 150) + 12
})

const formattedTime = computed(() => {
  const sourceTime = post.value?.updateTime || post.value?.createTime
  if (!sourceTime) return '未知时间'

  const d = new Date(sourceTime)
  if (Number.isNaN(d.getTime())) return '未知时间'

  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `最后更新于 ${month}-${day} ${h}:${m}`
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

    const cachedUser = getStoredUserInfo()
    if (cachedUser?.id === postData.userId) {
      author.value = {
        id: cachedUser.id,
        nickname: cachedUser.nickname,
        avatar: cachedUser.avatar,
      }
      return
    }

    if (postData.userId) {
      author.value = {
        id: postData.userId,
        nickname: postData.nickname || '心晴用户',
        avatar: postData.avatar,
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
  height: 100vh;
  background-color: var(--el-bg-color);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
    min-height: 0;
    overflow-y: auto;
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
  justify-content: flex-start;
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
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px 96px 20px;
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
  margin-bottom: 8px;
}

.read-count {
  font-size: 13px;
  color: var(--el-text-color-secondary);
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
  justify-content: flex-end;
  padding: 0 16px;
}

.like-action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border-radius: 0;
  background-color: transparent;
  color: var(--el-text-color-secondary);
  transition: color 0.2s;
}

.like-icon {
  width: 18px;
  height: 18px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 78;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.like-action-btn .count {
  font-size: 14px;
  font-weight: 500;
  min-width: 20px;
}
</style>
