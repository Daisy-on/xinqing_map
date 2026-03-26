<template>
  <article class="landmark-card" aria-label="landmark-card">
    <div class="landmark-icon">{{ iconText }}</div>
    <div class="landmark-body">
      <h3 class="landmark-name">{{ location.name }}</h3>
      <p class="landmark-meta">{{ location.moodText }} | {{ location.weatherText }}</p>
      <p v-if="location.description" class="landmark-desc">{{ location.description }}</p>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Location } from '@/types/models'

const props = defineProps<{
  location: Location
}>()

const iconText = computed(() => props.location.icon.slice(0, 4).toUpperCase())
</script>

<style scoped>
.landmark-card {
  --surface: rgba(245, 252, 255, 0.88);
  --line: rgba(3, 70, 113, 0.25);
  --accent: #035388;
  width: 212px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background:
    radial-gradient(140% 100% at 0% 0%, rgba(2, 150, 204, 0.14), transparent 54%),
    linear-gradient(165deg, rgba(255, 255, 255, 0.95), var(--surface));
  backdrop-filter: blur(6px);
  box-shadow: 0 10px 24px rgba(2, 46, 74, 0.2);
  pointer-events: auto;
  user-select: none;
  transform-origin: bottom center;
  animation: card-in 260ms ease-out;
}

.landmark-icon {
  min-width: 40px;
  height: 40px;
  border-radius: 999px;
  background: linear-gradient(160deg, #0b83b4, #035388);
  color: #f4fbff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.landmark-body {
  min-width: 0;
}

.landmark-name {
  margin: 0;
  color: #0b2d45;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
}

.landmark-meta {
  margin: 3px 0 0;
  color: #20516e;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
}

.landmark-desc {
  margin: 6px 0 0;
  color: #33586f;
  font-size: 12px;
  line-height: 1.35;
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
