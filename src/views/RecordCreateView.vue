<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db'
import type { Template } from '../models/template'
import type { FieldValue } from '../models/record'
import { showToast } from 'vant'
import DynamicField from '../components/record/DynamicField.vue'
import { triggerAutoSync } from '../services/autoSyncTrigger'

const route = useRoute()
const router = useRouter()
const clientId = route.params.clientId as string

const templates = ref<Template[]>([])
const selectedTemplate = ref<Template | null>(null)
const showTemplatePicker = ref(true)
const fieldValues = ref<Record<string, string | string[] | null>>({})

onMounted(async () => {
  templates.value = await db.templates.orderBy('name').toArray()
  if (templates.value.length === 0) {
    showToast('请先创建档案模板')
    router.back()
  }
})

function selectTemplate(tpl: Template) {
  selectedTemplate.value = tpl
  showTemplatePicker.value = false
  fieldValues.value = {}
  for (const f of tpl.fields) {
    fieldValues.value[f.id] = f.type === 'multi_select' ? [] : null
  }
}

async function onSubmit() {
  try {
    const tpl = selectedTemplate.value!

    // 验证必填字段
    for (const f of tpl.fields) {
      if (f.required) {
        const val = fieldValues.value[f.id]
        if (val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          showToast(`请填写「${f.label}」`)
          return
        }
      }
    }

    const values: FieldValue[] = tpl.fields.map(f => ({
      fieldId: f.id,
      fieldLabel: f.label,
      fieldType: f.type,
      value: fieldValues.value[f.id],
    }))

    const now = Date.now()
    await db.records.add({
      id: crypto.randomUUID(),
      clientId,
      templateId: tpl.id,
      templateName: tpl.name,
      values,
      createdAt: now,
      updatedAt: now,
    })

    showToast('档案已创建')
    triggerAutoSync()
    router.back()
  } catch (err) {
    console.error('保存档案失败', err)
    showToast('保存失败：' + (err as Error).message)
  }
}
</script>

<template>
  <div class="record-create-view">
    <van-nav-bar
      :title="selectedTemplate ? `填写：${selectedTemplate.name}` : '选择模板'"
      left-arrow
      @click-left="router.back()"
    />

    <!-- 模板选择 -->
    <div v-if="showTemplatePicker" class="template-picker">
      <van-empty v-if="templates.length === 0" description="暂无模板" />
      <van-cell
        v-for="tpl in templates"
        :key="tpl.id"
        :title="tpl.name"
        :label="tpl.description || `${tpl.fields.length} 个字段`"
        is-link
        @click="selectTemplate(tpl)"
      />
    </div>

    <!-- 档案表单 -->
    <div v-else-if="selectedTemplate" class="form-content">
      <van-cell-group inset style="margin-top: 12px">
        <DynamicField
          v-for="field in selectedTemplate.fields"
          :key="field.id"
          :field="field"
          v-model="fieldValues[field.id]"
        />
      </van-cell-group>

      <div style="margin: 16px; padding-bottom: 24px">
        <van-button round block type="primary" @click="onSubmit">保存档案</van-button>
        <van-button round block plain style="margin-top: 8px" @click="showTemplatePicker = true">重新选择模板</van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.record-create-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.template-picker, .form-content {
  flex: 1;
  overflow-y: auto;
}
</style>
