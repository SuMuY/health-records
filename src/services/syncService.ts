import { db } from '../db'
import { blobToBase64 } from '../utils/image'
import type { BackupData } from './backupService'

const SYNC_FILE_NAME = 'health-records-data.json'
const STORAGE_KEY = 'fileSystemHandle'

let syncDirectoryHandle: FileSystemDirectoryHandle | null = null
let autoSyncEnabled = false

/** 检查浏览器是否支持File System Access API */
export function isFileSystemSupported(): boolean {
  return 'showDirectoryPicker' in window
}

/** 请求用户选择同步文件夹 */
export async function setupSyncDirectory(): Promise<boolean> {
  if (!isFileSystemSupported()) {
    return false
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents',
    })

    // 验证权限
    const permission = await handle.queryPermission({ mode: 'readwrite' })
    if (permission !== 'granted') {
      const requestPermission = await handle.requestPermission({ mode: 'readwrite' })
      if (requestPermission !== 'granted') {
        return false
      }
    }

    syncDirectoryHandle = handle
    autoSyncEnabled = true

    // 保存handle引用（IndexedDB可以存储handle）
    await saveSyncHandle(handle)

    return true
  } catch (err) {
    console.error('选择文件夹失败', err)
    return false
  }
}

/** 恢复之前保存的同步文件夹 */
export async function restoreSyncDirectory(): Promise<boolean> {
  try {
    const handle = await loadSyncHandle()
    if (!handle) return false

    // 验证权限
    const permission = await handle.queryPermission({ mode: 'readwrite' })
    if (permission !== 'granted') {
      const requestPermission = await handle.requestPermission({ mode: 'readwrite' })
      if (requestPermission !== 'granted') {
        return false
      }
    }

    syncDirectoryHandle = handle
    autoSyncEnabled = true
    return true
  } catch (err) {
    console.error('恢复同步文件夹失败', err)
    return false
  }
}

/** 自动同步数据到文件系统 */
export async function autoSyncToFileSystem(): Promise<void> {
  if (!autoSyncEnabled || !syncDirectoryHandle) return

  try {
    const clients = await db.clients.toArray()
    const templates = await db.templates.toArray()
    const records = await db.records.toArray()
    const images = await db.images.toArray()

    const imagesData = await Promise.all(
      images.map(async (img) => ({
        id: img.id,
        base64: await blobToBase64(img.blob),
        thumbnailBase64: await blobToBase64(img.thumbnailBlob),
        mimeType: img.mimeType,
        createdAt: img.createdAt,
      }))
    )

    const backup: BackupData = {
      version: '1.0',
      exportTime: Date.now(),
      clients,
      templates,
      records,
      images: imagesData,
    }

    const fileHandle = await syncDirectoryHandle.getFileHandle(SYNC_FILE_NAME, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(JSON.stringify(backup, null, 2))
    await writable.close()

    console.log('自动同步成功', new Date().toLocaleTimeString())
  } catch (err) {
    console.error('自动同步失败', err)
    // 同步失败不影响用户操作，静默处理
  }
}

/** 从文件系统恢复数据 */
export async function restoreFromFileSystem(): Promise<{
  success: boolean
  message: string
  hasData: boolean
}> {
  if (!syncDirectoryHandle) {
    return { success: false, message: '未设置同步文件夹', hasData: false }
  }

  try {
    const fileHandle = await syncDirectoryHandle.getFileHandle(SYNC_FILE_NAME)
    const file = await fileHandle.getFile()
    const text = await file.text()
    const backup: BackupData = JSON.parse(text)

    if (!backup.version || !backup.clients || !backup.templates || !backup.records) {
      return { success: false, message: '备份文件格式不正确', hasData: false }
    }

    // 清空并恢复数据
    await db.transaction('rw', [db.clients, db.templates, db.records, db.images], async () => {
      await db.clients.clear()
      await db.templates.clear()
      await db.records.clear()
      await db.images.clear()

      await db.clients.bulkAdd(backup.clients)
      await db.templates.bulkAdd(backup.templates)
      await db.records.bulkAdd(backup.records)

      if (backup.images && backup.images.length > 0) {
        const imagesData = backup.images.map((img) => ({
          id: img.id,
          blob: base64ToBlob(img.base64, img.mimeType),
          thumbnailBlob: base64ToBlob(img.thumbnailBase64, img.mimeType),
          mimeType: img.mimeType,
          createdAt: img.createdAt,
        }))
        await db.images.bulkAdd(imagesData)
      }
    })

    return {
      success: true,
      message: `已从同步文件夹恢复 ${backup.clients.length} 个客户、${backup.records.length} 条档案`,
      hasData: true,
    }
  } catch (err: any) {
    if (err.name === 'NotFoundError') {
      return { success: true, message: '同步文件夹为空，这是首次使用', hasData: false }
    }
    console.error('从文件系统恢复失败', err)
    return { success: false, message: '恢复失败：' + err.message, hasData: false }
  }
}

/** 禁用自动同步 */
export function disableAutoSync() {
  autoSyncEnabled = false
  syncDirectoryHandle = null
  removeSyncHandle()
}

/** 检查是否已启用自动同步 */
export function isAutoSyncEnabled(): boolean {
  return autoSyncEnabled
}

// 保存和加载handle的辅助函数
async function saveSyncHandle(handle: FileSystemDirectoryHandle) {
  try {
    // IndexedDB可以直接存储FileSystemHandle
    const idb = indexedDB.open('FileSystemHandles', 1)
    await new Promise((resolve, reject) => {
      idb.onsuccess = resolve
      idb.onerror = reject
      idb.onupgradeneeded = (e) => {
        const db = (e.target as any).result
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles')
        }
      }
    })
    const db = idb.result
    const tx = db.transaction('handles', 'readwrite')
    const store = tx.objectStore('handles')
    store.put(handle, STORAGE_KEY)
    await new Promise((resolve) => (tx.oncomplete = resolve))
  } catch (err) {
    console.error('保存handle失败', err)
  }
}

async function loadSyncHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const idb = indexedDB.open('FileSystemHandles', 1)
    await new Promise((resolve, reject) => {
      idb.onsuccess = resolve
      idb.onerror = reject
      idb.onupgradeneeded = (e) => {
        const db = (e.target as any).result
        if (!db.objectStoreNames.contains('handles')) {
          db.createObjectStore('handles')
        }
      }
    })
    const db = idb.result
    const tx = db.transaction('handles', 'readonly')
    const store = tx.objectStore('handles')
    const request = store.get(STORAGE_KEY)
    return await new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => resolve(null)
    })
  } catch (err) {
    console.error('加载handle失败', err)
    return null
  }
}

async function removeSyncHandle() {
  try {
    const idb = indexedDB.open('FileSystemHandles', 1)
    await new Promise((resolve) => (idb.onsuccess = resolve))
    const db = idb.result
    const tx = db.transaction('handles', 'readwrite')
    const store = tx.objectStore('handles')
    store.delete(STORAGE_KEY)
  } catch (err) {
    console.error('删除handle失败', err)
  }
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteString = atob(base64.split(',')[1])
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mimeType })
}
