<script setup lang="ts">
import { onMounted, ref, watch, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { ArrowLeft } from '@element-plus/icons-vue';

const router = useRouter();
const chatStore = useChatStore();
const isOpenTime = ref(true);
const systemTimeMsg = ref('');

// 检查时间窗口 (08:00 - 23:00)
const checkTimeWindow = () => {
  const now = new Date();
  const hours = now.getHours();
  if (hours >= 8 && hours < 23) {
    isOpenTime.value = true;
    systemTimeMsg.value = '匹配窗口开放中 (08:00 - 23:00)';
  } else {
    isOpenTime.value = false;
    systemTimeMsg.value = '小伴休息中了，请在 08:00 - 23:00 来找我吧';
  }
};

onMounted(() => {
  checkTimeWindow();
  chatStore.connect();
  
  // 如果已经在房间里，直接跳到聊天页
  if (chatStore.currentRoomId) {
    router.replace('/chat');
  }
});

// 监听状态，进入房间时自动路由
watch(() => chatStore.currentRoomId, (newRoomId) => {
  if (newRoomId) {
    router.replace('/chat');
  }
});

const handleBack = () => {
  if (chatStore.isMatching) {
    chatStore.quitMatch();
  }
  router.push('/');
};

const handleStartMatch = () => {
  if (!isOpenTime) return;
  chatStore.joinMatch();
};

const handleCancelMatch = () => {
  chatStore.quitMatch();
};
</script>

<template>
  <div class="match-container">
    <!-- Header -->
    <header class="match-header">
      <el-icon class="back-btn" @click="handleBack"><ArrowLeft /></el-icon>
      <h2>随机小伴</h2>
      <div class="placeholder"></div>
    </header>

    <!-- Main Content -->
    <main class="match-main">
      <div class="radar-wrapper" :class="{ 'is-matching': chatStore.isMatching }">
        <div class="radar-circle circle-1"></div>
        <div class="radar-circle circle-2"></div>
        <div class="radar-circle circle-3"></div>
        
        <!-- Center Avatar or Status -->
        <div class="center-content">
          <div v-if="!isOpenTime" class="status-icon sleep-icon">🌙</div>
          <div v-else-if="!chatStore.isMatching" class="status-icon ready-icon">✨</div>
          <div v-else class="status-icon matching-icon">🔍</div>
        </div>
      </div>

      <div class="status-text">
        <h3 v-if="!isOpenTime">休息时间</h3>
        <h3 v-else-if="chatStore.isMatching">正在寻找同频的灵魂...</h3>
        <h3 v-else>准备好遇见新朋友了吗？</h3>
        <p class="sub-text">{{ systemTimeMsg }}</p>
      </div>

      <div class="action-area">
        <template v-if="isOpenTime">
          <button 
            v-if="!chatStore.isMatching" 
            class="glass-btn primary" 
            @click="handleStartMatch"
            :disabled="!chatStore.isConnected"
          >
            {{ chatStore.isConnected ? '开始匹配' : '正在连接服务器...' }}
          </button>
          <button 
            v-else 
            class="glass-btn cancel" 
            @click="handleCancelMatch"
          >
            取消匹配
          </button>
        </template>
        <template v-else>
          <button class="glass-btn secondary" @click="handleBack">返回地图</button>
        </template>
      </div>
    </main>
  </div>
</template>

<style scoped>
.match-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #fafafa;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

.match-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  font-size: 24px;
  color: #333;
  cursor: pointer;
  padding: 8px;
  margin-left: -8px;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.back-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.match-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.placeholder {
  width: 40px;
}

.match-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Radar Animation */
.radar-wrapper {
  position: relative;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40px;
}

.radar-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(var(--el-color-primary-rgb, 64, 158, 255), 0.1);
  border: 1px solid rgba(var(--el-color-primary-rgb, 64, 158, 255), 0.2);
  width: 100%;
  height: 100%;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.3s ease;
}

.is-matching .circle-1 {
  animation: ripple 2s linear infinite;
}
.is-matching .circle-2 {
  animation: ripple 2s linear infinite;
  animation-delay: 0.6s;
}
.is-matching .circle-3 {
  animation: ripple 2s linear infinite;
  animation-delay: 1.2s;
}

@keyframes ripple {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

.center-content {
  position: relative;
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  z-index: 2;
  font-size: 32px;
}

.status-text {
  text-align: center;
  margin-bottom: 40px;
  animation: fadeIn 0.5s ease;
}

.status-text h3 {
  font-size: 20px;
  color: #333;
  margin: 0 0 8px;
  font-weight: 600;
}

.sub-text {
  font-size: 14px;
  color: #888;
  margin: 0;
}

.action-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 300px;
}

.glass-btn {
  width: 100%;
  padding: 14px;
  border-radius: 100px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
  border: none;
  outline: none;
}

.glass-btn.primary {
  background: var(--el-color-primary, #409EFF);
  color: white;
  box-shadow: 0 4px 12px rgba(var(--el-color-primary-rgb, 64, 158, 255), 0.3);
}

.glass-btn.primary:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(var(--el-color-primary-rgb, 64, 158, 255), 0.4);
}

.glass-btn.primary:disabled {
  background: #ccc;
  box-shadow: none;
  cursor: not-allowed;
}

.glass-btn.cancel {
  background: #fff;
  color: #f56c6c;
  border: 1px solid #fecaca;
  box-shadow: 0 2px 8px rgba(245, 108, 108, 0.1);
}

.glass-btn.cancel:hover {
  background: #fef0f0;
}

.glass-btn.secondary {
  background: #fff;
  color: #333;
  border: 1px solid #ebeef5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
