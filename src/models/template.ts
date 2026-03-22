export interface FieldDefinition {
  id: string
  label: string
  type: 'text' | 'image' | 'single_select' | 'multi_select' | 'date'
  required: boolean
  options?: string[]
  calendarMode?: 'gregorian' | 'lunar' | 'both'
  order: number
}

export interface Template {
  id: string
  name: string
  description?: string
  fields: FieldDefinition[]
  createdAt: number
  updatedAt: number
}
