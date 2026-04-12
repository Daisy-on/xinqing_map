<template>
  <div class="splash-screen" :class="{ 'is-hiding': !isVisible }">
    <!-- Sky & Weather Elements -->
    <div class="sky-bg"></div>
    <div class="sun"></div>
    <div class="rainbow-container">
      <div class="rainbow"></div>
    </div>
    
    <!-- Decorative Clouds treated with SVG noise for realism -->
    <svg class="cloud-filter" width="0" height="0">
      <filter id="cloud-fractal">
        <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>

    <!-- Cloud layers using the filter -->
    <div class="cloud cloud-left-1"></div>
    <div class="cloud cloud-left-2"></div>
    <div class="cloud cloud-right-1"></div>
    <div class="cloud cloud-right-2"></div>
    <div class="cloud cloud-center-block"></div>

    <!-- Center Logo Container -->
    <div class="splash-logo">
      <div class="brand-group">
        <div class="brand-mark">
          <div class="brand-core"></div>
        </div>
        <div class="brand-text-wrap">
          <span class="brand-title">心晴地图</span>
        </div>
      </div>
      <div class="loading-subtitle">拨开云雾，遇见星晴...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  isVisible: boolean;
}>();
</script>

<style scoped>
/* Advanced CSS/SVG Hybrid Splash */
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background-color: #d8e5ec; /* overcast feeling initially */
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 2s ease;
}

.splash-screen.is-hiding {
  opacity: 0;
  pointer-events: none;
}

/* Sky Background - Blue gradient fades in */
.sky-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, #9fd3f4 0%, #dcecfa 50%, #f4f6fa 100%);
  opacity: 0;
  animation: skyClear 2.5s ease-in-out forwards 0.5s;
}

/* The Sun */
.sun {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, #fff7ce 0%, #ffe98f 20%, transparent 60%);
  transform: translate(-50%, -10%) scale(0.6);
  opacity: 0;
  animation: sunRise 3s cubic-bezier(0.15, 0.8, 0.2, 1) forwards 1s;
  pointer-events: none;
}

/* The Rainbow */
.rainbow-container {
  position: absolute;
  top: -15vh;
  left: 0;
  right: 0;
  height: 70vh;
  overflow: hidden;
  opacity: 0;
  animation: fadeInRainbow 4s ease forwards 1.8s;
  pointer-events: none;
  transform-origin: center bottom;
  transform: scale(1.1);
}

.rainbow {
  position: absolute;
  bottom: 0px;
  left: 50%;
  transform: translateX(-50%);
  width: 160vw;
  height: 160vw;
  border-radius: 50%;
  /* 7 distinct bands with mild blend/blur */
  box-shadow: 
    inset 0 0 0 12px rgba(255, 105, 97, 0.25),
    inset 0 0 0 24px rgba(255, 180, 128, 0.25),
    inset 0 0 0 36px rgba(248, 243, 141, 0.25),
    inset 0 0 0 48px rgba(66, 214, 164, 0.25),
    inset 0 0 0 60px rgba(8, 202, 209, 0.25),
    inset 0 0 0 72px rgba(89, 173, 246, 0.25),
    inset 0 0 0 84px rgba(157, 148, 255, 0.25);
  filter: blur(14px);
}

/* Cloud base style */
.cloud-filter {
  position: absolute;
}
.cloud {
  position: absolute;
  background: #ffffff;
  border-radius: 50%;
  filter: url(#cloud-fractal) drop-shadow(0 20px 25px rgba(0,0,0,0.1));
  opacity: 1;
  pointer-events: none;
  box-shadow: inset -20px -20px 60px rgba(0, 0, 0, 0.05); /* Adds volumetric shadow */
}

/* Cloud parting logic */
.cloud-left-1 {
  width: 600px; height: 350px;
  top: 5%; left: -20%;
  animation: cloudPartLeft 3.5s cubic-bezier(0.25, 1, 0.3, 1) forwards 0.3s;
}
.cloud-left-2 {
  width: 500px; height: 400px;
  bottom: 10%; left: -15%;
  animation: cloudPartLeft 4s cubic-bezier(0.25, 1, 0.3, 1) forwards 0.5s;
}
.cloud-right-1 {
  width: 550px; height: 300px;
  top: 15%; right: -15%;
  animation: cloudPartRight 3.8s cubic-bezier(0.25, 1, 0.3, 1) forwards 0.4s;
}
.cloud-right-2 {
  width: 650px; height: 380px;
  bottom: -5%; right: -20%;
  animation: cloudPartRight 4.2s cubic-bezier(0.25, 1, 0.3, 1) forwards 0.6s;
}
.cloud-center-block {
  width: 80vw; height: 60vh;
  top: 20%; left: 10%;
  border-radius: 30%;
  animation: cloudPartUp 3.5s cubic-bezier(0.25, 1, 0.3, 1) forwards 0s;
  opacity: 0.95;
}

/* Logo Animation Overlay */
.splash-logo {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  opacity: 0;
  transform: translateY(30px);
  animation: logoReveal 1.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards 1.5s;
}

.brand-group {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.85);
  padding: 16px 28px;
  border-radius: 28px;
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
}

.brand-mark {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  position: relative;
  background: linear-gradient(145deg, #ff6f4a 0%, #ff9a44 60%, #ffd166 100%);
  box-shadow: 0 6px 14px rgba(255, 111, 74, 0.35);
}

.brand-core {
  position: absolute;
  top: 13px;
  left: 13px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: radial-gradient(circle at 35% 35%, #fffad8 0%, #ffe27b 40%, #ffc145 100%);
}

.brand-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #152844;
}

.loading-subtitle {
  font-size: 15px;
  color: #475569;
  font-weight: 600;
  letter-spacing: 3px;
}

/* Animations Core */
@keyframes skyClear {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@keyframes sunRise {
  0% { transform: translate(-50%, -10%) scale(0.6); opacity: 0; }
  100% { transform: translate(-50%, -60%) scale(1.4); opacity: 1; filter: drop-shadow(0 0 60px rgba(255,233,143,0.4)); }
}

@keyframes fadeInRainbow {
  0% { opacity: 0; transform: scale(1.0); }
  50% { opacity: 0.8; transform: scale(1.05); }
  100% { opacity: 0.6; transform: scale(1.0); }
}

@keyframes cloudPartLeft {
  0% { transform: translateX(0) scale(1); opacity: 1; }
  100% { transform: translateX(-120vw) scale(1.4); opacity: 0; }
}

@keyframes cloudPartRight {
  0% { transform: translateX(0) scale(1); opacity: 1; }
  100% { transform: translateX(120vw) scale(1.4); opacity: 0; }
}

@keyframes cloudPartUp {
  0% { transform: translateY(0) scale(1); opacity: 0.95; }
  100% { transform: translateY(-80vh) scale(2); opacity: 0; }
}

@keyframes logoReveal {
  0% { transform: translateY(30px) scale(0.9); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
</style>