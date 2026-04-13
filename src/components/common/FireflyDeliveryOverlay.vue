<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="letterStore.showDeliveryFly" class="firefly-overlay">
        <!-- 飞行的发光萤火虫点 -->
        <div class="firefly-entity"></div>

        <!-- 治愈系毛玻璃弹窗 -->
        <div class="delivery-popup slide-up">
          <div class="popup-content">
             <h3>✨ 萤火虫飞回来了</h3>
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
  left: -20px;
  bottom: 20%;
  box-shadow: 0 0 15px 4px rgba(228, 255, 0, 0.8),
              0 0 30px 8px rgba(228, 255, 0, 0.4);
  animation: flightPath 4s cubic-bezier(0.25, 1, 0.5, 1) forwards,
             glowPulse 1.5s infinite alternate;
}

.delivery-popup {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 24px;
  border-radius: 20px;
  text-align: center;
  pointer-events: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  color: #fff;
  animation: slideUp 0.8s 2s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.delivery-popup h3 {
  margin: 0 0 8px;
  font-weight: 600;
  font-size: 1.1rem;
}
.delivery-popup p {
  margin: 0 0 20px;
  font-size: 0.9rem;
  opacity: 0.9;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.actions button {
  border: none;
  padding: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}
.btn-read {
  background: #e4ff00;
  color: #333;
  box-shadow: 0 4px 12px rgba(228, 255, 0, 0.3);
}
.btn-read:active { transform: scale(0.96); }
.btn-later {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@keyframes flightPath {
  0% { transform: translate(0, 0) scale(0.5); }
  50% { transform: translate(45vw, -30vh) scale(1.2); }
  100% { transform: translate(50vw, -45vh) scale(1); opacity: 0; }
}
@keyframes glowPulse {
  from { opacity: 0.7; box-shadow: 0 0 10px 2px rgba(228, 255, 0, 0.8); }
  to { opacity: 1; box-shadow: 0 0 20px 6px rgba(228, 255, 0, 1), 0 0 40px 10px rgba(228, 255, 0, 0.4); }
}
@keyframes slideUp {
  0% { transform: translate(-50%, -40%); opacity: 0; filter: blur(4px); }
  100% { transform: translate(-50%, -50%); opacity: 1; filter: blur(0); }
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
