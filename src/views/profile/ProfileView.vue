<template>
  <div class="profile-layout">
    <ProfileHeaderSection
      :is-logged-in="isLoggedIn"
      :user-info="userInfo"
      @back="handleBack"
      @avatar-click="handleAvatarClick"
      @login="handleLoginEntry"
      @profile-action="onProfileActionCommand"
    />

      <!-- 编辑资料弹窗 (抖音 风格沉浸卡片) -->
    <div class="profile-content-wrap">
      <EditProfileModal 
        v-model:visible="showEditModal"
        :user-info="userInfo"
        @success="handleEditSuccess"
      />
      <ProfilePostsGrid
        :posts="userPosts"
        :loading="loadingPosts"
        :deleting-post-ids="deletingPostIds"
        :has-unread-letter="letterStore.hasUnreadLetter"
        @open-post="handleOpenPost"
        @edit-post="handleEditPost"
        @delete-post="handleDeletePost"
        @mood-trend="handleMoodTrend"
        @mood-calendar="handleMoodCalendar"
        @firefly="handleFireflyClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { deletePost } from '@/api/post'
import { fetchCurrentUser, fetchUserPosts, type UserPostItem } from '@/api/user'
import type { User } from '@/types/models'
import EditProfileModal from '@/components/modal/EditProfileModal.vue'
import ProfileHeaderSection from '@/components/profile/ProfileHeaderSection.vue'
import ProfilePostsGrid from '@/components/profile/ProfilePostsGrid.vue'
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

const handleBack = () => {
  router.push('/')
}

const handleLoginEntry = () => {
  router.push('/auth')
}

const handleMoodTrend = () => {
  router.push({ name: 'mood_trend', query: { from: 'profile' } })
}

const handleMoodCalendar = () => {
  router.push({ name: 'mood-calendar', query: { from: 'profile' } })
}

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

const onProfileActionCommand = (command: 'edit-profile' | 'logout') => {
  if (command === 'edit-profile') {
    showEditModal.value = true
    return
  }

  if (command === 'logout') {
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

const handleOpenPost = (postId: number) => {
  router.push('/post/' + postId)
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

const handleDeletePost = (post: UserPostItem) => {
  return handlePostMenuCommand('delete', post)
}
</script>

<style scoped>
.profile-layout {
  min-height: 100vh;
  background-color: var(--el-bg-color-page);
}

.profile-content-wrap {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
}

@media (max-width: 768px) {
  .profile-content-wrap {
    padding: 0 16px;
  }
}
</style>


