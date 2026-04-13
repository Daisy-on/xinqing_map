import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLetterStore = defineStore('letter', () => {
  // 默认如果是首次访问或者有未读信件时亮起红点
  const hasUnreadLetter = ref(localStorage.getItem('firefly_visited') !== '1')
  const currentLetter = ref<any>(null)
  const showDeliveryFly = ref(false)
  let ws: WebSocket | null = null

  const connect = (token: string) => {
    if (!token) return
    if (ws) {
      ws.close()
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    ws = new WebSocket(`${protocol}//${host}/ws/letter?token=${token}`)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data && data.letter_content) {
        currentLetter.value = data
        hasUnreadLetter.value = true
        // 收到新信件，清除已访问标记，确保红点亮起
        localStorage.removeItem('firefly_visited')
        showDeliveryFly.value = true
      }
    }

    ws.onclose = () => {
      setTimeout(() => connect(token), 3000)
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

  return { hasUnreadLetter, currentLetter, showDeliveryFly, connect, markAsRead, closeDeliveryOverlay }
})
