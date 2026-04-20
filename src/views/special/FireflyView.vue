<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
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
const isDrawerOpen = ref(false)

// 智能分配：前 2 封放在桌上，其余在抽屉中
const desktopLetters = computed(() => letters.value.slice(0, 2))
const drawerLetters = computed(() => letters.value.slice(2))

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

// 桌面打开信封动画 -> 弹出展开的信纸
const handleOpenEnvelope = (letter: typeof letters.value[0]) => {
  if (letter.isOpen) return
  
  letter.isOpen = true
  setTimeout(() => {
    activeLetter.value = letter
    isOverlayVisible.value = true
    startTypewriter(letter.letter_content)
  }, 1000)
}

// 抽屉内打开信件：关闭抽屉并阅信
const handleOpenEnvelopeFromDrawer = (letter: typeof letters.value[0]) => {
  if (letter.isOpen) return
  
  letter.isOpen = true
  isDrawerOpen.value = false // 关上抽屉
  setTimeout(() => {
    activeLetter.value = letter
    isOverlayVisible.value = true
    startTypewriter(letter.letter_content)
  }, 800) 
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
  }, 40)
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

const handlePaperClick = () => {
  if (!isFinished.value) {
    finishTypewriter()
  }
}

// 关闭信纸，回到信箱并将信重新折叠进去
const closeOverlay = () => {
  isOverlayVisible.value = false
  setTimeout(() => {
    if (activeLetter.value) {
      activeLetter.value.isOpen = false 
    }
    activeLetter.value = null
    displayedText.value = ''
    isFinished.value = false
  }, 300)
}

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
      <div v-if="loading" class="empty-state">
        <div class="loading-ring"></div>
        <p>正在轻轻翻阅信箱...</p>
      </div>

      <div v-else-if="letters.length === 0" class="empty-state">
        <div class="empty-icon">🕊️</div>
        <p>晨光熹微，信箱里空空如也。<br>也许晚些时候，萤火虫会为你带来新的回信。</p>
      </div>

      <!-- Desk Background Scene -->
      <div v-else class="desk-scene">
        <div class="desk-surface">
          <!-- 桌面上的信件 (前1~2封) -->
          <div 
            v-for="(letter, index) in desktopLetters" 
            :key="letter.id"
            class="envelope-wrapper is-desktop"
            :class="{ 'is-open': letter.isOpen, ['pos-' + index]: true }"
            @click="handleOpenEnvelope(letter)"
          >
            <div class="envelope-back"></div>
            <div class="inner-paper"><div class="paper-preview"></div></div>
            <div class="envelope-pocket"></div>
            <div class="envelope-flap"></div>
            <div v-if="letter.emotion_tag" class="stamp" :class="{ 'is-hidden': letter.isOpen }">
              {{ letter.emotion_tag }}
            </div>
          </div>
        </div>

        <!-- 图片抽屉把手旁边的卡片提示 -->
        <div 
          v-if="letters.length > 2" 
          class="drawer-hint-card" 
          @click="isDrawerOpen = true"
        >
          <div class="hint-icon firefly-icon">✨</div>
          <div class="hint-text">
            <span class="hint-title">点击查看更多</span>
            <span class="hint-count">余 {{ letters.length - 2 }} 封信件</span>
          </div>
          <div class="hint-arrow">→</div>
        </div>
      </div>
    </main>

    <!-- Drawer: 残留信件列表 (采用底边滑出的逻辑) -->
    <el-drawer
      v-model="isDrawerOpen"
      direction="btt"
      size="75%"
      :with-header="false"
      class="wood-drawer-theme"
    >
      <div class="drawer-inner">
        <div class="drawer-drag-line" @click="isDrawerOpen = false" style="cursor: pointer;"></div>
        <h3 class="drawer-title">抽屉深处的过往回声</h3>
        <div class="drawer-grid">
          <div 
            v-for="letter in drawerLetters" 
            :key="letter.id"
            class="envelope-wrapper drawer-letter"
            :class="{ 'is-open': letter.isOpen }"
            @click="handleOpenEnvelopeFromDrawer(letter)"
          >
            <div class="envelope-back"></div>
            <div class="inner-paper"><div class="paper-preview"></div></div>
            <div class="envelope-pocket"></div>
            <div class="envelope-flap"></div>
            <div v-if="letter.emotion_tag" class="stamp" :class="{ 'is-hidden': letter.isOpen }">
              {{ letter.emotion_tag }}
            </div>
          </div>
        </div>
      </div>
    </el-drawer>

    <!-- Reading Overlay (展开的信纸阅读页) -->
    <div class="reading-overlay" :class="{ 'is-visible': isOverlayVisible }">
      <div class="overlay-backdrop" @click="closeOverlay"></div>
      
      <div class="reading-paper-wrapper">
        <button class="close-btn" @click="closeOverlay">
          <el-icon><Close /></el-icon>
        </button>
        
        <div class="readable-paper" @click="handlePaperClick">
          <div class="paper-header">
            <span class="tag" v-if="activeLetter?.emotion_tag">来自关于「{{ activeLetter.emotion_tag }}」的回声</span>
            <span class="tag" v-else>一段未名的寄语</span>
            <span v-if="!isFinished" class="skip-hint">(点击跳过动画)</span>
          </div>
          
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
  background-color: #fdfaf6; 
  background-image: radial-gradient(circle at 10% 20%, rgba(255, 255, 255, 0.8) 0%, rgba(247, 246, 242, 0) 60%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  overflow: hidden;
}

