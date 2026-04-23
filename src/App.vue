<script setup lang="ts">
import { RouterView } from 'vue-router'
import { defineAsyncComponent, onMounted, onBeforeUnmount } from 'vue'
import { useLetterStore } from '@/stores/letter'
import { getToken, AUTH_STORAGE_CHANGED_EVENT } from '@/utils/auth'

const letterStore = useLetterStore()
const FireflyDeliveryOverlay = defineAsyncComponent(() => import('@/components/common/FireflyDeliveryOverlay.vue'))

const handleAuthChange = () => {
  const token = getToken()
  if (token) {
    letterStore.connect(token)
    return
  }

  letterStore.disconnect()
}

onMounted(() => {
  handleAuthChange()
  window.addEventListener(AUTH_STORAGE_CHANGED_EVENT, handleAuthChange as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener(AUTH_STORAGE_CHANGED_EVENT, handleAuthChange as EventListener)
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
