<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db'
import type { Client } from '../models/client'
import { showConfirmDialog, showToast } from 'vant'

const router = useRouter()
const keyword = ref('')
const clients = ref<Client[]>([])

async function loadClients() {
  const all = await db.clients.orderBy('createdAt').reverse().toArray()
  clients.value = all
}

const filteredClients = ref<Client[]>([])
function filterClients() {
  const k = keyword.value.trim().toLowerCase()
  if (!k) {
    filteredClients.value = clients.value
  } else {
    filteredClients.value = clients.value.filter(
      c => c.name.toLowerCase().includes(k) || (c.phone && c.phone.includes(k))
    )
  }
}

onMounted(async () => {
  await loadClients()
  filterClients()
})

function onSearch() {
  filterClients()
}

function genderLabel(g: string) {
  return g === 'male' ? '男' : g === 'female' ? '女' : '其他'
}

async function onDelete(client: Client) {
  try {
    await showConfirmDialog({ title: '确认删除', message: `确定删除客户「${client.name}」及其所有档案？` })
    const recordIds = await db.records.where('clientId').equals(client.id).primaryKeys()
    // 收集关联图片
    const records = await db.records.where('clientId').equals(client.id).toArray()
    const imageIds: string[] = []
    for (const r of records) {
      for (const v of r.values) {
        if (v.fieldType === 'image' && v.value) {
          if (Array.isArray(v.value)) imageIds.push(...v.value)
          else imageIds.push(v.value)
        }
      }
    }
    await db.transaction('rw', [db.clients, db.records, db.images], async () => {
      await db.records.bulkDelete(recordIds)
      if (imageIds.length) await db.images.bulkDelete(imageIds)
      await db.clients.delete(client.id)
    })
    showToast('已删除')
    await loadClients()
    filterClients()
  } catch {
    // 用户取消
  }
}
</script>

<template>
  <div class="client-list-view">
    <van-nav-bar title="客户列表" />
    <van-search v-model="keyword" placeholder="搜索客户姓名或手机号" @search="onSearch" @clear="onSearch" />
    <div class="list-content">
      <van-empty v-if="filteredClients.length === 0" description="暂无客户" />
      <van-swipe-cell v-for="client in filteredClients" :key="client.id">
        <van-cell
          :title="client.name"
          :label="client.phone || ''"
          :value="genderLabel(client.gender)"
          is-link
          @click="router.push(`/clients/${client.id}`)"
        />
        <template #right>
          <van-button square type="danger" text="删除" class="swipe-btn" @click="onDelete(client)" />
        </template>
      </van-swipe-cell>
    </div>
    <div class="fab" @click="router.push('/clients/new')">
      <van-icon name="plus" size="24" color="#fff" />
    </div>
  </div>
</template>

<style scoped>
.client-list-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 50px;
}
.list-content {
  flex: 1;
  overflow-y: auto;
}
.swipe-btn {
  height: 100%;
}
.fab {
  position: fixed;
  right: 16px;
  bottom: 70px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  z-index: 10;
}
</style>