/* 顶部导航 */
.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  z-index: 10;
}
.back-btn {
  width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;
  font-size: 22px; color: #5c626a; cursor: pointer; border-radius: 50%; transition: background-color 0.3s;
}
.back-btn:hover { background-color: rgba(0, 0, 0, 0.05); }
.title { font-size: 17px; font-weight: 500; color: #3b424a; margin: 0; letter-spacing: 0.5px; }
.placeholder { width: 40px; }

/* 内容区域 */
.content-area {
  flex: 1; display: flex; flex-direction: column; align-items: center; overflow-y: hidden;
}

/* --- 背景图片桌面构建块 --- */
.desk-scene {
  flex: 1; width: 100%; min-height: 500px; height: 100%;
  position: relative;
  display: flex; align-items: center; justify-content: center;
  background-image: url('@/assets/images/desktop.png');
  background-size: cover;
  background-position: center bottom;
  background-repeat: no-repeat;
  padding-bottom: 60px;
  perspective: 1800px;
  overflow: hidden; /* 防止 3D 层超出容器 */
}

.desk-surface {
  position: relative;
  width: 780px; height: 500px; max-width: 90vw;
  /* 恢复原先的3D平面倾斜，用于正确承载信件 */
  transform: rotateX(55deg) rotateZ(-20deg);
  transform-style: preserve-3d;
  transition: transform 0.4s ease;
}

/* 响应式调整3D桌面信件面 */
@media (max-width: 800px) { .desk-surface { transform: rotateX(55deg) rotateZ(-12deg) scale(0.65); } }
@media (max-width: 500px) { .desk-surface { transform: rotateX(56deg) rotateZ(0deg) scale(0.5); } }

  /* 抽屉卡片提示 (针对新版背景图片微调位置) */
  .drawer-hint-card {
    position: absolute;
    bottom: 100px; right: 480px; /* 调整至图片中抽屉拉手右侧区域 */
    display: flex; align-items: center;
    gap: 12px; padding: 10px 16px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 50;
    animation: float-hint 3s infinite ease-in-out;
    /* 核心修复：取消 3D 转换对该卡片的影响，使其在 2D 合成层显示，防止被背景穿透或遮挡 */
    transform: translateZ(100px);
  }

.drawer-hint-card:hover {
    transform: translateZ(110px) translateY(-5px) scale(1.05);
    background: #fff;
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.12);
  }

