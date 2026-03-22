<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { db } from '../db'
import type { FieldDefinition } from '../models/template'
import { showToast } from 'vant'
import { triggerAutoSync } from '../services/autoSyncTrigger'

const route = useRoute()
const router = useRouter()
const isEdit = !!route.params.id
const templateId = route.params.id as string

const name = ref('')
const description = ref('')
const fields = ref<FieldDefinition[]>([])

const fieldTypeOptions = [
  { label: '文本', value: 'text' },
  { label: '图片', value: 'image' },
  { label: '单选', value: 'single_select' },
  { label: '多选', value: 'multi_select' },
  { label: '日期', value: 'date' },
]

const calendarModeOptions = [
  { label: '公历', value: 'gregorian' },
  { label: '农历', value: 'lunar' },
  { label: '公历+农历', value: 'both' },
]

onMounted(async () => {
  if (isEdit) {
    const tpl = await db.templates.get(templateId)
    if (tpl) {
      name.value = tpl.name
      description.value = tpl.description || ''
      fields.value = tpl.fields
    }
  }
})

function addField() {
  fields.value.push({
    id: crypto.randomUUID(),
    label: '',
    type: 'text',
    required: false,
    options: [],
    calendarMode: 'gregorian',
    order: fields.value.length,
  })
}

function removeField(index: number) {
  fields.value.splice(index, 1)
  fields.value.forEach((f, i) => (f.order = i))
}

function moveField(index: number, dir: -1 | 1) {
  const target = index + dir
  if (target < 0 || target >= fields.value.length) return
  const temp = fields.value[index]
  fields.value[index] = fields.value[target]
  fields.value[target] = temp
  fields.value.forEach((f, i) => (f.order = i))
}

function addOption(field: FieldDefinition) {
  if (!field.options) field.options = []
  field.options.push('')
}

function removeOption(field: FieldDefinition, optIndex: number) {
  field.options?.splice(optIndex, 1)
}

async function onSubmit() {
  if (!name.value.trim()) {
    showToast('请输入模板名称')
    return
  }
  if (fields.value.length === 0) {
    showToast('请至少添加一个字段')
    return
  }
  for (const f of fields.value) {
    if (!f.label.trim()) {
      showToast('字段名称不能为空')
      return
    }
    if ((f.type === 'single_select' || f.type === 'multi_select') && (!f.options || f.options.filter(o => o.trim()).length < 2)) {
      showToast(`字段「${f.label}」至少需要2个选项`)
      return
    }
  }

  const cleanedFields = fields.value.map(f => ({
    ...f,
    options: (f.type === 'single_select' || f.type === 'multi_select')
      ? f.options?.filter(o => o.trim())
      : undefined,
    calendarMode: f.type === 'date' ? f.calendarMode : undefined,
  }))

  const now = Date.now()
  if (isEdit) {
    await db.templates.update(templateId, {
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      fields: cleanedFields,
      updatedAt: now,
    })
    showToast('已更新')
  } else {
    await db.templates.add({
      id: crypto.randomUUID(),
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      fields: cleanedFields,
      createdAt: now,
      updatedAt: now,
    })
    showToast('已创建')
  }
  triggerAutoSync()
  router.back()
}
</script>

<template>
  <div class="template-edit-view">
    <van-nav-bar
      :title="isEdit ? '编辑模板' : '新建模板'"
      left-arrow
      @click-left="router.back()"
    />
    <div class="form-content">
      <van-cell-group inset>
        <van-field v-model="name" label="模板名称" placeholder="如：初诊评估表" required />
        <van-field v-model="description" label="描述" placeholder="可选" type="textarea" rows="1" autosize />
      </van-cell-group>

      <div class="section-header">
        <span>字段列表 ({{ fields.length }})</span>
        <van-button size="small" type="primary" plain @click="addField">添加字段</van-button>
      </div>

      <div v-for="(field, index) in fields" :key="field.id" class="field-card">
        <div class="field-header">
          <span class="field-index">#{{ index + 1 }}</span>
          <div class="field-actions">
            <van-icon name="arrow-up" size="18" @click="moveField(index, -1)" :style="{ opacity: index === 0 ? 0.3 : 1 }" />
            <van-icon name="arrow-down" size="18" @click="moveField(index, 1)" :style="{ opacity: index === fields.length - 1 ? 0.3 : 1, marginLeft: '8px' }" />
            <van-icon name="delete-o" size="18" color="#ee0a24" @click="removeField(index)" style="margin-left: 12px" />
          </div>
        </div>
        <van-cell-group inset>
          <van-field v-model="field.label" label="字段名" placeholder="如：血压" required />
          <van-field label="类型">
            <template #input>
              <van-radio-group v-model="field.type" direction="horizontal">
                <van-radio v-for="opt in fieldTypeOptions" :key="opt.value" :name="opt.value" style="margin-bottom: 4px">{{ opt.label }}</van-radio>
              </van-radio-group>
            </template>
          </van-field>
          <van-cell title="必填">
            <template #right-icon>
              <van-switch v-model="field.required" size="20" />
            </template>
          </van-cell>

          <!-- 单选/多选的选项 -->
          <template v-if="field.type === 'single_select' || field.type === 'multi_select'">
            <div class="options-section">
              <div v-for="(_, oi) in field.options" :key="oi" class="option-row">
                <van-field v-model="field.options![oi]" :label="`选项${oi + 1}`" placeholder="输入选项" />
                <van-icon name="cross" size="16" color="#969799" class="option-delete" @click="removeOption(field, oi)" />
              </div>
              <van-button size="small" plain block @click="addOption(field)" style="margin: 8px 16px">添加选项</van-button>
            </div>
          </template>

          <!-- 日期字段的日历模式 -->
          <template v-if="field.type === 'date'">
            <van-field label="日历模式">
              <template #input>
                <van-radio-group v-model="field.calendarMode" direction="horizontal">
                  <van-radio v-for="opt in calendarModeOptions" :key="opt.value" :name="opt.value">{{ opt.label }}</van-radio>
                </van-radio-group>
              </template>
            </van-field>
          </template>
        </van-cell-group>
      </div>

      <div v-if="fields.length === 0" style="padding: 32px 16px; text-align: center; color: #969799">
        点击「添加字段」开始设计模板
      </div>

      <div style="margin: 16px; padding-bottom: 24px">
        <van-button round block type="primary" @click="onSubmit">
          {{ isEdit ? '保存修改' : '创建模板' }}
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.template-edit-view {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.form-content {
  flex: 1;
  overflow-y: auto;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
}
.field-card {
  margin: 8px 0;
}
.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px 4px;
}
.field-index {
  font-size: 13px;
  color: #969799;
  font-weight: 500;
}
.field-actions {
  display: flex;
  align-items: center;
}
.options-section {
  padding: 4px 0;
}
.option-row {
  display: flex;
  align-items: center;
}
.option-delete {
  padding: 0 12px;
  cursor: pointer;
}
</style>
