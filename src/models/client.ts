export interface Client {
  id: string
  name: string
  gender: 'male' | 'female' | 'other'
  birthDateLunar?: string
  phone?: string
  notes?: string
  createdAt: number
  updatedAt: number
}
