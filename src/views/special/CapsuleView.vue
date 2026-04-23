<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Microphone, Mute, RefreshRight, VideoPause, Close } from '@element-plus/icons-vue'
import { openCapsule, publishCapsule } from '@/api/capsule'
import { uploadFile } from '@/api/file'
import type { CapsuleVO } from '@/types/models'

const router = useRouter()

const currentView = ref<'main' | 'drawing' | 'result' | 'writing'>('main')

const isDrawing = ref(false)
const cooldownTimer = ref(0)
const capsuleResult = ref<CapsuleVO | null>(null)
let intervalId: number | null = null

// ==== 语音录制相关状态 ====
const inputType = ref<'text' | 'voice'>('text')
const isRecording = ref(false)
const audioRecord = ref<Blob | null>(null)
const audioUrl = ref<string>('')
const recordDuration = ref(0) // 录音时长(秒)
let recordTimerId: number | null = null
let mediaRecorder: MediaRecorder | null = null
let audioChunks: BlobPart[] = []

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
  currentView.value = 'drawing'

  // 动画时长改为4s以配合上移拔塞、摇晃、逆时针倒出并展示小胶囊的动效
  setTimeout(async () => {
    isDrawing.value = false
    try {
      const capsule = await openCapsule()
      if (capsule) {
        capsuleResult.value = capsule
        currentView.value = 'result'
      } else {
        ElMessage.info('目前还没有漂流瓶哦，快去写一个吧！')
        currentView.value = 'main'
      }
    } catch (error: any) {
      if (error && error.code === 404) {
        ElMessage.info('目前还没有漂流瓶哦，快去写一个吧！')
      }
      currentView.value = 'main'
    }
    startCooldown()
  }, 4000)
}

const publishForm = reactive({
  content: ''
})
const isPublishing = ref(false)

const goToWrite = () => {
  currentView.value = 'writing'
  inputType.value = 'text'
  clearRecording()
}

// ==== 语音录制逻辑 ====
const clearRecording = () => {
  if (isRecording.value) stopRecording()
  audioRecord.value = null
  if (audioUrl.value) {
    URL.revokeObjectURL(audioUrl.value)
    audioUrl.value = ''
  }
  recordDuration.value = 0
  audioChunks = []
}

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    
    // 优先使用 webm 后端支持，对 Safari 也会自动降级
    let mimeType = 'audio/webm;codecs=opus'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/mp4' // iOS Safari fallback
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = '' // Let browser choose default
      }
    }

    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    audioChunks = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || 'audio/webm' })
      audioRecord.value = blob
      audioUrl.value = URL.createObjectURL(blob)
      stream.getTracks().forEach(track => track.stop()) // 停止麦克风流
    }

    mediaRecorder.start(200) // 切片录制，方便实时获取数据
    isRecording.value = true
    recordDuration.value = 0
    
    recordTimerId = window.setInterval(() => {
      recordDuration.value++
      // 限制 60 秒录制
      if (recordDuration.value >= 60) {
        stopRecording()
        ElMessage.info('最多只能录制60秒哦')
      }
    }, 1000)

  } catch (error) {
    console.error('麦克风访问失败', error)
    ElMessage.error('无法获取麦克风权限，请检查浏览器设置')
    inputType.value = 'text'
  }
}

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  isRecording.value = false
  if (recordTimerId) {
    clearInterval(recordTimerId)
    recordTimerId = null
  }
}

// 格式化时长 (mm:ss)
const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

const handlePublish = async () => {
  if (inputType.value === 'text' && !publishForm.content.trim()) {
    ElMessage.warning('胶囊内容不能为空哦')
    return
  }
  if (inputType.value === 'voice' && !audioRecord.value) {
    ElMessage.warning('请先录制一段语音')
    return
  }

  isPublishing.value = true
  try {
    if (inputType.value === 'voice') {
      const file = new File([audioRecord.value!], `capsule_voice_${Date.now()}.webm`, { type: audioRecord.value!.type })
      const uploadedUrl = await uploadFile(file)
      await publishCapsule({ content: uploadedUrl, type: 2 })
    } else {
      await publishCapsule({ content: publishForm.content, type: 0 })
    }
    
    ElMessage.success('投递成功，温暖已汇入玻璃瓶！')
    publishForm.content = ''
    clearRecording()
    currentView.value = 'main'
  } catch (error) {
    console.error('发布失败', error)
  } finally {
    isPublishing.value = false
  }
}

