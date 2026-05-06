<template>
  <div class="mood-trend-view">
    <!-- 顶部导航 -->
    <header class="top-nav">
      <button class="back-btn-glass" type="button" @click="router.push(getBackTarget())">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <h1 class="page-title">心情趋势</h1>
      <div style="width: 40px"></div>
    </header>

    <main class="trend-content">
      <!-- 时间切换（7 / 14 / 30 天） -->
      <div class="time-segments">
        <button 
          v-for="option in timeOptions" 
          :key="option.value"
          class="segment-btn"
          :class="{ 'is-active': selectedDays === option.value }"
          @click="setRange(option.value)"
        >
          {{ option.label }}
        </button>
      </div>

      <!-- 图表容器 -->
      <section class="chart-section">
        <div ref="scrollWrapperRef" class="chart-scroll-wrapper">
          <div ref="chartContainerRef" class="echarts-container" :style="{ width: chartWidth }"></div>
        </div>

        <div v-if="loading" class="chart-loading">
          <el-skeleton animated style="width: 100%; height: 100%">
            <template #template>
              <el-skeleton-item variant="rect" style="width: 100%; height: 100%; border-radius: 16px;" />
            </template>
          </el-skeleton>
        </div>
        
        <div v-else-if="!trendData.length" class="chart-empty">
          <el-empty description="这几天没有心情打卡记录呢" />
        </div>
      </section>

      <!-- 补充说明或总结（可选） -->
      <p class="summary-text" v-if="trendData.length">
        记录了属于你的色彩轨迹。持续打卡，遇见更清晰的自己。
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'
import dayjs from 'dayjs'
import { getTrendPoints, getMonthCalendar, type MoodTrendPointVO } from '@/api/mood'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const scrollWrapperRef = ref<HTMLElement | null>(null)
const chartContainerRef = ref<HTMLElement | null>(null)
let chartInstance: ECharts | null = null

const timeOptions = [
  { label: '最近 7 天', value: 7 },
  { label: '14 天', value: 14 },
  { label: '30 天', value: 30 },
]

const selectedDays = ref(7)
const loading = ref(false)
const trendData = ref<MoodTrendPointVO[]>([])
const wrapperWidth = ref(0)
let wrapperResizeObserver: ResizeObserver | null = null
let requestSeq = 0

const getMoodOrigin = () => {
  const origin = route.query.from
  return Array.isArray(origin) ? origin[0] : origin
}

const getBackTarget = () => {
  return getMoodOrigin() === 'map' ? '/' : '/profile'
}

// AI辅助生成：Kimi-K2.5, 2026-4-6
// 保持图表宽度固定，避免横向滚动留出空白区域。
const chartWidth = computed(() => {
  const dayCount = selectedDays.value
  const perDayWidth = dayCount === 30 ? 54 : 60
  const targetWidth = dayCount * perDayWidth
  if (!wrapperWidth.value) {
    return dayCount === 7 ? '100%' : `${targetWidth}px`
  }
  return `${Math.max(targetWidth, wrapperWidth.value)}px`
})

// 缓存日历结果，避免频繁重新请求。
let cachedRegisterDate: string | null = null

const fetchImplicitRegisterDate = async () => {
  if (cachedRegisterDate) return cachedRegisterDate
  
  const current = dayjs()
  try {
    const p1 = getMonthCalendar(current.year(), current.month() + 1)
    const prevMonth = current.subtract(1, 'month')
    const p2 = getMonthCalendar(prevMonth.year(), prevMonth.month() + 1)
    const p3 = getMonthCalendar(prevMonth.subtract(1, 'month').year(), prevMonth.subtract(1, 'month').month() + 1)
    
    // 为 30 天游览兜底，先加载最近 3 个月的数据。
    const [c1, c2, c3] = await Promise.all([p1, p2, p3])
    const combined = [...c3, ...c2, ...c1]
    
    const firstValid = combined.find(day => day.canBackfill)
    if (firstValid) {
      cachedRegisterDate = firstValid.diaryDate
      return cachedRegisterDate
    }
  } catch (error) {
    console.error('Failed to probe calendar', error)
  }
  
  // 兜底：如果没有找到注册日期，至少允许查看 60 天范围。
  return current.subtract(2, 'month').format('YYYY-MM-DD')
}

const setRange = (days: number) => {
  selectedDays.value = days
}

const alignScrollToRight = () => {
  const wrapper = scrollWrapperRef.value
  if (!wrapper) return
  const maxScrollLeft = Math.max(wrapper.scrollWidth - wrapper.clientWidth, 0)
  wrapper.scrollLeft = maxScrollLeft
}

