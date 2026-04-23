<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const chatStore = useChatStore();
const inputMsg = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

const myId = computed(() => chatStore.getMyUserId());

// --- 可拉伸高度控制 ---
const inputBoxHeight = ref(100); // 默认初始高度
let startY = 0;
let startHeight = 0;

const startDrag = (e: MouseEvent | TouchEvent) => {
  // 避免选中文字
  if (e.cancelable) e.preventDefault();
  startY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
  startHeight = inputBoxHeight.value;
  
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('touchmove', onDrag, { passive: false });
  document.addEventListener('touchend', stopDrag);
};

const onDrag = (e: MouseEvent | TouchEvent) => {
  const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
  const delta = startY - clientY; // 鼠标上移 delta>0 高度增加
  let newHeight = startHeight + delta;
  
  const windowHeight = window.innerHeight;
  const minHeight = windowHeight / 8;
  const maxHeight = windowHeight / 2;
  
  if (newHeight < minHeight) newHeight = minHeight;
  if (newHeight > maxHeight) newHeight = maxHeight;
  
  inputBoxHeight.value = newHeight;
};

const stopDrag = () => {
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  document.removeEventListener('touchmove', onDrag);
  document.removeEventListener('touchend', stopDrag);
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

onMounted(() => {
  if (!chatStore.currentRoomId && !chatStore.isRoomClosed) {
    // 如果没有房间记录且不是冻结状态，回退到匹配页
    router.replace('/match');
    return;
  }
  scrollToBottom();
});

// 监听消息列表变动，自动滚动
watch(() => chatStore.messages.length, () => {
  scrollToBottom();
});

const handleBack = () => {
  // 如果房间还在，点击返回提醒用户，因为返回不会退出房间（Pinia 保持连接）
  // 用户如果要彻底退出，需要点结束聊天
  if (!chatStore.isRoomClosed) {
    ElMessageBox.confirm('返回大厅仍会保持连接，要结束当前聊天吗？', '提示', {
      confirmButtonText: '结束聊天',
      cancelButtonText: '先放后台',
      type: 'warning'
    }).then(() => {
      chatStore.endChat();
      router.push('/match');
    }).catch(() => {
      router.push('/');
    });
  } else {
    chatStore.resetState();
    router.push('/match');
  }
};

const handleEndChat = () => {
  if (chatStore.isRoomClosed) return;
  ElMessageBox.confirm('确定要结束当前的相遇吗？', '结束聊天', {
    confirmButtonText: '确认',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    chatStore.endChat();
  }).catch(() => {});
};

const sendMsg = () => {
  const text = inputMsg.value.trim();
  if (!text) return;
  if (chatStore.isRoomClosed) {
    ElMessage.warning('聊天已结束，无法发送消息');
    return;
  }
  
  chatStore.sendChatMessage(text);
  inputMsg.value = '';
};

// 工具方法：格式化时间 HH:mm
const formatTime = (ts: string) => {
  if (!ts) return '';
  const date = new Date(ts);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// 冻结提示文案转换
const getClosedReasonText = (reason: string | null) => {
  switch(reason) {
    case 'peer_offline': return '对方已离线，缘分暂时中断';
    case 'user_quit': return '对方已退出匹配';
    case 'chat_end': return '对话已结束';
    case 'time_window_closed': return '夜深了，本日的匹配时段已结束，请早点休息';
    default: return '聊天室已关闭';
  }
};
</script>

<template>
  <div class="chat-container">
    <!-- Header -->
    <header class="chat-header">
      <el-icon class="back-btn" @click="handleBack"><ArrowLeft /></el-icon>
      <div class="peer-info">
        <div class="avatar">匿</div>
        <div class="name">小伴 #{{ chatStore.peerUserId ? String(chatStore.peerUserId).slice(-4) : '...' }}</div>
      </div>
      <div class="actions">
        <el-button 
          v-if="!chatStore.isRoomClosed"
          type="danger" 
          link 
          @click="handleEndChat"
        >结束</el-button>
      </div>
    </header>

    <!-- Message List -->
    <main class="message-list" ref="messagesContainer">
      <div class="system-msg mt">你们已成功连接，开始友好的交流吧~</div>
      
      <div 
        v-for="msg in chatStore.messages" 
        :key="msg.id"
        class="message-row"
        :class="{ 'is-mine': msg.senderId === myId }"
      >
        <div class="message-bubble">
          {{ msg.content }}
        </div>
        <div class="time">{{ formatTime(msg.timestamp) }}</div>
      </div>

      <!-- 冻结提示 -->
      <div v-if="chatStore.isRoomClosed" class="system-msg closed-msg">
        {{ getClosedReasonText(chatStore.roomClosedReason) }}
      </div>
    </main>

    <!-- Input Area -->
    <footer class="chat-footer" :class="{ 'is-disabled': chatStore.isRoomClosed }" :style="{ height: chatStore.isRoomClosed ? 'auto' : inputBoxHeight + 'px' }">
      <div v-if="!chatStore.isRoomClosed" class="resize-handle" @mousedown="startDrag" @touchstart="startDrag"></div>
      <div v-if="chatStore.isRoomClosed" class="footer-overlay">
        聊天已结束
        <el-button @click="handleBack" type="primary" link style="margin-left: 8px;">返回首页</el-button>
      </div>
      <div v-else class="input-wrapper">
        <textarea 
          v-model="inputMsg" 
          class="chat-input qq-textarea" 
          placeholder="说点什么吧..." 
          @keydown.enter.exact.prevent="sendMsg"
          :disabled="chatStore.isRoomClosed"
        ></textarea>
        <div class="send-action-bar">
          <button 
            class="send-btn" 
            :class="{ 'active': inputMsg.trim() }"
            @click="sendMsg"
            :disabled="!inputMsg.trim() || chatStore.isRoomClosed"
          >
            发送
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f7f8fa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.back-btn {
  font-size: 32px;
  color: #333;
  cursor: pointer;
  padding: 8px;
  margin-left: -8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
}
.back-btn:hover {
  color: var(--el-color-primary, #409EFF);
  text-shadow: 0 0 15px rgba(64, 158, 255, 0.6);
  transform: scale(1.1);
}

.peer-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
}

.name {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.actions {
  width: 48px; /* 平衡两边空间 */
  display: flex;
  justify-content: flex-end;
}

/* Messages */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.system-msg {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin: 10px 0;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 12px;
  align-self: center;
}

.system-msg.mt {
  margin-top: 0;
}

.system-msg.closed-msg {
  background: rgba(245, 108, 108, 0.05);
  color: #f56c6c;
  margin-top: 20px;
  animation: fadeIn 0.4s ease;
}

.message-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 80%;
  animation: slideUp 0.3s cubic-bezier(0.2, 0, 0, 1);
}

.message-row.is-mine {
  align-self: flex-end;
  align-items: flex-end;
}

.message-bubble {
  padding: 12px 16px;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  background: white;
  color: #333;
  font-size: 15px;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  word-break: break-word;
  white-space: pre-wrap;
  max-width: 100%;
}

.message-row.is-mine .message-bubble {
  background: var(--el-color-primary, #409EFF);
  color: white;
  border-bottom-left-radius: 18px;
  border-bottom-right-radius: 4px;
}

.time {
  font-size: 11px;
  color: #aaa;
  margin-top: 4px;
  padding: 0 4px;
}

/* Footer / Input */
.chat-footer {
  background: white;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  position: relative;
  display: flex;
  flex-direction: column;
}

.resize-handle {
  position: absolute;
  top: -4px;
  left: 0;
  right: 0;
  height: 8px;
  cursor: row-resize;
  z-index: 10;
}

.chat-footer.is-disabled {
  background: #fafafa;
}

.footer-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #888;
  font-size: 14px;
  animation: fadeIn 0.3s ease;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: #fff;
  padding: 12px 16px;
  box-sizing: border-box;
  height: 100%;
}

.qq-textarea {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 15px;
  color: #333;
  resize: none;
  line-height: 1.5;
  overflow-y: auto;
  font-family: inherit;
}

.qq-textarea::placeholder {
  color: #bbb;
}

.send-action-bar {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  margin-top: 8px;
}

.send-btn {
  border: none;
  background: #f0f0f0;
  color: #aaa;
  font-size: 14px;
  font-weight: 500;
  cursor: not-allowed;
  padding: 6px 18px;
  border-radius: 4px;
  transition: all 0.2s;
}

.send-btn.active {
  background: var(--el-color-primary, #409EFF);
  color: white;
  cursor: pointer;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
