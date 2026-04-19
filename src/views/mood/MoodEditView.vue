<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { MOODS, getMoodById } from '@/utils/moodHelpers'
import { checkInToday, backfillDiary, updateDiary, getDiaryDetail } from '@/api/mood'
import { ElMessage } from 'element-plus'
import dayjs from 'dayjs'

const router = useRouter()
const route = useRoute()

const rawDate = route.params.date as string
const isToday = dayjs(rawDate).isSame(dayjs(), 'day')
const formattedDate = computed(() => dayjs(rawDate).format('MM月, YYYY-MM-DD').split('-'))

const step = ref<'select' | 'write'>('select')
const status = ref<'loading' | 'ready'>('loading')
const selectedMoodId = ref<number | null>(null)
const diaryNote = ref('')
const hasOriginalRecord = ref(false)
const isLoading = ref(false)
const selectBackTarget = ref<'calendar' | 'write'>('calendar')

const loadDetail = async () => {
  try {
    const detail = await getDiaryDetail(rawDate)
    if (detail) {
      hasOriginalRecord.value = true
      selectedMoodId.value = detail.emotionTagId
      diaryNote.value = detail.note || ''
      step.value = 'write'
    } else {
      step.value = 'select'
    }
  } catch (error) {
    console.error('Failed to load diary detail', error)
  } finally {
    status.value = 'ready'
  }
}

const selectMood = (id: number) => {
  selectedMoodId.value = id
  selectBackTarget.value = 'calendar'
  step.value = 'write'
}

const reshowDial = () => {
  selectBackTarget.value = 'write'
  step.value = 'select'
}

const handleBackFromWrite = () => {
  if (hasOriginalRecord.value) {
    router.replace('/mood/calendar')
  } else {
    selectBackTarget.value = 'calendar'
    step.value = 'select'
  }
}

const handleBackFromSelect = () => {
  if (selectBackTarget.value === 'write') {
    step.value = 'write'
  } else {
    router.replace('/mood/calendar')
  }
}

