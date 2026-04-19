import { defineStore } from 'pinia'
import { getMonthCalendar } from '@/api/mood'
import type { MoodDiaryMonthVO } from '@/types/models'

export const useMoodStore = defineStore('mood', {
  state: () => ({
    monthData: [] as MoodDiaryMonthVO[],
    lastFetchKey: '',
    loading: false
  }),
  actions: {
    async fetchMonthData(year: number, month: number, force = false) {
      const key = `${year}-${month.toString().padStart(2, '0')}`
      if (!force && this.lastFetchKey === key && this.monthData.length > 0) return
      this.loading = true
      try {
        const data = await getMonthCalendar(year, month)
        this.monthData = data
        this.lastFetchKey = key
      } catch (error) {
        console.error('Failed to fetch month data:', error)
      } finally {
        this.loading = false
      }
    },
    clearCache() {
      this.lastFetchKey = ''
      this.monthData = []
    }
  }
})
