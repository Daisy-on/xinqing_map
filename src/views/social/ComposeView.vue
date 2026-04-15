<template>
  <main class="compose-page">
    <section class="compose-card">
      <header class="compose-head">
        <el-button class="back-btn" text @click="handleBack">{{ isEditMode ? '返回个人中心' : '返回点位' }}</el-button>
        <h1>{{ isEditMode ? '编辑帖子' : '记录心声' }}</h1>
      </header>

      <el-alert
        v-if="editTip || sourceLocationName"
        class="source-tip"
        type="info"
        :closable="false"
        show-icon
      >
        {{ editTip || `当前来自 ${sourceLocationName}，你也可以切换其他地图点位。` }}
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

        <el-form-item label="上传封面图（可选）" class="cover-item">
          <el-upload
            class="cover-uploader"
            action="/"
            accept=".jpg,.jpeg,.png,.webp"
            :show-file-list="false"
            :limit="1"
            :disabled="uploadingImage || publishing"
            :before-upload="beforeImageSelect"
            :on-exceed="handleImageExceed"
            :http-request="handleImageUpload"
            list-type="picture-card"
          >
            <el-icon v-if="!uploadingImage"><Plus /></el-icon>
            <el-icon v-else class="is-loading"><Loading /></el-icon>
            <template #tip>
              <div class="el-upload__tip">
                支持 JPG、PNG、WEBP，最多 1 张，大小不超过 5MB
              </div>
            </template>
          </el-upload>

          <div v-if="selectedImagePreviewUrl || selectedImageUrl" class="uploaded-preview">
            <img :src="selectedImagePreviewUrl || selectedImageUrl" alt="已上传封面图" class="uploaded-preview-img" />
            <div class="uploaded-preview-footer">
              <span class="uploaded-preview-name">{{ selectedImageName || '已上传图片' }}</span>
              <el-button
                text
                type="danger"
                :disabled="uploadingImage || publishing"
                @click="clearSelectedImage"
              >
                删除图片
              </el-button>
            </div>
          </div>
        </el-form-item>

        <div class="actions">
          <el-button class="cancel-btn" @click="handleBack">取消</el-button>
          <el-button class="publish-btn" type="primary" :loading="publishing" @click="handlePublish">
            {{ isEditMode ? '保存修改' : '发布' }}
          </el-button>
        </div>
      </el-form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules, UploadProps, UploadRequestOptions } from 'element-plus'
import { Loading, Plus } from '@element-plus/icons-vue'
import { fetchLocationList } from '@/api/location'
import { fetchEmotionTagList, fetchPostDetail, publishPost, uploadPostImage } from '@/api/post'
import type { EmotionTag, Location } from '@/types/models'
import { updateUserPost } from '@/api/user'

const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const publishing = ref(false)
const uploadingImage = ref(false)
const locationOptions = ref<Location[]>([])
const tagOptions = ref<EmotionTag[]>([])
const selectedImagePreviewUrl = ref('')
const selectedImageUrl = ref('')
const selectedImageName = ref('')
const imageCleared = ref(false)
const editTip = ref('')
const editingPostId = ref<number | null>(null)

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const form = reactive({
  locationId: undefined as number | undefined,
  emotionTagId: undefined as number | undefined,
  content: '',
})

const sourceSpotId = computed(() => {
  const queryId = Number(route.query.spotId)
  return Number.isFinite(queryId) ? queryId : null
})

const editPostId = computed(() => {
  const queryId = Number(route.query.postId)
  return Number.isFinite(queryId) && queryId > 0 ? queryId : null
})

const isEditMode = computed(() => editPostId.value !== null)

