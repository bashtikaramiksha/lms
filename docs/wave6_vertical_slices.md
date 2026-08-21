# 🌊 Wave 6 — Vertical Slices
## LMS Platform · Live Classes

> **Target Date:** December 22, 2026
> **Theme:** Full live class delivery engine — Zoom & Google Meet integration, Teacher OAuth account linking, session scheduling, student join flow, and automated email/in-app reminders via Inngest.
> **Definition of Done:** All 5 slices pass unit and integration tests. A Teacher can connect their Zoom or Google account, schedule a live session, and see a "Start Class" button at the right time. An enrolled Student sees a "Join Class" button that activates within a ±15-minute window of session start. Pre-session email reminders are delivered reliably via Inngest. Session status transitions (SCHEDULED → LIVE → ENDED) are accurate.

---

## Table of Contents

1. [Slice 6.1 — Teacher OAuth Account Connection (Zoom & Google)](#slice-61--teacher-oauth-account-connection-zoom--google)
2. [Slice 6.2 — Live Session Scheduling (Teacher)](#slice-62--live-session-scheduling-teacher)
3. [Slice 6.3 — Session Management & Teacher Dashboard](#slice-63--session-management--teacher-dashboard)
4. [Slice 6.4 — Student Join Flow & Live Session Access](#slice-64--student-join-flow--live-session-access)
5. [Slice 6.5 — Email & In-App Reminders (Inngest Automation)](#slice-65--email--in-app-reminders-inngest-automation)
6. [Wave 6 Shared Infrastructure](#wave-6-shared-infrastructure)

---

## Slice 6.1 — Teacher OAuth Account Connection (Zoom & Google)

### Goal

Before a Teacher can schedule a live session using Zoom or Google Meet, they must connect their third-party account. This slice implements the **OAuth 2.0 PKCE connection flow** for both providers — separate from the login flow — and stores the resulting access/refresh tokens encrypted in Turso. The Teacher's profile page at `/teacher/settings` shows which platforms are connected and allows disconnection. The admin panel can also view the connection status per Teacher.

---

### Database — New Columns on `users`

```typescript
// lib/db/schema/users.ts (additive columns)

// Zoom OAuth tokens (encrypted at rest)
zoomAccessToken:   text('zoom_access_token'),
zoomRefreshToken:  text('zoom_refresh_token'),
zoomTokenExpiry:   text('zoom_token_expiry'),   // ISO 8601
zoomUserId:        text('zoom_user_id'),          // Zoom's internal user ID

// Google OAuth tokens (for Meet/Calendar)
googleAccessToken:  text('google_access_token'),
googleRefreshToken: text('google_refresh_token'),
googleTokenExpiry:  text('google_token_expiry'),
```

**Migration:**
```sql
-- drizzle/migrations/0008_live_oauth_tokens.sql
ALTER TABLE users ADD COLUMN zoom_access_token   TEXT;
ALTER TABLE users ADD COLUMN zoom_refresh_token  TEXT;
ALTER TABLE users ADD COLUMN zoom_token_expiry   TEXT;
ALTER TABLE users ADD COLUMN zoom_user_id        TEXT;
ALTER TABLE users ADD COLUMN google_access_token  TEXT;
ALTER TABLE users ADD COLUMN google_refresh_token TEXT;
ALTER TABLE users ADD COLUMN google_token_expiry  TEXT;
```

> **Security note:** Access and refresh tokens are AES-256-GCM encrypted before being written to Turso using a `TOKEN_ENCRYPTION_KEY` environment variable. They are decrypted only inside the `LiveSessionService` at call time — never exposed over the API.

---

### API

#### `GET /api/teacher/integrations` — Get Connected Platforms

**Auth:** Required. Role: `TEACHER` or `ADMIN`.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "zoom":        { "connected": true,  "email": "teacher@zoom.example" },
    "googleMeet":  { "connected": false, "email": null }
  }
}
```

---

#### `GET /api/auth/zoom` — Initiate Zoom OAuth

**Auth:** Required. Role: `TEACHER`.

Redirects to Zoom's OAuth authorization URL with PKCE `code_challenge`. On callback, Zoom redirects to `/api/auth/zoom/callback`.

**Query params sent to Zoom:**
```
response_type=code
client_id={ZOOM_CLIENT_ID}
redirect_uri={NEXT_PUBLIC_SITE_URL}/api/auth/zoom/callback
code_challenge={pkce_challenge}
code_challenge_method=S256
state={csrf_token}
```

---

#### `GET /api/auth/zoom/callback` — Zoom OAuth Callback

**Auth:** Session must exist (server checks cookie).

**Flow:**
1. Validate `state` to prevent CSRF.
2. Exchange `code` for `access_token` + `refresh_token` via `POST https://zoom.us/oauth/token`.
3. Fetch Zoom user info: `GET https://api.zoom.us/v2/users/me`.
4. Encrypt tokens and store in `users` table via Drizzle.
5. Redirect to `/teacher/settings?zoom=connected`.

**Errors:**
| Code | Status | Meaning |
|------|--------|---------|
| `ZOOM_STATE_MISMATCH` | 400 | CSRF state token doesn't match |
| `ZOOM_TOKEN_EXCHANGE_FAILED` | 502 | Zoom token endpoint returned an error |

---

#### `DELETE /api/teacher/integrations/zoom` — Disconnect Zoom

**Auth:** Required. Role: `TEACHER`.

Clears `zoomAccessToken`, `zoomRefreshToken`, `zoomTokenExpiry`, `zoomUserId` for the requesting user.

**Response `200`:**
```json
{ "success": true, "data": { "disconnected": "zoom" } }
```

---

#### `GET /api/auth/google-meet` — Initiate Google OAuth (Meet Scope)

**Auth:** Required. Role: `TEACHER`.

> This is a **separate** OAuth flow from the Google login provider. It requests the `calendar.events` scope in addition to basic profile scopes.

**Scopes requested:**
```
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/userinfo.email
```

Redirects to Google consent → callback at `/api/auth/google-meet/callback`.

---

#### `GET /api/auth/google-meet/callback` — Google Meet OAuth Callback

Mirrors the Zoom callback: validates state, exchanges code for tokens, stores encrypted in `users`.

**Redirect:** `/teacher/settings?google=connected`.

---

#### `DELETE /api/teacher/integrations/google-meet` — Disconnect Google Meet

**Response `200`:**
```json
{ "success": true, "data": { "disconnected": "googleMeet" } }
```

---

### Service Layer

```typescript
// lib/services/live-oauth.service.ts
import { encrypt, decrypt } from '@/lib/crypto'   // AES-256-GCM helper

export class LiveOAuthService {
  async getIntegrationStatus(userId: string): Promise<IntegrationStatusDto> {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user) throw new NotFoundError('USER_NOT_FOUND')
    return {
      zoom:       { connected: !!user.zoomAccessToken,  email: user.zoomUserId },
      googleMeet: { connected: !!user.googleAccessToken, email: null },
    }
  }

  async saveZoomTokens(userId: string, code: string, codeVerifier: string): Promise<void> {
    // 1. Exchange code → tokens
    const tokens = await exchangeZoomCode(code, codeVerifier)

    // 2. Fetch Zoom user ID
    const zoomUser = await fetchZoomUser(tokens.access_token)

    // 3. Encrypt and persist
    await db.update(users).set({
      zoomAccessToken:  encrypt(tokens.access_token),
      zoomRefreshToken: encrypt(tokens.refresh_token),
      zoomTokenExpiry:  new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      zoomUserId:       zoomUser.id,
    }).where(eq(users.id, userId))
  }

  async getDecryptedZoomToken(userId: string): Promise<string> {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) })
    if (!user?.zoomAccessToken) throw new UnprocessableError('ZOOM_NOT_CONNECTED')

    // Refresh if expired
    if (new Date(user.zoomTokenExpiry!) < new Date()) {
      return this.refreshZoomToken(userId, user)
    }
    return decrypt(user.zoomAccessToken)
  }

  private async refreshZoomToken(userId: string, user: UserRecord): Promise<string> {
    const newTokens = await refreshZoomAccessToken(decrypt(user.zoomRefreshToken!))
    await db.update(users).set({
      zoomAccessToken: encrypt(newTokens.access_token),
      zoomTokenExpiry: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
    }).where(eq(users.id, userId))
    return newTokens.access_token
  }

  async disconnectZoom(userId: string): Promise<void> {
    await db.update(users).set({
      zoomAccessToken: null, zoomRefreshToken: null,
      zoomTokenExpiry: null, zoomUserId: null,
    }).where(eq(users.id, userId))
  }
}
```

**AES-256-GCM helper (lib/crypto.ts):**
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const KEY = Buffer.from(process.env.TOKEN_ENCRYPTION_KEY!, 'hex') // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('hex')}.${tag.toString('hex')}.${encrypted.toString('hex')}`
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split('.')
  const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8')
}
```

---

### Frontend

#### Routes
- `/teacher/settings` → `src/app/(teacher)/settings/page.tsx` — Integration management panel

#### Components

```
src/components/teacher/settings/
├── TeacherSettingsPage.tsx        # Tabbed settings: Profile, Integrations, Notifications
├── IntegrationsTab.tsx            # Cards for each platform: Zoom, Google Meet
├── PlatformConnectionCard.tsx     # Shared card: logo, connection status badge, Connect/Disconnect button
└── OAuthRedirectHandler.tsx       # Client component: reads ?zoom=connected query param, shows toast
```

**`PlatformConnectionCard` — example rendering:**
```tsx
<PlatformConnectionCard
  platform="zoom"
  connected={integrations.zoom.connected}
  email={integrations.zoom.email}
  onConnect={() => router.push('/api/auth/zoom')}
  onDisconnect={() => disconnectMutation.mutate('zoom')}
/>
```

---

### Tests

#### Unit — `LiveOAuthService`
```typescript
describe('LiveOAuthService.getDecryptedZoomToken', () => {
  it('decrypts and returns token when not expired')
  it('calls refreshZoomToken when token is expired')
  it('throws ZOOM_NOT_CONNECTED when zoomAccessToken is null')
})

describe('LiveOAuthService.saveZoomTokens', () => {
  it('encrypts access and refresh tokens before storing')
  it('stores the zoom user ID from the /me endpoint')
})

describe('encrypt / decrypt', () => {
  it('round-trips any ASCII string correctly')
  it('produces different ciphertext for the same plaintext on each call (random IV)')
  it('throws on tampered ciphertext (auth tag mismatch)')
})
```

#### Integration — OAuth Callback Routes
```typescript
describe('GET /api/auth/zoom/callback', () => {
  it('returns 400 when state does not match')
  it('returns 502 when Zoom token exchange fails')
  it('redirects to /teacher/settings?zoom=connected on success')
  it('encrypts tokens before writing to DB (raw DB value is not plaintext)')
})

describe('DELETE /api/teacher/integrations/zoom', () => {
  it('returns 401 when unauthenticated')
  it('returns 403 when role is STUDENT or ADMIN')
  it('clears all Zoom columns to null')
})
```

---

### Definition of Done

- [ ] Teacher can initiate Zoom OAuth from `/teacher/settings` and land back with a "Connected" status
- [ ] Teacher can initiate Google Meet OAuth and land back with a "Connected" status
- [ ] Tokens are AES-256-GCM encrypted before writing to Turso — verified by inspecting raw DB value
- [ ] Token refresh is attempted automatically when the stored token is within 5 minutes of expiry
- [ ] Teacher can disconnect either platform — status reverts to "Not connected"
- [ ] Disconnecting a platform does not affect live sessions already scheduled with that platform
- [ ] All unit and integration tests pass

---

## Slice 6.2 — Live Session Scheduling (Teacher)

### Goal

A Teacher with at least one connected platform can schedule a live session from within a **LIVE-type course's** curriculum builder. Sessions are created via the `POST /api/live/sessions` endpoint, which calls the appropriate third-party API (Zoom or Google Calendar) and stores the returned `joinUrl` / `hostUrl`. The session appears in the course's lesson plan as a `LIVE_SESSION` lesson type. Validation prevents scheduling in the past or outside a 24-hour minimum lead time.

---

### Database — No New Tables

Uses existing `live_sessions` table (defined in architecture doc):

```typescript
// Already defined in lib/db/schema/lessons.ts
export const liveSessions = sqliteTable('live_sessions', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  lessonId:     text('lesson_id').references(() => lessons.id),
  courseId:     text('course_id').references(() => courses.id),
  teacherId:    text('teacher_id').references(() => users.id),
  title:        text('title'),
  scheduledAt:  text('scheduled_at').notNull(),   // ISO 8601
  duration:     integer('duration').notNull(),     // minutes
  platform:     text('platform', { enum: ['ZOOM', 'GOOGLE_MEET'] }),
  joinUrl:      text('join_url'),
  hostUrl:      text('host_url'),
  status:       text('status', { enum: ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'] }).default('SCHEDULED'),
  recordingUrl: text('recording_url'),
  createdAt:    text('created_at').$defaultFn(() => new Date().toISOString()),
})
```

**Migration — DB index:**
```sql
-- drizzle/migrations/0009_live_sessions_index.sql
CREATE INDEX idx_live_sessions_teacher ON live_sessions(teacher_id);
CREATE INDEX idx_live_sessions_course  ON live_sessions(course_id);
CREATE INDEX idx_live_sessions_status  ON live_sessions(status);
```

---

### API

#### `POST /api/live/sessions` — Schedule a Live Session

**Auth:** Required. Role: `TEACHER` or `ADMIN`.

**Request (Zod schema):**
```typescript
// lib/validations/live.schema.ts
export const createLiveSessionSchema = z.object({
  courseId:    z.string().uuid(),
  lessonId:    z.string().uuid().optional(),      // attach to an existing LIVE_SESSION lesson
  title:       z.string().min(3).max(200),
  scheduledAt: z.string().datetime(),             // must be ≥ 1 hour from now
  duration:    z.number().int().min(15).max(480), // 15 min – 8 hours
  platform:    z.enum(['ZOOM', 'GOOGLE_MEET']),
}).refine(
  (d) => new Date(d.scheduledAt) > new Date(Date.now() + 60 * 60 * 1000),
  { message: 'Session must be scheduled at least 1 hour in the future', path: ['scheduledAt'] }
)
```

**Server-side flow:**
1. Verify Teacher owns the course (or is Admin).
2. Check Teacher has the requested platform connected.
3. Call Zoom or Google Calendar API to create meeting → get `joinUrl` / `hostUrl`.
4. Insert `live_sessions` row.
5. If `lessonId` provided, update `lessons.type = 'LIVE_SESSION'` and link session.
6. Trigger `inngest.send('live/session-created', { sessionId, teacherId, courseId })`.

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id":          "uuid",
    "title":       "Introduction to React — Live Q&A",
    "scheduledAt": "2026-12-20T14:00:00Z",
    "duration":    60,
    "platform":    "ZOOM",
    "joinUrl":     "https://zoom.us/j/123456789",
    "hostUrl":     "https://zoom.us/s/123456789?zak=...",
    "status":      "SCHEDULED"
  }
}
```

**Errors:**
| Code | Status | Meaning |
|------|--------|---------|
| `COURSE_NOT_FOUND` | 404 | Course doesn't exist or Teacher doesn't own it |
| `ZOOM_NOT_CONNECTED` | 422 | Teacher hasn't connected Zoom but selected Zoom |
| `GOOGLE_NOT_CONNECTED` | 422 | Teacher hasn't connected Google but selected Google Meet |
| `SCHEDULED_IN_PAST` | 422 | `scheduledAt` is less than 1 hour from now |
| `ZOOM_API_ERROR` | 502 | Zoom API call failed (with `details` field) |
| `GOOGLE_API_ERROR` | 502 | Google Calendar API call failed |

---

### Service Layer

```typescript
// lib/services/live-session.service.ts
export class LiveSessionService {
  constructor(
    private readonly liveOAuth: LiveOAuthService,
    private readonly zoom: ZoomApiClient,
    private readonly googleMeet: GoogleMeetApiClient,
  ) {}

  async createSession(dto: CreateLiveSessionDto, teacherId: string): Promise<LiveSessionRecord> {
    // 1. Validate course ownership
    const course = await db.query.courses.findFirst({ where: eq(courses.id, dto.courseId) })
    if (!course || (course.authorId !== teacherId && role !== 'ADMIN'))
      throw new NotFoundError('COURSE_NOT_FOUND')

    // 2. Create meeting via third-party API
    let joinUrl: string, hostUrl: string

    if (dto.platform === 'ZOOM') {
      const token = await this.liveOAuth.getDecryptedZoomToken(teacherId)
      const zoomUser = await db.query.users.findFirst({ where: eq(users.id, teacherId) })
      const meeting = await this.zoom.createMeeting(token, zoomUser!.zoomUserId!, {
        topic:      dto.title,
        type:       2,
        start_time: dto.scheduledAt,
        duration:   dto.duration,
        timezone:   'Asia/Kolkata',
        settings:   { waiting_room: false, join_before_host: false },
      })
      joinUrl = meeting.join_url
      hostUrl = meeting.start_url

    } else {
      const token = await this.liveOAuth.getDecryptedGoogleToken(teacherId)
      const event = await this.googleMeet.createCalendarEvent(token, {
        summary:  dto.title,
        start:    { dateTime: dto.scheduledAt, timeZone: 'Asia/Kolkata' },
        end:      { dateTime: addMinutes(dto.scheduledAt, dto.duration), timeZone: 'Asia/Kolkata' },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      })
      joinUrl = event.hangoutLink
      hostUrl = event.hangoutLink   // same URL for Meet host & student
    }

    // 3. Persist
    const [session] = await db.insert(liveSessions).values({
      ...dto,
      teacherId,
      joinUrl,
      hostUrl,
    }).returning()

    // 4. Inngest: schedule reminders
    await inngest.send({ name: 'live/session-created', data: { sessionId: session.id } })

    return session
  }
}
```

**`ZoomApiClient` (lib/integrations/zoom.client.ts):**
```typescript
export class ZoomApiClient {
  async createMeeting(accessToken: string, userId: string, body: ZoomMeetingInput): Promise<ZoomMeeting> {
    const res = await fetch(`https://api.zoom.us/v2/users/${userId}/meetings`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (!res.ok) throw new BadGatewayError('ZOOM_API_ERROR', await res.json())
    return res.json()
  }
}
```

**`GoogleMeetApiClient` (lib/integrations/google-meet.client.ts):**
```typescript
export class GoogleMeetApiClient {
  async createCalendarEvent(accessToken: string, body: GoogleCalendarEventInput): Promise<GoogleCalendarEvent> {
    const res = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method:  'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }
    )
    if (!res.ok) throw new BadGatewayError('GOOGLE_API_ERROR', await res.json())
    return res.json()
  }
}
```

---

### Frontend

#### Routes
- `/teacher/courses/[id]/sessions/new` → `src/app/(teacher)/courses/[id]/sessions/new/page.tsx`

#### Components

```
src/components/teacher/live/
├── ScheduleSessionPage.tsx      # Shell: header, back button, form
├── ScheduleSessionForm.tsx      # Full scheduling form with react-hook-form + Zod
├── PlatformPicker.tsx           # Radio group: Zoom card | Google Meet card (shows connection status)
├── SessionDateTimePicker.tsx    # shadcn/ui DatePicker + TimePicker (IST timezone)
├── DurationPicker.tsx           # Select: 15m, 30m, 45m, 1h, 1.5h, 2h, 3h, custom
└── SessionConfirmationCard.tsx  # Read-only summary shown after successful creation
```

**`ScheduleSessionForm` — key validation:**
```typescript
// Prevent past date selection in the date picker
const minDateTime = addHours(new Date(), 1)

// Warn if platform is not connected
const platformStatus = useIntegrations()  // TanStack Query

if (selectedPlatform === 'ZOOM' && !platformStatus.zoom.connected) {
  return <ConnectPlatformAlert platform="Zoom" href="/teacher/settings" />
}
```

---

### Tests

#### Unit — `LiveSessionService.createSession`
```typescript
describe('LiveSessionService.createSession', () => {
  it('throws COURSE_NOT_FOUND when course does not belong to the requesting teacher')
  it('throws ZOOM_NOT_CONNECTED when ZOOM is selected but teacher has no token')
  it('throws GOOGLE_NOT_CONNECTED when GOOGLE_MEET is selected but teacher has no token')
  it('calls ZoomApiClient.createMeeting with correct payload for ZOOM sessions')
  it('calls GoogleMeetApiClient.createCalendarEvent with correct payload for GOOGLE_MEET sessions')
  it('persists joinUrl and hostUrl returned from Zoom API')
  it('uses the same URL for both joinUrl and hostUrl for Google Meet sessions')
  it('fires inngest live/session-created event after successful DB insert')
})
```

#### Integration — `POST /api/live/sessions`
```typescript
describe('POST /api/live/sessions', () => {
  it('returns 401 when unauthenticated')
  it('returns 403 when role is STUDENT')
  it('returns 422 when scheduledAt is less than 1 hour from now')
  it('returns 422 when ZOOM platform is selected but teacher has no Zoom token')
  it('returns 502 when Zoom API returns a non-2xx response')
  it('returns 201 with correct session shape on success (Zoom)')
  it('returns 201 with correct session shape on success (Google Meet)')
})
```

---

### Definition of Done

- [ ] Teacher without a connected platform sees a "Connect Zoom / Google" prompt in the scheduler — cannot submit
- [ ] Session cannot be scheduled less than 1 hour from now — form validation and server validation both enforce this
- [ ] A scheduled session creates a real meeting in Zoom (verifiable via Zoom dashboard)
- [ ] A scheduled session creates a real Google Calendar event with a Meet link
- [ ] `joinUrl` and `hostUrl` are stored correctly in `live_sessions`
- [ ] `live/session-created` Inngest event is fired after successful creation
- [ ] Session appears on the Teacher's session list immediately after creation
- [ ] All unit and integration tests pass

---

## Slice 6.3 — Session Management & Teacher Dashboard

### Goal

The Teacher portal exposes a dedicated **Live Sessions** section at `/teacher/live-sessions` showing all upcoming and past sessions across all their courses. Teachers can edit a session's title/time (if ≥ 2 hours before start), cancel it, and add a `recordingUrl` post-session. A session status machine manages transitions: `SCHEDULED → LIVE → ENDED`. Status transitions to `LIVE` are triggered by an **Inngest cron** that runs every minute. An Inngest step marks sessions as `ENDED` 30 minutes after the scheduled end time.

---

### Database — No New Tables

Reads/writes `live_sessions`. New indexes added in Slice 6.2 migration cover this slice.

---

### Session Status Machine

```
SCHEDULED
  │
  ├── [sessionTime - 5min → sessionTime + 30min] ─→ LIVE   (Inngest cron, every 1 min)
  │
  └── [sessionTime + duration + 30min]            ─→ ENDED  (Inngest scheduled step)

CANCELLED  (manual — Teacher or Admin)
```

---

### API

#### `GET /api/live/sessions` — List Teacher's Sessions

**Auth:** Required. Role: `TEACHER` or `ADMIN`.

**Query params:** `status` (`SCHEDULED` | `LIVE` | `ENDED` | `CANCELLED`), `courseId`, `page`, `limit`.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id":          "uuid",
      "title":       "React Hooks Deep Dive — Live",
      "scheduledAt": "2026-12-20T14:00:00Z",
      "duration":    60,
      "platform":    "ZOOM",
      "status":      "SCHEDULED",
      "joinUrl":     "https://zoom.us/j/...",
      "hostUrl":     "https://zoom.us/s/...",
      "recordingUrl": null,
      "course":      { "id": "uuid", "title": "Advanced React" },
      "enrolledCount": 28
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20, "hasNext": false }
}
```

---

#### `PATCH /api/live/sessions/:id` — Update Session

**Auth:** Required. Role: `TEACHER` (own sessions only) or `ADMIN`.

**Request (Zod):**
```typescript
export const updateLiveSessionSchema = z.object({
  title:        z.string().min(3).max(200).optional(),
  scheduledAt:  z.string().datetime().optional(),
  duration:     z.number().int().min(15).max(480).optional(),
  recordingUrl: z.string().url().nullable().optional(),
}).refine(
  (d) => !d.scheduledAt || new Date(d.scheduledAt) > new Date(Date.now() + 2 * 60 * 60 * 1000),
  { message: 'Cannot reschedule within 2 hours of session start', path: ['scheduledAt'] }
)
```

**Side effects on reschedule:**
- If `scheduledAt` changed and platform is Zoom: call `PATCH https://api.zoom.us/v2/meetings/{meetingId}` to update meeting time.
- If `scheduledAt` changed and platform is Google Meet: call `PATCH` on the Calendar event.
- Cancel existing Inngest reminder events and re-schedule with updated times.

**Response `200`:**
```json
{ "success": true, "data": { "id": "uuid", "status": "SCHEDULED", "scheduledAt": "2026-12-21T10:00:00Z" } }
```

**Errors:**
| Code | Status | Meaning |
|------|--------|---------|
| `SESSION_NOT_FOUND` | 404 | Session doesn't exist or teacher doesn't own it |
| `SESSION_ALREADY_ENDED` | 409 | Cannot edit an ENDED or CANCELLED session |
| `RESCHEDULE_TOO_LATE` | 422 | Reschedule attempted within 2 hours of original session start |

---

#### `DELETE /api/live/sessions/:id` — Cancel Session

**Auth:** Required. Role: `TEACHER` (own) or `ADMIN`.

**Flow:**
1. Set `status = CANCELLED`.
2. Cancel the meeting via Zoom/Google API (best-effort, non-blocking).
3. Fire `inngest.send('live/session-cancelled', { sessionId })` → triggers cancellation email to enrolled students.

**Response `200`:**
```json
{ "success": true, "data": { "id": "uuid", "status": "CANCELLED" } }
```

**Errors:**
| Code | Status | Meaning |
|------|--------|---------|
| `SESSION_NOT_FOUND` | 404 | Session doesn't exist or teacher doesn't own it |
| `SESSION_ALREADY_LIVE` | 409 | Cannot cancel a session that is currently LIVE |

---

#### `PATCH /api/live/sessions/:id/recording` — Add Recording URL

**Auth:** Required. Role: `TEACHER` (own) or `ADMIN`.

**Request:**
```typescript
z.object({ recordingUrl: z.string().url() })
```

**Response `200`:**
```json
{ "success": true, "data": { "id": "uuid", "recordingUrl": "https://zoom.us/rec/..." } }
```

---

### Inngest — Status Transition Functions

```typescript
// lib/inngest/live.functions.ts

// Cron: run every minute — mark due sessions as LIVE
export const markSessionsLive = inngest.createFunction(
  { id: 'live-mark-sessions-live', concurrency: 1 },
  { cron: '* * * * *' },
  async ({ step }) => {
    const now = new Date()
    const windowStart = new Date(now.getTime() - 5  * 60 * 1000).toISOString()  // -5 min
    const windowEnd   = new Date(now.getTime() + 30 * 60 * 1000).toISOString()  // +30 min

    const due = await step.run('find-due-sessions', () =>
      db.select({ id: liveSessions.id })
        .from(liveSessions)
        .where(and(
          eq(liveSessions.status, 'SCHEDULED'),
          gte(liveSessions.scheduledAt, windowStart),
          lte(liveSessions.scheduledAt, windowEnd),
        ))
    )

    await step.run('mark-live', () =>
      db.update(liveSessions)
        .set({ status: 'LIVE' })
        .where(inArray(liveSessions.id, due.map(s => s.id)))
    )

    return { markedLive: due.length }
  }
)

// Cron: run every 5 minutes — mark sessions ENDED after duration + 30 min buffer
export const markSessionsEnded = inngest.createFunction(
  { id: 'live-mark-sessions-ended', concurrency: 1 },
  { cron: '*/5 * * * *' },
  async ({ step }) => {
    const now = new Date().toISOString()

    // Find LIVE sessions whose (scheduledAt + duration + 30min) <= now
    const ended = await step.run('find-ended-sessions', () =>
      db.select({ id: liveSessions.id, scheduledAt: liveSessions.scheduledAt, duration: liveSessions.duration })
        .from(liveSessions)
        .where(eq(liveSessions.status, 'LIVE'))
    ).then(sessions =>
      sessions.filter(s => {
        const endTime = new Date(s.scheduledAt).getTime() + (s.duration + 30) * 60 * 1000
        return endTime <= new Date(now).getTime()
      })
    )

    if (ended.length) {
      await step.run('mark-ended', () =>
        db.update(liveSessions)
          .set({ status: 'ENDED' })
          .where(inArray(liveSessions.id, ended.map(s => s.id)))
      )
    }

    return { markedEnded: ended.length }
  }
)
```

---

### Frontend

#### Routes
- `/teacher/live-sessions` → `src/app/(teacher)/live-sessions/page.tsx`
- `/teacher/live-sessions/[id]/edit` → `src/app/(teacher)/live-sessions/[id]/edit/page.tsx`

#### Components

```
src/components/teacher/live/
├── LiveSessionsPage.tsx          # Page shell: tab bar (Upcoming / Past), session list
├── LiveSessionCard.tsx           # Card: title, platform badge, date/time, status badge, action buttons
├── SessionStatusBadge.tsx        # SCHEDULED / LIVE (animated pulse) / ENDED / CANCELLED
├── EditSessionForm.tsx           # Reschedule form (title, date/time, duration)
├── AddRecordingForm.tsx          # Simple URL input shown on ENDED sessions
├── CancelSessionDialog.tsx       # Confirmation dialog with enrolled student warning count
└── StartClassButton.tsx          # Large CTA: "Start Class" → opens hostUrl in new tab
```

**`StartClassButton` — state-aware rendering:**
```tsx
export function StartClassButton({ session }: { session: LiveSessionRecord }) {
  const isActive = session.status === 'LIVE' ||
    (session.status === 'SCHEDULED' &&
     Math.abs(differenceInMinutes(new Date(session.scheduledAt), new Date())) <= 10)

  return (
    <Button
      variant={isActive ? 'default' : 'outline'}
      disabled={!isActive}
      onClick={() => window.open(session.hostUrl, '_blank')}
      className={isActive ? 'animate-pulse-subtle' : ''}
    >
      {session.status === 'LIVE' ? '🔴 Class is Live — Start Now' : 'Start Class'}
    </Button>
  )
}
```

---

### Tests

#### Unit — Inngest functions
```typescript
describe('markSessionsLive cron', () => {
  it('marks SCHEDULED sessions within -5 to +30 min window as LIVE')
  it('does not affect sessions outside the window')
  it('does not affect already LIVE or ENDED sessions')
  it('returns count of sessions marked LIVE')
})

describe('markSessionsEnded cron', () => {
  it('marks LIVE sessions as ENDED when (scheduledAt + duration + 30min) has passed')
  it('leaves sessions LIVE when the end buffer has not elapsed yet')
  it('returns count of sessions marked ENDED')
})
```

#### Unit — `LiveSessionService`
```typescript
describe('LiveSessionService.cancelSession', () => {
  it('throws SESSION_ALREADY_LIVE when trying to cancel a LIVE session')
  it('sets status to CANCELLED')
  it('fires live/session-cancelled Inngest event')
})

describe('LiveSessionService.updateSession', () => {
  it('throws RESCHEDULE_TOO_LATE when rescheduling within 2 hours of start')
  it('throws SESSION_ALREADY_ENDED for ENDED sessions')
  it('calls ZoomApiClient to update Zoom meeting time when scheduledAt changes')
})
```

#### Integration — Session Management API
```typescript
describe('GET /api/live/sessions', () => {
  it('returns only the requesting teacher\'s sessions, not other teachers\' sessions')
  it('filters by status param correctly')
  it('includes enrolledCount for each session')
})

describe('PATCH /api/live/sessions/:id', () => {
  it('returns 404 when a teacher tries to update another teacher\'s session')
  it('returns 409 when updating an ENDED session')
  it('returns 422 when rescheduling to within 2 hours of start')
  it('updates Zoom meeting via API when scheduledAt changes')
})

describe('DELETE /api/live/sessions/:id', () => {
  it('returns 409 when session is currently LIVE')
  it('sets status to CANCELLED and fires the cancellation Inngest event')
})
```

---

### Definition of Done

- [ ] Teacher live sessions list shows Upcoming and Past tabs, each with correct sessions
- [ ] Sessions within ±10 minutes of start time display the "Start Class" button as active (pulsing)
- [ ] `LIVE` status badge shows a red animated pulse to indicate class is live
- [ ] Inngest `markSessionsLive` cron marks sessions LIVE within 1 minute of the window opening
- [ ] Inngest `markSessionsEnded` cron marks sessions ENDED within 5 minutes of the end buffer
- [ ] Teacher can cancel a future session — enrolled students receive a cancellation email (Slice 6.5)
- [ ] Teacher can add a `recordingUrl` to an ENDED session — enrolled students see the replay link in their portal
- [ ] Rescheduling updates the Zoom/Google meeting via API
- [ ] All unit and integration tests pass

---

## Slice 6.4 — Student Join Flow & Live Session Access

### Goal

Enrolled students see upcoming live sessions in their dashboard at `/dashboard/live-sessions`. Each session shows a countdown to the next session. A **"Join Class"** button activates within a ±15-minute window of the `scheduledAt` time and redirects to the `joinUrl`. For ENDED sessions that have a `recordingUrl`, a **"Watch Recording"** button appears. Students who are not enrolled see a locked state with a "Enroll to Join" CTA. The join URL endpoint validates enrollment and timing before returning the URL — the `joinUrl` is never exposed in the listing response.

---

### Database — No New Tables

Reads from `live_sessions`, `enrollments`, `courses`, `lessons`.

---

### API

#### `GET /api/live/sessions/upcoming` — Student's Upcoming Sessions

**Auth:** Required. Role: `STUDENT`.

Returns live sessions for all courses the student is actively enrolled in, ordered by `scheduledAt` ASC, limited to sessions in the future or currently `LIVE`.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id":          "uuid",
      "title":       "React Hooks Deep Dive — Live",
      "scheduledAt": "2026-12-20T14:00:00Z",
      "duration":    60,
      "platform":    "ZOOM",
      "status":      "SCHEDULED",
      "course":      { "id": "uuid", "title": "Advanced React", "slug": "advanced-react" },
      "canJoin":     false,
      "joinOpenAt":  "2026-12-20T13:45:00Z"
    }
  ]
}
```

> `joinUrl` is **intentionally omitted** from this response. Students must call `GET /api/live/sessions/:id/join` to get the URL — this endpoint validates enrollment and timing server-side.

---

#### `GET /api/live/sessions/:id/join` — Get Join URL (Student)

**Auth:** Required. Role: `STUDENT`.

**Server-side validation:**
1. Session exists and is `SCHEDULED` or `LIVE`.
2. Student is enrolled in the associated course (enrollment status = `ACTIVE`).
3. Current time is within a ±15-minute window of `scheduledAt`:
   - Window opens: `scheduledAt - 15 min`
   - Window closes: `scheduledAt + duration + 15 min`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "joinUrl":  "https://zoom.us/j/123456789",
    "platform": "ZOOM",
    "expiresAt": "2026-12-20T15:15:00Z"
  }
}
```

