<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getLunarMonths, getLunarDays, dayName, formatLunarDate, parseLunarDate, lunarToSolar, solarToLunar } from '../../utils/lunar'

const props = defineProps<{
  modelValue: string
  calendarMode: 'gregorian' | 'lunar' | 'both'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPicker = ref(false)
const mode = ref<'gregorian' | 'lunar'>(props.calendarMode === 'lunar' ? 'lunar' : 'gregorian')
const displayText = computed(() => props.modelValue || '请选择日期')

// 公历状态
const gYear = ref(new Date().getFullYear())
const gMonth = ref(new Date().getMonth() + 1)
const gDay = ref(new Date().getDate())

// 农历状态
const lYear = ref(new Date().getFullYear())
const lMonthIndex = ref(0) // 在月份列表中的索引
const lDay = ref(1)

const lunarMonths = computed(() => getLunarMonths(lYear.value))
const currentLunarMonth = computed(() => lunarMonths.value[lMonthIndex.value] || lunarMonths.value[0])
const lunarDayCount = computed(() => {
  const m = currentLunarMonth.value
  return m ? getLunarDays(lYear.value, m.month, m.isLeap) : 30
})

// 公历年份范围
const yearRange = Array.from({ length: 150 }, (_, i) => 1920 + i)

// 公历列
const gYearColumns = yearRange.map(y => ({ text: `${y}年`, value: y }))
const gMonthColumns = Array.from({ length: 12 }, (_, i) => ({ text: `${i + 1}月`, value: i + 1 }))
const gDayColumns = computed(() => {
  const days = new Date(gYear.value, gMonth.value, 0).getDate()
  return Array.from({ length: days }, (_, i) => ({ text: `${i + 1}日`, value: i + 1 }))
})

// 农历列
const lYearColumns = yearRange.map(y => ({ text: `${y}`, value: y }))
const lMonthColumns = computed(() =>
  lunarMonths.value.map((m, i) => ({ text: m.label, value: i }))
)
const lDayColumns = computed(() =>
  Array.from({ length: lunarDayCount.value }, (_, i) => ({ text: dayName(i + 1), value: i + 1 }))
)

const columns = computed(() => {
  if (mode.value === 'gregorian') {
    return [gYearColumns, gMonthColumns, gDayColumns.value]
  }
  return [lYearColumns, lMonthColumns.value, lDayColumns.value]
})

const pickerValues = computed(() => {
  if (mode.value === 'gregorian') {
    return [gYear.value, gMonth.value, gDay.value]
  }
  return [lYear.value, lMonthIndex.value, lDay.value]
})

function onPickerChange({ selectedValues }: { selectedValues: (string | number)[] }) {
  const vals = selectedValues.map(Number)
  if (mode.value === 'gregorian') {
    gYear.value = vals[0]
    gMonth.value = vals[1]
    gDay.value = vals[2]
  } else {
    lYear.value = vals[0]
    lMonthIndex.value = vals[1]
    lDay.value = vals[2]
  }
}

function onConfirm() {
  let result: string
  if (mode.value === 'gregorian') {
    result = `${gYear.value}-${String(gMonth.value).padStart(2, '0')}-${String(gDay.value).padStart(2, '0')}`
  } else {
    const m = currentLunarMonth.value
    result = formatLunarDate(lYear.value, m.month, lDay.value, m.isLeap)
  }
  emit('update:modelValue', result)
  showPicker.value = false
}

function toggleMode() {
  mode.value = mode.value === 'gregorian' ? 'lunar' : 'gregorian'
}
</script>

<template>
  <div class="lunar-date-picker" @click="showPicker = true">
    <span :class="{ placeholder: !modelValue }">{{ displayText }}</span>
  </div>

  <van-popup v-model:show="showPicker" position="bottom" round>
    <div class="picker-header">
      <van-button v-if="calendarMode === 'both'" size="small" plain @click="toggleMode">
        {{ mode === 'gregorian' ? '切换农历' : '切换公历' }}
      </van-button>
      <span v-else class="mode-label">{{ mode === 'gregorian' ? '公历' : '农历' }}</span>
    </div>
    <van-picker
      :columns="columns"
      :model-value="pickerValues"
      @change="onPickerChange"
      @confirm="onConfirm"
      @cancel="showPicker = false"
    />
  </van-popup>
</template>

<style scoped>
.lunar-date-picker {
  cursor: pointer;
  min-height: 24px;
  display: flex;
  align-items: center;
}
.placeholder {
  color: #c8c9cc;
}
.picker-header {
  display: flex;
  justify-content: center;
  padding: 12px 16px 0;
}
.mode-label {
  font-size: 14px;
  color: #323233;
  font-weight: 500;
}
</style>
