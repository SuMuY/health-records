<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db'
import type { HealthRecord, StoredImage } from '../models/record'

const route = useRoute()
const router = useRouter()
const recordId = route.params.recordId as string
const clientId = route.params.clientId as string
const record = ref<HealthRecord | null>(null)
const imageUrls = ref<Record<string, string>>({})

onMounted(async () => {
  record.value = (await db.records.get(recordId)) || null
  if (!record.value) return

  // 加载所有图片的URL
  for (const v of record.value.values) {
    if (v.fieldType === 'image' && v.value) {
      const ids = Array.isArray(v.value) ? v.value : [v.value]
      for (const imgId of ids) {
        const img = await db.images.get(imgId)
        if (img) {
          imageUrls.value[imgId] = URL.createObjectURL(img.thumbnailBlob || img.blob)
        }
      }
    }
  }
})

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN')
}

function getDisplayValue(v: { fieldType: string; value: string | string[] | null }): string {
  if (v.value === null || v.value === '') return '未填写'
  if (v.fieldType === 'multi_select' && Array.isArray(v.value)) return v.value.join('、')
  if (typeof v.value === 'string') return v.value
  return String(v.value)
}

function getImageIds(v: { value: string | string[] | null }): string[] {
  if (!v.value) return []
  return Array.isArray(v.value) ? v.value : [v.value]
}

function showFullImage(imgId: string) {
  db.images.get(imgId).then(img => {
    if (img) {
      const url = URL.createObjectURL(img.blob)
      window.open(url, '_blank')
    }
  })
}
</script>

<template>
  <div class="record-detail-view">
    <van-nav-bar
      title="档案详情"
      left-arrow
      @click-left="router.back()"
    >
      <template #right>
        <van-icon name="edit" size="18" @click="router.push(`/clients/${clientId}/records/${recordId}/edit`)" />
      </template>
    </van-nav-bar>

    <template v-if="record">
      <van-cell-group inset style="margin: 12px 16px">
        <van-cell title="模板" :value="record.templateName" />
        <van-cell title="创建时间" :value="formatDate(record.createdAt)" />
        <van-cell v-if="record.updatedAt !== record.createdAt" title="更新时间" :value="formatDate(record.updatedAt)" />
      </van-cell-group>

      <van-cell-group inset style="margin: 12px 16px" v-for="v in record.values" :key="v.fieldId">
        <van-cell :title="v.fieldLabel">
          <template #default>
            <!-- 图片字段 -->
            <div v-if="v.fieldType === 'image'" class="image-grid">
              <div
                v-for="imgId in getImageIds(v)"
                :key="imgId"
                class="image-thumb"
                @click="showFullImage(imgId)"
              >
                <img v-if="imageUrls[imgId]" :src="imageUrls[imgId]" alt="" />
                <span v-else>加载中...</span>
              </div>
              <span v-if="getImageIds(v).length === 0" class="empty-text">未上传</span>
            </div>
            <!-- 其他字段 -->
            <span v-else>{{ getDisplayValue(v) }}</span>
          </template>
        </van-cell>
      </van-cell-group>
    </template>
  </div>
</template>

<style scoped>
.record-detail-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding-bottom: 24px;
}
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.image-thumb {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  background: #f2f3f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.image-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.empty-text {
  color: #969799;
  font-size: 13px;
}
</style>
