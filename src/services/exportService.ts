import type { Client } from '../models/client'
import type { HealthRecord } from '../models/record'
import { db } from '../db'
import { blobToBase64 } from '../utils/image'

export async function exportClientRecords(client: Client, records: HealthRecord[]) {
  const ExcelJS = await import('exceljs')
  const { saveAs } = await import('file-saver')

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet(client.name)

  if (records.length === 0) return

  // 收集所有字段标签（合并所有档案的字段）
  const fieldMap = new Map<string, { label: string; type: string }>()
  for (const r of records) {
    for (const v of r.values) {
      if (!fieldMap.has(v.fieldId)) {
        fieldMap.set(v.fieldId, { label: v.fieldLabel, type: v.fieldType })
      }
    }
  }

  const fieldEntries = Array.from(fieldMap.entries())

  // 表头
  const headers = ['模板', '创建时间', ...fieldEntries.map(([, f]) => f.label)]
  const headerRow = sheet.addRow(headers)
  headerRow.font = { bold: true }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

  // 设置列宽
  sheet.columns = headers.map((h, i) => ({
    width: i < 2 ? 16 : 20,
  }))

  // 数据行
  for (const record of records) {
    const rowValues: string[] = [
      record.templateName,
      new Date(record.createdAt).toLocaleString('zh-CN'),
    ]

    const rowIndex = sheet.rowCount + 1
    const imagePositions: { col: number; imageIds: string[] }[] = []

    for (const [fieldId, fieldInfo] of fieldEntries) {
      const fv = record.values.find(v => v.fieldId === fieldId)
      if (!fv || fv.value === null) {
        rowValues.push('')
      } else if (fieldInfo.type === 'image') {
        const ids = Array.isArray(fv.value) ? fv.value : [fv.value]
        rowValues.push(`[${ids.length}张图片]`)
        imagePositions.push({ col: rowValues.length - 1 + 1, imageIds: ids }) // 1-indexed
      } else if (Array.isArray(fv.value)) {
        rowValues.push(fv.value.join('、'))
      } else {
        rowValues.push(fv.value)
      }
    }

    const row = sheet.addRow(rowValues)
    row.alignment = { vertical: 'middle', wrapText: true }

    // 嵌入图片
    for (const pos of imagePositions) {
      let imgOffset = 0
      for (const imgId of pos.imageIds) {
        const storedImg = await db.images.get(imgId)
        if (!storedImg) continue

        const base64 = await blobToBase64(storedImg.blob)
        const imageId = workbook.addImage({
          base64: base64.split(',')[1],
          extension: 'jpeg',
        })

        sheet.addImage(imageId, {
          tl: { col: pos.col - 1 + imgOffset * 0.3, row: rowIndex - 1 },
          ext: { width: 80, height: 80 },
        })
        imgOffset++
      }
      // 调整行高以容纳图片
      row.height = Math.max(70, (row.height as number) || 15)
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${client.name}_健康档案_${new Date().toLocaleDateString('zh-CN')}.xlsx`)
}
