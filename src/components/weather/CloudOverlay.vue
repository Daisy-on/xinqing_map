<template>
  <div class="cloud-overlay" :class="['is-active', `type-${type || 'sunny'}`]">
    <!-- clouds2 (厚重底层) - 放在最底层(DOM最上面) -->
    <div v-if="hasLayer2" class="cloud-layer layer-2"></div>
    <!-- clouds1 (主要积云) - 中层 -->
    <div v-if="hasLayer1" class="cloud-layer layer-1"></div>
    <!-- clouds3 (薄白云/小片云) - 最顶层(DOM最下面) -->
    <div v-if="hasLayer3" class="cloud-layer layer-3"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  active: boolean
  type?: string
}>()

// 晴空万里 (clear_sky): 没有云
const hasLayer3 = computed(() => {
  return props.type !== 'clear_sky'
})

// 晴 (sunny): 只有一块 clouds3
// 多云 (cloudy): clouds1 + clouds3
// 小雨 (light_rain): clouds1 + clouds3
// 其余 (overcast, heavy_rain, thunderstorm, snow): clouds1 + clouds2 + clouds3
const hasLayer1 = computed(() => {
  const allowed = ['cloudy', 'light_rain', 'overcast', 'heavy_rain', 'thunderstorm', 'snow']
  return allowed.includes(props.type || '')
})

// 阴 (overcast)/大雨/雷雨/雪: 使用所有 3 层 (1, 2, 3)
const hasLayer2 = computed(() => {
  const allowed = ['overcast', 'heavy_rain', 'thunderstorm', 'snow']
  return allowed.includes(props.type || '')
})
</script>

<style scoped>
.cloud-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50vh;
  z-index: 1;
  pointer-events: none;
  opacity: 0;
  transition: opacity 1s ease-in-out;
  /* 基础遮罩：保持顶部清晰，底部淡出 */
  mask-image: linear-gradient(to bottom, black 20%, transparent 85%);
  -webkit-mask-image: linear-gradient(to bottom, black 20%, transparent 85%);
}

/* 针对阴雨天（overcast, light_rain, heavy_rain, thunderstorm）增强羽化效果，消除素材硬边界 */
.type-overcast,
.type-light_rain,
.type-heavy_rain,
.type-thunderstorm {
  mask-image: linear-gradient(to bottom, 
    black 0%, 
    black 10%, 
    rgba(0, 0, 0, 0.8) 40%, 
    rgba(0, 0, 0, 0.4) 65%, 
    transparent 80%
  );
  -webkit-mask-image: linear-gradient(to bottom, 
    black 0%, 
    black 10%, 
    rgba(0, 0, 0, 0.8) 40%, 
    rgba(0, 0, 0, 0.4) 65%, 
    transparent 80%
  );
}

.cloud-overlay.is-active {
  opacity: 1;
}

.cloud-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-repeat: repeat-x;
}

/* Layer specific speed and style */
.layer-1 {
  background-image: url('@/assets/images/clouds_1.png');
  background-size: cover;
  animation: clouds-move 30s linear infinite;
  opacity: 0.6;
}

.layer-2 {
  background-image: url('@/assets/images/clouds_2.png');
  background-size: cover;
  animation: clouds-move 20s linear infinite;
  opacity: 0.8;
  top: -5%;
}

.layer-3 {
  background-image: url('@/assets/images/clouds_3.png');
  background-size: 1500px auto;
  opacity: 0.4;
  animation: clouds-move 45s linear infinite;
}

/* 1. 晴/多云/小雨：极慢速，飘逸感 (80s) */
.type-sunny .layer-3,
.type-clear_sky .layer-3,
.type-cloudy .layer-3,
.type-cloudy .layer-1,
.type-light_rain .layer-3,
.type-light_rain .layer-1 {
  animation-duration: 80s;
  opacity: 0.5;
}

/* 2. 阴天/大雨/雪：标准速度 (30s-45s) */
/* 无需额外覆盖，使用默认的 .layer-1, .layer-2, .layer-3 定义即可 */

/* 3. 雷雨交加：最快速，营造压迫感 (15s-25s) */
.type-thunderstorm .layer-1 {
  animation-duration: 20s;
  opacity: 0.7;
}
.type-thunderstorm .layer-2 {
  animation-duration: 15s;
  opacity: 0.9;
}
.type-thunderstorm .layer-3 {
  animation-duration: 25s;
  opacity: 0.6;
}

/* 雷雨闪电效果保留：由 WeatherCanvas.vue 独立负责渲染，此处仅处理云层动效 */

@keyframes clouds-move {
  from {
    background-position: 0 0;
  }
  to {
    background-position: -1500px 0;
  }
}
</style>