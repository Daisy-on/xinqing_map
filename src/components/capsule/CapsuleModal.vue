<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Edit, Document } from '@element-plus/icons-vue'
import { openCapsule, publishCapsule } from '@/api/capsule'
import type { CapsuleVO } from '@/types/models'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
}>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

const activeTab = ref('draw')

// ---- 抽胶囊 (Draw) 相关逻辑 ----
const isDrawing = ref(false)
const cooldownTimer = ref(0)
const capsuleResult = ref<CapsuleVO | null>(null)

let intervalId: number | null = null

const startCooldown = () => {
  cooldownTimer.value = 5
  if (intervalId) clearInterval(intervalId)
  intervalId = window.setInterval(() => {
    cooldownTimer.value--
    if (cooldownTimer.value <= 0) {
      clearInterval(intervalId!)
      intervalId = null
    }
  }, 1000)
}

const handleDraw = async () => {
  if (cooldownTimer.value > 0 || isDrawing.value) return

  isDrawing.value = true
  capsuleResult.value = null

  // 模拟摇晃瓶子动画 1 秒后出结果
  setTimeout(async () => {
    isDrawing.value = false
    try {
      const res = await openCapsule()
      if (res && res.data) {
        capsuleResult.value = res.data
      }
    } catch (error: any) {
      // 错误处理由拦截器统一管理，或这里兜底
      if (error && error.code === 404) {
        ElMessage.info('目前还没有漂流瓶哦，快去写一个吧！')
      }
    }
    // 强制进入5秒防刷冷却
    startCooldown()
  }, 1000)
}

// 弹窗关闭时重置部分状态
watch(dialogVisible, (newVal) => {
  if (!newVal) {
    // 关闭时可以不清除冷却，但清除结果更干净
    // cooldownTimer 继续计也行，因为它是全局状态；但由于组件可能不卸载，interval会走完。
  }
})

// ---- 写胶囊 (Publish) 相关逻辑 ----
const publishForm = reactive({
  content: ''
})
const isPublishing = ref(false)

const handlePublish = async () => {
  if (!publishForm.content.trim()) {
    ElMessage.warning('胶囊内容不能为空哦')
    return
  }

  isPublishing.value = true
  try {
    await publishCapsule({ content: publishForm.content, type: 0 })
    ElMessage.success('发布胶囊成功，感谢你的温暖传递！')
    publishForm.content = ''
    activeTab.value = 'draw' // 投递成功后切回抽取页面
  } catch (error) {
    // 错误处理兜底
  } finally {
    isPublishing.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="dialogVisible"
    title="心情胶囊"
    width="400px"
    class="capsule-modal"
    append-to-body
    destroy-on-close
  >
    <el-tabs v-model="activeTab" class="capsule-tabs">
      <el-tab-pane label="抽取胶囊" name="draw">
        <div class="draw-container">
          <!-- 瓶子动画容器 -->
          <div class="bottle-wrapper">
            <svg
              class="bottle-icon"
              :class="{ 'shaking': isDrawing }"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M40 10 Q40 5 45 5 L55 5 Q60 5 60 10 L60 20 Q60 25 65 30 L75 50 Q85 70 85 80 Q85 95 70 95 L30 95 Q15 95 15 80 Q15 70 25 50 L35 30 Q40 25 40 20 Z" fill="#e0f2fe" stroke="#38bdf8" stroke-width="3"/>
              <!-- 瓶身一点光泽 -->
              <path d="M25 60 Q20 75 25 85" stroke="#bae6fd" stroke-width="4" fill="none" stroke-linecap="round"/>
              <rect x="35" y="6" width="30" height="8" rx="2" fill="#38bdf8"/>
            </svg>
          </div>

          <!-- 抽到胶囊展示卡片 -->
          <div v-if="capsuleResult" class="capsule-result animate-fade-in">
            <div class="capsule-content">
              <p class="capsule-text">{{ capsuleResult.content }}</p>
              <div class="capsule-footer">
                <span>来自：{{ capsuleResult.creatorName || '匿名心情' }}</span>
              </div>
            </div>
          </div>

          <div v-else class="draw-hint">
            <p v-if="!isDrawing">{{ cooldownTimer > 0 ? `休息一下，${cooldownTimer}秒后再来看看吧` : '摇一摇瓶子，看看别人留下了什么心情' }}</p>
            <p v-else>正在摇晃抽取中...</p>
          </div>

          <div class="draw-actions">
            <el-button
              type="primary"
              round
              size="large"
              :loading="isDrawing"
              :disabled="cooldownTimer > 0"
              @click="handleDraw"
            >
              {{ cooldownTimer > 0 ? `冷却中 (${cooldownTimer}s)` : '摸个胶囊' }}
            </el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="塞入胶囊" name="write">
        <div class="write-container">
          <p class="write-hint">写下你想诉说的温暖话语或小秘密，塞进瓶子里等待有缘人发现吧。</p>
          <el-input
            v-model="publishForm.content"
            type="textarea"
            :rows="6"
            placeholder="写点什么..."
            maxlength="500"
            show-word-limit
          ></el-input>
          <div class="write-actions">
            <el-button
              type="primary"
              size="large"
              :loading="isPublishing"
              @click="handlePublish"
            >
              塞入瓶中
            </el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </el-dialog>
</template>

<style scoped>
.capsule-modal :deep(.el-dialog__body) {
  padding-top: 10px;
}

.capsule-tabs {
  min-height: 380px;
}

.draw-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.bottle-wrapper {
  width: 100px;
  height: 100px;
  margin-bottom: 24px;
}

.bottle-icon {
  width: 100%;
  height: 100%;
  transform-origin: bottom center;
}

/* 摇晃动画核心 */
.shaking {
  animation: shake 0.5s ease-in-out infinite;
}

@keyframes shake {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(15deg); }
  50% { transform: rotate(0deg); }
  75% { transform: rotate(-15deg); }
  100% { transform: rotate(0deg); }
}

.draw-hint {
  height: 30px;
  color: #606266;
  font-size: 14px;
  margin-bottom: 16px;
}

.draw-actions {
  margin-top: 8px;
}

.capsule-result {
  width: 100%;
  background: #fdf6ec;
  border: 1px solid #f3d19e;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(230, 162, 60, 0.1);
  position: relative;
}

/* 简单的纸张折角效果 */
.capsule-result::after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  border-width: 0 16px 16px 0;
  border-style: solid;
  border-color: transparent #fff transparent transparent;
  box-shadow: -2px 2px 2px rgba(0, 0, 0, 0.05);
}

.capsule-text {
  font-size: 16px;
  color: #303133;
  line-height: 1.6;
  margin: 0 0 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.capsule-footer {
  text-align: right;
  font-size: 12px;
  color: #909399;
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.write-container {
  padding: 16px 0px;
}

.write-hint {
  color: #606266;
  font-size: 14px;
  margin-bottom: 16px;
  line-height: 1.5;
}

.write-actions {
  margin-top: 24px;
  text-align: right;
}
</style>
