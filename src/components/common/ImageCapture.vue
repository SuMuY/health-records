<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { db } from '../../db'
import { compressImage, createThumbnail } from '../../utils/image'
import { triggerAutoSync } from '../../services/autoSyncTrigger'

const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const imageUrls = ref<Record<string, string>>({})
const loading = ref(false)

// 加载已有图片的缩略图
async function loadThumbnails() {
  for (const id of props.modelValue) {
    if (!imageUrls.value[id]) {
      const img = await db.images.get(id)
      if (img) {
        imageUrls.value[id] = URL.createObjectURL(img.thumbnailBlob || img.blob)
      }
    }
  }
}
loadThumbnails()

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  loading.value = true
  try {
    const compressed = await compressImage(file, 1200, 0.8)
    const thumbnail = await createThumbnail(file, 200)
    const id = crypto.randomUUID()

    await db.images.add({
      id,
      blob: compressed,
      mimeType: 'image/jpeg',
      thumbnailBlob: thumbnail,
      createdAt: Date.now(),
    })

    imageUrls.value[id] = URL.createObjectURL(thumbnail)
    emit('update:modelValue', [...props.modelValue, id])
    triggerAutoSync()
  } catch (err) {
    console.error('图片处理失败', err)
  } finally {
    loading.value = false
    input.value = ''
  }
}

async function removeImage(id: string) {
  await db.images.delete(id)
  if (imageUrls.value[id]) {
    URL.revokeObjectURL(imageUrls.value[id])
    delete imageUrls.value[id]
  }
  emit('update:modelValue', props.modelValue.filter(i => i !== id))
  triggerAutoSync()
}

function showFull(id: string) {
  db.images.get(id).then(img => {
    if (img) {
      const url = URL.createObjectURL(img.blob)
      window.open(url, '_blank')
    }
  })
}

onUnmounted(() => {
  Object.values(imageUrls.value).forEach(url => URL.revokeObjectURL(url))
})
</script>

<template>
  <div class="image-capture">
    <div class="image-grid">
      <div v-for="id in modelValue" :key="id" class="image-item">
        <img
          v-if="imageUrls[id]"
          :src="imageUrls[id]"
          alt=""
          @click="showFull(id)"
        />
        <van-icon name="cross" class="remove-btn" @click.stop="removeImage(id)" />
      </div>
      <label class="add-btn" :class="{ loading }">
        <van-icon v-if="!loading" name="photograph" size="24" color="#969799" />
        <van-loading v-else size="20" />
        <input type="file" accept="image/*" capture="environment" @change="onFileChange" hidden />
      </label>
      <label class="add-btn">
        <van-icon name="photo-o" size="24" color="#969799" />
        <input type="file" accept="image/*" @change="onFileChange" hidden />
      </label>
    </div>
  </div>
</template>

<style scoped>
.image-capture {
  width: 100%;
}
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.image-item {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 4px;
  overflow: hidden;
  background: #f2f3f5;
}
.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.remove-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  border-radius: 50%;
  font-size: 14px;
  padding: 2px;
}
.add-btn {
  width: 64px;
  height: 64px;
  border: 1px dashed #dcdee0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: #fafafa;
}
.add-btn.loading {
  pointer-events: none;
  opacity: 0.6;
}
</style>