const goBack = () => {
  if (['result', 'writing'].includes(currentView.value)) {
    if (currentView.value === 'writing') {
      clearRecording()
    }
    currentView.value = 'main'
  } else {
    router.push('/')
  }
}

const isPlayingResult = ref(false)
const resultAudioPlayer = ref<HTMLAudioElement | null>(null)

const togglePlayResult = (url: string) => {
  if (!resultAudioPlayer.value) {
    resultAudioPlayer.value = new Audio(url)
    resultAudioPlayer.value.onended = () => { isPlayingResult.value = false }
    resultAudioPlayer.value.onpause = () => { isPlayingResult.value = false }
    resultAudioPlayer.value.onplay = () => { isPlayingResult.value = true }
  }
  
  if (resultAudioPlayer.value.src !== url) {
    resultAudioPlayer.value.src = url
  }

  if (isPlayingResult.value) {
    resultAudioPlayer.value.pause()
  } else {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    resultAudioPlayer.value.play()
  }
}

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
  clearRecording()
  if (resultAudioPlayer.value) {
    resultAudioPlayer.value.pause()
    resultAudioPlayer.value = null
  }
})
</script>

<template>
  <main class="capsule-view">
    <!-- 图片背景 -->
    <div class="light-bg">
      <img src="@/assets/images/capsule-bg.jpg" class="bg-image" />
      <div class="backdrop-glass"></div>
    </div>

    <header class="top-nav">
      <button class="back-btn" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        <span>返回</span>
      </button>
      <h1 class="page-title">心情胶囊</h1>
    </header>

    <div class="scene-container">
      <transition name="fade-scale" mode="out-in">
        <!-- 视图：主界面 -->
        <div v-if="currentView === 'main'" class="view-main">
          <div class="bottle-wrapper idle-hover">
            <!-- 纯CSS玻璃瓶 -->
            <div class="glass-bottle">
              <div class="bottle-cork"></div>
              <div class="bottle-neck"></div>
              <div class="bottle-body">
                <!-- 瓶内的彩色小胶囊 -->
                <div class="capsule mini c-1"></div>
                <div class="capsule mini c-2"></div>
                <div class="capsule mini c-3"></div>
                <div class="capsule mini c-4"></div>
                <div class="capsule mini c-5"></div>
                <div class="capsule mini c-6"></div>
              </div>
            </div>
            <div class="bottle-shadow"></div>
          </div>
          <div class="intro-texts">
            <h2 class="title">树洞里的秘密</h2>
            <p class="subtitle">摇晃瓶子，倾听陌生人的寄语。</p>
          </div>
          <div class="action-buttons">
            <button class="btn-primary" @click="goToWrite">塞入一颗</button>
            <button 
              class="btn-secondary" 
              :class="{ 'is-disabled': cooldownTimer > 0 }"
              @click="handleDraw"
              :disabled="cooldownTimer > 0"
            >
              {{ cooldownTimer > 0 ? `休息 (${cooldownTimer}s)` : '倒出一颗' }}
            </button>
          </div>
        </div>

        <!-- 视图：摇晃与倒出动画中 -->
        <div v-else-if="currentView === 'drawing'" class="view-drawing">
          <div class="bottle-wrapper shaking-animation">
            <div class="glass-bottle dispensing">
              <div class="bottle-cork dispensing-cork"></div>
              <div class="bottle-neck"></div>
              <div class="bottle-body">
                <!-- 晃动中错乱的小胶囊 -->
                <div class="capsule mini b-1"></div>
                <div class="capsule mini b-2"></div>
                <div class="capsule mini b-3"></div>
                <div class="capsule mini b-4"></div>
                <div class="capsule mini b-5"></div>
              </div>
            </div>
            <div class="bottle-shadow"></div>
            <!-- 倒出并在屏幕中间展示的这一颗 -->
            <div class="dropped-capsule-wrapper">
               <div class="capsule final-capsule"></div>
            </div>
          </div>
        </div>

        <!-- 视图：展示结果卡片 -->
        <div v-else-if="currentView === 'result'" class="view-result">
          <div class="result-card light-reveal">
            <div class="card-deco">
              <div class="capsule-icon"></div>
            </div>
            <div class="card-inner">
              <template v-if="capsuleResult?.type === 2">
                <div class="voice-bubble" @click="togglePlayResult(capsuleResult.content)">
                  <el-icon class="voice-icon" :class="{ 'is-playing': isPlayingResult }"><Microphone /></el-icon>
                  <span class="voice-text">{{ isPlayingResult ? '播放中...' : '点击播放语音' }}</span>
                  <div v-if="isPlayingResult" class="voice-waves">
                    <span class="wave"></span><span class="wave"></span><span class="wave"></span>
                  </div>
                </div>
              </template>
              <template v-else>
                <p class="content-text">{{ capsuleResult?.content }}</p>
              </template>
              <div class="card-footer">
                <span class="author">— {{ capsuleResult?.creatorName || '匿名' }}</span>
              </div>
            </div>
            <button class="btn-close-card" @click="currentView = 'main'">收回瓶中</button>
          </div>
        </div>

        <!-- 视图：填写内容 -->
        <div v-else-if="currentView === 'writing'" class="view-writing">
          <div class="writing-card">
            <!-- 关闭按钮 -->
            <button class="card-close-btn" type="button" @click="currentView = 'main'" aria-label="关闭">
              <el-icon><Close /></el-icon>
            </button>
            <div class="card-deco"><div class="capsule-icon write-mode"></div></div>
            
            <div class="writing-header">
              <h3 class="writing-title">装填胶囊</h3>
              <div class="segmented-control">
                <div 
                  class="segment-bg" 
                  :style="{ transform: `translateX(${inputType === 'text' ? '0' : '100%'})` }"
                ></div>
                <button 
                  class="segment-item" 
                  :class="{ active: inputType === 'text' }"
                  @click="inputType = 'text'"
                >文字</button>
                <button 
                  class="segment-item" 
                  :class="{ active: inputType === 'voice' }"
                  @click="inputType = 'voice'"
                >语音</button>
              </div>
            </div>

            <!-- 文字输入 -->
            <template v-if="inputType === 'text'">
              <textarea 
                v-model="publishForm.content" 
                class="custom-textarea"
                placeholder="写下你的寄语或小秘密..."
                maxlength="500"
              ></textarea>
              <div class="word-limit">{{ publishForm.content.length }}/500</div>
            </template>

            <!-- 语音输入 -->
            <template v-else>
              <div class="voice-recorder-container">
                <div class="voice-status" :class="{ 'is-recording': isRecording }">
                  <span v-if="!isRecording && !audioRecord">准备就绪</span>
                  <span v-else-if="isRecording" class="recording-time">{{ formatDuration(recordDuration) }}</span>
                  <span v-else class="audio-played-status" @click="togglePlayResult(audioUrl)">
                    {{ isPlayingResult ? '正在试听...' : '试听录音' }} ({{ formatDuration(recordDuration) }})
                  </span>
                </div>
                
                <div class="voice-controls">
                  <button v-if="audioRecord && !isRecording" class="btn-voice-sec" @click="clearRecording" title="重录">
                    <el-icon><RefreshRight /></el-icon>
                  </button>
                  <button 
                    class="btn-voice-main" 
                    :class="{ 'recording': isRecording }"
                    @click="isRecording ? stopRecording() : startRecording()"
                  >
                    <el-icon><Microphone v-if="!isRecording" /><VideoPause v-else /></el-icon>
                  </button>
                  <div v-if="audioRecord && !isRecording" class="btn-voice-sec-placeholder"></div>
                </div>
              </div>
            </template>

            <button 
              class="btn-publish" 
              :class="{ 'is-loading': isPublishing }"
              @click="handlePublish"
              :disabled="isPublishing"
            >
              {{ isPublishing ? '封装中...' : '塞进玻璃瓶' }}
            </button>
          </div>
        </div>
      </transition>
    </div>
  </main>
