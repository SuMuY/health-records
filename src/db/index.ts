import Dexie, { type Table } from 'dexie'
import type { Client } from '../models/client'
import type { Template } from '../models/template'
import type { HealthRecord, StoredImage } from '../models/record'

class HealthDB extends Dexie {
  clients!: Table<Client>
  templates!: Table<Template>
  records!: Table<HealthRecord>
  images!: Table<StoredImage>

  constructor() {
    super('HealthRecordsDB')
    this.version(1).stores({
      clients: 'id, name, createdAt',
      templates: 'id, name, createdAt',
      records: 'id, clientId, templateId, createdAt, [clientId+createdAt]',
      images: 'id, createdAt',
    })
  }
}

export const db = new HealthDB()
