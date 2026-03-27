<template>
  <main class="scatter-page">
    <div class="header-nav">
      <el-button circle :icon="ArrowLeft" class="back-btn" @click="goBack" />
      <span class="page-title">心声气泡 (点位ID: {{ spotId }})</span>
    </div>
    
    <div class="scatter-container">
      <!-- 帖子气泡散点容器预留 -->
      <div class="placeholder-bubble bubble-1">今天真的很开心，阳光很好！</div>
      <div class="placeholder-bubble bubble-2">图书馆复习到好晚，终于弄懂了这道题。</div>
      <div class="placeholder-bubble bubble-3">有人掉了一把雨伞在食堂二楼哦！</div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ArrowLeft } from "@element-plus/icons-vue"

const route = useRoute()
const router = useRouter()

const spotId = computed(() => route.params.spotId)

const goBack = () => {
  router.push("/")
}
</script>

<style scoped>
.scatter-page {
  width: 100vw;
  height: 100vh;
  background: radial-gradient(circle at 50% 50%, #f0f7fc 0%, #e0eaf5 100%);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.header-nav {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 10;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.6) 0%, transparent 100%);
  pointer-events: none;
}

.back-btn {
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}
.back-btn:hover {
  transform: scale(1.05);
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  text-shadow: 0 1px 4px rgba(255, 255, 255, 0.8);
}

.scatter-container {
  flex: 1;
  position: relative;
  width: 100%;
  height: 100%;
}

.placeholder-bubble {
  position: absolute;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  font-size: 14px;
  color: #606266;
  max-width: 200px;
  line-height: 1.5;
  backdrop-filter: blur(8px);
  animation: float 6s ease-in-out infinite alternate;
}

.bubble-1 { top: 30%; left: 15%; animation-delay: 0s; }
.bubble-2 { top: 50%; right: 20%; animation-delay: -2s; }
.bubble-3 { bottom: 20%; left: 35%; animation-delay: -4s; }

@keyframes float {
  0% { transform: translateY(0px); }
  100% { transform: translateY(-20px); }
}
</style>
