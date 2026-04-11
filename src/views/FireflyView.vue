<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getAiLetters, type AiLetterVO } from '@/api/ai'

const router = useRouter()

// 状态定义
const loading = ref(true)
const letters = ref<(AiLetterVO & { id: number; isOpen: boolean })[]>([])
const activeLetter = ref<(AiLetterVO & { id: number; isOpen: boolean }) | null>(null)
const isOverlayVisible = ref(false)

// 打字机相关
const displayedText = ref('')
const isFinished = ref(false)
let typeTimer: any = null

onMounted(async () => {
  try {
    const letterList = await getAiLetters()
    letters.value = letterList.map((item, index) => ({
      ...item,
      id: index,
      isOpen: false
    }))
  } catch (error) {
    ElMessage.error('无法获取信件，请稍后再试')
  } finally {
    loading.value = false
  }
})

// 组件销毁时清空定时器
onUnmounted(() => {
  if (typeTimer) clearInterval(typeTimer)
})

const handleBack = () => {
  router.push('/')
}

// 打开信封动画 -> 弹出展开的信纸
const handleOpenEnvelope = (letter: typeof letters.value[0]) => {
  if (letter.isOpen) return
  
  letter.isOpen = true
  
  // 等待 CSS 3D 开合及信纸抽出动画（800ms），然后展示阅读全屏蒙层
  setTimeout(() => {
    activeLetter.value = letter
    isOverlayVisible.value = true
    startTypewriter(letter.letter_content)
  }, 1000)
}

// 启动流式打字机效果
const startTypewriter = (fullText: string) => {
  if (!fullText) return
  displayedText.value = ''
  isFinished.value = false
  let currentIndex = 0
  
  if (typeTimer) clearInterval(typeTimer)
  
  typeTimer = setInterval(() => {
    if (currentIndex < fullText.length) {
      displayedText.value += fullText[currentIndex]
      currentIndex++
    } else {
      finishTypewriter()
    }
  }, 40) // 40ms/字 的平缓阅读节奏
}

// 提前结束/跳过动效
const finishTypewriter = () => {
  if (typeTimer) {
    clearInterval(typeTimer)
    typeTimer = null
  }
  if (activeLetter.value) {
    displayedText.value = activeLetter.value.letter_content
  }
  isFinished.value = true
}

// 处理点击信纸（如果在打字中，则快速略过；如果打字完毕，无操作）
const handlePaperClick = () => {
  if (!isFinished.value) {
    finishTypewriter()
  }
}

// 关闭信纸，回到信箱
const closeOverlay = () => {
  isOverlayVisible.value = false
  setTimeout(() => {
    activeLetter.value = null
    displayedText.value = ''
    isFinished.value = false
  }, 300) // 等待退出动画完成
}

// 格式化段落，识别换行符
const formatContent = (text: string) => {
  return text.replace(/\n/g, '<br/>')
}
</script>

<template>
  <div class="firefly-container">
    <!-- Header -->
    <header class="top-nav">
      <div class="back-btn" @click="handleBack">
        <el-icon><ArrowLeft /></el-icon>
      </div>
      <h2 class="title">清晨信箱</h2>
      <div class="placeholder"></div>
    </header>

    <!-- Main Content -->
    <main class="content-area">
      <!-- Loading State -->
      <div v-if="loading" class="empty-state">
        <div class="loading-ring"></div>
        <p>正在轻轻翻阅信箱...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="letters.length === 0" class="empty-state">
        <div class="empty-icon">🕊️</div>
        <p>晨光熹微，信箱里空空如也。<br>也许晚些时候，萤火虫会为你带来新的回信。</p>
      </div>

      <!-- Letter List (Envelopes) -->
      <div v-else class="envelope-list">
        <div 
          v-for="letter in letters" 
          :key="letter.id"
          class="scene"
        >
          <div 
            class="envelope-wrapper" 
            :class="{ 'is-open': letter.isOpen }"
            @click="handleOpenEnvelope(letter)"
          >
            <!-- 信封背部背景 -->
            <div class="envelope-back"></div>
            
            <!-- 藏在信封里的折叠信纸 -->
            <div class="inner-paper">
              <div class="paper-preview"></div>
            </div>
            
            <!-- 信封的前面板口袋 -->
            <div class="envelope-pocket"></div>
            
            <!-- 信封翻盖 -->
            <div class="envelope-flap"></div>
            
            <!-- 外部标签或邮戳 -->
            <div v-if="letter.emotion_tag" class="stamp" :class="{ 'is-hidden': letter.isOpen }">
              {{ letter.emotion_tag }}
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Reading Overlay (展开的信纸阅读页) -->
    <div class="reading-overlay" :class="{ 'is-visible': isOverlayVisible }">
      <div class="overlay-backdrop" @click="closeOverlay"></div>
      
      <div class="reading-paper-wrapper">
        <button class="close-btn" @click="closeOverlay">
          <el-icon><Close /></el-icon>
        </button>
        
        <div class="readable-paper" @click="handlePaperClick">
          <!-- 信纸页眉 -->
          <div class="paper-header">
            <span class="tag" v-if="activeLetter?.emotion_tag">来自关于「{{ activeLetter.emotion_tag }}」的回声</span>
            <span class="tag" v-else>一段未名的寄语</span>
            <span v-if="!isFinished" class="skip-hint">(点击跳过动画)</span>
          </div>
          
          <!-- 信纸正文 -->
          <div class="paper-body">
            <p class="typewriter-content" v-html="formatContent(displayedText)"></p>
            <span v-if="!isFinished" class="cursor">|</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 容器及全局设定 - 亮色治愈风 */
