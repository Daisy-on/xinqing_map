<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useChatStore } from '@/stores/chat';
import { ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import xinyuBg from '@/assets/images/xinyu.png';
import nimingIcon from '@/assets/icon/niming.svg';

const router = useRouter();
const chatStore = useChatStore();
const inputMsg = ref('');
const messagesContainer = ref<HTMLElement | null>(null);

const myId = computed(() => chatStore.getMyUserId());
const chatBackgroundStyle = computed(() => ({
  backgroundImage: `url(${xinyuBg})`,
}));

// --- 可拉伸高度控制 ---
const inputBoxHeight = ref(140); // 增加初始高度，避免默认高度太小或被压缩
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
  <div class="chat-container" :style="chatBackgroundStyle">
    <!-- Header -->
    <header class="chat-header">
      <el-icon class="back-btn" @click="handleBack"><ArrowLeft /></el-icon>
      <div class="peer-info">
        <div class="avatar">
          <img :src="nimingIcon" alt="匿名" class="avatar-icon" />
        </div>
        <div class="name">小伴 #{{ chatStore.peerUserId ? String(chatStore.peerUserId).slice(-4) : '...' }}</div>
      </div>
      <div class="actions">
        <el-button 
          v-if="!chatStore.isRoomClosed"
          type="info" 
          link 
          class="end-btn"
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
  background-color: #0a0b10;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  background-attachment: fixed;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  position: relative;
  overflow: hidden;
}

/* Header */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(20, 22, 30, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 10;
}

.back-btn {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  padding: 6px;
  margin-left: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #a1c4fd;
  transform: translateX(-2px);
}

.peer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

.name {
  font-size: 16px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.5px;
}

.actions {
  min-width: 48px;
  display: flex;
  justify-content: flex-end;
}

.end-btn {
  color: rgba(255, 255, 255, 0.5) !important;
  font-size: 14px;
  transition: color 0.3s;
}
.end-btn:hover {
  color: #f56c6c !important;
}

/* Messages */
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  z-index: 2;
  scrollbar-width: none; /* Firefox */
  min-height: 0; /* 允许 flex 项目缩小 */
}
.message-list::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}

.system-msg {
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin: 10px 0;
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(4px);
  border-radius: 20px;
  align-self: center;
  max-width: 80%;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.system-msg.mt {
  margin-top: 0;
}

.system-msg.closed-msg {
  background: rgba(245, 108, 108, 0.1);
  color: #ff9a9a;
  border: 1px solid rgba(245, 108, 108, 0.2);
  margin-top: 20px;
  animation: fadeIn 0.4s ease;
}

.message-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 85%;
  position: relative;
  animation: slideUp 0.4s cubic-bezier(0.2, 0, 0, 1);
}

.message-row.is-mine {
  align-self: flex-end;
  align-items: flex-end;
}

.message-bubble {
  padding: 12px 18px;
  border-radius: 20px;
  border-top-left-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  color: rgba(255, 255, 255, 0.95);
  font-size: 15px;
  line-height: 1.6;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  word-break: break-word;
  white-space: pre-wrap;
  max-width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.message-row.is-mine .message-bubble {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.3) 0%, rgba(64, 158, 255, 0.15) 100%);
  color: #fff;
  border-top-left-radius: 20px;
  border-top-right-radius: 4px;
  border-bottom-right-radius: 20px;
  border: 1px solid rgba(64, 158, 255, 0.3);
  box-shadow: 0 4px 20px rgba(64, 158, 255, 0.15);
}

.time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  margin: 6px 4px 0;
}

/* Footer / Input */
.chat-footer {
  background: rgba(20, 22, 30, 0.85);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  display: flex;
  flex-direction: column;
  z-index: 10;
  flex-shrink: 0; /* 强制底部输入框不被压缩 */
  /* 移除这里的 height transition，因为它会导致拖拽时平滑过渡与鼠标位置冲突，产生阻尼感 */
}

.resize-handle {
  position: absolute;
  top: -6px;
  left: 0;
  right: 0;
  height: 12px;
  cursor: row-resize;
  z-index: 11;
  display: flex;
  justify-content: center;
  align-items: center;
}
.resize-handle::after {
  content: '';
  width: 36px;
  height: 4px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.chat-footer.is-disabled {
  background: rgba(10, 11, 16, 0.9);
}

.footer-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  animation: fadeIn 0.3s ease;
}

.input-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: transparent;
  padding: 16px 20px;
  box-sizing: border-box;
  height: 100%;
}

.qq-textarea {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 15px;
  color: #fff;
  resize: none;
  line-height: 1.6;
  overflow-y: auto;
  font-family: inherit;
}

.qq-textarea::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.send-action-bar {
  display: flex;
  justify-content: flex-end;
  align-items: flex-end;
  margin-top: 12px;
}

.send-btn {
  border: none;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3);
  font-size: 14px;
  font-weight: 500;
  cursor: not-allowed;
  padding: 8px 24px;
  border-radius: 10px;
  transition: all 0.3s;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.send-btn.active {
  background: linear-gradient(135deg, #409EFF 0%, #3a8ee6 100%);
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}
.send-btn.active:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.5);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>

<style>
/* 全局样式修改 Element Plus 的弹窗，使其符合深夜暗色系风格 */
.el-message-box {
  background: rgba(30, 32, 40, 0.9) !important;
  backdrop-filter: blur(20px) !important;
  -webkit-backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 24px !important;
  padding: 16px 16px !important;
}

.el-message-box__title {
  color: rgba(255, 255, 255, 0.9) !important;
  font-weight: 600 !important;
}

.el-message-box__content {
  color: rgba(255, 255, 255, 0.7) !important;
  font-size: 15px !important;
  padding: 20px 0 !important;
}

.el-message-box__btns {
  padding-top: 10px !important;
}

.el-message-box__btns .el-button {
  border-radius: 12px !important;
  padding: 10px 20px !important;
  height: auto !important;
  transition: all 0.3s !important;
}

/* “先放后台”按钮样式 */
.el-message-box__btns .el-button--default {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: rgba(255, 255, 255, 0.6) !important;
}
.el-message-box__btns .el-button--default:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
}

/* “结束聊天”按钮样式 */
.el-message-box__btns .el-button--primary {
  background: linear-gradient(135deg, #409EFF 0%, #3a8ee6 100%) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3) !important;
}
.el-message-box__btns .el-button--primary:hover {
  transform: translateY(-1px) !important;
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4) !important;
}

/* 提示图标颜色微调 */
.el-message-box__status.el-icon {
  color: #e6a23c !important;
}

/* 关闭按钮 */
.el-message-box__headerbtn .el-message-box__close {
  color: rgba(255, 255, 255, 0.4) !important;
}
.el-message-box__headerbtn .el-message-box__close:hover {
  color: #fff !important;
}
</style>
