# IWant2Network — Event Management System (EMS)
## Claude Code Project Specification — v3.0 | Sona IT

> **How to use this file:** This is `CLAUDE.md` — place it in the root of the project. Claude Code reads it automatically at the start of every session. It contains the full spec, data model, and prompt scaffold for the EMS build.

---

## 1. Project Overview

**Client:** IWant2Network — Quality London Business Networking Events  
**Built by:** Sona IT (MSP)  
**Purpose:** A bespoke Event Management System that sits above Keap CRM, Eventbrite, and Xero as the unified operational layer — handling multi-group management, sales pipeline, email communications, member introductions (Referrals), AI-assisted inbox, calendar management, and event attendance documentation.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Next.js API routes |
| Database | PostgreSQL 16 + Prisma ORM |
| Auth | NextAuth.js (email/password + Google SSO) |
| Email delivery | SMTP2GO REST API (POST /v3/email/send) |
| Calendar | ical-generator (npm) |
| Job queue | BullMQ + Redis 7 |
| PDF generation | Puppeteer (headless Chrome, server-side) |
| AI | Anthropic SDK (Claude, primary) + OpenAI SDK (fallback) |
| File storage | Cloudflare R2 |
| Deployment | Docker Compose (app + db + redis) + Nginx + Let's Encrypt SSL |

---

## 3. Integrations

All integrations configured in **Settings > Integrations**. Each has: credential input (AES-256 encrypted), read-only toggle (enforced at service layer, not just UI), test connection button, status badge, last sync timestamp, sync log.

| Integration | Auth | Scopes / Permissions | Read-Only Toggle |
|---|---|---|---|
| SMTP2GO | API Key (X-Smtp2go-Api-Key header) | Send emails, view logs | N/A — send only |
| Xero | OAuth 2.0 (Client ID + Secret) | accounting.contacts, accounting.transactions, offline_access | Yes |
| Eventbrite | Private API Token | Read events, attendees, orders | Yes (recommended ON) |
| Microsoft Graph API | OAuth 2.0 App Registration | Mail.ReadWrite, Mail.Send, offline_access, Contacts.Read, Mail.ReadWrite.Shared, Mail.Send.Shared, Contacts.Read.Shared | Yes (for contacts) |
| Claude API | API Key (x-api-key header) | messages endpoint | N/A |
| OpenAI API | API Key (Bearer token) | chat/completions | N/A |

**CRITICAL:** The read-only flag must be enforced in the integration service class — if `read_only = true` for an integration, all POST/PUT/PATCH/DELETE calls to that API must be blocked at the service layer and throw a `ReadOnlyIntegrationError`. This is not a UI guard.

---

## 4. Database Schema (Prisma)

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String?
  firstName       String
  lastName        String
  role            String   @default("member") // admin | member
  keapContactId   String?
  xeroContactId   String?
  createdAt       DateTime @default(now())
  memberships     GroupMembership[]
  attendances     Attendee[]
  dealsAssigned   Deal[]
  memberPackages  MemberPackage[]
  referralsA      Referral[] @relation("PersonA")
  referralsB      Referral[] @relation("PersonB")
}

model Group {
  id                  String   @id @default(cuid())
  name                String
  slug                String   @unique
  description         String?
  type                String   // online | in-person | hybrid
  coverImage          String?
  status              String   @default("active") // active | archived
  keapTagId           String?
  timezone            String   @default("Europe/London")
  calendarVisibility  String   @default("members") // members | public
  memberships         GroupMembership[]
  events              Event[]
  campaigns           EmailCampaign[]
  reminderConfigs     ReminderConfig[]
  calendarFeed        CalendarFeed?
}

model GroupMembership {
  id             String    @id @default(cuid())
  userId         String
  groupId        String
  joinedAt       DateTime  @default(now())
  status         String    @default("active")
  unsubscribedAt DateTime?
  user           User      @relation(fields: [userId], references: [id])
  group          Group     @relation(fields: [groupId], references: [id])
  @@unique([userId, groupId])
}

