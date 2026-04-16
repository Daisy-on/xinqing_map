<template>
  <div class="content-area">
    <div class="section-title-row">
      <h2 class="section-title">我的动态</h2>
      <span class="section-count">{{ posts.length }}</span>
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
            <span class="privacy-tag"><el-icon><Lock /></el-icon> 仅自己可见</span>
          </div>
          <div class="header-actions" @click.stop>
            <button class="edit-post-btn" type="button" :aria-label="`编辑帖子 ${post.id}`" @click="emit('edit-post', post)">
              <el-icon><EditPen /></el-icon>
            </button>
            <el-dropdown trigger="click" @command="onPostDropdownCommand($event, post)" @click.stop>
              <div class="header-right" @click.stop>
                <el-icon><MoreFilled /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="delete" :disabled="isPostDeleting(post.id)" class="danger-dropdown-item">
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
import { EditPen, Lock, Location, MoreFilled } from '@element-plus/icons-vue'
import type { UserPostItem } from '@/api/user'

const props = defineProps<{
  posts: UserPostItem[]
  loading: boolean
  deletingPostIds: number[]
}>()

const emit = defineEmits<{
  (event: 'open-post', postId: number): void
  (event: 'edit-post', post: UserPostItem): void
  (event: 'delete-post', post: UserPostItem): void
}>()

const isPostDeleting = (postId: number) => props.deletingPostIds.includes(postId)

const onPostDropdownCommand = (command: string | number | Record<string, unknown>, post: UserPostItem) => {
  if (String(command) === 'delete') {
    emit('delete-post', post)
  }
}
</script>

<style scoped>
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  margin-bottom: 24px;
}

.section-title {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: #333;
  letter-spacing: 0.1em;
}

.section-count {
  font-size: 15px;
  color: var(--el-text-color-secondary);
  font-weight: 400;
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
  padding: 60px 0;
}

@media (max-width: 768px) {
  .grid-list {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