**Errors:**
| Code | Status | Meaning |
|------|--------|---------|
| `SESSION_NOT_FOUND` | 404 | Session doesn't exist |
| `NOT_ENROLLED` | 403 | Student is not enrolled in the course |
| `JOIN_WINDOW_NOT_OPEN` | 422 | Current time is before the join window opens |
| `SESSION_ENDED` | 410 | Session has already ended |

---

#### `GET /api/live/sessions/past` — Student's Past Sessions (With Recordings)

**Auth:** Required. Role: `STUDENT`.

Returns ENDED sessions from enrolled courses that have a `recordingUrl`.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id":           "uuid",
      "title":        "React Hooks Deep Dive — Live",
      "scheduledAt":  "2026-12-15T14:00:00Z",
      "duration":     60,
      "platform":     "ZOOM",
      "status":       "ENDED",
      "recordingUrl": "https://zoom.us/rec/share/...",
      "course":       { "title": "Advanced React", "slug": "advanced-react" }
    }
  ]
}
```

---

### Service Layer

```typescript
// lib/services/live-session.service.ts (additions)

async getJoinUrl(sessionId: string, studentId: string): Promise<JoinUrlDto> {
  const session = await db.query.liveSessions.findFirst({ where: eq(liveSessions.id, sessionId) })
  if (!session || session.status === 'CANCELLED') throw new NotFoundError('SESSION_NOT_FOUND')
  if (session.status === 'ENDED') throw new GoneError('SESSION_ENDED')

  // Check enrollment
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.courseId, session.courseId!),
      eq(enrollments.status, 'ACTIVE'),
    )
  })
  if (!enrollment) throw new ForbiddenError('NOT_ENROLLED')

  // Check join window
  const now = Date.now()
  const windowOpen  = new Date(session.scheduledAt).getTime() - 15 * 60 * 1000
  const windowClose = new Date(session.scheduledAt).getTime() + (session.duration + 15) * 60 * 1000

  if (now < windowOpen) throw new UnprocessableError('JOIN_WINDOW_NOT_OPEN')
  if (now > windowClose) throw new GoneError('SESSION_ENDED')

  return {
    joinUrl:  session.joinUrl!,
    platform: session.platform!,
    expiresAt: new Date(windowClose).toISOString(),
  }
}
```

---

### Frontend

#### Routes
- `/dashboard/live-sessions` → `src/app/(dashboard)/live-sessions/page.tsx`
- `/dashboard/live-sessions/[id]` → `src/app/(dashboard)/live-sessions/[id]/page.tsx` — Session detail

#### Components

```
src/components/dashboard/live/
├── LiveSessionsDashboardPage.tsx  # Page: Upcoming tab + Past/Recordings tab
├── UpcomingSessionsList.tsx       # Sorted list with countdown timers
├── UpcomingSessionCard.tsx        # Card: platform badge, title, countdown, Join button
├── SessionCountdown.tsx           # Real-time countdown: "Starts in 2h 15m"
├── JoinClassButton.tsx            # State-aware button — disabled until window opens
├── PastSessionCard.tsx            # ENDED card: date, duration, Watch Recording button
└── EnrollToJoinBanner.tsx         # Shown to non-enrolled visitors on course page
```

**`JoinClassButton` — polling-aware implementation:**
```tsx
'use client'
export function JoinClassButton({ sessionId, scheduledAt, duration }: JoinClassButtonProps) {
  const windowOpen  = new Date(scheduledAt).getTime() - 15 * 60 * 1000
  const windowClose = new Date(scheduledAt).getTime() + (duration + 15) * 60 * 1000
  const now = Date.now()

  const isOpen = now >= windowOpen && now <= windowClose

  // Re-render every 30 seconds so the button activates at the right time
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(interval)
  }, [])

  const joinMutation = useMutation({
    mutationFn: () => fetch(`/api/live/sessions/${sessionId}/join`).then(r => r.json()),
    onSuccess: (data) => window.open(data.data.joinUrl, '_blank'),
  })

  return (
    <Button
      disabled={!isOpen || joinMutation.isPending}
      onClick={() => joinMutation.mutate()}
      variant={isOpen ? 'default' : 'secondary'}
    >
      {isOpen ? '🎥 Join Class' : `Opens at ${format(windowOpen, 'HH:mm')}`}
    </Button>
  )
}
```

**`SessionCountdown` component:**
```tsx
'use client'
export function SessionCountdown({ scheduledAt }: { scheduledAt: string }) {
  const [timeLeft, setTimeLeft] = useState(formatDistanceToNow(new Date(scheduledAt)))
  useEffect(() => {
    const interval = setInterval(() =>
      setTimeLeft(formatDistanceToNow(new Date(scheduledAt), { addSuffix: true })), 1000)
    return () => clearInterval(interval)
  }, [scheduledAt])
  return <span className="text-sm text-muted-foreground">Starts {timeLeft}</span>
}
```

---

### Tests

#### Unit — `LiveSessionService.getJoinUrl`
```typescript
describe('LiveSessionService.getJoinUrl', () => {
  it('throws NOT_ENROLLED when student has no active enrollment')
  it('throws JOIN_WINDOW_NOT_OPEN when called more than 15 minutes before session start')
  it('throws SESSION_ENDED when called more than (duration + 15) minutes after session start')
  it('returns joinUrl and expiresAt when called within the valid window')
  it('throws SESSION_NOT_FOUND for CANCELLED sessions')
})
```

#### Integration — Student Join API
```typescript
describe('GET /api/live/sessions/:id/join', () => {
  it('returns 401 when unauthenticated')
  it('returns 403 when student is not enrolled')
  it('returns 422 when window is not yet open')
  it('returns 410 when session has ended')
  it('returns 200 with joinUrl when within the valid window and enrolled')
  it('does not expose joinUrl in the listing endpoint GET /api/live/sessions/upcoming')
})

