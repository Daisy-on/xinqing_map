<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Edit, ArrowRight } from '@element-plus/icons-vue'
import { getMonthCalendar, getTodayStatus } from '@/api/mood'
import { getMoodById } from '@/utils/moodHelpers'
import type { MoodDiaryMonthVO } from '@/types/models'
import dayjs from 'dayjs'

const router = useRouter()

const currentDate = ref(dayjs())
const monthData = ref<MoodDiaryMonthVO[]>([])
const todayStatus = ref(false)

const year = computed(() => currentDate.value.year())
const month = computed(() => currentDate.value.month() + 1)
const monthStr = computed(() => `${year.value}年${month.value}月`)

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

const paddingDays = computed(() => {
  if (!monthData.value.length) return []
  const firstDay = dayjs(monthData.value[0].diaryDate).day()
  // day() returns 0 for Sunday. We want Monday=1, Sunday=7
  const padCount = firstDay === 0 ? 6 : firstDay - 1
  return Array(padCount).fill(null)
})

const fetchMonthData = async () => {
  try {
    monthData.value = await getMonthCalendar(year.value, month.value)
  } catch (error) {
    console.error('Failed to fetch calendar', error)
  }
}

const checkToday = async () => {
  try {
    const res = await getTodayStatus()
    todayStatus.value = res.checkedIn
  } catch (error) {
    console.error('Failed to get today status', error)
  }
}

const handlePrevMonth = () => {
  currentDate.value = currentDate.value.subtract(1, 'month')
  fetchMonthData()
}

const handleNextMonth = () => {
  currentDate.value = currentDate.value.add(1, 'month')
  fetchMonthData()
}

const isToday = (date: string) => {
  return dayjs(date).isSame(dayjs(), 'day')
}

const navigateToEdit = (date: string, item: MoodDiaryMonthVO) => {
  if (item.isFuture) return // cannot edit future
  router.push(`/mood/edit/${date}`)
}

onMounted(() => {
  fetchMonthData()
  checkToday()
})
</script>

<template>
  <div class="calendar-page">
    <div class="calendar-container">
      <div class="top-nav">
        <button class="back-btn" @click="router.push('/profile')">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <div class="month-selector">
          <button class="arrow-btn" @click="handlePrevMonth">
            <el-icon><ArrowLeft /></el-icon>
          </button>
          <span class="month-title">{{ monthStr }}</span>
          <button class="arrow-btn" @click="handleNextMonth">
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>
        <div class="header-right">
          <!-- Optional stats icon -->
        </div>
      </div>

      <div class="calendar-body">
        <div class="week-header">
          <span v-for="day in weekDays" :key="day" class="week-day">{{ day }}</span>
        </div>

        <div class="days-grid">
          <div v-for="(__, idx) in paddingDays" :key="'pad-'+idx" class="day-cell empty"></div>
          
          <div 
            v-for="item in monthData" 
            :key="item.diaryDate"
            class="day-cell"
            :class="{
              'is-today': isToday(item.diaryDate),
              'is-future': item.isFuture,
              'has-record': item.hasRecord,
              'clickable': !item.isFuture
            }"
            @click="navigateToEdit(item.diaryDate, item)"
          >
            <span class="date-num" v-if="!isToday(item.diaryDate)">{{ dayjs(item.diaryDate).date() }}</span>
            <span class="date-num today-label" v-else>今天</span>
            
            <div class="record-indicator">
              <div v-if="item.hasRecord" class="mood-box" :style="{ backgroundColor: item.emotionTagColor || getMoodById(item.emotionTagId || 6).color }">
                <span class="mood-icon">{{ getMoodById(item.emotionTagId || 6).icon }}</span>
              </div>
              <div v-else-if="!item.isFuture" class="empty-circle"></div>
              <!-- if future, no circle -->
            </div>
          </div>
        </div>
      </div>
      
      <!-- Floating Action Button for Today -->
      <div v-if="!todayStatus" class="fab-container">
        <div class="fab-tooltip">今天还没写日记</div>
        <button class="fab-btn" @click="navigateToEdit(dayjs().format('YYYY-MM-DD'), { isFuture: false } as any)">
          <el-icon><Edit /></el-icon>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-page {
  min-height: 100vh;
  background-color: #fcfcfc;
  background-image: radial-gradient(#e0e0e0 1px, transparent 0);
  background-size: 20px 20px;
  display: flex;
  justify-content: center;
}

.calendar-container {
  width: 100%;
  max-width: 480px;
  background: rgba(255, 255, 255, 0.95);
  min-height: 100vh;
  position: relative;
  box-shadow: 0 0 20px rgba(0,0,0,0.02);
  padding-bottom: 80px;
  overflow-x: hidden;
}

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}

.back-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #333;
}

.month-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}

.month-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.arrow-btn {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  color: #888;
  padding: 4px;
}

.week-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  padding: 0 16px 12px;
  color: #999;
  font-size: 13px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 0 16px;
  gap: 12px 4px;
}

.day-cell {
  aspect-ratio: 1 / 1.3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding-top: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.day-cell.clickable {
  cursor: pointer;
}

.day-cell.clickable:hover {
  background: rgba(0, 0, 0, 0.02);
}

.date-num {
  font-size: 14px;
  color: #333;
  margin-bottom: 6px;
}

.today-label {
  color: #d97d7a;
  font-weight: bold;
}

.is-future .date-num {
  color: #ccc;
}

.record-indicator {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-circle {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1.5px solid #eee;
}

.mood-box {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.fab-container {
  position: absolute;
  bottom: 40px;
  right: 24px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  z-index: 10;
}

.fab-tooltip {
  background: #f4eee2;
  color: #555;
  padding: 8px 16px;
  border-radius: 16px;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  position: relative;
}

.fab-tooltip::after {
  content: '';
  position: absolute;
  bottom: -6px;
  right: 20px;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #f4eee2;
}

.fab-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #eecf9e;
  border: none;
  color: #fff;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(238, 207, 158, 0.4);
  transition: transform 0.2s;
}

.fab-btn:hover {
  transform: scale(1.05);
}
</style>
