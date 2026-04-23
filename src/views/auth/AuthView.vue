<template>
  <div class="auth-page">
    <div class="auth-split">
      <!-- 左侧品牌与情绪可视化区 -->
      <section class="auth-visual">
        <video class="visual-bg" :src="authVideo" autoplay muted loop playsinline preload="auto"></video>
        <div class="blobs">
          <div class="blob blob-1"></div>
          <div class="blob blob-2"></div>
          <div class="blob blob-3"></div>
        </div>
        <div class="visual-overlay"></div>

        <el-button class="back-btn" circle @click="router.push('/')">
          <el-icon><ArrowLeft /></el-icon>
        </el-button>

        <div class="visual-content">
          <h1>心晴</h1>
          <p>寻找你的心情坐标，留下你的此刻。</p>
        </div>
      </section>

      <!-- 右侧认证表单区 -->
      <main class="auth-panel">
        <div class="auth-card">
          <div class="auth-header">
            <h2>{{ mode === 'login' ? 'Hi~欢迎回来!' : '开启心晴之旅' }}</h2>
            <p>{{ mode === 'login' ? '请输入账号密码登录' : '只需几步，就可以创建你的账号' }}</p>
          </div>

          <div class="mode-tabs">
            <button
              class="mode-tab"
              :class="{ active: mode === 'login' }"
              type="button"
              @click="switchMode('login')"
            >
              登录
            </button>
            <button
              class="mode-tab"
              :class="{ active: mode === 'register' }"
              type="button"
              @click="switchMode('register')"
            >
              注册
            </button>
          </div>

          <el-form
            v-if="mode === 'login'"
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            label-position="top"
            class="auth-form login-form"
          >
            <el-form-item label="账号" prop="account">
              <el-input
                v-model="loginForm.account"
                placeholder="请输入账号"
                autocomplete="username"
              />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                show-password
                placeholder="请输入密码"
                autocomplete="current-password"
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-button
              type="primary"
              class="submit-btn"
              :loading="submitting"
              @click="handleLogin"
            >
              登录
            </el-button>
          </el-form>

          <el-form
            v-else
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            label-position="top"
            class="auth-form register-form"
          >
            <el-form-item label="账号" prop="account">
              <el-input
                v-model="registerForm.account"
                placeholder="请输入账号"
                autocomplete="username"
              />
            </el-form-item>
            <el-form-item label="用户名" prop="nickname">
              <el-input
                v-model="registerForm.nickname"
                placeholder="请输入昵称"
                autocomplete="nickname"
              />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input
                v-model="registerForm.password"
                type="password"
                show-password
                placeholder="请输入密码"
                autocomplete="new-password"
                @keyup.enter="handleRegister"
              />
            </el-form-item>
            <el-button
              type="primary"
              class="submit-btn"
              :loading="submitting"
              @click="handleRegister"
            >
              注册
            </el-button>
          </el-form>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { loginUser, registerUser } from '@/api/user'
import { setAuthSession } from '@/utils/auth'
import authVideo from '@/assets/video/auth.webm'

type AuthMode = 'login' | 'register'

const router = useRouter()
const route = useRoute()
const mode = ref<AuthMode>('login')
const submitting = ref(false)

const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()

const loginForm = reactive({
  account: '',
  password: '',
})

const registerForm = reactive({
  account: '',
  nickname: '',
  password: '',
})

const loginRules: FormRules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const registerRules: FormRules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

function switchMode(nextMode: AuthMode) {
  mode.value = nextMode
}

const resolveRedirect = () => {
  const redirect = route.query.redirect
  if (typeof redirect === 'string' && redirect.startsWith('/')) {
    return redirect
  }
  return '/profile'
}

async function handleLogin() {
  const valid = await loginFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const data = await loginUser({
      account: loginForm.account.trim(),
      password: loginForm.password,
    })

    setAuthSession(data.token, data.userInfo)
    ElMessage.success('登录成功')
    router.push(resolveRedirect())
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '登录失败，请检查账号密码')
  } finally {
    submitting.value = false
  }
}

async function handleRegister() {
  const valid = await registerFormRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await registerUser({
      account: registerForm.account.trim(),
      nickname: registerForm.nickname.trim(),
      password: registerForm.password,
    })

    ElMessage.success('注册成功，请登录')
    loginForm.account = registerForm.account.trim()
    loginForm.password = ''
    switchMode('login')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '注册失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: var(--el-bg-color-page);
  display: flex;
}

