<template>
  <main class="compose-page">
    <section class="compose-card">
      <header class="compose-head">
        <el-button class="back-btn" text @click="handleBack">返回点位</el-button>
        <h1>记录心声</h1>
      </header>

      <el-alert
        v-if="sourceLocationName"
        class="source-tip"
        type="info"
        :closable="false"
        show-icon
      >
        当前来自 {{ sourceLocationName }}，你也可以切换其他地图点位。
      </el-alert>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="compose-form">
        <el-form-item label="请选择地图点位" prop="locationId">
          <el-select v-model="form.locationId" class="full-width" placeholder="请选择地图点位" filterable>
            <el-option
              v-for="location in locationOptions"
              :key="location.id"
              :label="location.name"
              :value="location.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="请选择心情标签" prop="emotionTagId">
          <el-select v-model="form.emotionTagId" class="full-width" placeholder="请选择心情标签">
            <el-option
              v-for="tag in tagOptions"
              :key="tag.id"
              :label="tag.name"
              :value="tag.id"
            >
              <div class="tag-option">
                <span class="dot" :style="{ backgroundColor: tag.color }"></span>
                <span>{{ tag.name }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="写下你的此刻" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="7"
            maxlength="500"
            show-word-limit
            placeholder="此刻你想记录什么？比如：图书馆今天下雨了，但我写完了拖了很久的报告。"
          />
        </el-form-item>

        <div class="actions">
          <el-button class="cancel-btn" @click="handleBack">取消</el-button>
          <el-button type="primary" :loading="publishing" @click="handlePublish">发布</el-button>
        </div>
      </el-form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { fetchLocationList } from '@/api/location'
import { fetchEmotionTagList, publishPost } from '@/api/post'
import type { EmotionTag, Location } from '@/types/models'

const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const publishing = ref(false)
const locationOptions = ref<Location[]>([])
const tagOptions = ref<EmotionTag[]>([])

const form = reactive({
  locationId: undefined as number | undefined,
  emotionTagId: undefined as number | undefined,
  content: '',
})

const sourceSpotId = computed(() => {
  const queryId = Number(route.query.spotId)
  return Number.isFinite(queryId) ? queryId : null
})

const sourceLocationName = computed(() => {
  if (!sourceSpotId.value) return ''
  const source = locationOptions.value.find((item) => item.id === sourceSpotId.value)
  return source?.name || ''
})

const rules: FormRules = {
  locationId: [{ required: true, message: '请选择地图点位', trigger: 'change' }],
  emotionTagId: [{ required: true, message: '请选择心情标签', trigger: 'change' }],
  content: [
    { required: true, message: '请输入内容', trigger: 'blur' },
    { min: 2, message: '内容至少 2 个字符', trigger: 'blur' },
    { max: 500, message: '内容不能超过 500 字', trigger: 'blur' },
  ],
}

const initForm = async () => {
  const [locations, tags] = await Promise.all([fetchLocationList(), fetchEmotionTagList()])
  locationOptions.value = locations
  tagOptions.value = tags

  if (sourceSpotId.value) {
    const hasSource = locations.some((item) => item.id === sourceSpotId.value)
    if (hasSource) {
      form.locationId = sourceSpotId.value
    }
  }

  const [firstLocation] = locations
  if (!form.locationId && firstLocation) {
    form.locationId = firstLocation.id
  }
}

const handleBack = () => {
  if (sourceSpotId.value) {
    router.push(`/spots/${sourceSpotId.value}`)
    return
  }
  router.push('/')
}

const handlePublish = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || !form.locationId || !form.emotionTagId) return

  publishing.value = true
  try {
    await publishPost({
      locationId: form.locationId,
      emotionTagId: form.emotionTagId,
      content: form.content.trim(),
    })

    ElMessage.success('发布成功')
    router.push(`/spots/${form.locationId}`)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || '发布失败，请稍后重试')
  } finally {
    publishing.value = false
  }
}

onMounted(async () => {
  try {
    await initForm()
  } catch {
    ElMessage.error('加载发布表单失败，请刷新后重试')
  }
})
</script>

<style scoped>
.compose-page {
  min-height: 100vh;
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(189, 226, 255, 0.55), transparent 55%),
    linear-gradient(170deg, #f4f9ff 0%, #edf5ff 52%, #f7fbff 100%);
  padding: 28px 16px;
}

.compose-card {
  max-width: 760px;
  margin: 0 auto;
  border-radius: 20px;
  border: 1px solid rgba(151, 178, 209, 0.26);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 20px 48px rgba(90, 124, 169, 0.14);
  padding: 20px;
}

.compose-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.compose-head h1 {
  margin: 0;
  color: #1b2a40;
  font-size: 28px;
}

.back-btn {
  color: #4d6a8d;
}

.source-tip {
  margin-bottom: 16px;
}

.compose-form {
  margin-top: 10px;
}

.full-width {
  width: 100%;
}

.tag-option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 10px;
}

.cancel-btn {
  border-color: #d1dded;
  color: #4d6a8d;
}

@media (max-width: 767px) {
  .compose-page {
    padding: 0;
  }

  .compose-card {
    border-radius: 0;
    border: none;
    min-height: 100vh;
    padding: 16px;
    box-shadow: none;
  }

  .compose-head h1 {
    font-size: 22px;
  }
}
</style>
