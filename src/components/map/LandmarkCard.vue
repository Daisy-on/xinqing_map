<template>
  <article class="landmark-card" aria-label="landmark-card" @click="$emit('click', location)">
    <WeatherLottieIcon :weather-code="location.weatherCode" :size="36" class="landmark-icon-wrap" />
    <div class="text-content">
      <span class="landmark-name">{{ location.name || '未命名地点' }}</span>
      <span class="landmark-meta">{{ location.weatherText || '未知天气' }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { Location } from '@/types/models'
import WeatherLottieIcon from './WeatherLottieIcon.vue'

const props = defineProps<{
  location: Location
}>()

defineEmits<{
  (e: 'click', value: Location): void
}>()
</script>

<style scoped>
.landmark-card {
  --surface: rgba(255, 255, 255, 0.05);
  --line: rgba(255, 255, 255, 0.15);
  width: max-content;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px 8px 8px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--surface);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  pointer-events: auto;
  user-select: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  transform-origin: bottom center;
  animation: card-in 260ms ease-out;
}

.landmark-card:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.1);
}

.text-content {
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
}

.landmark-icon-wrap {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 添加微弱图标保护底座，确保雨雪天气可见度 */
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.3);
}

.landmark-name {
  color: #1a425a;
  font-size: 14px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.landmark-meta {
  color: #2b5d7e;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