const returnPath = computed(() => {
  if (typeof route.query.from === 'string' && route.query.from.trim()) {
    return route.query.from
  }
  return isEditMode.value ? '/profile' : '/'
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

  if (isEditMode.value && editPostId.value) {
    const postDetail = await fetchPostDetail(editPostId.value)
    editingPostId.value = postDetail.id
    form.locationId = postDetail.locationId || form.locationId
    form.emotionTagId = postDetail.emotionTagId || form.emotionTagId
    form.content = postDetail.content || ''
    selectedImageUrl.value = postDetail.image || ''
    selectedImageName.value = postDetail.image ? '已存在的封面图' : ''
    imageCleared.value = false
    editTip.value = `正在编辑“${postDetail.locationName || '分享瞬间'}”的帖子，修改后将保存到你的我的动态中。`
  }

  if (!isEditMode.value && sourceSpotId.value) {
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
  if (isEditMode.value) {
    router.push(returnPath.value)
    return
  }

  if (sourceSpotId.value) {
    router.push(`/spots/${sourceSpotId.value}`)
    return
  }
  router.push('/')
}

const resetPreviewBlob = () => {
  if (selectedImagePreviewUrl.value) {
    URL.revokeObjectURL(selectedImagePreviewUrl.value)
    selectedImagePreviewUrl.value = ''
  }
}

const clearSelectedImage = () => {
  resetPreviewBlob()
  selectedImageUrl.value = ''
  selectedImageName.value = ''
  imageCleared.value = isEditMode.value
}

const beforeImageSelect: UploadProps['beforeUpload'] = (rawFile) => {
  if (!ALLOWED_IMAGE_TYPES.includes(rawFile.type)) {
    ElMessage.error('仅支持 JPG、PNG、WEBP 格式图片')
    return false
  }

  if (rawFile.size > MAX_IMAGE_SIZE) {
    ElMessage.error('图片大小不能超过 5MB')
    return false
  }

  return true
}

const handleImageExceed: UploadProps['onExceed'] = () => {
  ElMessage.warning('当前仅支持上传 1 张图片，请先删除已上传图片')
}

const handleImageUpload = async (options: UploadRequestOptions) => {
  uploadingImage.value = true
  const file = options.file as File
  try {
    resetPreviewBlob()
    selectedImagePreviewUrl.value = URL.createObjectURL(file)
    imageCleared.value = false

    const imageUrl = await uploadPostImage(file)
    selectedImageUrl.value = imageUrl
    selectedImageName.value = file.name
    options.onSuccess?.({ imageUrl })
    ElMessage.success('图片上传成功')
  } catch (error: any) {
    selectedImageUrl.value = ''
    selectedImageName.value = ''
    resetPreviewBlob()
    options.onError?.(error)
    ElMessage.error(error?.response?.data?.message || error?.message || '图片上传失败，请稍后重试')
  } finally {
    uploadingImage.value = false
  }
}

const handlePublish = async () => {
  if (uploadingImage.value) {
    ElMessage.warning('图片上传中，请稍后发布')
    return
  }

  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || !form.locationId || !form.emotionTagId) return

  const selectedLocation = locationOptions.value.find((item) => item.id === form.locationId)
  const selectedTag = tagOptions.value.find((item) => item.id === form.emotionTagId)

  if (!selectedLocation || !selectedTag) {
    ElMessage.error('请选择有效的地点和情绪标签后再发布')
    return
  }

  publishing.value = true
  try {
    const payload = {
      locationId: form.locationId,
      locationName: selectedLocation.name,
      emotionTagId: form.emotionTagId,
      emotionTagName: selectedTag.name,
      emotionTagColor: selectedTag.color,
      content: form.content.trim(),
      image: isEditMode.value ? (imageCleared.value ? '' : (selectedImageUrl.value || undefined)) : (selectedImageUrl.value || undefined),
    }

    if (isEditMode.value && editingPostId.value) {
      await updateUserPost(editingPostId.value, payload)
      ElMessage.success('修改成功')
      router.push(returnPath.value)
      return
    }

    await publishPost(payload)
    ElMessage.success('发布成功')
    router.push(`/spots/${form.locationId}`)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || (isEditMode.value ? '修改失败，请稍后重试' : '发布失败，请稍后重试'))
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

onBeforeUnmount(() => {
  resetPreviewBlob()
})
</script>

<style scoped>
.compose-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding: 40px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: 
    radial-gradient(circle at 15% 50%, rgba(200, 225, 255, 0.6), transparent 45%),
    radial-gradient(circle at 85% 30%, rgba(225, 200, 255, 0.4), transparent 50%),
    radial-gradient(circle at 50% 80%, rgba(190, 240, 230, 0.5), transparent 50%),
    linear-gradient(135deg, #f4f8fc 0%, #eef3fb 100%);
}

.compose-page::before {
  content: '';
  position: absolute;
  top: -15%; left: -10%;
  width: 50vw; height: 50vw;
  background: rgba(135, 206, 250, 0.35);
  filter: blur(100px);
  border-radius: 50%;
  z-index: 0;
  animation: floatBlobs 12s ease-in-out infinite alternate;
}

.compose-page::after {
  content: '';
  position: absolute;
  bottom: -15%; right: -5%;
  width: 45vw; height: 45vw;
  background: rgba(216, 175, 240, 0.25);
  filter: blur(90px);
  border-radius: 50%;
  z-index: 0;
  animation: floatBlobs 15s ease-in-out infinite alternate-reverse;
}

@keyframes floatBlobs {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(40px, 60px) scale(1.1); }
}

.compose-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 680px;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.7);
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  box-shadow: 
    0 24px 60px rgba(45, 65, 95, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  padding: 36px 40px;
  animation: cardEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards;
}

