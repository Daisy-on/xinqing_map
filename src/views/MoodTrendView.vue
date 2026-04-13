<template>
  <div class="mood-trend-view">
    <!-- Header -->
    <header class="top-nav">
      <button class="back-btn-glass" type="button" @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <h1 class="page-title">心情趋势</h1>
      <div style="width: 40px"></div>
    </header>

    <main class="trend-content">
      <!-- Segment Control (7, 14, 30 days) -->
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

      <!-- Chart Container -->
      <section class="chart-section">
        <div ref="chartContainerRef" class="echarts-container"></div>

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

      <!-- Sub text or summary (optional) -->
      <p class="summary-text" v-if="trendData.length">
        记录了属于你的色彩轨迹。持续打卡，遇见更清晰的自己。
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { nextTick, ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'
import dayjs from 'dayjs'
import { getTrendPoints, type MoodTrendPointVO } from '@/api/mood'
import { ElMessage } from 'element-plus'

const router = useRouter()
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
let requestSeq = 0

const setRange = (days: number) => {
  selectedDays.value = days
}

/**
 * Handle Echarts rendering with a multi-colored line (rainbow gradient)
 * Since `emotionTagColor` is returned per data point, we can leverage LinearGradient.
 */
const renderChart = () => {
  if (!chartInstance && chartContainerRef.value) {
    chartInstance = echarts.init(chartContainerRef.value)
  }
  
  if (!chartInstance || !trendData.value.length) return

  // Format data
  const xAxisData = trendData.value.map(pt => dayjs(pt.date).format('MM-DD'))
  
  // Custom series point data to keep exact dot colors
  const seriesData = trendData.value.map(pt => {
    const pointColor = pt.hasRecord ? (pt.emotionTagColor || '#cfd8dc') : '#e0e0e0'
    return {
      value: pt.emotionValue || 0,
      itemStyle: {
        color: pointColor
      }
    }
  })

  // To create a continuous gradient along the X-axis for the line
  const colorStops = trendData.value.map((pt, idx) => {
    const offset = trendData.value.length > 1 ? idx / (trendData.value.length - 1) : 0
    return {
      offset: offset,
      color: pt.hasRecord ? (pt.emotionTagColor || '#cfd8dc') : '#e0e0e0'
    }
  })

  const lineGradient = new echarts.graphic.LinearGradient(0, 0, 1, 0, colorStops)

  // To create a beautiful glowing line and area
  const option: echarts.EChartsOption = {
    grid: {
      left: '4%',
      right: '6%',
      bottom: '5%',
      top: '15%',
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
      axisLabel: { color: '#90a4ae', padding: [8, 0, 0, 0] },
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
        smooth: true,
        data: seriesData,
        symbol: 'circle',
        symbolSize: (value, params) => {
          // Exaggerate dots if they correspond to actual records
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
            { offset: 0, color: 'rgba(150, 150, 150, 0.15)' }, // standard overlay, visualMap controls the line color only well
            { offset: 1, color: 'rgba(255, 255, 255, 0)' }
          ])
        }
      }
    ]
  }

  chartInstance.setOption(option, { notMerge: true, lazyUpdate: false })
  chartInstance.resize()
}

const loadTrendData = async () => {
  const currentRequest = ++requestSeq
  loading.value = true
  
  // Calculate begin and end logic
  const now = dayjs()
  const end = now.format('YYYY-MM-DD')
  // Note: If we want exactly 7 days including today, we go back 6 days.
  const begin = now.subtract(selectedDays.value - 1, 'day').format('YYYY-MM-DD')

  try {
    const data = await getTrendPoints(begin, end)
    if (currentRequest !== requestSeq) return
    trendData.value = data
  } catch (error) {
    trendData.value = []
    ElMessage.warning('当前时间范围暂无可用数据，请先持续打卡')
    console.error('Failed to fetch trend data', error)
  } finally {
    if (currentRequest !== requestSeq) return
    loading.value = false
    await nextTick()

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

const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
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
  max-width: 800px;
  height: 380px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.04);
  padding: 20px;
  position: relative;
}

.echarts-container {
  width: 100%;
  height: 100%;
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

/* Animations */
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