.hint-icon { font-size: 20px; }
.firefly-icon {
  text-shadow: 0 0 15px rgba(253, 224, 71, 0.9), 0 0 30px rgba(253, 224, 71, 0.6);
  animation: firefly-glow 2s infinite alternate;
}
@keyframes firefly-glow {
  from { opacity: 0.7; filter: drop-shadow(0 0 5px #fde047); transform: scale(0.9); }
  to { opacity: 1; filter: drop-shadow(0 0 15px #fde047) brightness(1.2); transform: scale(1.1); }
}
.hint-text { display: flex; flex-direction: column; }
.hint-title { font-size: 14px; font-weight: 600; color: #4b5563; }
.hint-count { font-size: 12px; color: #9ca3af; }
.hint-arrow { margin-left: 4px; color: #6366f1; font-weight: bold; transition: transform 0.3s; }
.drawer-hint-card:hover .hint-arrow { transform: translateX(4px); }

@keyframes float-hint {
  0%, 100% { transform: translateZ(100px) translateY(0); }
  50% { transform: translateZ(100px) translateY(-8px); }
}

@media (max-width: 800px) {
  .drawer-hint-card { bottom: 80px; right: 50%; transform: translateX(50%); }
  .drawer-hint-card:hover { transform: translateX(50%) translateY(-5px) scale(1.05); }
}

/* --- 3D 信封样式复用与位置定制 --- */
.envelope-wrapper {
  position: relative; width: 320px; height: 200px;
  cursor: pointer; transform-style: preserve-3d;
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  border-radius: 6px; background-color: #faf7f0;
}

/* 抽屉里列表用的正常2D气浮感 */
.drawer-letter {
  box-shadow: 0 10px 24px rgba(0,0,0,0.06), 0 4px 8px rgba(0,0,0,0.04);
}
.drawer-letter:hover:not(.is-open) { transform: translateY(-6px); box-shadow: 0 16px 32px rgba(0,0,0,0.08); }

/* 模拟桌面的信封 */
.envelope-wrapper.is-desktop { box-shadow: none; position: absolute; }
.envelope-wrapper.is-desktop::before {
  content: ''; position: absolute; inset: -2px;
  background: rgba(0,0,0,0.4); filter: blur(12px);
  transform: translateZ(-1px); transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  border-radius: 6px;
}
.envelope-wrapper.is-desktop:hover:not(.is-open)::before {
  transform: translateZ(-35px); filter: blur(25px); opacity: 0.6;
}

/* 根据图片微调摆放信件 */
.is-desktop.pos-0 { 
  --r: -9deg; top: 290px; left: 30px; transform: rotateZ(var(--r)); 
}
.is-desktop.pos-1 { 
  --r: 8deg; top: 360px; right: 230px; transform: rotateZ(var(--r)); 
}

/* 极具带入感的悬浮动画 */
.is-desktop:hover:not(.is-open) {
  transform: translateZ(50px) rotateZ(var(--r)) !important;
  z-index: 100;
}

/* 其他信封组装部分 (背板、纸张等复用原设计) */
.envelope-back { position: absolute; inset: 0; background: #f0ebe1; border-radius: 6px; z-index: 5; }
.inner-paper {
  position: absolute; top: 10px; left: 15px; right: 15px; bottom: 10px; background: #fffefb;
  border-radius: 4px; box-shadow: 0 0 10px rgba(0,0,0,0.02); z-index: 10;
  /* 阅信动作：当 is-open 时，先等封盖打开(0.6s)再弹出信纸 */
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0.4s, opacity 0.5s ease;
}
.paper-preview { margin: 20px; height: 8px; background: #f0f0f0; border-radius: 4px; width: 60%; box-shadow: 0 16px 0 #f0f0f0, 0 32px 0 #f0f0f0; }
.envelope-wrapper.is-open .inner-paper { transform: translateY(-80px) !important; z-index: 10; }
.envelope-pocket {
  position: absolute; bottom: 0; left: 0; width: 0; height: 0; border-style: solid;
  border-width: 100px 160px; border-color: transparent #ede7db #e3dccf #ede7db;
  border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; z-index: 20;
}
.envelope-flap {
  position: absolute; top: 0; left: 0; width: 0; height: 0; border-style: solid;
  border-width: 110px 160px 0 160px; border-color: #e6dfd1 transparent transparent transparent;
  transform-origin: top center; 
  /* 封盖动作：开启时长0.6s，关闭时应等待信纸缩回(0.6s)再闭合 */
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1) 0s; 
  z-index: 30; filter: drop-shadow(0 4px 4px rgba(0,0,0,0.03));
}
.envelope-wrapper.is-open .envelope-flap { 
  transform: rotateX(180deg); 
  z-index: 5; 
  transition-delay: 0s; /* 打开时立即响应 */
}
/* 核心逻辑：当 wrapper 不是 is-open (即关闭时) 的延迟处理 */
.envelope-wrapper:not(.is-open) .envelope-flap {
  transition-delay: 0.6s; /* 等待信纸缩回动画结束后再合盖 */
}
.envelope-wrapper:not(.is-open) .inner-paper {
  transition-delay: 0s; /* 关闭时信纸立即开始缩回 */
}
.stamp {
  position: absolute; bottom: 20px; right: 20px; background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(4px); padding: 6px 12px; border-radius: 12px; font-size: 12px;
  color: #6b7280; border: 1px solid rgba(255,255,255,0.8); font-family: "Noto Serif SC", "Songti SC", serif; z-index: 25; transition: opacity 0.3s;
}
.stamp.is-hidden { opacity: 0; }

/* 抽屉(侧边栏) 的样式重写 */
:deep(.wood-drawer-theme) { background-color: #faf8f5 !important; border-top-left-radius: 20px; border-top-right-radius: 20px; }
.drawer-inner { padding: 16px 20px; height: 100%; overflow-y: auto; }
.drawer-drag-line { width: 40px; height: 4px; background: #e0dcd5; border-radius: 2px; margin: 0 auto 20px auto; }
.drawer-title { text-align: center; color: #8e8780; font-family: serif; margin-bottom: 30px; letter-spacing: 1px; font-size: 16px; }
.drawer-grid { display: flex; flex-wrap: wrap; gap: 30px; justify-content: center; }

/* 全屏阅读蒙层 (Reading Overlay) - 此处不变 */
.reading-overlay { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: center; justify-content: center; pointer-events: none; opacity: 0; transition: opacity 0.5s ease; }
.reading-overlay.is-visible { pointer-events: auto; opacity: 1; }
.overlay-backdrop { position: absolute; inset: 0; background: rgba(247, 246, 242, 0.85); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
.reading-paper-wrapper { position: relative; width: 90vw; max-width: 680px; height: 85vh; z-index: 2; transform: translateY(20px); transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); }
.reading-overlay.is-visible .reading-paper-wrapper { transform: translateY(0); }
.close-btn { position: absolute; top: -10px; right: -40px; background: transparent; border: none; font-size: 28px; color: #8c939d; cursor: pointer; transition: color 0.2s, transform 0.2s; padding: 8px; }
.close-btn:hover { color: #3b424a; transform: scale(1.1); }
@media (max-width: 768px) { .close-btn { top: 10px; right: 10px; z-index: 10; color: #a4b0be; } }
.readable-paper { width: 100%; height: 100%; background: #fffdf9; border-radius: 8px; box-shadow: 0 20px 60px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02); padding: 40px 48px; overflow-y: auto; cursor: text; }
@media (max-width: 768px) { .readable-paper { padding: 40px 24px; } }
.paper-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 16px; margin-bottom: 32px; font-family: inherit; }
.tag { font-size: 14px; color: #a4b0be; letter-spacing: 1px; }
.skip-hint { font-size: 12px; color: #dcdfe6; font-style: italic; }
.paper-body { font-family: "Noto Serif SC", "Songti SC", "STSong", serif; color: #4a5159; font-size: 17px; line-height: 2.2; letter-spacing: 0.5px; position: relative; min-height: 200px; }
.typewriter-content { margin: 0; display: inline; }
.cursor { display: inline-block; margin-left: 4px; color: #a4b0be; animation: blink 1s step-start infinite; }
@keyframes blink { 50% { opacity: 0; } }

.empty-state { margin-top: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #8c939d; font-size: 15px; line-height: 1.8; }
.empty-icon { font-size: 48px; margin-bottom: 24px; opacity: 0.8; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.05)); }
.loading-ring { width: 32px; height: 32px; border: 3px solid rgba(0,0,0,0.05); border-top-color: #a4b0be; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 24px; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