</template>

<style scoped>
/* 容器及亮色背景 */
.capsule-view {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #f8fafc;
  color: #334155;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

.light-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background-color: #000; /* 视频加载前的底色 */
}

.bg-image {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: translate(-50%, -50%);
  filter: brightness(0.85); /* 恢复之前的亮度 */
}

.backdrop-glass {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.05); /* 恢复之前的半透明遮罩 */
  backdrop-filter: blur(4px); /* 恢复之前的背景模糊效果 */
}

@keyframes blobFloat {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-50px) scale(1.1); }
}

/* 导航 */
.top-nav {
  position: relative;
  z-index: 1001;
  display: flex;
  align-items: center;
  padding: 24px 32px;
}

.back-btn {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  color: #475569;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: #fff;
  transform: translateX(-4px);
  box-shadow: 0 6px 10px -1px rgba(0,0,0,0.08);
}

.page-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 2px;
  color: #30476d;
}

.scene-container {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 视图过渡 */
.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.2, 0, 0, 1);
}
.fade-scale-enter-from { opacity: 0; transform: scale(0.95); }
.fade-scale-leave-to { opacity: 0; transform: scale(1.05); }

/* === 透明玻璃瓶容器与形状 === */
.bottle-wrapper {
  position: relative;
  width: 140px;
  height: 220px;
  margin: 0 auto 40px;
  perspective: 1000px;
}