describe('GET /api/live/sessions/upcoming', () => {
  it('returns only sessions for courses the student is enrolled in')
  it('excludes CANCELLED and ENDED sessions')
  it('includes canJoin flag and joinOpenAt time')
})
```

---

### Definition of Done

- [ ] Student dashboard shows all upcoming live sessions from enrolled courses with a real-time countdown
- [ ] "Join Class" button is disabled and shows opening time until 15 minutes before the session
- [ ] Clicking "Join Class" calls the `/join` API, which validates enrollment + window, then opens `joinUrl` in a new tab
- [ ] `joinUrl` is never present in the listing response — only returned from the dedicated join endpoint
- [ ] "Watch Recording" button appears on past sessions with a `recordingUrl` and opens in a new tab
- [ ] A non-enrolled student visiting the course page sees a locked state with "Enroll to Join" CTA
- [ ] Button auto-activates without page refresh (30-second re-render tick)
- [ ] All unit and integration tests pass

---

## Slice 6.5 — Email & In-App Reminders (Inngest Automation)

### Goal

Three automated notification flows power the live class communication layer, all implemented as **Inngest event-driven functions**:

1. **Pre-session reminders** (24h and 1h before) — email + in-app notification to all enrolled students.
2. **Cancellation notification** — email to all enrolled students when a session is cancelled.
3. **Recording available** — email to all enrolled students when a Teacher adds a `recordingUrl`.

In-app notifications are stored in a new `notifications` table and surfaced via a bell icon in the student's nav.

---

### Database — New `notifications` Table

```typescript
// lib/db/schema/notifications.ts
export const notifications = sqliteTable('notifications', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:      text('type', {
    enum: ['SESSION_REMINDER', 'SESSION_CANCELLED', 'RECORDING_AVAILABLE', 'COURSE_PURCHASE']
  }).notNull(),
  title:     text('title').notNull(),
  body:      text('body').notNull(),
  actionUrl: text('action_url'),
  isRead:    integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})
