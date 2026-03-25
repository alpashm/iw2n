import { IntegrationService, ReadOnlyIntegrationError } from './base'

export interface KeapContact {
  id: number
  given_name: string
  family_name: string
  email_addresses?: Array<{ email: string; field: string }>
  phone_numbers?: Array<{ number: string; field: string }>
  company?: { company_name: string }
  tag_ids?: number[]
  custom_fields?: Array<{ id: number; content: string }>
}

export interface KeapTag {
  id: number
  name: string
  description?: string
  category?: { id: number; name: string }
}

export interface KeapContactsResponse {
  contacts: KeapContact[]
  count: number
  next?: string
}

export interface KeapTagsResponse {
  tags: KeapTag[]
  count: number
}

export class KeapService extends IntegrationService {
  protected integrationKey = 'keap'
  private baseUrl = 'https://api.infusionsoft.com/crm/rest/v2'
  private token: string

  constructor(token: string) {
    super()
    this.readOnly = true // Keap is ALWAYS read-only
    this.token = token
  }

  protected assertWritable() {
    // Keap is NEVER writable per spec
    throw new ReadOnlyIntegrationError('keap')
  }

  private async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Keap API error: ${response.status} - ${text}`)
    }
    return response.json()
  }

  async getContacts(limit = 200, offset = 0): Promise<KeapContactsResponse> {
    return this.get<KeapContactsResponse>(
      `/contacts?limit=${limit}&offset=${offset}&optional_properties=custom_fields,tag_ids,email_addresses,phone_numbers,company`
    )
  }

  async getAllContacts(): Promise<KeapContact[]> {
    const allContacts: KeapContact[] = []
    let offset = 0
    const limit = 200

    while (true) {
      const response = await this.getContacts(limit, offset)
      allContacts.push(...response.contacts)
      if (response.contacts.length < limit) break
      offset += limit
    }

    return allContacts
  }

  async getContact(id: string): Promise<KeapContact> {
    return this.get<KeapContact>(
      `/contacts/${id}?optional_properties=custom_fields,tag_ids,email_addresses,phone_numbers,company`
    )
  }

  async getTags(limit = 200, offset = 0): Promise<KeapTagsResponse> {
    return this.get<KeapTagsResponse>(`/tags?limit=${limit}&offset=${offset}`)
  }

  async getAllTags(): Promise<KeapTag[]> {
    const allTags: KeapTag[] = []
    let offset = 0
    const limit = 200

    while (true) {
      const response = await this.getTags(limit, offset)
      allTags.push(...response.tags)
      if (response.tags.length < limit) break
      offset += limit
    }

    return allTags
  }

  async getContactTags(id: string) {
    return this.get(`/contacts/${id}/tags`)
  }

  async getNotes(contactId: string) {
    return this.get(`/notes?contact_id=${contactId}`)
  }

  async searchContactsByEmail(email: string): Promise<KeapContactsResponse> {
    return this.get<KeapContactsResponse>(
      `/contacts?email=${encodeURIComponent(email)}&optional_properties=custom_fields,tag_ids,email_addresses,phone_numbers,company`
    )
  }
}