const updateWrapperWidth = () => {
  if (!scrollWrapperRef.value) return
  wrapperWidth.value = scrollWrapperRef.value.clientWidth
}

/**
 * Handle Echarts rendering with a multi-colored line (rainbow gradient)
 * Since `emotionTagColor` is returned per data point, we can leverage LinearGradient.
 */
const renderChart = () => {
  updateWrapperWidth()

  if (!chartInstance && chartContainerRef.value) {
    chartInstance = echarts.init(chartContainerRef.value)
  }
  
  if (!chartInstance || !trendData.value.length) return

  // 格式化数据
  const xAxisData = trendData.value.map(pt => dayjs(pt.date).format('MM-DD'))
  
  // 自定义系列点数据，确保圆点颜色保持准确
  const seriesData = trendData.value.map(pt => {
    const pointColor = pt.hasRecord ? (pt.emotionTagColor || '#cfd8dc') : '#e0e0e0'
    return {
      value: pt.emotionValue || 0,
      itemStyle: {
        color: pointColor
      }
    }
  })

  // 为折线创建沿 X 轴连续变化的渐变
  const colorStops = trendData.value.map((pt, idx) => {
    const offset = trendData.value.length > 1 ? idx / (trendData.value.length - 1) : 0
    return {
      offset: offset,
      color: pt.hasRecord ? (pt.emotionTagColor || '#cfd8dc') : '#e0e0e0'
    }
  })

  const lineGradient = new echarts.graphic.LinearGradient(0, 0, 1, 0, colorStops)

  // 绘制更柔和的发光折线和面积区域
  const option: echarts.EChartsOption = {
    grid: {
      left: 24,
      right: 24,
      bottom: '10%',
      top: 30,
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: 'rgba(255, 255, 255, 0.3)',
      textStyle: { color: '#333' },
      extraCssText: 'border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,0.1); backdrop-filter: blur(12px);',
      formatter: (params: any) => {
        const firstItem = Array.isArray(params) ? params[0] : params
        const index = firstItem?.dataIndex ?? 0
        const pt = trendData.value[index]
        if (!pt) return ''
        const displayDate = dayjs(pt.date).format('YYYY年MM月DD日')
        
        let htmlStr = `<div style="font-weight: 600; margin-bottom: 8px;">${displayDate}</div>`
        
        if (pt.hasRecord) {
          htmlStr += `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 12px; height: 12px; border-radius: 50%; background-color: ${pt.emotionTagColor || '#000'};"></span>
              <span style="font-size: 14px; font-weight: 500;">${pt.emotionTagName}</span>
            </div>
            <div style="color: #666; font-size: 13px; margin-top: 4px;">心情指数：${pt.emotionValue}</div>
          `
        } else {
          htmlStr += `<div style="color: #999; font-size: 13px;">未记录心情</div>`
        }
        
        return htmlStr
      }
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xAxisData,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { 
        color: '#90a4ae', 
        padding: [8, 0, 0, 0],
        interval: selectedDays.value === 7 ? 0 : (selectedDays.value === 14 ? 1 : 2)
      },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'value',
      min: (value) => Math.floor(value.min - 1),
      max: (value) => Math.ceil(value.max + 1),
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: 'Mood Trend',
        type: 'line',
        smooth: false,
        data: seriesData,
        symbol: 'circle',
        symbolSize: (value, params) => {
          // 如果对应真实记录，则放大圆点
          return trendData.value[params.dataIndex]?.hasRecord ? 10 : 6
        },
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff'
        },
        lineStyle: {
          width: 5,
          color: lineGradient,
          cap: 'round',
          join: 'round',
          shadowColor: 'rgba(0, 0, 0, 0.1)',
          shadowBlur: 10,
          shadowOffsetY: 8
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(150, 150, 150, 0.15)' }, // 标准遮罩层，折线颜色主要由 visualMap 控制
            { offset: 1, color: 'rgba(255, 255, 255, 0)' }
          ])
        }
      }
    ]
  }

  chartInstance.setOption(option, { notMerge: true, lazyUpdate: false })

  // 在 DOM 宽度稳定后再调整尺寸，并将视口锁定到最新日期（右侧）。
  nextTick(() => {
    if (chartInstance && chartContainerRef.value) {
      chartInstance.resize({
        width: chartContainerRef.value.clientWidth,
        height: chartContainerRef.value.clientHeight
      })
    }
    alignScrollToRight()
  })
}

