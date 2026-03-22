<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { exportAllData, importAllData } from '../services/backupService'
import { showToast, showConfirmDialog } from 'vant'

const router = useRouter()
const fileInputRef = ref<HTMLInputElement | null>(null)
const importing = ref(false)

async function handleExport() {
  try {
    await exportAllData()
    showToast('备份文件已下载')
  } catch (err) {
    showToast('导出失败')
    console.error(err)
  }
}

function triggerImport() {
  fileInputRef.value?.click()
}

async function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    await showConfirmDialog({
      title: '确认导入',
      message: '导入备份会清空当前所有数据，确定继续？',
    })

    importing.value = true
    const result = await importAllData(file)

    if (result.success) {
      showToast(result.message)
      setTimeout(() => {
        router.push('/clients')
        window.location.reload()
      }, 1000)
    } else {
      showToast(result.message)
    }
  } catch {
    // 用户取消
  } finally {
    importing.value = false
    input.value = ''
  }
}
</script>

<template>
  <div class="settings-view">
    <van-nav-bar title="设置" left-arrow @click-left="router.back()" />

    <van-cell-group inset style="margin-top: 16px">
      <van-cell title="数据备份" is-link @click="handleExport">
        <template #label>
          <span style="color: #969799; font-size: 13px">导出所有数据到本地文件</span>
        </template>
      </van-cell>

      <van-cell title="数据恢复" is-link @click="triggerImport">
        <template #label>
          <span style="color: #969799; font-size: 13px">从备份文件恢复数据（会清空当前数据）</span>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset style="margin-top: 16px">
      <van-cell title="版本信息" value="v1.0.0" />
      <van-cell title="数据存储" label="所有数据存储在设备本地IndexedDB中" />
    </van-cell-group>

    <div style="padding: 24px 16px; color: #969799; font-size: 13px; line-height: 1.6">
      <p style="margin-bottom: 8px">💡 使用建议：</p>
      <p>• 定期导出备份，防止数据丢失</p>
      <p>• 备份文件可保存到云盘或电脑</p>
      <p>• 更换设备时可通过备份文件迁移数据</p>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="application/json"
      @change="handleImport"
      style="display: none"
    />

    <van-overlay :show="importing">
      <div style="display: flex; align-items: center; justify-content: center; height: 100%">
        <van-loading size="24px" vertical>导入中...</van-loading>
      </div>
    </van-overlay>
  </div>
</template>

<style scoped>
.settings-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-bottom: 50px;
}
</style>
