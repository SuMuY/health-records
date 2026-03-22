<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { exportAllData, importAllData } from '../services/backupService'
import {
  setupSyncDirectory,
  isAutoSyncEnabled,
  disableAutoSync,
  restoreFromFileSystem,
  isFileSystemSupported,
} from '../services/syncService'
import {
  isAutoBackupEnabled,
  enableAutoBackup,
  disableAutoBackup,
  getLastBackupTime,
  performAutoBackup,
} from '../services/autoBackupService'
import { showToast, showConfirmDialog, showDialog } from 'vant'

const router = useRouter()
const fileInputRef = ref<HTMLInputElement | null>(null)
const importing = ref(false)
const autoSyncActive = ref(false)
const autoBackupActive = ref(false)
const fsSupported = ref(false)
const lastBackupTime = ref<Date | null>(null)

onMounted(() => {
  fsSupported.value = isFileSystemSupported()
  autoSyncActive.value = isAutoSyncEnabled()
  autoBackupActive.value = isAutoBackupEnabled()
  lastBackupTime.value = getLastBackupTime()
})

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

async function handleSetupAutoSync() {
  const success = await setupSyncDirectory()
  if (success) {
    autoSyncActive.value = true
    showDialog({
      title: '自动同步已启用',
      message: '数据将自动保存到您选择的文件夹，清除浏览器数据后会自动恢复。',
      confirmButtonText: '好的',
    })
  } else {
    showToast('设置失败，请检查浏览器权限')
  }
}

async function handleDisableAutoSync() {
  try {
    await showConfirmDialog({
      title: '确认关闭',
      message: '关闭后数据将不再自动同步到文件夹，建议定期手动备份。',
    })
    disableAutoSync()
    autoSyncActive.value = false
    showToast('已关闭自动同步')
  } catch {
    // 用户取消
  }
}

async function handleManualRestore() {
  try {
    await showConfirmDialog({
      title: '确认恢复',
      message: '将从同步文件夹恢复数据，会清空当前所有数据。',
    })

    importing.value = true
    const result = await restoreFromFileSystem()

    if (result.success) {
      showToast(result.message)
      if (result.hasData) {
        setTimeout(() => {
          router.push('/clients')
          window.location.reload()
        }, 1000)
      }
    } else {
      showToast(result.message)
    }
  } catch {
    // 用户取消
  } finally {
    importing.value = false
  }
}

function handleToggleAutoBackup(value: boolean) {
  if (value) {
    enableAutoBackup()
    autoBackupActive.value = true
    showDialog({
      title: '自动备份已启用',
      message: '每24小时自动导出一次备份文件到下载文件夹，建议定期整理备份文件。',
      confirmButtonText: '好的',
    })
  } else {
    disableAutoBackup()
    autoBackupActive.value = false
    lastBackupTime.value = null
    showToast('已关闭自动备份')
  }
}

async function handleManualBackup() {
  const success = await performAutoBackup()
  if (success) {
    lastBackupTime.value = new Date()
    showToast('备份文件已下载')
  } else {
    showToast('备份失败，请检查是否有数据')
  }
}

function formatBackupTime(time: Date | null): string {
  if (!time) return '从未备份'
  const now = Date.now()
  const diff = now - time.getTime()
  const hours = Math.floor(diff / (60 * 60 * 1000))
  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

function showBackupLocationHelp() {
  showDialog({
    title: '备份文件位置',
    message: `备份文件保存在：

📱 iPhone/iPad：
打开"文件"App → 浏览 → 我的iPhone（或iCloud Drive）→ 下载项

文件名格式：
健康档案自动备份_2026-03-22.json

💡 建议：
• 定期将备份文件移动到iCloud Drive，实现云端备份
• 或通过AirDrop发送到电脑保存
• 导入备份时，在"文件"App的"下载项"中找到备份文件`,
    confirmButtonText: '知道了',
  })
}
</script>

<template>
  <div class="settings-view">
    <van-nav-bar title="设置" left-arrow @click-left="router.back()" />

    <van-cell-group inset style="margin-top: 16px">
      <van-cell title="自动备份" center>
        <template #label>
          <span style="color: #969799; font-size: 13px">
            {{ autoBackupActive ? `每24小时自动导出备份 · 上次备份：${formatBackupTime(lastBackupTime)}` : '启用后每24小时自动导出备份文件' }}
          </span>
        </template>
        <template #right-icon>
          <van-switch
            :model-value="autoBackupActive"
            @update:model-value="handleToggleAutoBackup"
            size="20"
          />
        </template>
      </van-cell>

      <van-cell
        v-if="autoBackupActive"
        title="立即备份"
        is-link
        @click="handleManualBackup"
      >
        <template #label>
          <span style="color: #969799; font-size: 13px">手动触发一次备份</span>
        </template>
      </van-cell>

      <van-cell title="备份文件位置" @click="showBackupLocationHelp">
        <template #label>
          <span style="color: #969799; font-size: 13px">点击查看备份文件保存在哪里</span>
        </template>
        <template #right-icon>
          <van-icon name="question-o" />
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset style="margin-top: 16px" v-if="fsSupported">
      <van-cell title="文件夹同步（桌面版）" center>
        <template #label>
          <span style="color: #969799; font-size: 13px">
            {{ autoSyncActive ? '数据自动保存到文件夹' : '仅桌面浏览器支持' }}
          </span>
        </template>
        <template #right-icon>
          <van-switch
            :model-value="autoSyncActive"
            @update:model-value="autoSyncActive ? handleDisableAutoSync() : handleSetupAutoSync()"
            size="20"
          />
        </template>
      </van-cell>

      <van-cell
        v-if="autoSyncActive"
        title="从文件夹恢复"
        is-link
        @click="handleManualRestore"
      >
        <template #label>
          <span style="color: #969799; font-size: 13px">从同步文件夹恢复数据</span>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group inset style="margin-top: 16px">
      <van-cell title="手动备份" is-link @click="handleExport">
        <template #label>
          <span style="color: #969799; font-size: 13px">导出所有数据到本地文件</span>
        </template>
      </van-cell>

      <van-cell title="导入备份" is-link @click="triggerImport">
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
      <p>• 启用自动备份，每天自动导出备份文件到"下载项"</p>
      <p>• 定期将备份文件移到iCloud Drive，实现云端备份</p>
      <p>• 导入备份时，在"文件"App的"下载项"中找到备份文件</p>
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
