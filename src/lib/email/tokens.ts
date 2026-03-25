import { format } from 'date-fns'

export interface TokenContext {
  // User / Contact
  firstName?: string
  surname?: string
  fullName?: string
  email?: string
  company?: string
  // Group
  groupName?: string
  // Event
  eventTitle?: string
  eventDate?: Date | string
  eventTime?: Date | string
  eventLocation?: string
  eventLink?: string
  // Referral
  introPersonAName?: string
  introPersonBName?: string
  introPersonACompany?: string
  introPersonBCompany?: string
  introEventTitle?: string
  introEventDate?: Date | string
  // Package
  packageName?: string
  packagePrice?: number | string
  packageExpiry?: Date | string
  // System
  unsubscribeLink?: string
  senderName?: string
}

const fallbacks: Record<string, string> = {
  FirstName: 'Member',
  Surname: '',
  FullName: 'Member',
  Email: '',
  Company: '',
  GroupName: 'our group',
  EventTitle: 'the event',
  EventDate: '',
  EventTime: '',
  EventLocation: '',
  EventLink: '#',
  IntroPersonAName: '',
  IntroPersonBName: '',
  IntroPersonACompany: '',
  IntroPersonBCompany: '',
  IntroEventTitle: '',
  IntroEventDate: '',
  PackageName: '',
  PackagePrice: '',
  PackageExpiry: '',
  UnsubscribeLink: '#',
  CurrentDate: '',
  SenderName: 'IWant2Network',
}

function formatDate(value: Date | string | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return ''
  return format(d, 'dd MMM yyyy')
}

function formatTime(value: Date | string | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return ''
  return format(d, 'HH:mm')
}

export function substituteTokens(html: string, context: TokenContext): string {
  const currentDate = format(new Date(), 'dd MMM yyyy')

  const tokenMap: Record<string, string> = {
    FirstName: context.firstName || fallbacks.FirstName,
    Surname: context.surname || fallbacks.Surname,
    FullName:
      context.fullName ||
      (context.firstName && context.surname
        ? `${context.firstName} ${context.surname}`
        : context.firstName || fallbacks.FullName),
    Email: context.email || fallbacks.Email,
    Company: context.company || fallbacks.Company,
    GroupName: context.groupName || fallbacks.GroupName,
    EventTitle: context.eventTitle || fallbacks.EventTitle,
    EventDate:
      formatDate(context.eventDate) || fallbacks.EventDate,
    EventTime:
      formatTime(context.eventTime || context.eventDate) || fallbacks.EventTime,
    EventLocation: context.eventLocation || fallbacks.EventLocation,
    EventLink: context.eventLink || fallbacks.EventLink,
    IntroPersonAName: context.introPersonAName || fallbacks.IntroPersonAName,
    IntroPersonBName: context.introPersonBName || fallbacks.IntroPersonBName,
    IntroPersonACompany: context.introPersonACompany || fallbacks.IntroPersonACompany,
    IntroPersonBCompany: context.introPersonBCompany || fallbacks.IntroPersonBCompany,
    IntroEventTitle: context.introEventTitle || fallbacks.IntroEventTitle,
    IntroEventDate:
      formatDate(context.introEventDate) || fallbacks.IntroEventDate,
    PackageName: context.packageName || fallbacks.PackageName,
    PackagePrice:
      context.packagePrice !== undefined ? String(context.packagePrice) : fallbacks.PackagePrice,
    PackageExpiry:
      formatDate(context.packageExpiry instanceof Date || typeof context.packageExpiry === 'string'
        ? context.packageExpiry
        : undefined) || fallbacks.PackageExpiry,
    UnsubscribeLink: context.unsubscribeLink || fallbacks.UnsubscribeLink,
    CurrentDate: currentDate,
    SenderName: context.senderName || fallbacks.SenderName,
  }

  let result = html
  for (const [token, value] of Object.entries(tokenMap)) {
    // Replace {Token} patterns - case sensitive per spec
    result = result.replaceAll(`{${token}}`, value)
  }

  return result
}

export function buildUnsubscribeLink(
  baseUrl: string,
  groupId: string,
  userId: string,
  token: string
): string {
  return `${baseUrl}/unsubscribe/${groupId}/${userId}/${token}`
}

export function generateUnsubscribeToken(userId: string, groupId: string): string {
  const crypto = require('crypto')
  const secret = process.env.NEXTAUTH_SECRET || 'default-secret'
  return crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${groupId}`)
    .digest('hex')
    .slice(0, 32)
}
