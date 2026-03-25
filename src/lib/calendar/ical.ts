import ical, { ICalCalendar, ICalAttendeeStatus } from 'ical-generator'

export interface ICalEventData {
  id: string
  title: string
  description?: string
  startDatetime: Date
  endDatetime: Date
  timezone: string
  location?: string
  onlineLink?: string
  eventbriteUrl?: string
  groupName?: string
  organizerName?: string
  organizerEmail?: string
}

export interface ICalAttendeeData {
  name: string
  email: string
  partstat?: 'ACCEPTED' | 'TENTATIVE' | 'DECLINED' | 'NEEDS-ACTION'
}

export function createEventIcs(event: ICalEventData, attendee?: ICalAttendeeData): string {
  const cal = ical({ name: 'IWant2Network Events' })

  const icalEvent = cal.createEvent({
    id: event.id,
    summary: event.title,
    description: event.description || '',
    start: event.startDatetime,
    end: event.endDatetime,
    timezone: event.timezone,
    location: event.location || event.onlineLink || undefined,
    url: event.eventbriteUrl || undefined,
    organizer: event.organizerEmail
      ? { name: event.organizerName || 'IWant2Network', email: event.organizerEmail }
      : undefined,
  })

  if (attendee) {
    icalEvent.createAttendee({
      name: attendee.name,
      email: attendee.email,
      status: (attendee.partstat as ICalAttendeeStatus) || ICalAttendeeStatus.ACCEPTED,
    })
  }

  return cal.toString()
}

export function createGroupFeedIcs(
  groupName: string,
  events: ICalEventData[]
): string {
  const cal = ical({ name: `IWant2Network - ${groupName}` })

  for (const event of events) {
    cal.createEvent({
      id: event.id,
      summary: event.title,
      description: event.description || '',
      start: event.startDatetime,
      end: event.endDatetime,
      timezone: event.timezone,
      location: event.location || event.onlineLink || undefined,
      url: event.eventbriteUrl || undefined,
    })
  }

  return cal.toString()
}

export function createMemberFeedIcs(
  memberName: string,
  events: Array<ICalEventData & { registered: boolean }>
): string {
  const cal = ical({ name: `IWant2Network - ${memberName}'s Calendar` })

  for (const event of events) {
    const icalEvent = cal.createEvent({
      id: event.id,
      summary: event.title,
      description: event.description || '',
      start: event.startDatetime,
      end: event.endDatetime,
      timezone: event.timezone,
      location: event.location || event.onlineLink || undefined,
      url: event.eventbriteUrl || undefined,
    })

    icalEvent.createAttendee({
      name: memberName,
      email: '',
      status: event.registered ? ICalAttendeeStatus.ACCEPTED : ICalAttendeeStatus.TENTATIVE,
    })
  }

  return cal.toString()
}
