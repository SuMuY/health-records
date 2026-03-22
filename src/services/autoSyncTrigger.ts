import { autoSyncToFileSystem } from './syncService'

// 数据库操作后自动触发同步
let syncTimeout: number | null = null

export function triggerAutoSync() {
  // 防抖：500ms内的多次修改只触发一次同步
  if (syncTimeout) {
    clearTimeout(syncTimeout)
  }
  syncTimeout = window.setTimeout(() => {
    autoSyncToFileSystem()
    syncTimeout = null
  }, 500)
}
