<template>
  <div class="content-area">
    <div class="section-title-row qq-space-nav">
      <div class="nav-item active">
        <span class="nav-value count">{{ posts.length }}</span>
        <span class="nav-label">我的动态</span>
      </div>
      <div class="nav-actions">
        <div class="nav-item" @click="emit('mood-trend')">
          <div class="nav-value icon">
            <img src="@/assets/icon/heart-dance.svg" class="nav-svg-icon" alt="趋势" />
          </div>
          <span class="nav-label">心情趋势</span>
        </div>
        <div class="nav-item" @click="emit('mood-calendar')">
          <div class="nav-value icon">
            <img src="@/assets/icon/daka.svg" class="nav-svg-icon" alt="打卡" />
          </div>
          <span class="nav-label">心情打卡</span>
        </div>
        <div class="nav-item firefly-action" @click="emit('firefly')">
          <div class="nav-value icon firefly-icon-btn-wrapper">
            <img src="@/assets/icon/yinghuochong.svg" class="firefly-svg-icon" alt="" />
            <span v-if="hasUnreadLetter" class="glowing-red-dot"></span>
          </div>
          <span class="nav-label">萤火虫</span>
        </div>
      </div>
    </div>

    <div class="grid-list">
      <div v-if="!posts.length && !loading" class="empty-state-wrapper">
        <el-empty description="暂无动态" />
      </div>
      <div v-else-if="loading" class="empty-state-wrapper">
        <el-skeleton animated :rows="3" />
      </div>
      <div v-else class="content-card" v-for="post in posts" :key="'post-' + post.id" @click="emit('open-post', post.id)">
        <div class="card-header">
          <div class="header-left">
            <span class="date">{{ post.createTime.slice(5, 10).replace('-', '月') }}日</span>
            <span class="time">{{ post.createTime.slice(11, 16) }}</span>
          </div>
          <div class="header-actions" @click.stop>
            <button class="edit-post-btn" type="button" :aria-label="`编辑帖子 ${post.id}`" @click="emit('edit-post', post)">
              <el-icon><EditPen /></el-icon>
            </button>
            <button 
              class="delete-post-btn" 
              type="button" 
              :aria-label="`删除帖子 ${post.id}`" 
              @click="onDeleteClick(post)"
              :disabled="isPostDeleting(post.id)"
            >
              <img src="@/assets/icon/delete.svg" class="delete-svg-icon" alt="删除" />
            </button>
          </div>
        </div>
        <div class="card-body">
          <h3 class="card-title"><el-icon style="margin-right: 4px; vertical-align: -2px"><Location /></el-icon>{{ post.locationName || '分享瞬间' }}</h3>
          <p class="card-desc">{{ post.content || '...' }}</p>
          <div class="card-media" v-if="post.imageUrls && post.imageUrls.length > 0">
            <img :src="post.imageUrls[0]" class="post-img" alt="post cover" />
          </div>
        </div>
        <div class="card-footer">
          <div class="action-btn like-action">
            <svg class="heart-icon" viewBox="0 0 1024 1024" aria-hidden="true">
              <path d="M512 917.6 123.4 518.8c-85.2-87.2-81-227.3 9.4-309.1 86.6-78.5 218.8-73.2 300.1 9.9L512 245.4l79.1-25.8c81.3-83.1 213.5-88.4 300.1-9.9 90.4 81.8 94.6 221.9 9.4 309.1L512 917.6z" />
            </svg>
            <span>{{ post.likeCount || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EditPen, Location } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import type { UserPostItem } from '@/api/user'

const props = defineProps<{
  posts: UserPostItem[]
  loading: boolean
  deletingPostIds: number[]
  hasUnreadLetter: boolean
}>()

const emit = defineEmits<{
  (event: 'open-post', postId: number): void
  (event: 'edit-post', post: UserPostItem): void
  (event: 'delete-post', post: UserPostItem): void
  (event: 'mood-trend'): void
  (event: 'mood-calendar'): void
  (event: 'firefly'): void
}>()

const isPostDeleting = (postId: number) => props.deletingPostIds.includes(postId)

const onDeleteClick = (post: UserPostItem) => {
  ElMessageBox.confirm(
    '确定要删除这条心声吗？删除后将无法找回。',
    '提示',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      roundButton: true,
      buttonSize: 'default',
      customClass: 'custom-message-box',
      lockScroll: false
    }
  ).then(() => {
    emit('delete-post', post)
  }).catch(() => {
    // 取消删除
  })
}
</script>

<style scoped>
.section-title-row {
  margin-bottom: 24px;
}

.qq-space-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--el-bg-color);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.nav-actions {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: opacity 0.2s;
  position: relative;
}

.nav-item:hover {
  opacity: 0.8;
}

.nav-item.active .nav-value {
  color: var(--el-color-primary);
  font-weight: 600;
}

.nav-item.active .nav-label {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.nav-value {
  font-size: 18px;
  color: var(--el-text-color-regular);
  margin-bottom: 4px;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-value.count {
  font-family: var(--el-font-family);
  font-size: 20px;
}

.nav-value.icon {
  font-size: 22px;
}

.nav-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.nav-svg-icon {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.firefly-icon-btn-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.firefly-svg-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.glowing-red-dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 8px;
  height: 8px;
  background-color: #ff4757;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(255, 71, 87, 0.6);
  animation: red-pulse 1.5s infinite;
  pointer-events: none;
}

@keyframes red-pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

@media (max-width: 768px) {
  .qq-space-nav {
    padding: 10px 12px;
  }
  .nav-actions {
    gap: 16px;
  }
  .nav-value.count {
    font-size: 18px;
  }
  .nav-value.icon {
    font-size: 20px;
  }
  .nav-svg-icon {
    width: 22px;
    height: 22px;
  }
  .nav-label {
    font-size: 11px;
  }
  .firefly-svg-icon {
    width: 20px;
    height: 20px;
  }
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

.delete-post-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.delete-post-btn:hover {
  background: #fff0f0;
}

.delete-svg-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.delete-post-btn:hover .delete-svg-icon {
  opacity: 1;
}

.edit-post-btn:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 2px;
}
</style>

<style>
/* 消息确认框全局样式优化 */
.custom-message-box {
  border-radius: 16px;
}
.custom-message-box .el-message-box__header {
  padding-top: 10px;
}
.custom-message-box .el-message-box__content {
  padding-bottom: 10px;
}
.custom-message-box .el-message-box__btns {
  padding-bottom: 10px;
}
</style>

<style scoped>
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
  color: var(--el-text-color-secondary);
}

.like-action {
  gap: 6px;
}

.heart-icon {
  width: 16px;
  height: 16px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 78;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.empty-state-wrapper {
  grid-column: 1 / -1;
  width: 100%;
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

@media (max-width: 768px) {
  .grid-list {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