model Event {
  id                String    @id @default(cuid())
  groupId           String
  title             String
  description       String?
  startDatetime     DateTime
  endDatetime       DateTime
  timezone          String    @default("Europe/London")
  location          String?
  onlineLink        String?
  type              String    // in-person | online | hybrid
  coverImage        String?
  capacity          Int?
  status            String    @default("draft") // draft | published | cancelled | completed
  eventbriteEventId String?
  eventbriteUrl     String?
  group             Group     @relation(fields: [groupId], references: [id])
  attendees         Attendee[]
  referrals         Referral[]
}

model Attendee {
  id                  String    @id @default(cuid())
  eventId             String
  userId              String?
  keapContactId       String?
  name                String
  email               String
  ticketType          String?
  eventbriteOrderId   String?   @unique
  checkedIn           Boolean   @default(false)
  registeredAt        DateTime  @default(now())
  icsSent             Boolean   @default(false)
  event               Event     @relation(fields: [eventId], references: [id])
  user                User?     @relation(fields: [userId], references: [id])
}

model KeapContactCache {
  id            String   @id @default(cuid())
  keapId        String   @unique
  firstName     String
  lastName      String
  email         String
  phone         String?
  company       String?
  tags          Json     @default("[]")
  customFields  Json     @default("{}")
  rawData       Json     @default("{}")
  lastSyncedAt  DateTime @default(now())
}

model XeroContactCache {
  id                 String   @id @default(cuid())
  xeroContactId      String   @unique
  name               String
  email              String?
  phone              String?
  company            String?
  outstandingBalance Float    @default(0)
  lastSyncedAt       DateTime @default(now())
  xeroLink           XeroLink?
}

model XeroLink {
  id              String           @id @default(cuid())
  emsUserId       String
  xeroContactId   String           @unique
  matchStatus     String           @default("unmatched") // auto-matched-pending | confirmed | possible-match | unmatched | not-in-xero
  matchedBy       String?          // auto | manual
  confirmedAt     DateTime?
  user            User             @relation(fields: [emsUserId], references: [id])
  xeroContact     XeroContactCache @relation(fields: [xeroContactId], references: [xeroContactId])
}

model Package {
  id              String          @id @default(cuid())
  name            String
  description     String?
  price           Float
  billingType     String          // monthly | annual | one-off
  includedGroups  Json            @default("[]")
  status          String          @default("active")
  memberPackages  MemberPackage[]
}

model MemberPackage {
  id              String    @id @default(cuid())
  userId          String
  packageId       String
  status          String    @default("active") // active | expired | cancelled | pending
  startedAt       DateTime  @default(now())
  expiresAt       DateTime?
  xeroInvoiceId   String?
  user            User      @relation(fields: [userId], references: [id])
  package         Package   @relation(fields: [packageId], references: [id])
}

model Pipeline {
  id           String  @id @default(cuid())
  name         String
  stages       Json    // Array of {id, name, order, color}
  outcomeWin   String  @default("Won")
  outcomeLoss  String  @default("Lost")
  deals        Deal[]
}

model Deal {
  id           String         @id @default(cuid())
  pipelineId   String
  contactId    String?        // EMS user or Keap cache ID
  title        String
  value        Float?
  stage        String
  status       String         @default("open") // open | won | lost
  outcome      String?
  assignedTo   String?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt
  pipeline     Pipeline       @relation(fields: [pipelineId], references: [id])
  assignedUser User?          @relation(fields: [assignedTo], references: [id])
  activities   DealActivity[]
}

model DealActivity {
  id        String   @id @default(cuid())
  dealId    String
  type      String   // note | stage-change | email-sent | task
  note      String?
  createdBy String?
  createdAt DateTime @default(now())
  deal      Deal     @relation(fields: [dealId], references: [id])
}

model Ticket {
  id             String    @id @default(cuid())
  fromName       String
  fromEmail      String
  subject        String
  bodyHtml       String
  receivedAt     DateTime
  status         String    @default("new") // new | open | ai-draft-ready | replied | closed
  graphMessageId String    @unique
  assignedTo     String?
  contactId      String?
  tag            String?   // enquiry | sponsorship | speaker | technical | other
  aiDraft        String?
  repliedAt      DateTime?
  notes          String?
}