.glass-bottle {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform-origin: center center; /* 将旋转中心点从 bottom 改为 center，旋转更自然 */
  transition: transform 0.5s ease;
}

.bottle-cork {
  width: 36px;
  height: 22px;
  background: #d2b48c; /* 软木塞颜色 */
  border-radius: 4px 4px 2px 2px;
  box-shadow: inset -4px -4px 6px rgba(139, 69, 19, 0.4), inset 4px 4px 6px rgba(245, 222, 179, 0.4);
  position: relative;
  top: 6px;
  z-index: 2;
  transition: transform 0.5s ease;
}

.bottle-neck {
  width: 44px;
  height: 50px;
  background: rgba(255, 255, 255, 0.2);
  border: 2px solid rgba(255, 255, 255, 0.7);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  z-index: 1;
  backdrop-filter: blur(4px);
  position: relative;
  box-shadow: inset 10px 0 15px rgba(255,255,255,0.5);
}

.bottle-body {
  width: 120px;
  height: 136px;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.7);
  border-radius: 46px 46px 20px 20px / 60px 60px 20px 20px;
  z-index: 1;
  position: relative;
  backdrop-filter: blur(6px);
  box-shadow: 
    inset 20px 0 30px rgba(255,255,255,0.6),
    inset -10px -20px 30px rgba(0,0,0,0.05),
    0 15px 30px rgba(0,0,0,0.1);
  overflow: hidden; /* 保证里面的胶囊在体内 */
}

.bottle-shadow {
  position: absolute;
  bottom: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 100px;
  height: 15px;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, transparent 70%);
  filter: blur(2px);
  border-radius: 50%;
}