.firefly-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f7f6f2; /* 浅米色/暖白 */
  background-image: radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.8) 0%, rgba(247, 246, 242, 0) 60%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
}

/* 顶部导航 */
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  z-index: 10;
  position: sticky;
  top: 0;
}

.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #5c626a;
  cursor: pointer;
  border-radius: 50%;
  transition: background-color 0.3s;
}
.back-btn:hover { background-color: rgba(0, 0, 0, 0.05); }

.title {
  font-size: 17px;
  font-weight: 500;
  color: #3b424a;
  margin: 0;
  letter-spacing: 0.5px;
}
.placeholder { width: 40px; }

/* 内容区域 */
.content-area {
  flex: 1;
  padding: 40px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
}

/* 空状态 */
.empty-state {
  margin-top: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #8c939d;
  font-size: 15px;
  line-height: 1.8;
  animation: fadeIn 0.8s ease;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 24px;
  opacity: 0.8;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.05));
}
.loading-ring {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0,0,0,0.05);
  border-top-color: #a4b0be;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 24px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 信封列表容器 */
.envelope-list {
  display: flex;
  flex-wrap: wrap;
  gap: 40px;
  justify-content: center;
  max-width: 1000px;
  width: 100%;
}

/* CSS 3D 信封构建 */
.scene {
  perspective: 1200px;
  margin-bottom: 20px;
}

.envelope-wrapper {
  position: relative;
  width: 320px;
  height: 200px;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), 
              box-shadow 0.4s ease;
  border-radius: 6px;
  box-shadow: 0 10px 24px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04);
  background-color: #faf7f0; /* 信封底色 */
}

.envelope-wrapper:hover:not(.is-open) {
  transform: translateY(-6px);
  box-shadow: 0 16px 32px rgba(0,0,0,0.08), 0 8px 16px rgba(0,0,0,0.05);
}

/* 信封背板 */
.envelope-back {
  position: absolute;
  inset: 0;
  background: #f0ebe1;
  border-radius: 6px;
}

/* 内部信纸 */
.inner-paper {
  position: absolute;
  top: 10px;
  left: 15px;
  right: 15px;
  bottom: 10px;
  background: #fffefb;
  border-radius: 4px;
  box-shadow: 0 0 10px rgba(0,0,0,0.02);
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease;
  transition-delay: 0.3s; /* 等待盖子打开 */
  z-index: 10;
}
.paper-preview {
  margin: 20px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  width: 60%;
  box-shadow: 0 16px 0 #f0f0f0, 0 32px 0 #f0f0f0;
}
.envelope-wrapper.is-open .inner-paper {
  transform: translateY(-80px);
}

/* 信封口袋(前置重叠层) */
.envelope-pocket {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 100px 160px;
  /* 创造信封下方三角叠加效果 */
  border-color: transparent #ede7db #e3dccf #ede7db;
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  z-index: 20;
}

/* 信封翻盖 */
.envelope-flap {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 110px 160px 0 160px;
  border-color: #e6dfd1 transparent transparent transparent;
  transform-origin: top center;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 30;
  filter: drop-shadow(0 4px 4px rgba(0,0,0,0.03));
}
.envelope-wrapper.is-open .envelope-flap {
  transform: rotateX(180deg);
  z-index: 5; /* 降层及防止遮挡抽出的信纸 */
}

/* 邮戳/标签 */
.stamp {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(4px);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: #6b7280;
  border: 1px solid rgba(255,255,255,0.8);
  font-family: "Noto Serif SC", "Songti SC", serif;
  transition: opacity 0.3s;
  z-index: 25;
}
.stamp.is-hidden { opacity: 0; }


/* 全屏阅读蒙层 (Reading Overlay) */
.reading-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.5s ease;
}
.reading-overlay.is-visible {
  pointer-events: auto;
  opacity: 1;
}

.overlay-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(247, 246, 242, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.reading-paper-wrapper {
  position: relative;
  width: 90vw;
  max-width: 680px;
  height: 85vh;
  z-index: 2;
  transform: translateY(20px);
  transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.reading-overlay.is-visible .reading-paper-wrapper {
  transform: translateY(0);
}

.close-btn {
  position: absolute;
  top: -10px;
  right: -40px;
  background: transparent;
  border: none;
  font-size: 28px;
  color: #8c939d;
  cursor: pointer;
  transition: color 0.2s, transform 0.2s;
  padding: 8px;
}
.close-btn:hover {
  color: #3b424a;
  transform: scale(1.1);
}
@media (max-width: 768px) {
  .close-btn {
    top: 10px;
    right: 10px;
    z-index: 10;
    color: #a4b0be;
  }
}

.readable-paper {
  width: 100%;
  height: 100%;
  background: #fffdf9;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02);
  padding: 40px 48px;
  overflow-y: auto;
  cursor: text;
}
@media (max-width: 768px) {
  .readable-paper { padding: 40px 24px; }
}

.paper-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  padding-bottom: 16px;
  margin-bottom: 32px;
  font-family: inherit;
}
.tag {
  font-size: 14px;
  color: #a4b0be;
  letter-spacing: 1px;
}
.skip-hint {
  font-size: 12px;
  color: #dcdfe6;
  font-style: italic;
}

/* 信纸字体排版 - 优雅治愈系 */
.paper-body {
  font-family: "Noto Serif SC", "Songti SC", "STSong", serif;
  color: #4a5159; /* 深空灰 */
  font-size: 17px;
  line-height: 2.2;
  letter-spacing: 0.5px;
  position: relative;
  min-height: 200px;
}

.typewriter-content {
  margin: 0;
  display: inline;
}

/* 闪烁光标 */
.cursor {
  display: inline-block;
  margin-left: 4px;
  color: #a4b0be;
  animation: blink 1s step-start infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
