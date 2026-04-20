<template>
  <div class="splash-screen" :class="{ 'is-hiding': !isVisible }">
    <!-- 背景与太阳 -->
    <div class="sky-bg"></div>
    <div class="sun"></div>
    
    <!-- 彩虹 -->
    <div class="rainbow-container">
      <div class="rainbow"></div>
    </div>
    
    <!-- 3D 穿梭 WebM 视频 (替代以前的图片云层) -->
    <div class="video-container">
      <video 
        autoplay 
        muted 
        playsinline
        class="splash-video"
      >
        <source src="@/assets/video/output.webm" type="video/webm">
      </video>
    </div>

    <!-- 中心地标 -->
    <div class="splash-logo">
      <div class="brand-group">
        <img src="@/assets/iocn/logo.png" class="brand-logo-img" alt="心晴地图 Logo" />
        <div class="brand-text-wrap">
          <span class="brand-title">心晴地图</span>
        </div>
      </div>
      <div class="loading-subtitle">拨开阴霾，遇见新晴</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isVisible: boolean;
}>();
</script>

<style scoped>
/* 容器及 3D 视角 */
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: #a8c8db;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 800px; /* 增加景深，让穿片感更强 */
  transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 2.5s ease;
}

.splash-screen.is-hiding {
  opacity: 0;
  pointer-events: none;
}

/* 天空渐变变亮 */
.sky-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #2e9bef 0%, #dbe0e0 100%);
  opacity: 0;
  animation: skyClear 3s ease-in-out forwards 0.5s;
}

/* 太阳升起 */
.sun {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, #fff7ce 0%, #ffde59 20%, transparent 60%);
  transform: translate(-50%, 0) scale(0.8);
  opacity: 0;
  animation: sunRise 3.5s cubic-bezier(0.15, 0.8, 0.2, 1) forwards 0.8s;
  pointer-events: none;
}

/* 动态彩虹 */
.rainbow-container {
  position: absolute;
  top: -10vh;
  left: 0;
  right: 0;
  height: 80vh;
  display: flex;
  justify-content: center;
  opacity: 0;
  animation: rainbowReveal 4s ease forwards 2s;
  pointer-events: none;
}

.rainbow {
  width: 100vw;
  height: 90vw; 
  border-radius: 50%;
  box-shadow: 
    inset 0 0 0 16px rgba(255, 105, 97, 0.4),
    inset 0 0 0 32px rgba(255, 180, 128, 0.4),
    inset 0 0 0 48px rgba(248, 243, 141, 0.4),
    inset 0 0 0 64px rgba(66, 214, 164, 0.4),
    inset 0 0 0 80px rgba(8, 202, 209, 0.4),
    inset 0 0 0 96px rgba(89, 173, 246, 0.4),
    inset 0 0 0 112px rgba(157, 148, 255, 0.4);
  filter: blur(28px);
  /* 初始裁剪掉底部一半，只保留拱桥部分 */
  clip-path: inset(0 0 50% 0);
  animation: rainbowGrow 3s cubic-bezier(0.25, 1, 0.5, 1) forwards 2.2s;
}

/* 视频容器 */
.video-container {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.splash-video {
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  /* 如果导出的 WebM 带 Alpha 透明通道，背景会自动透出底部的彩虹 */
}

/* Logo 与 Slogan 沉浸式出现 */
.splash-logo {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  opacity: 0;
  transform: translateY(40px);
  filter: blur(10px);
  animation: logoReveal 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards 2.5s;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.75);
  padding: 12px 28px;
  border-radius: 28px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.6);
}

.brand-logo-img {
  width: 56px;
  height: 56px;
  object-fit: contain;
}

.brand-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.5px;
  color: #152844;
}

.loading-subtitle {
  font-size: 15px;
  color: #3b5068;
  font-weight: 600;
  letter-spacing: 12px;
  text-shadow: 0 2px 4px rgba(255, 255, 255, 0.8);
  animation: subtitleFocus 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards 2.6s;
}

/* 核心动画 */
@keyframes skyClear {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes sunRise {
  0% { transform: translate(-50%, 10%) scale(0.8); opacity: 0; }
  100% { transform: translate(-50%, -40%) scale(1.4); opacity: 1; filter: drop-shadow(0 0 80px rgba(255,233,143,0.5)); }
}

@keyframes rainbowReveal {
  0% { opacity: 0; }
  100% { opacity: 0.9; }
}

@keyframes rainbowGrow {
  0% { clip-path: inset(50% 0 50% 0); transform: scale(0.95); }
  100% { clip-path: inset(0% 0 50% 0); transform: scale(1); }
}

@keyframes logoReveal {
  0% { transform: translateY(40px); filter: blur(10px); opacity: 0; }
  100% { transform: translateY(0); filter: blur(0); opacity: 1; }
}

@keyframes subtitleFocus {
  0% { letter-spacing: 12px; opacity: 0.5; }
  100% { letter-spacing: 4px; opacity: 1; }
}
</style>