model EmailTemplate {
  id        String   @id @default(cuid())
  name      String
  category  String   // transactional | bulk | referral | reminder | welcome
  subject   String
  htmlBody  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EmailSignature {
  id          String  @id @default(cuid())
  name        String
  htmlContent String
  isDefault   Boolean @default(false)
  groupId     String?
}

model EmailCampaign {
  id           String    @id @default(cuid())
  groupId      String?
  templateId   String?
  subject      String
  htmlBody     String
  status       String    @default("draft") // draft | scheduled | sending | sent
  scheduledAt  DateTime?
  sentAt       DateTime?
  senderName   String
  senderEmail  String
  signatureId  String?
  group        Group?    @relation(fields: [groupId], references: [id])
  emailLogs    EmailLog[]
}

model EmailLog {
  id             String    @id @default(cuid())
  campaignId     String?
  referralId     String?
  ticketId       String?
  userId         String?
  email          String
  type           String    // confirmation | reminder | campaign | referral | welcome | ticket-reply
  smtp2goEmailId String?
  status         String    @default("queued") // queued | sent | opened | bounced | failed
  openedAt       DateTime?
  sentAt         DateTime  @default(now())
  campaign       EmailCampaign? @relation(fields: [campaignId], references: [id])
}

model Referral {
  id                  String    @id @default(cuid())
  personAId           String
  personBId           String
  eventbriteEventId   String?
  eventTitle          String?
  eventDate           DateTime?
  templateId          String?
  personalNote        String?
  sentBy              String?
  sentAt              DateTime  @default(now())
  smtp2goEmailId      String?
  qualityScore        Int?
  feedbackA           String?
  feedbackB           String?
  personA             User      @relation("PersonA", fields: [personAId], references: [id])
  personB             User      @relation("PersonB", fields: [personBId], references: [id])
}

model IntegrationSetting {
  id             String    @id @default(cuid())
  key            String    @unique // smtp2go_api_key | keap_pat | eventbrite_token | xero_client_id | xero_client_secret | xero_access_token | xero_refresh_token | graph_client_id | graph_client_secret | graph_access_token | graph_refresh_token | graph_mailbox | claude_api_key | openai_api_key | preferred_ai_model
  valueEncrypted String
  readOnly       Boolean   @default(false)
  lastTestedAt   DateTime?
  status         String    @default("unconfigured") // unconfigured | connected | error
}

model SyncLog {
  id         String   @id @default(cuid())
  source     String   // keap | eventbrite | xero | graph
  direction  String   // pull | push | webhook
  records    Int      @default(0)
  errors     String?
  syncedAt   DateTime @default(now())
}

model ReminderConfig {
  id          String  @id @default(cuid())
  groupId     String?
  eventId     String?
  offsetHours Int
  templateId  String?
  enabled     Boolean @default(true)
  group       Group?  @relation(fields: [groupId], references: [id])
}

model CalendarFeed {
  id              String   @id @default(cuid())
  groupId         String   @unique
  slug            String   @unique
  icalToken       String   @unique @default(cuid())
  lastGeneratedAt DateTime?
  group           Group    @relation(fields: [groupId], references: [id])
}
```

---

## 5. Key Business Rules

- **Read-only enforcement:** If `IntegrationSetting.readOnly = true` for any integration, ALL write operations to that API must throw `ReadOnlyIntegrationError` at the service layer.
- **Keap:** NEVER writes to Keap under any circumstance. Read-only always.
- **Eventbrite:** Read-only recommended. EMS does not sell tickets — links to Eventbrite pages only.
- **Xero:** Write mode creates draft invoices only. Invoice creation blocked if read-only ON.
- **SMTP2GO:** All outbound email (transactional, bulk, referrals, reminders, .ics invites, ticket replies) routes via SMTP2GO API. Never use nodemailer/SMTP directly.
- **AI drafts:** NEVER auto-send AI-generated email. Admin must click Send explicitly.
- **Calendar invite:** When an Eventbrite attendee is synced (new order), EMS must dispatch a branded .ics invite via SMTP2GO — the attendee should NOT need to rely on Eventbrite's own invite.
- **Attendance Sheet:** Regenerate Eventbrite attendee pull at PDF generation time — always current. Auto-email to admin at 6pm the day before each in-person event.

---

## 6. Token System

All email templates support these substitution tokens. Resolved at send time:

| Token | Source |
|---|---|
| `{FirstName}` | User / KeapContactCache |
| `{Surname}` | User / KeapContactCache |
| `{FullName}` | User / KeapContactCache |
| `{Email}` | User / KeapContactCache |
| `{Company}` | User / KeapContactCache |
| `{GroupName}` | Group |
| `{EventTitle}` | Event |
| `{EventDate}` | Event (formatted DD MMM YYYY) |
| `{EventTime}` | Event (formatted HH:mm) |
| `{EventLocation}` | Event.location or Event.onlineLink |
| `{EventLink}` | Event.eventbriteUrl |
| `{IntroPersonAName}` | Referral.personA.firstName |
| `{IntroPersonBName}` | Referral.personB.firstName |
| `{IntroPersonACompany}` | Referral.personA company |
| `{IntroPersonBCompany}` | Referral.personB company |
| `{IntroEventTitle}` | Referral.eventTitle |
| `{IntroEventDate}` | Referral.eventDate (formatted) |
| `{PackageName}` | MemberPackage → Package.name |
| `{PackagePrice}` | Package.price |
| `{PackageExpiry}` | MemberPackage.expiresAt |
| `{UnsubscribeLink}` | Generated URL: /unsubscribe/{groupId}/{userId}/{token} |
| `{CurrentDate}` | new Date() formatted |
| `{SenderName}` | IntegrationSetting: smtp2go_sender_name |

If a token cannot be resolved, use the fallback value configured in Settings > Email > Token Defaults. Never leave an unresolved token visible in the sent email.

---

## 7. API Endpoints Reference

### SMTP2GO
```
POST https://api.smtp2go.com/v3/email/send
Header: X-Smtp2go-Api-Key: {key}
Body: { sender, to: [], subject, html_body, text_body, attachments: [{filename, fileblob (base64), mimetype}] }
Max 100 recipients per call. Batch larger lists.
```

### Keap
```
Base: https://api.infusionsoft.com/crm/rest/v2
Header: Authorization: Bearer {personal_access_token}
GET /contacts?limit=200&offset=0  (paginate)
GET /contacts/{id}
GET /tags
GET /contacts/{id}/tags
GET /notes?contact_id={id}
```

### Eventbrite
```
Base: https://www.eventbriteapi.com/v3
Header: Authorization: Bearer {private_token}
GET /users/me/organizations/
GET /organizations/{id}/events/?status=live&expand=venue
GET /events/{id}/attendees/
Webhook events: order.placed, attendee.updated, event.updated, event.published
Webhook endpoint: POST /api/webhooks/eventbrite
```

### Xero
```
Base: https://api.xero.com/api.xro/2.0
Header: Authorization: Bearer {access_token}, Xero-tenant-id: {tenantId}
GET /Contacts?where=EmailAddress%3D%22{email}%22
GET /Invoices?ContactIDs={xeroContactId}
POST /Invoices  (body: ACCREC draft invoice)
OAuth: GET https://login.xero.com/identity/connect/authorize
Token: POST https://identity.xero.com/connect/token
```

### Microsoft Graph API
```
Base: https://graph.microsoft.com/v1.0
Header: Authorization: Bearer {access_token}
GET /users/{mailbox}/mailFolders/Inbox/messages?$filter=isRead eq false
POST /users/{mailbox}/messages/{id}/move  body: {destinationId: "deleteditems"}
POST /users/{mailbox}/sendMail
OAuth: https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/authorize
Token: POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
Scopes: Mail.ReadWrite Mail.Send offline_access Contacts.Read Mail.ReadWrite.Shared Mail.Send.Shared Contacts.Read.Shared
```

### Claude API
```
POST https://api.anthropic.com/v1/messages
Header: x-api-key: {key}, anthropic-version: 2023-06-01
Body: { model: "claude-sonnet-4-6", max_tokens: 1024, messages: [{role: "user", content: "..."}] }
```

### OpenAI API
```
POST https://api.openai.com/v1/chat/completions
Header: Authorization: Bearer {key}
Body: { model: "gpt-4o", messages: [{role: "system", content: "..."}, {role: "user", content: "..."}] }
```

---

## 8. Module Summary

| Module | Section | Phase |
|---|---|---|
| Group Management | 11.1 | 1 |
| Event Management + Eventbrite Sync | 11.2 | 1 |
| Sales Pipeline (Kanban) | 11.3 | 1 |
| Membership Packages | 11.4 | 1 |
| Keap CRM Read-Only Panel | 11.5 | 1 |
| Xero Client Linking + Auto-Match | 11.6 | 1 |
| Email Templates + HTML + Signatures + Tokens | 11.8 | 1 |
| Referrals Module (with Event Dropdown) | 11.9 | 1 |
| Per-Group iCal + Public All-Groups Calendar | 11.7 | 2 |
| Per-Member Personalised iCal Feed | 11.7 | 2 |
| Inbox + AI Ticketing (Graph API) | 11.10 | 2 |
| Event Attendance Sheet PDF | 11.11 | 2 |
| Member Portal | 11.12 | 2 |
| Admin Dashboard | 11.13 | 2 |
| Visual Automation Builder | Recommended | 3 |
| Lead Scoring | Recommended | 3 |
| Stripe Billing | Recommended | 3 |
| PWA Mobile App | Recommended | 3 |

---

## 9. Docker Compose Structure

```yaml
version: '3.8'
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      DATABASE_URL: postgresql://ems:password@db:5432/ems
      REDIS_URL: redis://cache:6379
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    depends_on: [db, cache]

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ems
      POSTGRES_USER: ems
      POSTGRES_PASSWORD: password
    volumes: [postgres_data:/var/lib/postgresql/data]

  cache:
    image: redis:7-alpine
    volumes: [redis_data:/data]

volumes:
  postgres_data:
  redis_data:
```

---

## 10. Build Prompts (Run in Order)

### PROMPT 1 — Scaffold + Settings + Integrations
Set up a Next.js 14 (App Router) project with the tech stack defined in Section 2 of this spec. Use Docker Compose from Section 9. Generate the full Prisma schema from Section 4. Set up NextAuth.js with email/password login and Google SSO with admin and member roles. Build the Settings > Integrations admin page with 6 integration cards (SMTP2GO, Xero, Eventbrite, Microsoft Graph API, Claude API, OpenAI API). Each card must have: masked credential input, read-only toggle tick box, test connection button, status badge (connected/error/unconfigured), last sync timestamp, sync log link. Credentials stored AES-256 encrypted using the ENCRYPTION_KEY env var. The read-only toggle must be enforced at the integration service layer — create a base IntegrationService class that checks readOnly before any write call and throws ReadOnlyIntegrationError if set.

### PROMPT 2 — Keap Sync + Eventbrite Sync + .ics Dispatch
Build the Keap sync service using the API details in Section 7 of this spec. Use node-cron for nightly scheduling. Pull all contacts with pagination into KeapContactCache. Pull and store tags. Implement tag-to-group mapping: admin configures which Keap tag ID maps to which EMS Group ID — on sync, contacts with that tag get GroupMembership records created. Log all operations to SyncLog. On-demand sync API route at POST /api/admin/sync/keap. Build the Eventbrite webhook endpoint at POST /api/webhooks/eventbrite. Process order.placed and attendee.updated events. Upsert Attendee records using eventbriteOrderId as idempotency key. On new attendee: generate a .ics file using ical-generator and dispatch via SMTP2GO (POST /v3/email/send) with the .ics as a base64 attachment using the registration confirmation email template. Schedule hourly Eventbrite reconciliation pull via BullMQ.

### PROMPT 3 — Sales Pipeline (Kanban) + Packages + Xero
Build the Sales Pipeline Kanban board using react-beautiful-dnd. Columns are stages (stored as JSON on Pipeline). Deal cards show: name, company, value, days in stage, colour-coded staleness (red >7 days no activity, amber >3 days). Deal detail slide-over panel: contact info, notes, stage history log (DealActivity), stage change dropdown, value edit. On stage change: optionally trigger a SMTP2GO email send or create a task (basic automation, stage config). Multiple pipelines support. Win/Loss outcome on close. Pipeline analytics page: Recharts funnel chart, conversion rate per stage, average stage duration, revenue forecast. Build Membership Packages CRUD. Package assignment to member. Build Xero OAuth 2.0 connection using API details from Section 7. Two-column Xero client linking screen: left searches Xero contacts, right searches EMS members. Auto-match engine: email exact match (status: auto-matched-pending) and Levenshtein name match above 0.85 threshold (status: possible-match). Match confirmation/reject UI. Once linked: show Xero invoice panel on member profile. If read-only OFF and package assigned: create draft ACCREC invoice via Xero POST /Invoices.

### PROMPT 4 — Email Platform + Templates + Tokens + Signatures
Build the Email Platform admin section. Rich HTML editor using @tiptap/react with extensions: StarterKit, Link, Image, Table, TextAlign, Color. Toggle between visual editor and raw HTML. Email Template CRUD with categories. Token substitution engine: implement substituteTokens(html, context) function that replaces all 23 tokens from Section 6 with live data. Fallback values for unresolved tokens from settings. Email Signature CRUD: HTML editor, default per group. Append signature to html_body at send time. Bulk email campaign composer: group audience selector, template picker, signature picker, preview with live substitution (test contact selector), schedule or send immediately. Batch SMTP2GO sending (100/call max, BullMQ queued). Email log: smtp2go_email_id per send, status tracking. SMTP2GO bounce webhook at POST /api/webhooks/smtp2go-bounce: add bounced email to suppression list in database. GDPR group unsubscribe: unique URL per member/group, one-click unsubscribe sets GroupMembership.unsubscribedAt.

### PROMPT 5 — Referrals Module
Build the Referrals module at /admin/referrals. New Introduction screen: two independent search panels side by side. Each searches KeapContactCache and EMS User records by name, email, or company. Contact card preview shows: name, company, email, Keap tags, group memberships, events attended. Eventbrite event dropdown: fetch completed events from GET /organizations/{id}/events?status=completed (use stored Eventbrite token). Selected event populates IntroEventTitle and IntroEventDate tokens. Template selector (Referral category templates). Personal note textarea. Live email preview with all tokens substituted. Duplicate warning: check Referral table for existing pair before send. Send via SMTP2GO with both recipients in To field. Log to Referral table with eventbriteEventId, eventTitle, eventDate, smtp2goEmailId. Referrals history table: searchable/filterable, shows open status from SMTP2GO. Post-event batch: from Event detail page, add Introduce button next to attendee pairs that opens Referrals with both pre-filled.

### PROMPT 6 — Graph API Inbox + AI Ticketing
Build the Microsoft Graph API inbox integration. OAuth 2.0 flow with scopes from Section 3. Store access and refresh tokens encrypted in IntegrationSetting. BullMQ job polls every 2 minutes: GET /users/{mailbox}/mailFolders/Inbox/messages?$filter=isRead eq false&$top=20. For each new message: create Ticket record, move original to Deleted Items via POST /users/{mailbox}/messages/{id}/move {destinationId: "deleteditems"}. On ticket creation: call Claude API (claude-sonnet-4-6) with system prompt "You are a friendly assistant for IWant2Network, a London business networking organisation run by Lizzy. Draft a warm, professional reply to this enquiry email. Keep it concise, helpful and on-brand." + email body. Store response in Ticket.aiDraft. Ticketing UI at /admin/inbox: ticket list with status badges and unread count in nav. Ticket detail: full email HTML, AI draft display with Use Draft / Edit / Discard buttons, reply composer (send via Graph API Mail.Send.Shared), internal notes. Status workflow: new → open → ai-draft-ready → replied → closed. Assign ticket to group or tag with category.

### PROMPT 7 — Event Attendance Sheet PDF
Build the Event Attendance Sheet generator. For a given event (in-person type): (1) Fetch all active GroupMembership users for the event's group. (2) Fetch Eventbrite attendees for the event via GET /events/{eventbriteEventId}/attendees. Identify visitors: attendees whose email does NOT match any GroupMembership user. Merge: Section 1 = Group Members (alphabetical by firstName), Section 2 = Visitors (alphabetical). Generate PDF using Puppeteer with this layout: header (IWant2Network logo placeholder, event title, date formatted as "Tuesday 10 March 2026", time, venue, group name), optional AI-generated welcome note (call Claude API: "Write a 2-sentence welcoming introduction for the [GroupName] networking event on [date]"), attendance table with columns: Name | Company | Role / Industry | Website | Notes (blank — wide column for handwriting), section divider between Members and Visitors, footer with date and page numbers. API route: GET /api/events/{id}/attendance-sheet → streams PDF. Store in R2 as {YYYYMMDD}-{GroupSlug}-AttendanceSheet.pdf. BullMQ cron: at 18:00 daily, find all in-person events tomorrow, generate PDF, email Lizzy with download link via SMTP2GO.

### PROMPT 8 — Calendars + Member Portal + Admin Dashboard
Build: (1) Per-group iCal feed at GET /api/calendar/[slug]/feed.ics using ical-generator — all upcoming published events for the group. Dynamic, never cached. (2) Public all-groups feed at GET /api/calendar/public/feed.ics — all published events across all groups with calendarVisibility = public. (3) Per-member personalised feed at GET /api/calendar/member/[icalToken]/feed.ics — all events across member's groups. Events the member is registered for (has Attendee record): PARTSTAT=ACCEPTED. Others: PARTSTAT=TENTATIVE. Use CalendarFeed.icalToken as auth. Member portal pages: /portal/dashboard (upcoming events across groups), /portal/groups/[slug] (group events + subscribe button + private iCal URL), /portal/calendar (public all-groups view with filter, subscribe to public feed button), /portal/events/[id] (event detail, Eventbrite link, download .ics button), /portal/profile (prefs, per-group unsubscribe, personalised calendar URL). Admin dashboard at /admin: stats overview, Tomorrow's Events panel (in-person events next day with Download Attendance Sheet button), inbox unread badge in nav, pipeline summary card, recent referrals, integration status cards for all 6 integrations.

---

## 11. Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://ems:password@localhost:5432/ems

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Encryption (for integration credentials)
ENCRYPTION_KEY=  # 32-byte hex string

# Redis
REDIS_URL=redis://localhost:6379

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=  # Lizzy's email for system notifications
```

All integration API keys and OAuth tokens are stored encrypted in the database (IntegrationSetting table) — NOT in .env files. They are configured through Settings > Integrations in the admin UI.

---

## 12. Folder Structure (Suggested)

```
/app
  /admin          — admin portal pages
    /dashboard
    /groups
    /events
    /pipeline
    /packages
    /referrals
    /inbox
    /email
    /xero
    /settings
  /portal         — member portal pages
  /api
    /webhooks
      /eventbrite
      /smtp2go-bounce
    /webhooks
    /calendar
    /admin
    /portal
/lib
  /integrations
    smtp2go.ts
    keap.ts
    eventbrite.ts
    xero.ts
    graph.ts
    claude.ts
    openai.ts
    base.ts       — IntegrationService base class with readOnly check
  /email
    templates.ts
    tokens.ts
    signatures.ts
  /calendar
    ical.ts
  /pdf
    attendanceSheet.ts
  /jobs
    reminders.ts
    keapSync.ts
    eventbriteSync.ts
    inboxPoll.ts
    attendanceSheetCron.ts
/prisma
  schema.prisma
```

---

*Spec version 3.0 | Sona IT | March 2026*