```

**Migration:**
```sql
-- drizzle/migrations/0010_notifications.sql
CREATE TABLE notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  action_url TEXT,
  is_read    INTEGER DEFAULT 0,
  created_at TEXT
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
```

---

### API

#### `GET /api/notifications` — Get User's Notifications

**Auth:** Required (any role).

**Query params:** `unreadOnly` (boolean), `page`, `limit`.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id":        "uuid",
      "type":      "SESSION_REMINDER",
      "title":     "Your class starts in 1 hour",
      "body":      "React Hooks Deep Dive starts at 2:00 PM IST.",
      "actionUrl": "/dashboard/live-sessions/uuid",
      "isRead":    false,
      "createdAt": "2026-12-20T13:00:00Z"
    }
  ],
  "meta": { "unreadCount": 3, "total": 10, "hasNext": false }
}
```

---

#### `PATCH /api/notifications/read-all` — Mark All as Read

**Auth:** Required.

**Response `200`:**
```json
{ "success": true, "data": { "markedRead": 3 } }
```

---

#### `PATCH /api/notifications/:id/read` — Mark Single Notification as Read

**Auth:** Required.

**Response `200`:**
```json
{ "success": true, "data": { "id": "uuid", "isRead": true } }
```

---

### Inngest — Notification Functions

