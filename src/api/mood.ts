import http from './http'
import type { 
  MoodDiaryCheckInDTO, 
  MoodDiaryBackfillDTO, 
  MoodDiaryVO, 
  MoodDiaryMonthVO 
} from '@/types/models'

// 7.1 今日打卡（有则覆盖为手动）
export const checkInToday = (data: MoodDiaryCheckInDTO): Promise<MoodDiaryVO> => {
  return http.post('/mood-diary/check-in', data).then(res => res.data?.data ?? res.data ?? null)
}

// 7.2 手动补卡
export const backfillDiary = (data: MoodDiaryBackfillDTO): Promise<MoodDiaryVO> => {
  return http.post('/mood-diary/backfill', data).then(res => res.data?.data ?? res.data ?? null)
}

// 7.3 修改指定日期记录
export const updateDiary = (date: string, data: MoodDiaryCheckInDTO): Promise<MoodDiaryVO> => {
  return http.put(`/mood-diary/${date}`, data).then(res => res.data?.data ?? res.data ?? null)
}

// 7.4 获取今日打卡状态
export const getTodayStatus = (): Promise<{ checkedIn: boolean; record: MoodDiaryVO | null }> => {
  return http.get('/mood-diary/today').then(res => res.data?.data ?? res.data ?? null)
}

// 7.5 按月查询日历
export const getMonthCalendar = (year: number, month: number): Promise<MoodDiaryMonthVO[]> => {
  return http.get(`/mood-diary/calendar/month`, { params: { year, month } }).then(res => res.data?.data ?? res.data ?? [])
}

// 7.6 查询指定日期详情
export const getDiaryDetail = (date: string): Promise<MoodDiaryVO | null> => {
  return http.get(`/mood-diary/detail/${date}`)
    .then(res => res.data?.data ?? res.data ?? null)
    .catch(error => {
      if (error && (error.code === 404 || error.response?.status === 404)) return null
      throw error
    })
}
