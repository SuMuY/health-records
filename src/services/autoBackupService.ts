import { db } from '../db'
import { blobToBase64 } from '../utils/image'
import { saveAs } from 'file-saver'
import type { BackupData } from './backupService'

const AUTO_BACKUP_KEY = 'autoBackupEnabled'
const LAST_BACKUP_KEY = 'lastBackupTime'
const BACKUP_INTERVAL = 24 * 60 * 60 * 1000 // 24小时

/** 检查是否启用自动备份 */
export function isAutoBackupEnabled(): boolean {
  return localStorage.getItem(AUTO_BACKUP_KEY) === 'true'
}

/** 启用自动备份 */
export function enableAutoBackup() {
  localStorage.setItem(AUTO_BACKUP_KEY, 'true')
}

/** 禁用自动备份 */
export function disableAutoBackup() {
  localStorage.setItem(AUTO_BACKUP_KEY, 'false')
  localStorage.removeItem(LAST_BACKUP_KEY)
}

/** 检查是否需要自动备份 */
export function shouldAutoBackup(): boolean {
  if (!isAutoBackupEnabled()) return false

  const lastBackup = localStorage.getItem(LAST_BACKUP_KEY)
  if (!lastBackup) return true

  const lastBackupTime = parseInt(lastBackup)
  const now = Date.now()
  return now - lastBackupTime > BACKUP_INTERVAL
}

/** 执行自动备份 */
export async function performAutoBackup(): Promise<boolean> {
  try {
    const clients = await db.clients.toArray()
    const templates = await db.templates.toArray()
    const records = await db.records.toArray()
    const images = await db.images.toArray()

    // 如果没有数据，不备份
    if (clients.length === 0 && templates.length === 0 && records.length === 0) {
      return false
    }

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

    const json = JSON.stringify(backup, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const filename = `健康档案自动备份_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`

    saveAs(blob, filename)

    // 记录备份时间
    localStorage.setItem(LAST_BACKUP_KEY, Date.now().toString())

    return true
  } catch (err) {
    console.error('自动备份失败', err)
    return false
  }
}

/** 获取上次备份时间 */
export function getLastBackupTime(): Date | null {
  const lastBackup = localStorage.getItem(LAST_BACKUP_KEY)
  if (!lastBackup) return null
  return new Date(parseInt(lastBackup))
}
