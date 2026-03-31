<template>
  <article class="landmark-card" aria-label="landmark-card" @click="$emit('click', location)">
    <div class="landmark-icon">{{ iconText }}</div>
    <div class="text-content">
      <span class="landmark-name">{{ location.name }}</span>
      <span class="landmark-meta">{{ location.moodText }} | {{ location.weatherText }}</span>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Location } from '@/types/models'

const props = defineProps<{
  location: Location
}>()

defineEmits<{
  (e: 'click', value: Location): void
}>()

const iconText = computed(() => props.location.icon.slice(0, 4).toUpperCase())
</script>

<style scoped>
.landmark-card {
  --surface: rgba(255, 255, 255, 0.05);
  --line: rgba(255, 255, 255, 0.15);
  width: max-content;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  border-radius: 12px;
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
  gap: 4px;
  justify-content: center;
}

.landmark-icon {
  min-width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(11, 131, 180, 0.4);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.landmark-name {
  color: #1a425a;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.landmark-meta {
  color: #2b5d7e;
  font-size: 11px;
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