.auth-split {
  display: flex;
  flex-direction: column;
  width: 100%;
}

@media (min-width: 1024px) {
  .auth-split {
    flex-direction: row;
    height: 100vh;
  }
}

/* --- 左侧视觉区 --- */
.auth-visual {
  position: relative;
  min-height: 240px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 40px;
}

@media (min-width: 1024px) {
  .auth-visual {
    flex: 1;
    min-height: unset;
  }
}

.visual-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  background: #0f172a;
  filter: brightness(0.88) saturate(1.05);
  z-index: 0;
}

.blobs {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  filter: blur(60px);
}

.blob {
  position: absolute;
  border-radius: 50%;
  opacity: 0.8;
}

.blob-1 {
  width: 50vw;
  height: 50vw;
  max-width: 600px;
  max-height: 600px;
  background: #739dff;
  top: -10%;
  left: -10%;
  animation: float 14s ease-in-out infinite;
}

.blob-2 {
  width: 40vw;
  height: 40vw;
  max-width: 500px;
  max-height: 500px;
  background: #c5ecff;
  bottom: 10%;
  right: -5%;
  animation: float 18s ease-in-out infinite reverse;
}

.blob-3 {
  width: 30vw;
  height: 30vw;
  max-width: 400px;
  max-height: 400px;
  background: #e5d4ff;
  bottom: 20%;
  left: 20%;
  animation: float 22s ease-in-out infinite 2s;
}

.visual-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.06);
  z-index: 2;
}

.back-btn {
  position: absolute;
  top: 40px;
  left: 40px;
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  color: #1b2a40;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: scale(1.05);
}

.visual-content {
  position: relative;
  z-index: 10;
  color: #1b2a40;
  transform: translateY(-20px);
}

@media (max-width: 1023px) {
  .visual-content {
    transform: translateY(0);
    margin-top: 40px;
  }
  .back-btn {
    top: 20px;
    left: 20px;
  }
}

.visual-content h1 {
  margin: 0;
  font-size: 48px;
  font-weight: 800;
  letter-spacing: 1.5px;
  line-height: 1.2;
  transform: translateX(5rem);
}

.visual-content p {
  margin: 16px 0 0;
  font-size: 18px;
  color: rgba(27, 42, 64, 0.85);
  max-width: 400px;
  line-height: 1.6;
  transform: translateX(5rem);
}

/* --- 右侧表单区 --- */
.auth-panel {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color);
  position: relative;
  z-index: 3;
}

@media (min-width: 1024px) {
  .auth-panel {
    width: 580px;
    box-shadow: -10px 0 40px rgba(93, 124, 170, 0.1);
  }
}

@media (max-width: 1023px) {
  .auth-panel {
    border-radius: 24px 24px 0 0;
    margin-top: -32px;
    padding-top: 24px;
    padding-bottom: 40px;
    min-height: calc(100vh - 216px);
  }
}

.auth-card {
  width: 100%;
  max-width: 440px;
  padding: 40px 30px;
}

.auth-header {
  margin-bottom: 32px;
}

.auth-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #1b2a40;
}

.auth-header p {
  margin: 8px 0 0;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.mode-tabs {
  display: inline-flex;
  gap: 8px;
  margin-bottom: 32px;
  padding: 4px;
  background: var(--el-fill-color-light);
  border-radius: 999px;
}

.mode-tab {
  border: 0;
  border-radius: 999px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background: transparent;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #739dff 0%, #61c4ff 100%);
  box-shadow: 0 4px 12px rgba(111, 163, 255, 0.3);
}

.auth-form {
  animation: fade-in 0.4s ease-out;
}

.submit-btn {
  width: 100%;
  margin-top: 16px;
  height: 48px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #739dff 0%, #61c4ff 100%);
  box-shadow: 0 6px 16px rgba(111, 163, 255, 0.25);
  transition: all 0.3s ease;
}

.submit-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(111, 163, 255, 0.35);
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.05); }
}

@media (max-width: 768px) {
  .auth-visual {
    padding: 30px 20px;
  }
  .visual-content h1 {
    font-size: 32px;
  }
  .visual-content p {
    font-size: 15px;
  }
  .auth-card {
    padding: 16px 20px 24px;
  }
  .auth-header {
    margin-top: -8px;
  }
  .auth-form {
    margin-top: -6px;
  }
}
</style>
