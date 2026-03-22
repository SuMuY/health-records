import { db } from '../db'
import { blobToBase64 } from '../utils/image'
import { saveAs } from 'file-saver'

export interface BackupData {
  version: string
  exportTime: number
  clients: any[]
  templates: any[]
  records: any[]
  images: Array<{
    id: string
    base64: string
    thumbnailBase64: string
    mimeType: string
    createdAt: number
  }>
}

/** 导出所有数据为JSON文件 */
export async function exportAllData() {
  const clients = await db.clients.toArray()
  const templates = await db.templates.toArray()
  const records = await db.records.toArray()
  const images = await db.images.toArray()

  // 将图片Blob转为base64
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
  const filename = `健康档案备份_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`
  saveAs(blob, filename)
}

/** 从JSON文件恢复数据 */
export async function importAllData(file: File): Promise<{ success: boolean; message: string }> {
  try {
    const text = await file.text()
    const backup: BackupData = JSON.parse(text)

    if (!backup.version || !backup.clients || !backup.templates || !backup.records) {
      return { success: false, message: '备份文件格式不正确' }
    }

    // 清空现有数据
    await db.transaction('rw', [db.clients, db.templates, db.records, db.images], async () => {
      await db.clients.clear()
      await db.templates.clear()
      await db.records.clear()
      await db.images.clear()

      // 恢复数据
      await db.clients.bulkAdd(backup.clients)
      await db.templates.bulkAdd(backup.templates)
      await db.records.bulkAdd(backup.records)

      // 恢复图片（base64转回Blob）
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
      message: `成功恢复 ${backup.clients.length} 个客户、${backup.templates.length} 个模板、${backup.records.length} 条档案`,
    }
  } catch (err) {
    console.error('导入失败', err)
    return { success: false, message: '导入失败：' + (err as Error).message }
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
