<template>
  <div class="cloud-overlay" :class="{ 'is-active': active }">
    <div class="cloud-layer layer-3"></div>
    <div class="cloud-layer layer-1"></div>
    <div class="cloud-layer layer-2"></div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  active: boolean
}>()
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
  mask-image: linear-gradient(to bottom, black 20%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 20%, transparent 100%);
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
  background-size: cover;
}

.layer-1 {
  background-image: url('@/assets/images/clouds_2.png');
  animation: clouds-move 30s linear infinite;
  opacity: 0.6;
}

.layer-2 {
  background-image: url('@/assets/images/clouds_1.png');
  animation: clouds-move 20s linear infinite;
  opacity: 0.8;
  top: -5%;
}

.layer-3 {
  background-image: url('@/assets/images/clouds_3.png');
  animation: clouds-move 45s linear infinite;
  opacity: 0.4;
  background-size: 1500px auto;
}

@keyframes clouds-move {
  from {
    background-position: 0 0;
  }
  to {
    background-position: -1500px 0;
  }
}
</style>