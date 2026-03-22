<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db'
import type { Client } from '../models/client'
import type { HealthRecord } from '../models/record'
import { showConfirmDialog, showToast } from 'vant'
import { triggerAutoSync } from '../services/autoSyncTrigger'

const route = useRoute()
const router = useRouter()
const clientId = route.params.id as string
const client = ref<Client | null>(null)
const records = ref<HealthRecord[]>([])

onMounted(async () => {
  client.value = (await db.clients.get(clientId)) || null
  records.value = await db.records
    .where('[clientId+createdAt]')
    .between([clientId, 0], [clientId, Infinity])
    .reverse()
    .toArray()
})

function genderLabel(g: string) {
  return g === 'male' ? '男' : g === 'female' ? '女' : '其他'
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN')
}

async function deleteRecord(record: HealthRecord) {
  try {
    await showConfirmDialog({ title: '确认删除', message: '确定删除这条档案？' })
    const imageIds: string[] = []
    for (const v of record.values) {
      if (v.fieldType === 'image' && v.value) {
        if (Array.isArray(v.value)) imageIds.push(...v.value)
        else imageIds.push(v.value)
      }
    }
    await db.transaction('rw', [db.records, db.images], async () => {
      await db.records.delete(record.id)
      if (imageIds.length) await db.images.bulkDelete(imageIds)
    })
    showToast('已删除')
    triggerAutoSync()
    records.value = records.value.filter(r => r.id !== record.id)
  } catch {
    // cancelled
  }
}

async function exportRecords() {
  if (records.value.length === 0) {
    showToast('暂无档案可导出')
    return
  }
  const { exportClientRecords } = await import('../services/exportService')
  await exportClientRecords(client.value!, records.value)
}
</script>

<template>
  <div class="client-detail-view">
    <van-nav-bar
      title="客户详情"
      left-arrow
      @click-left="router.back()"
    >
      <template #right>
        <van-icon name="edit" size="18" @click="router.push(`/clients/${clientId}/edit`)" />
      </template>
    </van-nav-bar>

    <template v-if="client">
      <van-cell-group inset style="margin: 12px 16px">
        <van-cell title="姓名" :value="client.name" />
        <van-cell title="性别" :value="genderLabel(client.gender)" />
        <van-cell v-if="client.phone" title="手机" :value="client.phone" />
        <van-cell v-if="client.birthDate" title="出生日期" :value="client.birthDate" />
        <van-cell v-if="client.birthDateLunar" title="农历生日" :value="client.birthDateLunar" />
        <van-cell v-if="client.notes" title="备注" :label="client.notes" />
      </van-cell-group>

      <div class="section-header">
        <span>健康档案 ({{ records.length }})</span>
        <div>
          <van-button size="small" plain type="primary" @click="exportRecords" style="margin-right: 8px">导出Excel</van-button>
          <van-button size="small" type="primary" @click="router.push(`/clients/${clientId}/records/new`)">新建档案</van-button>
        </div>
      </div>

      <div class="records-list">
        <van-empty v-if="records.length === 0" description="暂无档案" />
        <van-swipe-cell v-for="record in records" :key="record.id">
          <van-cell
            :title="record.templateName"
            :label="formatDate(record.createdAt)"
            is-link
            @click="router.push(`/clients/${clientId}/records/${record.id}`)"
          />
          <template #right>
            <van-button square text="编辑" class="swipe-btn" @click="router.push(`/clients/${clientId}/records/${record.id}/edit`)" />
            <van-button square type="danger" text="删除" class="swipe-btn" @click="deleteRecord(record)" />
          </template>
        </van-swipe-cell>
      </div>
    </template>
  </div>
</template>

<style scoped>
.client-detail-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 16px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
}
.records-list {
  flex: 1;
  overflow-y: auto;
}
.swipe-btn {
  height: 100%;
}
</style>
