<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '../db'
import type { Template } from '../models/template'
import { showConfirmDialog, showToast } from 'vant'

const router = useRouter()
const templates = ref<Template[]>([])

onMounted(async () => {
  templates.value = await db.templates.orderBy('createdAt').reverse().toArray()
})

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('zh-CN')
}

function fieldTypeName(type: string) {
  const map: Record<string, string> = { text: '文本', image: '图片', single_select: '单选', multi_select: '多选', date: '日期' }
  return map[type] || type
}

async function onDelete(tpl: Template) {
  try {
    await showConfirmDialog({ title: '确认删除', message: `确定删除模板「${tpl.name}」？已创建的档案不受影响。` })
    await db.templates.delete(tpl.id)
    templates.value = templates.value.filter(t => t.id !== tpl.id)
    showToast('已删除')
  } catch {
    // cancelled
  }
}
</script>

<template>
  <div class="template-list-view">
    <van-nav-bar title="档案模板" />
    <div class="list-content">
      <van-empty v-if="templates.length === 0" description="暂无模板，点击右下角创建" />
      <van-swipe-cell v-for="tpl in templates" :key="tpl.id">
        <van-cell
          :title="tpl.name"
          :label="`${tpl.fields.length} 个字段 · ${formatDate(tpl.createdAt)}`"
          is-link
          @click="router.push(`/templates/${tpl.id}/edit`)"
        >
          <template #value>
            <div class="field-tags">
              <van-tag v-for="f in tpl.fields.slice(0, 3)" :key="f.id" plain type="primary" size="medium" style="margin-left: 4px">
                {{ fieldTypeName(f.type) }}
              </van-tag>
              <van-tag v-if="tpl.fields.length > 3" plain size="medium" style="margin-left: 4px">+{{ tpl.fields.length - 3 }}</van-tag>
            </div>
          </template>
        </van-cell>
        <template #right>
          <van-button square type="danger" text="删除" class="swipe-btn" @click="onDelete(tpl)" />
        </template>
      </van-swipe-cell>
    </div>
    <div class="fab" @click="router.push('/templates/new')">
      <van-icon name="plus" size="24" color="#fff" />
    </div>
  </div>
</template>

<style scoped>
.template-list-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 50px;
}
.list-content {
  flex: 1;
  overflow-y: auto;
}
.field-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
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
