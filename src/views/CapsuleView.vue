<script setup lang="ts">
import { ref, reactive, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { openCapsule, publishCapsule } from '@/api/capsule'
import type { CapsuleVO } from '@/types/models'

const router = useRouter()

const currentView = ref<'main' | 'drawing' | 'result' | 'writing'>('main')

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
  currentView.value = 'drawing'

  // 动画时长改为2.5s以配合摇晃和倒出小胶囊动画
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
  }, 2500)
}

const publishForm = reactive({
  content: ''
})
const isPublishing = ref(false)

const goToWrite = () => {
  currentView.value = 'writing'
}

const handlePublish = async () => {
  if (!publishForm.content.trim()) {
    ElMessage.warning('胶囊内容不能为空哦')
    return
  }

  isPublishing.value = true
  try {
    await publishCapsule({ content: publishForm.content, type: 0 })
    ElMessage.success('投递成功，温暖已汇入玻璃瓶！')
    publishForm.content = ''
    currentView.value = 'main'
  } catch (error) {
  } finally {
    isPublishing.value = false
  }
}

const goBack = () => {
  if (['result', 'writing'].includes(currentView.value)) {
    currentView.value = 'main'
  } else {
    router.push('/')
  }
}

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<template>
  <main class="capsule-view">
    <!-- 明亮色调高雅背景 -->
    <div class="light-bg">
      <div class="blob shape-1"></div>
      <div class="blob shape-2"></div>
      <div class="blob shape-3"></div>
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
              <div class="bottle-reflection"></div>
            </div>
            <div class="bottle-shadow"></div>
          </div>
          <div class="intro-texts">
            <h2 class="title">树洞里的秘密</h2>
            <p class="subtitle">摇晃玻璃瓶，倾听陌生人的心情。</p>
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
              <div class="bottle-neck">
                 <!-- 倒出的那一颗 -->
                 <div class="capsule dropping-capsule"></div>
              </div>
              <div class="bottle-body">
                <!-- 晃动中错乱的小胶囊 -->
                <div class="capsule mini b-1"></div>
                <div class="capsule mini b-2"></div>
                <div class="capsule mini b-3"></div>
                <div class="capsule mini b-4"></div>
                <div class="capsule mini b-5"></div>
              </div>
              <div class="bottle-reflection"></div>
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
              <p class="content-text">{{ capsuleResult?.content }}</p>
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
            <div class="card-deco"><div class="capsule-icon write-mode"></div></div>
            <h3 class="writing-title">装填胶囊</h3>
            <textarea 
              v-model="publishForm.content" 
              class="custom-textarea"
              placeholder="写下你的小秘密，封装进胶囊..."
              maxlength="500"
            ></textarea>
            <div class="word-limit">{{ publishForm.content.length }}/500</div>
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
}
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.6;
}
.shape-1 {
  top: -10%; left: -10%; width: 50vw; height: 50vw;
  background: #bae6fd;
  animation: blobFloat 10s infinite alternate;
}
.shape-2 {
  bottom: -20%; right: -10%; width: 60vw; height: 60vw;
  background: #c7d2fe;
  animation: blobFloat 12s infinite alternate-reverse;
}
.shape-3 {
  top: 40%; left: 60%; width: 40vw; height: 40vw;
  background: #fbcfe8;
  animation: blobFloat 14s infinite alternate;
}
.backdrop-glass {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(30px);
}

@keyframes blobFloat {
  0% { transform: translateY(0) scale(1); }
  100% { transform: translateY(-50px) scale(1.1); }
}

/* 导航 */
.top-nav {
  position: relative;
  z-index: 10;
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
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 2px;
  color: #1e293b;
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
  transform-origin: center bottom;
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
  height: 30px;
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
  height: 150px;
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.7);
  border-radius: 40px 40px 20px 20px;
  z-index: 1;
  position: relative;
  backdrop-filter: blur(6px);
  box-shadow: 
    inset 20px 0 30px rgba(255,255,255,0.6),
    inset -10px -20px 30px rgba(0,0,0,0.05),
    0 15px 30px rgba(0,0,0,0.1);
  overflow: hidden; /* 保证里面的胶囊在体内 */
}

/* 玻璃高光反光 */
.bottle-reflection {
  position: absolute;
  top: 40px;
  left: 20px;
  width: 15px;
  height: 110px;
  background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%);
  border-radius: 50%;
  transform: rotate(4deg);
  z-index: 3;
  pointer-events: none;
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
  0% { transform: translateY(0) rotate(0deg); }
  100% { transform: translateY(-30px) rotate(45deg); }
}

/* === 摇晃及倒出动画 === */
.shaking-animation .glass-bottle {
  animation: pourSequence 2.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.shaking-animation .dispensing-cork {
  animation: popCork 2.5s forwards;
}

/* 掉出的那颗胶囊预埋在颈部 */
.dropping-capsule {
  opacity: 0;
  top: 10px;
  left: 12px;
  background: linear-gradient(180deg, #818cf8 50%, #fff 50%);
  z-index: 5;
}
.shaking-animation .dropping-capsule {
  animation: dropOut 2.5s ease-in forwards;
}

/* 玻璃瓶主体运动 */
@keyframes pourSequence {
  0% { transform: rotate(0deg); }
  10% { transform: rotate(-25deg); }
  20% { transform: rotate(20deg); }
  30% { transform: rotate(-15deg); }
  45% { transform: rotate(10deg); }
  55% { transform: rotate(-5deg); }
  65% { transform: rotate(0deg); }
  /* 准备倾倒(-130度)，因为它是以 bottom center 为轴转的 */
  75% { transform: translateY(-40px) rotate(-135deg); }
  90% { transform: translateY(-40px) rotate(-135deg); }
  100% { transform: translateY(0) rotate(-135deg); opacity: 0; } 
}

@keyframes popCork {
  0%, 70% { transform: translateY(0); opacity: 1; }
  75% { transform: translateY(-30px) translateX(-20px) rotate(-45deg); opacity: 0; }
  100% { transform: translateY(-30px) translateX(-20px) rotate(-45deg); opacity: 0; }
}

@keyframes dropOut {
  0%, 75% { opacity: 0; transform: translateY(0) scale(1); }
  80% { opacity: 1; transform: translateY(-40px) scale(1.2); }
  95% { opacity: 1; transform: translateY(-200px) scale(3); } /* 相对倒立的瓶子方向，也就是向下落 */
  100% { opacity: 0; transform: translateY(-300px) scale(5); }
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
  color: #0f172a;
}
.intro-texts .subtitle {
  font-size: 14px;
  color: #64748b;
  letter-spacing: 0.5px;
}

.action-buttons {
  display: flex;
  gap: 16px;
}

.btn-primary,
.btn-secondary {
  padding: 14px 32px;
  border-radius: 30px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.btn-primary {
  background: #fff;
  color: #38bdf8;
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

.write-mode {
  background: linear-gradient(180deg, #38bdf8 50%, #e2e8f0 50%);
}

.writing-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 24px;
  color: #1e293b;
  text-align: center;
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
  margin-top: 8px;
}

.btn-publish {
  width: 100%;
  margin-top: 24px;
  padding: 14px 0;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 8px 16px rgba(56, 189, 248, 0.3);
}

.btn-publish:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(56, 189, 248, 0.4);
}

.btn-publish.is-loading {
  background: #cbd5e1;
  box-shadow: none;
  cursor: wait;
  transform: none;
}
</style>
