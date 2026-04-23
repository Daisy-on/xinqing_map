<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="letterStore.showDeliveryFly" class="firefly-overlay">
        <!-- 飞行的发光萤火虫点 -->
        <div class="firefly-entity"></div>

        <!-- 治愈系毛玻璃弹窗 -->
        <div class="delivery-popup">
          <div class="popup-content">
             <h3>萤火虫飞回来了</h3>
             <p>带着远方的心情回信</p>
             <div class="actions">
               <button class="btn-read" @click="goToLetter">立即查看</button>
               <button class="btn-later" @click="letterStore.closeDeliveryOverlay">先收下</button>
             </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useLetterStore } from '@/stores/letter'

const router = useRouter()
const letterStore = useLetterStore()

const goToLetter = () => {
  letterStore.markAsRead()
  router.push('/firefly')
}
</script>

<style scoped>
.firefly-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
}

.firefly-entity {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: #e4ff00;
  border-radius: 50%;
  left: 50%;
  top: 50%;
  margin-left: -6px;
  margin-top: -6px;
  box-shadow: 0 0 15px 4px rgba(228, 255, 0, 0.8),
              0 0 30px 8px rgba(228, 255, 0, 0.4);
  /* 
     串联动画：
     1. flightPath: 飞入并穿透中心 (执行 3s)
     2. agileOrbit: 3s 后开启不规则多维旋转
     3. glowPulse: 持续的发光呼吸感
  */
  animation: 
    flightPath 3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
    agileOrbit 12s 3s infinite ease-in-out,
    glowPulse 1.5s infinite alternate;
  z-index: 10000;
}

.delivery-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.85); /* 高不透明度浅色背景 */
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  padding: 32px;
  border-radius: 24px;
  text-align: center;
  pointer-events: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
  color: #1e293b; /* 深色文字确保易读性 */
  z-index: 9999;
  animation: slideUp 0.8s 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.delivery-popup h3 {
  margin: 0 0 10px;
  font-weight: 700;
  font-size: 1.2rem;
  color: #0f172a;
}
.delivery-popup p {
  margin: 0 0 24px;
  font-size: 0.95rem;
  color: #64748b; /* 优雅的次要文字颜色 */
  line-height: 1.5;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.actions button {
  border: none;
  padding: 10px 24px;
  border-radius: 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-read {
  background: #38bdf8; /* 改为品牌蓝，对比度更佳且更治愈 */
  color: #fff;
  box-shadow: 0 4px 12px rgba(56, 189, 248, 0.25);
}
.btn-read:hover {
  background: #0ea5e9;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(56, 189, 248, 0.35);
}
.btn-read:active { transform: translateY(0) scale(0.98); }

.btn-later {
  background: #f1f5f9;
  color: #64748b;
  border: 1px solid #e2e8f0;
}
.btn-later:hover {
  background: #e2e8f0;
  color: #475569;
}

@keyframes flightPath {
  0% { transform: translate(-55vw, 40vh) scale(0.3); opacity: 0; }
  35% { opacity: 1; transform: translate(-10vw, 5vh) scale(1.3); }
  65% { transform: translate(0, 0) scale(0.7); filter: blur(1px); } /* 穿透中心 */
  100% { transform: translate(160px, -120px) scale(1.1); opacity: 1; }
}

@keyframes agileOrbit {
  0% { transform: translate(160px, -120px); }
  25% { transform: translate(-180px, -80px) rotate(-15deg) scale(0.9); }
  45% { transform: translate(0, 0) scale(1.4); filter: brightness(1.5) blur(0); } /* 再次穿梭中心 */
  70% { transform: translate(140px, 100px) rotate(15deg) scale(0.8); }
  90% { transform: translate(-120px, 110px) scale(1); }
  100% { transform: translate(160px, -120px); }
}

@keyframes glowPulse {
  from { opacity: 0.8; box-shadow: 0 0 15px 4px rgba(228, 255, 0, 0.7); }
  to { opacity: 1; box-shadow: 0 0 25px 8px rgba(228, 255, 0, 1), 0 0 45px 12px rgba(228, 255, 0, 0.3); }
}

@keyframes slideUp {
  0% { transform: translate(-50%, -40%); opacity: 0; filter: blur(4px); }
  100% { transform: translate(-50%, -50%); opacity: 1; filter: blur(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