```typescript
// lib/inngest/live.functions.ts (continued)

// Triggered by 'live/session-created' event
export const scheduleSessionReminders = inngest.createFunction(
  { id: 'live-schedule-reminders' },
  { event: 'live/session-created' },
  async ({ event, step }) => {
    const { sessionId } = event.data

    const session = await step.run('fetch-session', () =>
      db.query.liveSessions.findFirst({ where: eq(liveSessions.id, sessionId) })
    )
    if (!session) return

    // Get all enrolled students for this course
    const students = await step.run('fetch-enrolled-students', () =>
      db.select({ id: users.id, email: users.email, fullName: users.fullName })
        .from(enrollments)
        .innerJoin(users, eq(enrollments.studentId, users.id))
        .where(and(
          eq(enrollments.courseId, session.courseId!),
          eq(enrollments.status, 'ACTIVE'),
        ))
    )

    const sessionTime = new Date(session.scheduledAt).getTime()

    // Schedule 24h reminder
    await step.sleepUntil('wait-for-24h-reminder', new Date(sessionTime - 24 * 60 * 60 * 1000))
    await step.run('send-24h-reminder', async () => {
      for (const student of students) {
        await sendSessionReminderEmail(student, session, '24 hours')
        await createInAppNotification(student.id, {
          type:      'SESSION_REMINDER',
          title:     'Class tomorrow!',
          body:      `${session.title} starts in 24 hours.`,
          actionUrl: `/dashboard/live-sessions/${session.id}`,
        })
      }
    })

    // Schedule 1h reminder
    await step.sleepUntil('wait-for-1h-reminder', new Date(sessionTime - 60 * 60 * 1000))
    await step.run('send-1h-reminder', async () => {
      for (const student of students) {
        await sendSessionReminderEmail(student, session, '1 hour')
        await createInAppNotification(student.id, {
          type:      'SESSION_REMINDER',
          title:     'Your class starts in 1 hour!',
          body:      `${session.title} starts at ${format(new Date(session.scheduledAt), 'hh:mm a z')}.`,
          actionUrl: `/dashboard/live-sessions/${session.id}`,
        })
      }
    })
  }
)

// Triggered by 'live/session-cancelled' event
export const sendCancellationNotifications = inngest.createFunction(
  { id: 'live-send-cancellation' },
  { event: 'live/session-cancelled' },
  async ({ event, step }) => {
    const { sessionId } = event.data

    const session  = await step.run('fetch-session', () => /* ... */)
    const students = await step.run('fetch-students', () => /* enrolled students */)

    await step.run('send-cancellation-emails', async () => {
      for (const student of students) {
        await resend.emails.send({
          from:    process.env.EMAIL_FROM!,
          to:      student.email,
          subject: `Class Cancelled: ${session.title}`,
          react:   <SessionCancelledEmail session={session} student={student} />,
        })
        await createInAppNotification(student.id, {
          type:  'SESSION_CANCELLED',
          title: 'A class has been cancelled',
          body:  `${session.title} scheduled for ${format(new Date(session.scheduledAt), 'MMM d')} has been cancelled.`,
        })
      }
    })
  }
)

// Triggered by 'live/recording-added' event (fired from PATCH /api/live/sessions/:id/recording)
export const sendRecordingAvailableNotifications = inngest.createFunction(
  { id: 'live-recording-available' },
  { event: 'live/recording-added' },
  async ({ event, step }) => {
    const { sessionId } = event.data
    const session  = await step.run('fetch-session', () => /* ... */)
    const students = await step.run('fetch-students', () => /* enrolled */)

    await step.run('send-recording-emails', async () => {
      for (const student of students) {
        await resend.emails.send({
          from:    process.env.EMAIL_FROM!,
          to:      student.email,
          subject: `Recording Available: ${session.title}`,
          react:   <RecordingAvailableEmail session={session} student={student} />,
        })
        await createInAppNotification(student.id, {
          type:      'RECORDING_AVAILABLE',
          title:     'Recording now available',
          body:      `The recording of ${session.title} is now available.`,
          actionUrl: `/dashboard/live-sessions/${session.id}`,
        })
      }
    })
  }
)
```

