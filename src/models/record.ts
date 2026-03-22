export interface FieldValue {
  fieldId: string
  fieldLabel: string
  fieldType: string
  value: string | string[] | null
}

export interface HealthRecord {
  id: string
  clientId: string
  templateId: string
  templateName: string
  values: FieldValue[]
  createdAt: number
  updatedAt: number
}

export interface StoredImage {
  id: string
  blob: Blob
  mimeType: string
  thumbnailBlob: Blob
  createdAt: number
}
