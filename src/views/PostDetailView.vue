<template>
  <div class="post-detail-page">
    <div class="top-nav">
      <div class="back-btn-glass" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
      </div>
      <h2>动态详情</h2>
    </div>

    <div v-if="post" class="post-content">
      <div class="post-header">
        <div class="location-badge">
          <el-icon><Location /></el-icon> {{ post.locationName || '未知地点' }}
        </div>
        <div class="time-text">{{ post.createTime }}</div>
      </div>

      <div class="emotion-tag" :style="{ backgroundColor: post.emotionTagColor + '20', color: post.emotionTagColor }">
        {{ post.emotionTagName }}
      </div>

      <p class="content-text">{{ post.content }}</p>

      <div v-if="post.imageUrls && post.imageUrls.length" class="image-gallery">
        <el-image 
          v-for="(img, idx) in post.imageUrls" 
          :key="idx" 
          :src="img" 
          :preview-src-list="post.imageUrls"
          fit="cover"
          class="gallery-image"
        />
      </div>

      <div class="interaction-bar">
        <div class="action-item">
          <el-icon><Star /></el-icon> {{ post.likeCount || 0 }} 点赞
        </div>
        <div v-if="post.reactionSummary" class="reactions">
          <span class="reaction"><span class="emoji">👏</span> {{ post.reactionSummary.support }}</span>
          <span class="reaction"><span class="emoji">🫂</span> {{ post.reactionSummary.relax }}</span>
          <span class="reaction"><span class="emoji">❤️</span> {{ post.reactionSummary.anxious }}</span>
        </div>
      </div>
    </div>
    
    <div v-else-if="loading" class="loading-state">
      <el-skeleton animated />
    </div>
    
    <div v-else class="error-state">
      <el-empty description="动态不存在或已被删除" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Location, Star } from '@element-plus/icons-vue'
import { fetchPostDetail } from '@/api/post'
import type { PostItem } from '@/types/models'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const post = ref<PostItem | null>(null)
const loading = ref(true)

onMounted(async () => {
  const postId = Number(route.params.id)
  if (!postId) return
  
  try {
    post.value = await fetchPostDetail(postId)
  } catch (error) {
    ElMessage.error('无法获取动态详情')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.post-detail-page {
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
  padding-bottom: 40px;
}

.top-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.top-nav h2 {
  margin: 0 0 0 16px;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.back-btn-glass {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-primary);
  font-size: 18px;
  transition: all 0.3s;
}

.back-btn-glass:hover {
  background: var(--el-fill-color);
  transform: scale(1.05);
}

.post-content {
  max-width: 800px;
  margin: 24px auto;
  padding: 32px;
  background: var(--el-bg-color);
  border-radius: 20px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.04);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.location-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  font-weight: 600;
  color: #1a425a;
}

.time-text {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.emotion-tag {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 24px;
}

.content-text {
  font-size: 16px;
  line-height: 1.8;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  margin: 0 0 24px 0;
}

.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 32px;
}

.gallery-image {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
}

.interaction-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.action-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-regular);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.reactions {
  display: flex;
  gap: 16px;
}

.reaction {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.loading-state, .error-state {
  max-width: 800px;
  margin: 40px auto;
  padding: 0 24px;
}

@media (max-width: 768px) {
  .post-content {
    margin: 16px;
    padding: 24px 20px;
  }
}
</style>
