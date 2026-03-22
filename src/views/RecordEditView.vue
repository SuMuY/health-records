<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db'
import type { HealthRecord } from '../models/record'
import type { FieldDefinition } from '../models/template'
import type { FieldValue } from '../models/record'
import { showToast } from 'vant'
import DynamicField from '../components/record/DynamicField.vue'

const route = useRoute()
const router = useRouter()
const recordId = route.params.recordId as string

const record = ref<HealthRecord | null>(null)
const fields = ref<FieldDefinition[]>([])
const fieldValues = ref<Record<string, string | string[] | null>>({})

onMounted(async () => {
  record.value = (await db.records.get(recordId)) || null
  if (!record.value) return

  // 尝试加载原模板获取字段定义
  const tpl = await db.templates.get(record.value.templateId)
  if (tpl) {
    fields.value = tpl.fields
  } else {
    // 模板已删除，从档案值中重建字段定义
    fields.value = record.value.values.map((v, i) => ({
      id: v.fieldId,
      label: v.fieldLabel,
      type: v.fieldType as FieldDefinition['type'],
      required: false,
      order: i,
    }))
  }

  // 填充当前值
  for (const v of record.value.values) {
    fieldValues.value[v.fieldId] = v.value
  }
})

async function onSubmit() {
  for (const f of fields.value) {
    if (f.required) {
      const val = fieldValues.value[f.id]
      if (val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
        showToast(`请填写「${f.label}」`)
        return
      }
    }
  }

  const values: FieldValue[] = fields.value.map(f => ({
    fieldId: f.id,
    fieldLabel: f.label,
    fieldType: f.type,
    value: fieldValues.value[f.id],
  }))

  await db.records.update(recordId, {
    values,
    updatedAt: Date.now(),
  })
  showToast('已更新')
  router.back()
}
</script>

<template>
  <div class="record-edit-view">
    <van-nav-bar
      :title="`编辑：${record?.templateName || '档案'}`"
      left-arrow
      @click-left="router.back()"
    />

    <div v-if="record" class="form-content">
      <van-cell-group inset style="margin-top: 12px">
        <DynamicField
          v-for="field in fields"
          :key="field.id"
          :field="field"
          v-model="fieldValues[field.id]"
        />
      </van-cell-group>

      <div style="margin: 16px; padding-bottom: 24px">
        <van-button round block type="primary" @click="onSubmit">保存修改</van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.record-edit-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.form-content {
  flex: 1;
  overflow-y: auto;
}
</style>
