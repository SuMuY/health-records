<script setup lang="ts">
import { computed } from 'vue'
import type { FieldDefinition } from '../../models/template'
import ImageCapture from '../common/ImageCapture.vue'
import LunarDatePicker from '../common/LunarDatePicker.vue'

const props = defineProps<{
  field: FieldDefinition
  modelValue: string | string[] | null | undefined
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
}>()

const textValue = computed({
  get: () => (props.modelValue as string) || '',
  set: (v: string) => emit('update:modelValue', v || null),
})

const singleSelectValue = computed({
  get: () => (props.modelValue as string) || '',
  set: (v: string) => emit('update:modelValue', v || null),
})

const multiSelectValue = computed({
  get: () => (props.modelValue as string[]) || [],
  set: (v: string[]) => emit('update:modelValue', v.length ? v : null),
})

const imageValue = computed({
  get: () => {
    if (!props.modelValue) return []
    return Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]
  },
  set: (v: string[]) => emit('update:modelValue', v.length ? v : null),
})

const dateValue = computed({
  get: () => (props.modelValue as string) || '',
  set: (v: string) => emit('update:modelValue', v || null),
})
</script>

<template>
  <!-- 文本 -->
  <van-field
    v-if="field.type === 'text'"
    v-model="textValue"
    :label="field.label"
    :placeholder="`请输入${field.label}`"
    :required="field.required"
    type="textarea"
    rows="1"
    autosize
  />

  <!-- 单选 -->
  <van-field v-else-if="field.type === 'single_select'" :label="field.label" :required="field.required">
    <template #input>
      <van-radio-group v-model="singleSelectValue" direction="horizontal">
        <van-radio
          v-for="opt in field.options"
          :key="opt"
          :name="opt"
          style="margin-bottom: 4px"
        >{{ opt }}</van-radio>
      </van-radio-group>
    </template>
  </van-field>

  <!-- 多选 -->
  <van-field v-else-if="field.type === 'multi_select'" :label="field.label" :required="field.required">
    <template #input>
      <van-checkbox-group v-model="multiSelectValue" direction="horizontal">
        <van-checkbox
          v-for="opt in field.options"
          :key="opt"
          :name="opt"
          shape="square"
          style="margin-bottom: 4px"
        >{{ opt }}</van-checkbox>
      </van-checkbox-group>
    </template>
  </van-field>

  <!-- 图片 -->
  <van-field v-else-if="field.type === 'image'" :label="field.label" :required="field.required">
    <template #input>
      <ImageCapture v-model="imageValue" />
    </template>
  </van-field>

  <!-- 日期 -->
  <van-field v-else-if="field.type === 'date'" :label="field.label" :required="field.required">
    <template #input>
      <LunarDatePicker v-model="dateValue" :calendar-mode="field.calendarMode || 'gregorian'" />
    </template>
  </van-field>
</template>
