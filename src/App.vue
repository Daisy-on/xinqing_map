<script setup lang="ts">
import { RouterView } from 'vue-router'
import { defineAsyncComponent, onMounted, onBeforeUnmount } from 'vue'
import { useLetterStore } from '@/stores/letter'
import { useMoodStore } from '@/stores/mood'
import { getToken, AUTH_STORAGE_CHANGED_EVENT } from '@/utils/auth'

const letterStore = useLetterStore()
const moodStore = useMoodStore()
const FireflyDeliveryOverlay = defineAsyncComponent(() => import('@/components/common/FireflyDeliveryOverlay.vue'))
const LANDMARK_LIST_REFRESH_EVENT = 'xinqing-map:landmark-list-refresh'
const LANDMARK_LIST_REFRESH_INTERVAL = 5 * 60 * 1000

let landmarkRefreshTimer: ReturnType<typeof window.setInterval> | null = null

// AI辅助生成：Qwen-3.6-plus, 2026-4-9
const handleAuthChange = () => {
  moodStore.clearCache()

  const token = getToken()
  if (token) {
    letterStore.connect(token)
    return
  }

  letterStore.disconnect()
}

const dispatchLandmarkRefresh = () => {
  window.dispatchEvent(new CustomEvent(LANDMARK_LIST_REFRESH_EVENT))
}

const startLandmarkRefreshTimer = () => {
  if (landmarkRefreshTimer !== null) return

  landmarkRefreshTimer = window.setInterval(dispatchLandmarkRefresh, LANDMARK_LIST_REFRESH_INTERVAL)
}

const stopLandmarkRefreshTimer = () => {
  if (landmarkRefreshTimer === null) return

  window.clearInterval(landmarkRefreshTimer)
  landmarkRefreshTimer = null
}

onMounted(() => {
  handleAuthChange()
  window.addEventListener(AUTH_STORAGE_CHANGED_EVENT, handleAuthChange as EventListener)
  startLandmarkRefreshTimer()
})

onBeforeUnmount(() => {
  window.removeEventListener(AUTH_STORAGE_CHANGED_EVENT, handleAuthChange as EventListener)
  stopLandmarkRefreshTimer()
  letterStore.disconnect()
})
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <KeepAlive>
      <component :is="Component" :key="route.name" v-if="route.meta.keepAlive" />
    </KeepAlive>
    <component :is="Component" :key="route.name" v-if="!route.meta.keepAlive" />
  </RouterView>
  <FireflyDeliveryOverlay />
</template>
