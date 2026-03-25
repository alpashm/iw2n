import { IntegrationService } from './base'

export class EventbriteService extends IntegrationService {
  protected integrationKey = 'eventbrite'
  private baseUrl = 'https://www.eventbriteapi.com/v3'
  private token: string

  constructor(token: string, readOnly = true) {
    super()
    this.token = token
    this.readOnly = readOnly
  }

  private async get(path: string) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    })
    if (!response.ok) throw new Error(`Eventbrite API error: ${response.status}`)
    return response.json()
  }

  async getOrganizations() {
    return this.get('/users/me/organizations/')
  }

  async getEvents(orgId: string, status = 'live') {
    return this.get(`/organizations/${orgId}/events/?status=${status}&expand=venue`)
  }

  async getAttendees(eventId: string) {
    return this.get(`/events/${eventId}/attendees/`)
  }
}