.idle-hover {
  animation: gentleFloat 4s ease-in-out infinite;
}
@keyframes gentleFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* === 小胶囊形状 === */
.capsule {
  width: 16px;
  height: 36px;
  border-radius: 8px;
  position: absolute;
  background: linear-gradient(180deg, #ff7eb3 50%, #fff 50%);
  box-shadow: inset -2px -2px 4px rgba(0,0,0,0.1), inset 2px 2px 4px rgba(255,255,255,0.6), 0 2px 4px rgba(0,0,0,0.1);
}

.mini {
  /* 随机分散在瓶内底部 */
  bottom: 10px;
}
/* 颜色与堆叠位置 */
.c-1 { left: 10px; transform: rotate(15deg); background: linear-gradient(180deg, #ff758c 50%, #fff 50%); }
.c-2 { left: 30px; transform: rotate(-25deg); background: linear-gradient(180deg, #8ba8f9 50%, #fff 50%); }
.c-3 { left: 50px; bottom: 8px; transform: rotate(45deg); background: linear-gradient(180deg, #fbcfe8 50%, #fff 50%); }
.c-4 { left: 70px; transform: rotate(-10deg); background: linear-gradient(180deg, #38bdf8 50%, #fff 50%); }
.c-5 { left: 85px; bottom: 15px; transform: rotate(60deg); background: linear-gradient(180deg, #c7d2fe 50%, #fff 50%); }
.c-6 { left: 45px; bottom: 25px; transform: rotate(80deg); background: linear-gradient(180deg, #34e89e 50%, #fff 50%); }

/* 摇晃中瓶内胶囊跳动错乱 */
.b-1 { left: 20px; animation: rattle 0.4s infinite alternate; background: linear-gradient(180deg, #ff758c 50%, #fff 50%); }
.b-2 { left: 40px; animation: rattle 0.3s infinite alternate-reverse; background: linear-gradient(180deg, #8ba8f9 50%, #fff 50%); }
.b-3 { left: 60px; bottom: 15px; animation: rattle 0.5s infinite alternate; background: linear-gradient(180deg, #fbcfe8 50%, #fff 50%); }
.b-4 { left: 80px; animation: rattle 0.35s infinite alternate-reverse; background: linear-gradient(180deg, #38bdf8 50%, #fff 50%); }
.b-5 { left: 50px; bottom: 30px; animation: rattle 0.45s infinite alternate; background: linear-gradient(180deg, #c7d2fe 50%, #fff 50%); }

@keyframes rattle {
  0% { transform: translateY(0) translateX(0) rotate(0deg); }
  100% { transform: translateY(-20px) translateX(10px) rotate(30deg); }
}

/* === 摇晃及倒出动画 === */
.shaking-animation .glass-bottle {
  animation: pourSequence 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.shaking-animation .bottle-shadow {
  animation: shadowLift 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.shaking-animation .dispensing-cork {
  animation: popCork 4s forwards;
}

.dropped-capsule-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* 防止遮挡瓶子 */
  z-index: 10;
}

.final-capsule {
  opacity: 0;
  background: linear-gradient(180deg, #818cf8 50%, #fff 50%);
}
.shaking-animation .final-capsule {
  animation: dropOut 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

/* 玻璃瓶主体运动：上移 -> 摇晃 -> 平滑倾倒倒出 -> 缓慢淡退 */
@keyframes pourSequence {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  15% { transform: translateY(-220px) rotate(0deg); opacity: 1; } 
  20% { transform: translateY(-220px) rotate(25deg); opacity: 1; }
  25% { transform: translateY(-220px) rotate(-20deg); opacity: 1; }
  30% { transform: translateY(-220px) rotate(25deg); opacity: 1; }
  35% { transform: translateY(-220px) rotate(-20deg); opacity: 1; }
  40% { transform: translateY(-220px) rotate(15deg); opacity: 1; }
  45% { transform: translateY(-220px) rotate(-10deg); opacity: 1; }
  50% { transform: translateY(-220px) rotate(0deg); opacity: 1; }
  65% { transform: translateY(-160px) translateX(-40px) rotate(-135deg); opacity: 1; }
  85% { transform: translateY(-160px) translateX(-40px) rotate(-135deg); opacity: 1; }
  100% { transform: translateY(-150px) translateX(-50px) rotate(-140deg); opacity: 0; }
}

@keyframes shadowLift {
  0% { transform: translateX(-50%) scale(1); opacity: 1; }
  15% { transform: translateX(-50%) scale(0.4); opacity: 0.1; } 
  48% { transform: translateX(-50%) scale(0.4); opacity: 0.1; }
  65% { transform: translateX(-30%) scale(0.25); opacity: 0.05; }
  85% { transform: translateX(-30%) scale(0.25); opacity: 0.05; }
  100% { transform: translateX(-40%) scale(0.1); opacity: 0; }
}

@keyframes popCork {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  60% { transform: translateY(0) rotate(0deg); opacity: 1; } 
  68% { transform: translateY(-30px) translateX(20px) rotate(45deg); opacity: 1; } 
  75% { transform: translateY(-40px) translateX(40px) rotate(90deg); opacity: 0; }
  100% { transform: translateY(-40px) translateX(40px) rotate(90deg); opacity: 0; }
}

@keyframes dropOut {
  /* 初始不可见，位置计算为瓶子倾斜135度后，瓶口处的 offset */
  0%, 65% { opacity: 0; transform: translate(-50px, -200px) rotate(-135deg) scale(0.5); }
  68% { opacity: 1; transform: translate(-120px, -100px) rotate(-135deg) scale(0.8); }
  82% { opacity: 1; transform: translate(-20px, -60px) rotate(-30deg) scale(1.2); }
  88% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1.5); }
  98% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1.5); }
  100% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(2.5); }
}

/* === 文字与按钮区 === */
.intro-texts {
  text-align: center;
  margin-bottom: 40px;
}
.intro-texts .title {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 8px;
  color: #2e619b;
}
.intro-texts .subtitle {
  font-size: 14px;
  color: #3f60a9;
  letter-spacing: 0.5px;
}

.action-buttons {
  display: flex;
  gap: 16px;
}

.btn-primary,
.btn-secondary {
  padding: 12px 24px;
  border-radius: 30px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.btn-primary {
  background: #fff;
  color: #49c8ff;
  box-shadow: 0 8px 16px rgba(56, 189, 248, 0.2);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(56, 189, 248, 0.3);
  color: #0ea5e9;
}

.btn-secondary {
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
  color: #fff;
  box-shadow: 0 8px 16px rgba(129, 140, 248, 0.3);
}
.btn-secondary:hover:not(.is-disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(129, 140, 248, 0.4);
}
.btn-secondary.is-disabled {
  background: #cbd5e1;
  color: #f1f5f9;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

/* === 结果卡片展示 === */
.view-result {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.light-reveal {
  width: 340px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 1);
  border-radius: 24px;
  padding: 40px 32px 32px;
  box-shadow: 
    0 20px 40px -10px rgba(0, 0, 0, 0.1),
    0 0 20px rgba(255, 255, 255, 0.5);
  text-align: center;
  animation: puffIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  position: relative;
}

@keyframes puffIn {
  0% { transform: scale(0.6) translateY(50px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

.card-deco {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 48px;
  height: 48px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 8px 16px rgba(0,0,0,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.capsule-icon {
  width: 12px;
  height: 28px;
  background: linear-gradient(180deg, #818cf8 50%, #e2e8f0 50%);
  border-radius: 6px;
  transform: rotate(20deg);
}

.card-inner {
  margin-bottom: 32px;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.content-text {
  font-size: 16px;
  line-height: 1.8;
  color: #334155;
  z-index: 1;
  white-space: pre-wrap;
  word-break: break-all;
  font-weight: 500;
}

/* 语音气泡样式 - 结果展示页 */
.voice-bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 14px 24px;
  border-radius: 16px;
  cursor: pointer;
  margin: 20px auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
}

.voice-bubble:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
  transform: translateY(-2px);
}

.voice-icon {
  font-size: 20px;
  color: #64748b;
  transition: color 0.3s;
}

.voice-icon.is-playing {
  color: #3b82f6;
}

.voice-text {
  font-size: 15px;
  font-weight: 500;
  color: #334155;
}

.voice-waves {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 16px;
}

.wave {
  width: 3px;
  height: 6px;
  background-color: #3b82f6;
  border-radius: 3px;
  animation: wave-bounce 0.8s ease-in-out infinite;
}

.wave:nth-child(2) { animation-delay: 0.15s; }
.wave:nth-child(3) { animation-delay: 0.3s; }

@keyframes wave-bounce {
  0%, 100% { height: 6px; }
  50% { height: 16px; }
}

.card-footer {
  margin-top: 24px;
}

.author {
  font-size: 13px;
  color: #94a3b8;
  letter-spacing: 0.5px;
}

.btn-close-card {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 10px 24px;
  border-radius: 20px;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close-card:hover {
  background: #e2e8f0;
  color: #475569;
}

/* === 投递信纸视图 === */
.view-writing {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.writing-card {
  width: 360px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(25px);
  border: 1px solid #fff;
  padding: 40px 32px 32px;
  border-radius: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.08);
  position: relative;
}

.card-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: #64748b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.card-close-btn:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #1e293b;
  transform: rotate(90deg);
}

.write-mode {
  background: linear-gradient(180deg, #38bdf8 50%, #e2e8f0 50%);
}

.writing-header {
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.writing-title {
  font-size: 22px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  letter-spacing: 1px;
}

/* 分段选择器样式 */
.segmented-control {
  display: flex;
  position: relative;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 20px;
  width: 160px;
  height: 40px;
}

.segment-bg {
  position: absolute;
  top: 4px;
  left: 4px;
  width: calc(50% - 4px);
  height: calc(100% - 8px);
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
}

.segment-item {
  flex: 1;
  position: relative;
  z-index: 2;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: color 0.3s ease;
}

.segment-item.active {
  color: #0f172a;
  font-weight: 600;
}

/* 语音控制区样式 */
.voice-recorder-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
  min-height: 160px;
}

.voice-status {
  font-size: 14px;
  color: #94a3b8;
  margin-bottom: 32px;
  min-height: 20px;
}

.voice-status.is-recording .recording-time {
  color: #ef4444;
  font-weight: 600;
  font-size: 20px;
  font-family: monospace;
  animation: pulse-recording 1s infinite;
}

.audio-played-status {
  color: #3b82f6;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 16px;
  background: #eff6ff;
  border-radius: 20px;
  transition: all 0.2s ease;
}

.audio-played-status:hover {
  background: #dbeafe;
}

@keyframes pulse-recording {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

.voice-controls {
  display: flex;
  align-items: center;
  gap: 24px;
}

.btn-voice-main {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: #f8fafc;
  color: #3b82f6;
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.btn-voice-main:hover {
  transform: scale(1.05);
  background: #eff6ff;
}

.btn-voice-main.recording {
  background: #ef4444;
  color: white;
  box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.1);
  animation: ripple-red 1.5s infinite;
}

@keyframes ripple-red {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.btn-voice-sec {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-voice-sec:hover {
  background: #f8fafc;
  color: #ef4444;
  border-color: #fecaca;
}

.btn-voice-sec-placeholder {
  width: 40px;
}

.custom-textarea {
  width: 100%;
  height: 140px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  color: #334155;
  font-size: 15px;
  line-height: 1.6;
  resize: none;
  outline: none;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.custom-textarea:focus {
  border-color: #7dd3fc;
  box-shadow: 0 0 0 3px rgba(125, 211, 252, 0.3);
  background: #fff;
}

.custom-textarea::placeholder {
  color: #94a3b8;
}

.word-limit {
  text-align: right;
  font-size: 12px;
  color: #94a3b8;
  margin-top: 12px;
}

.btn-publish {
  width: 100%;
  margin-top: 32px;
  padding: 16px 0;
  border: none;
  border-radius: 28px;
  background: #38bdf8;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 16px rgba(56, 189, 248, 0.25);
}

.btn-publish:hover:not(:disabled) {
  background: #0ea5e9;
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(56, 189, 248, 0.35);
}

.btn-publish:active:not(:disabled) {
  transform: translateY(0);
}

.btn-publish:disabled {
  background: #cbd5e1;
  box-shadow: none;
  cursor: not-allowed;
  transform: none;
}

.btn-publish.is-loading {
  background: #7dd3fc;
  cursor: wait;
}
</style>