const handleComplete = async () => {
  if (!selectedMoodId.value) {
    ElMessage.warning('请选择一个心情')
    return
  }
  isLoading.value = true
  try {
    const payload = {
      emotionTagId: selectedMoodId.value,
      note: diaryNote.value
    }
    if (hasOriginalRecord.value) {
      await updateDiary(rawDate, payload)
      ElMessage.success('修改成功')
    } else if (isToday) {
      await checkInToday(payload)
      ElMessage.success('今日打卡成功')
    } else {
      await backfillDiary({ diaryDate: rawDate, ...payload })
      ElMessage.success('补卡成功')
    }
    router.replace('/mood/calendar')
  } catch (error) {
    console.error('Failed to submit diary', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadDetail()
})
</script>

<template>
  <div class="edit-page">
    <div class="edit-container" v-if="status === 'ready'">
      <!-- SELECT STEP -->
      <transition name="fade" mode="out-in">
        <div v-if="step === 'select'" class="step-select">
          <div class="top-nav">
            <button class="back-btn" @click="handleBackFromSelect">
              <el-icon><ArrowLeft /></el-icon>
            </button>
            <div class="date-title">
              <div class="date-main">{{ dayjs(rawDate).month() + 1 }}月{{ dayjs(rawDate).format('DD日') }}</div>
              <div class="date-sub">{{ dayjs(rawDate).format('dddd') }}</div>
            </div>
            <button class="close-btn" @click="handleBackFromSelect">×</button>
          </div>

          <div class="dial-wrapper">
            <h2 class="greeting">Hi，今天心情怎么样</h2>
            <div class="mood-circle">
              <div 
                v-for="(mood, index) in MOODS" 
                :key="mood.id"
                class="mood-item"
                :style="{ '--target-angle': `${index * (360 / MOODS.length)}deg`, '--delay': `${index * 0.05}s` } as any"
                @click="selectMood(mood.id)"
              >
                <div class="mood-box" :style="{ backgroundColor: mood.color }">
                  <img :src="mood.icon" class="mood-emoji" :alt="mood.name" />
                </div>
                <span class="mood-name">{{ mood.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- WRITE STEP -->
        <div v-else class="step-write">
          <div class="top-nav writing-nav">
            <button class="back-btn" @click="handleBackFromWrite">
              <el-icon><ArrowLeft /></el-icon>
            </button>
            <span class="nav-title">写日记</span>
            <button 
              class="complete-btn" 
              :disabled="isLoading"
              @click="handleComplete"
            >完成</button>
          </div>

          <div class="card-area">
            <div class="card-paper">
              <div class="card-header">
                <div class="date-col">
                  <span class="date-num">{{ dayjs(rawDate).date() }}</span>
                  <span class="date-month">{{ dayjs(rawDate).month() + 1 }}月, {{ dayjs(rawDate).year() }}</span>
                </div>
                <div class="selected-mood" @click="reshowDial">
                  <div class="mood-box" :style="{ backgroundColor: getMoodById(selectedMoodId!).color }">
                    <img :src="getMoodById(selectedMoodId!).icon" class="mood-emoji" />
                  </div>
                  <span class="mood-name-pill" :style="{ backgroundColor: getMoodById(selectedMoodId!).color }">
                    {{ getMoodById(selectedMoodId!).name }}
                  </span>
                </div>
              </div>
              
              <textarea 
                v-model="diaryNote"
                class="diary-textarea"
                placeholder="记录详细内容吧，将成为珍贵的回忆哟～"
                maxlength="500"
              ></textarea>
            </div>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  min-height: 100vh;
  background-color: #fcfcfc;
  background-image: radial-gradient(#e0e0e0 1px, transparent 0);
  background-size: 20px 20px;
  display: flex;
  justify-content: center;
}

.edit-container {
  width: 100%;
  max-width: 480px;
  min-height: 100vh;
  background: rgba(255, 255, 255, 0.95);
  position: relative;
  box-shadow: 0 0 20px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
}

/* Common Nav */
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}
.back-btn, .close-btn {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #333;
}
.close-btn {
  font-weight: 300;
}

.date-title {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-right: auto;
  margin-left: 16px;
}
.date-main {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}
.date-sub {
  font-size: 12px;
  color: #888;
}

/* Dial Layout */
.dial-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 60px;
}

.greeting {
  font-size: 18px;
  color: #333;
  font-weight: 500;
  margin-bottom: 160px;
}

.mood-circle {
  position: relative;
  width: 20px;
  height: 20px;
}

.mood-item {
  position: absolute;
  top: 0; left: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  /* Animate outwards from center */
  animation: bloomOut 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  animation-delay: var(--delay);
  opacity: 0; /* hidden before delay */
}

@keyframes bloomOut {
  0% {
    transform: rotate(var(--target-angle)) translateY(0px) rotate(calc(-1 * var(--target-angle))) scale(0.2);
    opacity: 0;
  }
  100% {
    transform: rotate(var(--target-angle)) translateY(-135px) rotate(calc(-1 * var(--target-angle))) scale(1);
    opacity: 1;
  }
}

.mood-item:hover .mood-box {
  filter: brightness(0.95);
  transform: scale(1.05);
}

.mood-box {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: inset -2px -2px 6px rgba(0,0,0,0.05), inset 2px 2px 6px rgba(255,255,255,0.4);
  transition: all 0.2s;
  overflow: hidden;
}
.mood-emoji {
  width: 70%;
  height: 70%;
  object-fit: contain;
}
.mood-name {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
}

/* Write Step */
.writing-nav {
  padding-bottom: 10px;
}
.nav-title {
  font-size: 16px;
  font-weight: 600;
}
.complete-btn {
  background: #eecf9e;
  border: none;
  border-radius: 16px;
  padding: 6px 16px;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
}

.card-area {
  padding: 16px 20px;
  flex: 1;
}

.card-paper {
  background: #fff;
  border: 1px solid #ebebeb;
  border-radius: 20px;
  min-height: 400px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.date-col {
  display: flex;
  flex-direction: column;
}
.date-col .date-num {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  line-height: 1;
  margin-bottom: 4px;
}
.date-col .date-month {
  font-size: 12px;
  color: #999;
}

.selected-mood {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  margin-top: -10px;
}
.selected-mood .mood-box {
  width: 70px;
  height: 70px;
  border-radius: 20px;
}
.mood-name-pill {
  margin-top: -12px;
  background: #ccc;
  color: #fff;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
  border: 2px solid #fff;
  z-index: 2;
}

.diary-textarea {
  flex: 1;
  border: none;
  resize: none;
  font-size: 15px;
  line-height: 1.6;
  color: #444;
  outline: none;
  margin-bottom: 20px;
}
.diary-textarea::placeholder {
  color: #c0c0c0;
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
