export interface Client {
  id: string
  name: string
  gender: 'male' | 'female' | 'other'
  birthDate?: string
  birthDateLunar?: string
  phone?: string
  notes?: string
  createdAt: number
  updatedAt: number
}
