<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db'
import type { Client } from '../models/client'
import { showToast } from 'vant'

const route = useRoute()
const router = useRouter()
const isEdit = !!route.params.id
const clientId = route.params.id as string

const form = ref<Omit<Client, 'id' | 'createdAt' | 'updatedAt'>>({
  name: '',
  gender: 'male',
  birthDate: '',
  birthDateLunar: '',
  phone: '',
  notes: '',
})

onMounted(async () => {
  if (isEdit) {
    const c = await db.clients.get(clientId)
    if (c) {
      form.value = {
        name: c.name,
        gender: c.gender,
        birthDate: c.birthDate || '',
        birthDateLunar: c.birthDateLunar || '',
        phone: c.phone || '',
        notes: c.notes || '',
      }
    }
  }
})

const genderOptions = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
  { label: '其他', value: 'other' },
]

async function onSubmit() {
  if (!form.value.name.trim()) {
    showToast('请输入客户姓名')
    return
  }
  const now = Date.now()
  if (isEdit) {
    await db.clients.update(clientId, {
      ...form.value,
      updatedAt: now,
    })
    showToast('已更新')
  } else {
    await db.clients.add({
      id: crypto.randomUUID(),
      ...form.value,
      createdAt: now,
      updatedAt: now,
    })
    showToast('已创建')
  }
  router.back()
}
</script>

<template>
  <div class="client-edit-view">
    <van-nav-bar
      :title="isEdit ? '编辑客户' : '新建客户'"
      left-arrow
      @click-left="router.back()"
    />
    <van-form @submit="onSubmit">
      <van-cell-group inset>
        <van-field v-model="form.name" label="姓名" placeholder="请输入姓名" required :rules="[{ required: true, message: '请输入姓名' }]" />
        <van-field label="性别" required>
          <template #input>
            <van-radio-group v-model="form.gender" direction="horizontal">
              <van-radio v-for="opt in genderOptions" :key="opt.value" :name="opt.value">{{ opt.label }}</van-radio>
            </van-radio-group>
          </template>
        </van-field>
        <van-field v-model="form.phone" label="手机号" placeholder="请输入手机号" type="tel" />
        <van-field v-model="form.birthDate" label="出生日期" placeholder="如 1990-01-15" />
        <van-field v-model="form.birthDateLunar" label="农历生日" placeholder="如 庚午年腊月初一" />
        <van-field v-model="form.notes" label="备注" placeholder="请输入备注" type="textarea" rows="2" autosize />
      </van-cell-group>
      <div style="margin: 16px">
        <van-button round block type="primary" native-type="submit">
          {{ isEdit ? '保存修改' : '创建客户' }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<style scoped>
.client-edit-view {
  flex: 1;
}
</style>