---

### Email Templates

```
src/emails/
├── SessionReminderEmail.tsx       # Subject: "Your class starts in {timeUntil}!"
├── SessionCancelledEmail.tsx      # Subject: "Class Cancelled: {session.title}"
└── RecordingAvailableEmail.tsx    # Subject: "Recording Available: {session.title}"
```

**`SessionReminderEmail` — key content blocks:**
- Hero: session title + platform logo (Zoom/Google Meet)
- Session details: date, time (IST), duration
- CTA button: "Join Class" → links to `/dashboard/live-sessions/{id}`
- Footer: course name + unsubscribe notice

---

### Frontend — Notification Bell

#### API integration
```typescript
// hooks/useNotifications.ts
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn:  () => fetch('/api/notifications?unreadOnly=true&limit=10').then(r => r.json()),
    refetchInterval: 30_000,   // poll every 30s for new notifications
  })
}
```

#### Components

```
src/components/shared/
├── NotificationBell.tsx           # Nav bell icon with unread badge count
├── NotificationDropdown.tsx       # Popover: list of recent notifications
└── NotificationItem.tsx           # Single notification row: icon, title, body, time ago, read indicator
```

**`NotificationBell` — badge rendering:**
```tsx
export function NotificationBell() {
  const { data } = useNotifications()
  const unreadCount = data?.meta?.unreadCount ?? 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <NotificationDropdown />
      </PopoverContent>
    </Popover>
  )
}
```

