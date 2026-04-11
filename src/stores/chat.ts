import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';

// 消息结构定义
export interface ChatMessage {
  id: string;
  senderId: number;
  content: string;
  timestamp: string;
}

export const useChatStore = defineStore('chat', () => {
  const ws = ref<WebSocket | null>(null);
  
  // 状态机
  const isConnected = ref(false);
  const isMatching = ref(false);
  const currentRoomId = ref<string | null>(null);
  const peerUserId = ref<number | null>(null);
  const messages = ref<ChatMessage[]>([]);
  
  // 房间关闭相关状态
  const isRoomClosed = ref(false);
  const roomClosedReason = ref<string | null>(null); // 'peer_offline', 'user_quit', 'chat_end', 'time_window_closed'

  // 从 localStorage 获取 Token
  function getToken() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return user.token;
    } catch {
      return null;
    }
  }
  
  function getMyUserId() {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      const user = JSON.parse(userStr);
      return user.id || null;
    } catch {
      return null;
    }
  }

  // 初始化并连接 WebSocket
  function connect() {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) return;
    
    const token = getToken();
    if (!token) {
      ElMessage.error('请先登录');
      return;
    }
    
    // 使用当前协议与主机，自动转换 ws/wss
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // const host = window.location.host; 
    // Vite 本地代理通常需要在前端直接连到后端端口，或者通过 nginx。这里写死指向后端 ws
    const wsUrl = `ws://localhost:8080/ws/match?token=${token}`;
    
    ws.value = new WebSocket(wsUrl);
    
    ws.value.onopen = () => {
      isConnected.value = true;
    };
    
    ws.value.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (err) {
        console.error('Failed to parse WS message:', event.data);
      }
    };
    
    ws.value.onclose = () => {
      isConnected.value = false;
      ws.value = null;
      // 可以在此处处理断线重连逻辑
    };
    
    ws.value.onerror = (err) => {
      console.error('WebSocket Error:', err);
    };
  }
  
  // 分发处理服务端消息
  function handleServerMessage(payload: any) {
    const { type, message, data, timestamp } = payload;
    
    switch (type) {
      case 'connected':
        isConnected.value = true;
        break;
        
      case 'match_waiting':
        isMatching.value = true;
        break;
        
      case 'match_rejected':
        isMatching.value = false;
        ElMessage.warning(message || '当前不在开放时间');
        break;
        
      case 'match_success':
        isMatching.value = false;
        currentRoomId.value = data.roomId;
        peerUserId.value = data.peerUserId;
        isRoomClosed.value = false;
        roomClosedReason.value = null;
        messages.value = []; // 清空历史
        break;
        
      case 'already_in_room':
        isMatching.value = false;
        currentRoomId.value = data.roomId;
        peerUserId.value = data.peerUserId;
        isRoomClosed.value = false;
        roomClosedReason.value = null;
        // 恢复房间状态（如果有历史消息可在 data 里带上，目前先初始化为空）
        if (messages.value.length === 0) {
           ElMessage.success('已恢复到聊天室');
        }
        break;
        
      case 'chat_msg':
        messages.value.push({
          id: data.msgId || Date.now().toString(),
          senderId: data.fromUserId,
          content: message,
          timestamp: timestamp
        });
        break;
        
      case 'room_closed':
        isRoomClosed.value = true;
        roomClosedReason.value = data.reason || 'chat_end';
        if (data.reason === 'time_window_closed') {
          ElMessage.info('夜深了，对话时段已结束');
        }
        currentRoomId.value = null;
        // 注意：不在这里清空 messages 和 peerUserId，保持 UI 冻结以供查看
        break;
        
      case 'match_window_closed':
        isMatching.value = false;
        ElMessage.info(message || '匹配时段已结束，请明天再来');
        break;
        
      case 'error':
        ElMessage.error(message || '发生错误');
        break;
        
      default:
        console.warn('Unknown WS message type:', type);
    }
  }

  // 发送行为方法
  function sendJson(payload: any) {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(payload));
    } else {
      ElMessage.error('网络已断开，请刷新重试');
    }
  }

  function joinMatch() {
    sendJson({ type: 'match_join' });
  }

  function quitMatch() {
    sendJson({ type: 'match_quit' });
    isMatching.value = false;
  }

  function sendChatMessage(text: string) {
    sendJson({ type: 'chat_msg', message: text });
    // 乐观更新（或等服务器回退，后端实现会把自己的消息也推一份回来，这里依赖后端回推）
  }

  function endChat() {
    sendJson({ type: 'chat_end' });
  }

  function resetState() {
    isMatching.value = false;
    currentRoomId.value = null;
    peerUserId.value = null;
    isRoomClosed.value = false;
    roomClosedReason.value = null;
    messages.value = [];
  }

  return {
    ws,
    isConnected,
    isMatching,
    currentRoomId,
    peerUserId,
    messages,
    isRoomClosed,
    roomClosedReason,
    getMyUserId,
    connect,
    joinMatch,
    quitMatch,
    sendChatMessage,
    endChat,
    resetState
  };
});
