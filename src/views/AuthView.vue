<template>
  <div class="auth-page">
    <div class="auth-banner">
      <div class="banner-overlay"></div>
      <el-button class="back-btn" circle @click="router.push('/')">
        <el-icon><ArrowLeft /></el-icon>
      </el-button>
      <div class="banner-copy">
        <h1>心晴地图</h1>
        <p>记录心情，连接地点，留下你的此刻。</p>
      </div>
    </div>

    <main class="auth-main">
      <section class="auth-card">
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
          class="auth-form"
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
          class="auth-form"
        >
          <el-form-item label="账号" prop="account">
            <el-input
              v-model="registerForm.account"
              placeholder="请输入账号（不可重复）"
              autocomplete="username"
            />
          </el-form-item>
          <el-form-item label="用户名" prop="nickname">
            <el-input
              v-model="registerForm.nickname"
              placeholder="请输入昵称（可重复）"
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
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { loginUser, registerUser } from '@/api/user'

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

    localStorage.setItem('token', data.token)
    localStorage.setItem('userInfo', JSON.stringify(data.userInfo))
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
}

.auth-banner {
  position: relative;
  min-height: 240px;
  background:
    radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.55), transparent 45%),
    linear-gradient(120deg, #e5d4ff 0%, #a6d6ff 58%, #c5ecff 100%);
  overflow: hidden;
}

.banner-overlay {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to bottom, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0));
}

.back-btn {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  border: 1px solid rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
}

.banner-copy {
  position: relative;
  z-index: 1;
  max-width: 960px;
  margin: 0 auto;
  padding: 78px 24px 26px;
  color: #1b2a40;
}

.banner-copy h1 {
  margin: 0;
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 1px;
}

.banner-copy p {
  margin: 10px 0 0;
  font-size: 15px;
  color: rgba(27, 42, 64, 0.82);
}

.auth-main {
  position: relative;
  z-index: 2;
  max-width: 960px;
  margin: -32px auto 0;
  padding: 0 24px 32px;
}

.auth-card {
  background: var(--el-bg-color);
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(93, 124, 170, 0.15);
  padding: 24px;
}

.mode-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.mode-tab {
  border: 0;
  border-radius: 999px;
  padding: 10px 18px;
  font-size: 15px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-tab.active {
  color: #fff;
  background: linear-gradient(135deg, #739dff 0%, #61c4ff 100%);
  box-shadow: 0 8px 16px rgba(111, 163, 255, 0.28);
}

.auth-form {
  max-width: 480px;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
  height: 42px;
  border: none;
  background: linear-gradient(135deg, #739dff 0%, #61c4ff 100%);
}

@media (max-width: 768px) {
  .auth-banner {
    min-height: 190px;
  }

  .banner-copy {
    padding: 72px 16px 20px;
  }

  .banner-copy h1 {
    font-size: 28px;
  }

  .auth-main {
    margin-top: -24px;
    padding: 0 16px 24px;
  }

  .auth-card {
    border-radius: 16px;
    padding: 16px;
  }

  .auth-form {
    max-width: none;
  }
}
</style>
