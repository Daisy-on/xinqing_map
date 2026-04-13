<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted, onBeforeUnmount } from 'vue'
import FireflyDeliveryOverlay from '@/components/common/FireflyDeliveryOverlay.vue'
import { useLetterStore } from '@/stores/letter'
import { getToken, AUTH_STORAGE_CHANGED_EVENT } from '@/utils/auth'

const letterStore = useLetterStore()

const handleAuthChange = () => {
  const token = getToken()
  if (token) {
    letterStore.connect(token)
  }
}

onMounted(() => {
  handleAuthChange()
  window.addEventListener(AUTH_STORAGE_CHANGED_EVENT, handleAuthChange as EventListener)
})

onBeforeUnmount(() => {
  window.removeEventListener(AUTH_STORAGE_CHANGED_EVENT, handleAuthChange as EventListener)
})
</script>

<template>
  <RouterView />
  <FireflyDeliveryOverlay />
</template>
