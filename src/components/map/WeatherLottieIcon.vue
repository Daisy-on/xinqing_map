<template>
  <div class="weather-lottie-icon">
    <!-- 如果匹配到天气动画则展示 -->
    <Vue3Lottie
      v-if="animationData"
      :animationData="animationData"
      :width="size"
      :height="size"
      :loop="true"
      :autoPlay="true"
    />
    <!-- 否则展示默认后备图标/文本 -->
    <div v-else class="fallback-icon" :style="{ width: size + 'px', height: size + 'px' }">
      POI
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Vue3Lottie } from 'vue3-lottie'

import sunnyJSON from '@/assets/Lottie/sunny.json'
import cloudyJSON from '@/assets/Lottie/cloudy.json'
import veryCloudyJSON from '@/assets/Lottie/very-cloudy.json'
import rain1JSON from '@/assets/Lottie/rain1.json'
import thunderJSON from '@/assets/Lottie/thunder.json'
import snowJSON from '@/assets/Lottie/snow.json'

const props = defineProps<{
  weatherCode?: string
  size?: number
}>()

const size = computed(() => props.size || 40)

// 映射关系
const weatherToLottieMap: Record<string, any> = {
  clear_sky: sunnyJSON,
  sunny: sunnyJSON,
  cloudy: cloudyJSON,
  overcast: veryCloudyJSON,
  light_rain: rain1JSON,
  heavy_rain: rain1JSON,
  thunderstorm: thunderJSON,
  snow: snowJSON
}

const animationData = computed(() => {
  if (!props.weatherCode) return null
  return weatherToLottieMap[props.weatherCode] || null
})
</script>

<style scoped>
.weather-lottie-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  overflow: hidden;
}

.fallback-icon {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
}
</style>