---

### Tests

#### Unit — Inngest functions
```typescript
describe('scheduleSessionReminders', () => {
  it('sleeps until 24 hours before the session for the first reminder')
  it('sleeps until 1 hour before the session for the second reminder')
  it('sends reminder emails to all enrolled active students')
  it('creates in-app notifications for each enrolled student')
  it('does not send reminders to students with EXPIRED or REVOKED enrollments')
})

describe('sendCancellationNotifications', () => {
  it('sends a cancellation email to every enrolled student')
  it('creates SESSION_CANCELLED in-app notifications for each student')
})

describe('sendRecordingAvailableNotifications', () => {
  it('sends a recording available email to all enrolled students')
  it('creates RECORDING_AVAILABLE in-app notifications with correct actionUrl')
})
```

#### Unit — `NotificationService`
```typescript
describe('createInAppNotification', () => {
  it('inserts a notification row with isRead = false')
  it('throws when userId does not exist (FK violation)')
})
```

#### Integration — Notifications API
```typescript
describe('GET /api/notifications', () => {
  it('returns 401 when unauthenticated')
  it('only returns notifications belonging to the requesting user')
  it('filters by unreadOnly=true correctly')
  it('includes unreadCount in meta')
})

describe('PATCH /api/notifications/read-all', () => {
  it('marks all user notifications as isRead = true')
  it('returns count of notifications marked read')
})
```