const loadTrendData = async () => {
  const currentRequest = ++requestSeq
  loading.value = true
  
  const reqDays = selectedDays.value
  const now = dayjs()
  const end = now.format('YYYY-MM-DD')
  const beginTarget = now.subtract(reqDays - 1, 'day').format('YYYY-MM-DD')

  try {
    // 1. 先探测安全起始日期
    const registerDate = await fetchImplicitRegisterDate()
    if (currentRequest !== requestSeq) return

    // 2. 将请求起始日期限制在注册日期之后
    const safeBegin = dayjs(beginTarget).isBefore(dayjs(registerDate)) ? registerDate : beginTarget
    
    // 3. 从后端拉取数据
    const rawData = await getTrendPoints(safeBegin, end)
    if (currentRequest !== requestSeq) return

    // 4. 如果数据不完整，则补齐开头，确保 X 轴上有 reqDays 个刻度。
    let fullData = [...rawData]
    if (rawData.length < reqDays) {
      const paddedData = []
      // 从 beginTarget 开始补空点，直到第一个有效数据点（safeBegin）。
      // 实际上这里直接从 beginTarget 循环到结尾，逐个映射或合并即可。
      for (let i = 0; i < reqDays; i++) {
        const iterDate = now.subtract(reqDays - 1 - i, 'day').format('YYYY-MM-DD')
        const existing = fullData.find(d => d.date === iterDate)
        if (existing) {
          paddedData.push(existing)
        } else {
          // 空白占位补齐
          paddedData.push({
            date: iterDate,
            emotionTagId: null,
            emotionTagName: null,
            emotionTagColor: '#e0e0e0', // 占位灰色
            emotionValue: 0,
            hasRecord: false
          })
        }
      }
      fullData = paddedData
    }

    trendData.value = fullData
  } catch (error) {
    trendData.value = []
    ElMessage.warning('当前时间范围暂无可用数据，请先持续打卡')
    console.error('Failed to fetch trend data', error)
  } finally {
    if (currentRequest !== requestSeq) return
    loading.value = false
    await nextTick()
    updateWrapperWidth()

    if (!trendData.value.length) {
      if (chartInstance) {
        chartInstance.dispose()
        chartInstance = null
      }
      return
    }

    renderChart()
  }
}

watch(selectedDays, () => {
  loadTrendData()
}, { immediate: true })

watch(wrapperWidth, async () => {
  await nextTick()
  if (chartInstance && chartContainerRef.value) {
    chartInstance.resize({
      width: chartContainerRef.value.clientWidth,
      height: chartContainerRef.value.clientHeight
    })
    alignScrollToRight()
  }
})

const handleResize = () => {
  updateWrapperWidth()
  if (chartInstance) {
    chartInstance.resize()
    alignScrollToRight()
  }
}

onMounted(() => {
  updateWrapperWidth()

  if (scrollWrapperRef.value) {
    wrapperResizeObserver = new ResizeObserver(() => {
      updateWrapperWidth()
    })
    wrapperResizeObserver.observe(scrollWrapperRef.value)
  }

  if (trendData.value.length) {
    renderChart()
  }

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (wrapperResizeObserver) {
    wrapperResizeObserver.disconnect()
    wrapperResizeObserver = null
  }

  if (chartInstance) {
    chartInstance.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.mood-trend-view {
  min-height: 100vh;
  background-color: #fafbfc;
  background-image: 
    radial-gradient(at 0% 0%, rgba(200, 240, 255, 0.2) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(255, 230, 240, 0.2) 0px, transparent 50%);
  display: flex;
  flex-direction: column;
}

.top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  position: relative;
  z-index: 10;
}

.back-btn-glass {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--el-text-color-primary);
  font-size: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.back-btn-glass:hover {
  background: rgba(255, 255, 255, 0.9);
  transform: scale(1.05);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.5px;
  color: var(--el-text-color-primary);
}

.trend-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 24px;
}

.time-segments {
  display: flex;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(12px);
  padding: 4px;
  border-radius: 99px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
  margin-bottom: 32px;
}

.segment-btn {
  border: none;
  background: transparent;
  padding: 8px 20px;
  border-radius: 99px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.segment-btn.is-active {
  background: #ffffff;
  color: var(--el-color-primary);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.chart-section {
  width: 100%;
  max-width: 1000px;
  height: 480px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.04);
  padding: 20px 12px;
  position: relative;
}

.chart-scroll-wrapper {
  width: 100%;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  touch-action: pan-x;
  -webkit-overflow-scrolling: touch;
  /* 隐藏滚动条，让界面更清爽 */
  scrollbar-width: none;
}
.chart-scroll-wrapper::-webkit-scrollbar {
  display: none;
}

.echarts-container {
  height: 100%;
  flex: 0 0 auto;
}

.chart-loading, .chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.summary-text {
  margin-top: 32px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  letter-spacing: 0.5px;
  text-align: center;
  opacity: 0.8;
}

/* 动画 */
.chart-section {
  animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>