@keyframes cardEnter {
  from { opacity: 0; transform: translateY(30px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.compose-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  opacity: 0;
  animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
}

.compose-head h1 {
  margin: 0;
  color: #1b2a40;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.back-btn {
  color: #5c7289;
  font-weight: 500;
  font-size: 15px;
  transition: color 0.2s, transform 0.2s;
}

.back-btn:hover {
  color: #1b2a40;
  transform: translateX(-2px);
  background: transparent;
}

.source-tip {
  margin-bottom: 24px;
  border-radius: 12px;
  background: rgba(235, 246, 255, 0.65);
  border: 1px solid rgba(180, 215, 255, 0.4);
  color: #2b5585;
  backdrop-filter: blur(8px);
  opacity: 0;
  animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
}

.source-tip :deep(.el-alert__title) {
  color: #1a4270;
  font-weight: 500;
}
.source-tip :deep(.el-alert__icon) {
  color: #6aa6ff;
}

.compose-form {
  margin-top: 10px;
}

/* 依次加载表单项动效 */
.compose-form :deep(.el-form-item) {
  opacity: 0;
  animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.compose-form :deep(.el-form-item:nth-child(1)) { animation-delay: 0.2s; }
.compose-form :deep(.el-form-item:nth-child(2)) { animation-delay: 0.25s; }
.compose-form :deep(.el-form-item:nth-child(3)) { animation-delay: 0.3s; }
.compose-form :deep(.el-form-item:nth-child(4)) { animation-delay: 0.35s; }

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 36px;
  opacity: 0;
  animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #2c3e50;
  padding-bottom: 8px;
  font-size: 15px;
}

.full-width {
  width: 100%;
}

:deep(.el-input__wrapper),
:deep(.el-textarea__inner) {
  background: rgba(255, 255, 255, 0.6) !important;
  border-radius: 12px;
  box-shadow: inset 0 0 0 1px rgba(180, 200, 220, 0.4) !important;
  transition: all 0.3s ease;
  color: #1b2a40;
}

:deep(.el-input__wrapper.is-focus),
:deep(.el-textarea__inner:focus) {
  background: rgba(255, 255, 255, 0.9) !important;
  box-shadow: inset 0 0 0 2px #7aa6d3 !important;
}

:deep(.el-textarea__inner) {
  padding: 16px;
  font-size: 15px;
  line-height: 1.6;
}

:deep(.el-select .el-input__wrapper) {
  padding: 6px 16px;
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

.cover-item {
  margin-top: 10px;
}

.cover-uploader :deep(.el-upload--picture-card) {
  width: 100px;
  height: 100px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px dashed rgba(160, 180, 200, 0.6);
  border-radius: 14px;
  transition: all 0.3s;
}

.cover-uploader :deep(.el-upload--picture-card:hover) {
  background: rgba(255, 255, 255, 0.8);
  border-color: #7aa6d3;
}

.cover-uploader :deep(.el-icon) {
  font-size: 24px;
  color: #8c939d;
}

.el-upload__tip {
  color: #7a8b9e;
  font-size: 13px;
  margin-top: 10px;
}

.uploaded-preview {
  margin-top: 14px;
  width: 100%;
  max-width: 340px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(160, 180, 200, 0.45);
  background: rgba(255, 255, 255, 0.65);
  box-shadow: 0 8px 22px rgba(45, 65, 95, 0.08);
}

.uploaded-preview-img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.uploaded-preview-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
}

.uploaded-preview-name {
  color: #41566f;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cancel-btn {
  border-radius: 20px;
  padding: 10px 24px;
  font-weight: 600;
  background: transparent;
  border: 1px solid rgba(130, 150, 170, 0.4);
  color: #5c7289;
  transition: all 0.2s;
  height: auto;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(130, 150, 170, 0.8);
  color: #1b2a40;
}

.publish-btn {
  border-radius: 20px;
  padding: 10px 28px;
  font-weight: 600;
  background: linear-gradient(135deg, #5b9bf8, #3b7ced) !important;
  border: none !important;
  color: #fff !important;
  box-shadow: 0 8px 16px rgba(59, 124, 237, 0.25);
  transition: all 0.2s;
  height: auto;
}

.publish-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(59, 124, 237, 0.35);
  background: linear-gradient(135deg, #6aa6ff, #4788f8) !important;
}

.publish-btn:active {
  transform: translateY(0);
  box-shadow: 0 4px 8px rgba(59, 124, 237, 0.2);
}

@media (max-width: 767px) {
  .compose-page {
    padding: 0;
  }
  
  .compose-card {
    padding: 24px 20px;
    border-radius: 0;
    border: none;
    min-height: 100vh;
    box-shadow: none;
    background: rgba(255, 255, 255, 0.7);
  }
  
  .compose-head h1 {
    font-size: 22px;
  }
}
</style>
