import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLetterStore = defineStore('letter', () => {
  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_BASE_DELAY_MS = 3000
  const RECONNECT_MAX_DELAY_MS = 30000

  // 默认如果是首次访问或者有未读信件时亮起红点
  const hasUnreadLetter = ref(localStorage.getItem('firefly_visited') !== '1')
  const currentLetter = ref<any>(null)
  const showDeliveryFly = ref(false)

  let ws: WebSocket | null = null
  let activeToken = ''
  let shouldReconnect = false
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof window.setTimeout> | null = null

  const buildWebSocketUrl = (token: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/ws/letter?token=${token}`
  }

  const clearReconnectTimer = () => {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  const scheduleReconnect = () => {
    if (!shouldReconnect || !activeToken || reconnectTimer !== null) {
      return
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[letter-ws] reach max reconnect attempts, stop reconnecting')
      return
    }

    const delay = Math.min(
      RECONNECT_BASE_DELAY_MS * (2 ** reconnectAttempts),
      RECONNECT_MAX_DELAY_MS,
    )
    reconnectAttempts += 1

    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      openConnection()
    }, delay)
  }

  const openConnection = () => {
    if (!activeToken) return

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    const socket = new WebSocket(buildWebSocketUrl(activeToken))
    ws = socket

    socket.onopen = () => {
      reconnectAttempts = 0
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data && data.letter_content) {
          currentLetter.value = data
          hasUnreadLetter.value = true
          // 收到新信件，清除已访问标记，确保红点亮起
          localStorage.removeItem('firefly_visited')
          showDeliveryFly.value = true
        }
      } catch (error) {
        console.warn('[letter-ws] invalid message payload', error)
      }
    }

    socket.onerror = (error) => {
      console.warn('[letter-ws] websocket error', error)
    }

    socket.onclose = () => {
      if (ws === socket) {
        ws = null
      }

      // 旧连接被替换后会触发 close，此时不应该参与重连。
      if (ws !== null) {
        return
      }

      scheduleReconnect()
    }
  }

  const connect = (token: string) => {
    if (!token) {
      disconnect()
      return
    }

    const isSameToken = activeToken === token
    activeToken = token
    shouldReconnect = true
    clearReconnectTimer()

    if (isSameToken && ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    if (ws) {
      const staleSocket = ws
      ws = null
      staleSocket.close(1000, 'replace-connection')
    }

    reconnectAttempts = 0
    openConnection()
  }

  const disconnect = () => {
    shouldReconnect = false
    activeToken = ''
    clearReconnectTimer()

    if (ws) {
      const socket = ws
      ws = null
      socket.close(1000, 'manual-disconnect')
    }
  }

  const markAsRead = () => {
    hasUnreadLetter.value = false
    showDeliveryFly.value = false
    localStorage.setItem('firefly_visited', '1')
  }

  const closeDeliveryOverlay = () => {
    showDeliveryFly.value = false
  }

  return { hasUnreadLetter, currentLetter, showDeliveryFly, connect, disconnect, markAsRead, closeDeliveryOverlay }
})