---

### Definition of Done

- [ ] A student enrolled in a live course receives an email reminder 24 hours before session start
- [ ] A student receives a second email reminder 1 hour before session start
- [ ] In-app notification bell shows unread count and updates every 30 seconds
- [ ] Clicking a notification marks it as read and navigates to the correct page
- [ ] When a Teacher cancels a session, all enrolled students receive a cancellation email within 5 minutes
- [ ] When a Teacher adds a `recordingUrl`, all enrolled students receive a "Recording Available" email
- [ ] Email templates are visually consistent with the platform branding (logo, CTA button, footer)
- [ ] Inngest Reminder steps correctly use `step.sleepUntil` — verified via Inngest dashboard event timeline
- [ ] All unit and integration tests pass

---

## Wave 6 Shared Infrastructure

### New npm Packages

```bash
npm install date-fns @react-email/components
```

| Package | Usage |
|---------|-------|
| `date-fns` | Date arithmetic (`addMinutes`, `differenceInMinutes`, `formatDistanceToNow`, `format`) |
| `@react-email/components` | React-based email template primitives (`Html`, `Button`, `Section`, `Text`, etc.) |

> The `crypto` module used for AES-256-GCM is Node.js built-in — no extra package needed.

---

### New Environment Variables (Wave 6)

```bash
# ── Live Class OAuth ───────────────────────────────────────────
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
ZOOM_REDIRECT_URI=${NEXT_PUBLIC_SITE_URL}/api/auth/zoom/callback

GOOGLE_MEET_CLIENT_ID=...       # Separate OAuth app from Google Login
GOOGLE_MEET_CLIENT_SECRET=...
GOOGLE_MEET_REDIRECT_URI=${NEXT_PUBLIC_SITE_URL}/api/auth/google-meet/callback

# ── Token Encryption ──────────────────────────────────────────
TOKEN_ENCRYPTION_KEY=...        # 64-character hex string (32 bytes AES key)
```

---

### New Inngest Functions (Wave 6)

| Event / Cron | Function ID | Trigger |
|---|---|---|
| `event: live/session-created` | `live-schedule-reminders` | Fires when Teacher schedules a session |
| `event: live/session-cancelled` | `live-send-cancellation` | Fires when Teacher cancels a session |
| `event: live/recording-added` | `live-recording-available` | Fires when Teacher adds a recording URL |
| `cron: * * * * *` | `live-mark-sessions-live` | Every 1 minute — status → LIVE |
| `cron: */5 * * * *` | `live-mark-sessions-ended` | Every 5 minutes — status → ENDED |

---

### New Drizzle Migrations (Wave 6)

| Migration File | Change |
|---|---|
| `0008_live_oauth_tokens.sql` | Adds Zoom + Google OAuth token columns to `users` |
| `0009_live_sessions_index.sql` | Adds indexes on `live_sessions` (teacher_id, course_id, status) |
| `0010_notifications.sql` | Creates `notifications` table + indexes |

```bash
# Run after merging Wave 6
npx drizzle-kit migrate
```

---

### New Integration Client Files (Wave 6)

```
src/lib/
├── crypto.ts                        # AES-256-GCM encrypt / decrypt helpers
└── integrations/
    ├── zoom.client.ts               # ZoomApiClient — createMeeting, updateMeeting, deleteMeeting
    └── google-meet.client.ts        # GoogleMeetApiClient — createCalendarEvent, updateEvent, deleteEvent
```

---

### Wave 6 Route Handler Index

```
src/app/api/
├── teacher/
│   └── integrations/
│       ├── route.ts                 # GET /api/teacher/integrations
│       ├── zoom/route.ts            # DELETE /api/teacher/integrations/zoom
│       └── google-meet/route.ts    # DELETE /api/teacher/integrations/google-meet
│
├── auth/
│   ├── zoom/route.ts                # GET /api/auth/zoom (initiate)
│   ├── zoom/callback/route.ts       # GET /api/auth/zoom/callback
│   ├── google-meet/route.ts         # GET /api/auth/google-meet (initiate)
│   └── google-meet/callback/route.ts
│
├── live/
│   └── sessions/
│       ├── route.ts                 # GET (list teacher), POST (create)
│       ├── upcoming/route.ts        # GET /api/live/sessions/upcoming (student)
│       ├── past/route.ts            # GET /api/live/sessions/past (student)
│       └── [id]/
│           ├── route.ts             # PATCH (update), DELETE (cancel)
│           ├── join/route.ts        # GET /api/live/sessions/:id/join
│           └── recording/route.ts   # PATCH /api/live/sessions/:id/recording
│
└── notifications/
    ├── route.ts                     # GET /api/notifications
    ├── read-all/route.ts            # PATCH /api/notifications/read-all
    └── [id]/read/route.ts           # PATCH /api/notifications/:id/read
```
