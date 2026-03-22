import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import 'vant/lib/index.css'
import './styles/global.css'
import { restoreSyncDirectory, restoreFromFileSystem, isFileSystemSupported } from './services/syncService'
import { shouldAutoBackup, performAutoBackup } from './services/autoBackupService'
import { showDialog } from 'vant'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 启动时尝试恢复自动同步（仅桌面浏览器）
async function initAutoSync() {
  if (!isFileSystemSupported()) {
    console.log('浏览器不支持File System Access API，使用自动备份方案')
    return
  }

  const restored = await restoreSyncDirectory()
  if (restored) {
    console.log('已恢复自动同步设置')

    // 尝试从文件系统恢复数据
    const result = await restoreFromFileSystem()
    if (result.success && result.hasData) {
      showDialog({
        title: '数据已恢复',
        message: result.message,
        confirmButtonText: '好的',
      })
    }
  }
}

// 检查是否需要自动备份（iOS等不支持File System API的设备）
async function checkAutoBackup() {
  if (shouldAutoBackup()) {
    const success = await performAutoBackup()
    if (success) {
      console.log('自动备份已完成')
    }
  }
}

app.mount('#app')

// 延迟初始化，避免阻塞首屏渲染
setTimeout(() => {
  initAutoSync()
  checkAutoBackup()
}, 1000)
