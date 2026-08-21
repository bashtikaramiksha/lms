# 🌊 Wave 4 — Vertical Slices
## LMS Platform · Learning Experience

> **Target Date:** November 24, 2026
> **Theme:** The student's world — progress tracking, video playback, teacher analytics, and certificate generation.
> **Definition of Done:** All 4 slices pass unit tests and integration tests. A student can enroll → watch lessons → earn a certificate. A teacher can view real revenue and per-course analytics. All pages are demonstrable end-to-end in staging.

---

## Table of Contents

1. [Slice 4.1 — Student Dashboard](#slice-41--student-dashboard)
2. [Slice 4.2 — Course Video Player & Progress Tracking](#slice-42--course-video-player--progress-tracking)
3. [Slice 4.3 — Teacher Dashboard & Revenue View](#slice-43--teacher-dashboard--revenue-view)
4. [Slice 4.4 — Course Completion Certificate](#slice-44--course-completion-certificate)
5. [Wave 4 Shared Infrastructure](#wave-4-shared-infrastructure)

---

## Slice 4.1 — Student Dashboard

### Goal

Every enrolled student lands on a **personalized home** at `/dashboard` after login. The dashboard surfaces three content sections: **Continue Learning** (in-progress courses, resuming at the last-watched lesson), **Upcoming Live Sessions** (scheduled sessions for their enrolled courses), and **Completed Courses** (courses at 100% progress). Progress bars are calculated from `lesson_progress` aggregated per enrollment. No heavy server computation — the API returns pre-aggregated progress percentages per course.

---

### Database — Queries Used

No new tables are added. This slice reads from the existing `enrollments`, `lesson_progress`, `lessons`, `modules`, `courses`, and `live_sessions` tables created in Waves 1–3.

**Aggregation query (Drizzle):**
```typescript
// lib/services/dashboard.service.ts

// 1. Fetch all active enrollments for the student
const studentEnrollments = await db
  .select({
    enrollmentId: enrollments.id,
    courseId:     enrollments.courseId,
    enrolledAt:   enrollments.enrolledAt,
    expiresAt:    enrollments.expiresAt,
  })
  .from(enrollments)
  .where(
    and(
      eq(enrollments.studentId, userId),
      eq(enrollments.status, 'ACTIVE'),
    )
  )

// 2. For each enrollment, compute progress:
//    progress% = (completed lessons / total lessons) * 100
const progressMap = await db
  .select({
    enrollmentId: lessonProgress.enrollmentId,
    completed:    sql`SUM(CASE WHEN ${lessonProgress.isCompleted} = 1 THEN 1 ELSE 0 END)`,
    total:        sql`COUNT(*)`,
  })
  .from(lessonProgress)
  .where(inArray(lessonProgress.enrollmentId, enrollmentIds))
  .groupBy(lessonProgress.enrollmentId)
```

**Last-watched lesson query:**
```typescript
// Returns the most recently watched, incomplete lesson per enrollment
const lastWatched = await db
  .select({
    enrollmentId:  lessonProgress.enrollmentId,
    lessonId:      lessonProgress.lessonId,
    lastWatchedAt: lessonProgress.lastWatchedAt,
  })
  .from(lessonProgress)
  .where(
    and(
      inArray(lessonProgress.enrollmentId, enrollmentIds),
      eq(lessonProgress.isCompleted, false),
    )
  )
  .orderBy(desc(lessonProgress.lastWatchedAt))
```

---

### API

#### `GET /api/users/me/dashboard` — Student Dashboard Data

**Auth:** Required. Role: `STUDENT`.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "inProgress": [
      {
        "enrollmentId": "uuid",
        "course": {
          "id": "uuid",
          "title": "React Masterclass",
          "slug": "react-masterclass",
          "thumbnailUrl": "https://cdn.yourlms.com/thumbnails/uuid.jpg",
          "instructor": { "fullName": "Jane Smith" }
        },
        "progressPercent": 42,
        "lastLesson": {
          "id": "uuid",
          "title": "useEffect Deep Dive",
          "moduleTitle": "Hooks in Depth"
        },
        "lastWatchedAt": "2026-11-10T09:22:00Z"
      }
    ],
    "upcomingLiveSessions": [
      {
        "sessionId": "uuid",
        "courseTitle": "Node.js Bootcamp",
        "title": "Q&A Session — Week 3",
        "scheduledAt": "2026-11-20T14:00:00Z",
        "platform": "ZOOM",
        "joinUrl": null
      }
    ],
    "completed": [
      {
        "enrollmentId": "uuid",
        "course": {
          "id": "uuid",
          "title": "JavaScript Fundamentals",
          "slug": "javascript-fundamentals",
          "thumbnailUrl": "https://cdn.yourlms.com/thumbnails/uuid.jpg"
        },
        "completedAt": "2026-11-05T16:00:00Z",
        "certificateUrl": "https://cdn.yourlms.com/certs/uuid.pdf"
      }
    ]
  }
}
```

> **Note:** `joinUrl` is `null` until 15 minutes before the session (enforced at the API level to prevent early access).

**Errors:**
| Code | Status | Meaning |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | No valid session |
| `FORBIDDEN` | 403 | Role is not STUDENT |

---

### Service Layer

```typescript
// lib/services/dashboard.service.ts
export class DashboardService {
  async getStudentDashboard(userId: string): Promise<StudentDashboardDto> {
    const activeEnrollments = await this.getActiveEnrollments(userId)
    if (!activeEnrollments.length) return this.emptyDashboard()

    const enrollmentIds = activeEnrollments.map(e => e.enrollmentId)
    const [progressData, lastLessons, courseDetails, upcomingSessions] = await Promise.all([
      this.getProgressPerEnrollment(enrollmentIds),
      this.getLastWatchedLessons(enrollmentIds),
      this.getCourseDetails(activeEnrollments.map(e => e.courseId)),
      this.getUpcomingLiveSessions(userId),
    ])

    return this.buildDashboardResponse(
      activeEnrollments, progressData, lastLessons, courseDetails, upcomingSessions
    )
  }

  private buildDashboardResponse(...): StudentDashboardDto {
    // Partition enrollments into inProgress (0-99%) and completed (100%)
    // Attach lastLesson, progressPercent, certificateUrl per enrollment
    // Sort inProgress by lastWatchedAt desc
    // Limit upcomingLiveSessions to next 5 sessions by scheduledAt asc
  }
}
```

---

### Frontend

#### Route
`/dashboard` → `src/app/(dashboard)/dashboard/page.tsx`

#### Rendering Strategy
**CSR (Client Component)** — protected route behind auth guard. Data fetched client-side via TanStack Query.

#### Components

```
src/components/dashboard/
├── DashboardPage.tsx              # Root page component
├── ContinueLearningSection.tsx    # Horizontal scrollable course cards with progress bar
├── CourseProgressCard.tsx         # Single card: thumbnail, title, progress bar, "Resume" CTA
├── UpcomingSessionsSection.tsx    # Upcoming live session tiles
├── LiveSessionTile.tsx            # Session: title, date, platform badge, countdown
├── CompletedCoursesSection.tsx    # Grid of completed course cards with cert download
└── CompletedCourseCard.tsx        # Thumbnail, completion date, "Download Certificate" button
```

**`CourseProgressCard` — key props:**
```typescript
interface CourseProgressCardProps {
  thumbnailUrl:    string
  title:           string
  instructorName:  string
  progressPercent: number          // 0-100
  lastLessonTitle: string
  resumeHref:      string          // /dashboard/my-courses/:id/lessons/:lessonId
}
```

**Progress bar implementation:**
```tsx
// Uses CSS custom property for animated progress fill
<div className="progress-bar-track">
  <div
    className="progress-bar-fill"
    style={{ '--progress': `${progressPercent}%` } as CSSProperties}
  />
</div>
```

#### TanStack Query Hook
```typescript
// hooks/useDashboard.ts
export function useStudentDashboard() {
  return useQuery({
    queryKey: ['student-dashboard'],
    queryFn:  () => apiClient.get('/api/users/me/dashboard'),
    staleTime: 60 * 1000,   // 1 minute
    refetchOnWindowFocus: true,
  })
}
```

---

### Tests

#### Unit — `DashboardService`
```typescript
describe('DashboardService.getStudentDashboard', () => {
  it('partitions enrollments into inProgress and completed by progressPercent')
  it('returns empty sections when student has no enrollments')
  it('limits upcoming sessions to the next 5 by scheduledAt')
  it('sets joinUrl to null when session is more than 15 minutes away')
  it('sorts inProgress by lastWatchedAt descending')
})
```

#### Integration — `GET /api/users/me/dashboard`
```typescript
describe('GET /api/users/me/dashboard', () => {
  it('returns 401 when unauthenticated')
  it('returns 403 when role is TEACHER')
  it('returns correct dashboard shape for a student with mixed enrollments')
  it('returns empty arrays when student has no enrollments')
})
```

---

### Definition of Done

- [ ] Student logs in and is redirected to `/dashboard`
- [ ] "Continue Learning" section shows all in-progress courses with accurate progress %
- [ ] "Resume" button deep-links to the exact last-watched lesson
- [ ] "Upcoming Live Sessions" section shows correct session data with a countdown
- [ ] "Completed Courses" section shows completed courses with a certificate download link (or "Processing" badge if cert not yet ready)
- [ ] Progress bars animate smoothly on load
- [ ] Page renders a skeleton loader while data is being fetched
- [ ] All unit and integration tests pass

---

## Slice 4.2 — Course Video Player & Progress Tracking

### Goal

Enrolled students navigate to `/dashboard/my-courses/:courseId/lessons/:lessonId` and watch lesson videos with a custom video player. **Progress is tracked automatically** — debounced PATCH calls every 10 seconds send the current `watchPercent` to the API. When `watchPercent >= 80`, the lesson is auto-marked as `isCompleted = true`. The curriculum sidebar shows all modules and lessons with visual completion checkmarks. Clicking any lesson in the sidebar navigates to it. Non-enrolled students are blocked server-side with a 403.

---

### Database — `lesson_progress` Upsert

No new tables. The `lesson_progress` table (defined in Wave 3 infra) is written to via an **upsert** (INSERT OR REPLACE) to avoid duplicate rows.

```typescript
// lib/db/schema/lesson_progress.ts (already exists from Wave 3 infra)
export const lessonProgress = sqliteTable('lesson_progress', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  enrollmentId:  text('enrollment_id').references(() => enrollments.id),
  lessonId:      text('lesson_id').references(() => lessons.id),
  watchPercent:  real('watch_percent').default(0),
  isCompleted:   integer('is_completed', { mode: 'boolean' }).default(false),
  lastWatchedAt: text('last_watched_at'),
})
```

**Drizzle upsert pattern (SQLite `INSERT OR REPLACE`):**
```typescript
await db
  .insert(lessonProgress)
  .values({
    enrollmentId,
    lessonId,
    watchPercent,
    isCompleted:   watchPercent >= 80,
    lastWatchedAt: new Date().toISOString(),
  })
  .onConflictDoUpdate({
    target: [lessonProgress.enrollmentId, lessonProgress.lessonId],
    set: {
      watchPercent:  sql`MAX(excluded.watch_percent, ${lessonProgress.watchPercent})`,
      isCompleted:   sql`CASE WHEN excluded.watch_percent >= 80 THEN 1 ELSE ${lessonProgress.isCompleted} END`,
      lastWatchedAt: sql`excluded.last_watched_at`,
    },
  })
```

> **Important:** `watchPercent` only ever increases (uses `MAX`). Rewinding a video does not lower progress.

---

### API

#### `GET /api/courses/:courseId/lessons/:lessonId` — Get Lesson Data

**Auth:** Required. Enrollment check performed server-side.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "lesson": {
      "id": "uuid",
      "title": "useEffect Deep Dive",
      "type": "VIDEO",
      "videoUrl": "https://cdn.yourlms.com/videos/signed-uuid.mp4",
      "duration": 1842,
      "content": null
    },
    "progress": {
      "watchPercent": 42.5,
      "isCompleted": false,
      "lastWatchedAt": "2026-11-10T09:22:00Z"
    },
    "curriculum": [
      {
        "moduleId": "uuid",
        "moduleTitle": "Hooks in Depth",
        "order": 2,
        "lessons": [
          { "id": "uuid", "title": "useState & Reducers", "type": "VIDEO", "isCompleted": true,  "duration": 1200 },
          { "id": "uuid", "title": "useEffect Deep Dive", "type": "VIDEO", "isCompleted": false, "duration": 1842 },
          { "id": "uuid", "title": "Custom Hooks",        "type": "VIDEO", "isCompleted": false, "duration": 1560 }
        ]
      }
    ],
    "navigation": {
      "prevLesson": { "id": "uuid", "title": "useState & Reducers" },
      "nextLesson":  { "id": "uuid", "title": "Custom Hooks" }
    }
  }
}
```

**Errors:**
| Code | Status | Meaning |
|------|--------|---------|
| `UNAUTHORIZED` | 401 | No session |
| `NOT_ENROLLED` | 403 | Student is not enrolled in this course |
| `LESSON_NOT_FOUND` | 404 | Lesson does not exist or is not part of the course |
| `ENROLLMENT_EXPIRED` | 403 | Enrollment has passed `expiresAt` |

---

#### `PATCH /api/lessons/:lessonId/progress` — Update Watch Progress

**Auth:** Required. Rate-limited to 20 req/min per user to prevent abuse.

**Request (Zod schema):**
```typescript
// lib/validations/progress.schema.ts
export const updateProgressSchema = z.object({
  watchPercent: z.number().min(0).max(100),
  courseId:     z.string().uuid(),  // used to find the correct enrollment
})
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "watchPercent":   83.4,
    "isCompleted":    true,
    "justCompleted":  true,
    "courseCompleted": false
  }
}
```

> `justCompleted: true` signals the client to show a celebratory toast/animation.
> `courseCompleted: true` signals the client to prompt the student to claim their certificate.

**Course completion check (triggered when `isCompleted = true`):**
```typescript
// After marking a lesson complete, check if ALL lessons in the course are done
const allLessons   = await db.query.lessons.findMany({ where: eq(lessons.courseId, courseId) })
const completedIds = await db.query.lessonProgress.findMany({
  where: and(eq(lessonProgress.enrollmentId, enrollmentId), eq(lessonProgress.isCompleted, true))
})
const courseCompleted = completedIds.length === allLessons.length
```

---

#### `POST /api/courses/:courseId/lessons/:lessonId/complete` — Force Mark Complete

Allows students to manually mark a lesson complete (e.g., articles, quizzes that have no watch percent).

**Auth:** Required. Enrollment check performed.

**Request:** `{}` (empty body)

**Response `200`:**
```json
{
  "success": true,
  "data": { "isCompleted": true, "courseCompleted": false }
}
```

---

### Service Layer

```typescript
// lib/services/progress.service.ts
export class ProgressService {
  async updateProgress(dto: UpdateProgressDto): Promise<ProgressResultDto> {
    const enrollment = await this.validateEnrollment(dto.studentId, dto.courseId)
    const previous   = await this.getExistingProgress(enrollment.id, dto.lessonId)

    const newPercent    = Math.max(previous?.watchPercent ?? 0, dto.watchPercent)
    const completed     = newPercent >= 80
    const justCompleted = completed && !(previous?.isCompleted ?? false)

    await this.upsertProgress(enrollment.id, dto.lessonId, newPercent, completed)

    let courseCompleted = false
    if (justCompleted) {
      courseCompleted = await this.checkCourseCompletion(enrollment.id, dto.courseId)
      if (courseCompleted) {
        await inngest.send({
          name: 'certificate/generate',
          data: { userId: dto.studentId, courseId: dto.courseId, enrollmentId: enrollment.id },
        })
      }
    }

    return { watchPercent: newPercent, isCompleted: completed, justCompleted, courseCompleted }
  }
}
```

---

### Frontend

#### Route
`/dashboard/my-courses/[courseId]/lessons/[lessonId]` → `src/app/(dashboard)/my-courses/[courseId]/lessons/[lessonId]/page.tsx`

#### Rendering Strategy
**CSR (Client Component)** — heavy interactivity (video player, progress polling).

#### Components

```
src/components/dashboard/
├── LessonPlayerPage.tsx     # Page-level shell (sidebar + player area)
├── VideoPlayer.tsx          # Custom HTML5 video player (shared component)
├── PlayerControls.tsx       # Play/pause, seek, volume, speed, fullscreen
├── ProgressPoller.tsx       # Invisible component: emits PATCH every 10s
├── CurriculumSidebar.tsx    # Collapsible module/lesson tree
├── LessonListItem.tsx       # Lesson row: checkmark, title, duration, type icon
├── LessonNav.tsx            # Prev / Next lesson navigation bar
└── CompletionToast.tsx      # Celebration toast when lesson completes
```

**`ProgressPoller` — key logic:**
```typescript
// components/dashboard/ProgressPoller.tsx
'use client'

export function ProgressPoller({ lessonId, courseId, videoRef }: ProgressPollerProps) {
  const updateProgress = useMutation({ mutationFn: progressApi.update })

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!videoRef.current) return
      const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100
      if (percent > 0) {
        const result = await updateProgress.mutateAsync({ lessonId, courseId, watchPercent: percent })
        if (result.data.justCompleted)   showCompletionToast()
        if (result.data.courseCompleted) showCourseCompletionModal()
      }
    }, 10_000)  // every 10 seconds

    return () => clearInterval(interval)
  }, [lessonId, courseId, videoRef])
}
```

**Video URL — CloudFront signed URL generation:**
```typescript
// lib/s3.ts
export async function getSignedVideoUrl(s3Key: string): Promise<string> {
  // CloudFront signed URL: expires in 4 hours
  return getSignedUrl({ url: `${process.env.CLOUDFRONT_BASE_URL}/${s3Key}`, expires: 4 * 60 * 60 })
}
```

---

### Tests

#### Unit — `ProgressService`
```typescript
describe('ProgressService.updateProgress', () => {
  it('never decreases watchPercent below the stored value')
  it('sets isCompleted = true when watchPercent >= 80')
  it('sets isCompleted = false when watchPercent < 80 (first write)')
  it('sets justCompleted = true only on the false-to-true transition')
  it('returns courseCompleted = true when all lessons are marked complete')
  it('fires an Inngest certificate/generate event when course is completed')
  it('throws NOT_ENROLLED when student has no active enrollment')
})
```

#### Integration — `PATCH /api/lessons/:lessonId/progress`
```typescript
describe('PATCH /api/lessons/:lessonId/progress', () => {
  it('returns 401 when unauthenticated')
  it('returns 403 when student is not enrolled in the course')
  it('returns 200 and updated progress for a valid request')
  it('returns justCompleted: true when crossing the 80% threshold')
  it('does not fire certificate event when not all lessons are complete')
  it('fires certificate event when the last lesson crosses 80%')
  it('is rate-limited to 20 requests per minute per user')
})
```

---

### Definition of Done

- [ ] Student can load the lesson player page for any enrolled course
- [ ] Video plays from CloudFront signed URL
- [ ] Curriculum sidebar shows all modules and lessons with correct completion checkmarks
- [ ] Progress is sent to the API every 10 seconds while video is playing
- [ ] Rewinding does not reduce stored `watchPercent`
- [ ] Lesson is auto-marked complete at >= 80% watch time
- [ ] A celebratory toast/animation appears upon lesson completion
- [ ] Prev/Next navigation links work correctly across module boundaries
- [ ] Non-enrolled users get a redirect to the course detail page, not a raw 403
- [ ] All unit and integration tests pass

---

## Slice 4.3 — Teacher Dashboard & Revenue View

### Goal

Teachers access a **two-page portal**: the main **Dashboard** (`/teacher/dashboard`) and a dedicated **Revenue** page (`/teacher/revenue`). The Dashboard shows per-course stats: total enrolled students, lesson completion rates, and an aggregate summary card. The Revenue page shows a time-series revenue chart (monthly, via Recharts), a breakdown by course, and an order list. All data is **teacher-scoped** — teachers only see stats for courses they authored.

---

### Database — Aggregation Queries

No new tables for the dashboard stats. The revenue queries introduce an `order_items` table (additive migration) to support per-course revenue attribution.

**Revenue aggregation (Drizzle):**
```typescript
// lib/services/teacher-stats.service.ts

// Monthly revenue aggregation
const monthlyRevenue = await db
  .select({
    month:   sql`strftime('%Y-%m', ${orders.createdAt})`,
    revenue: sql`SUM(${orders.totalAmount} - COALESCE(${orders.discountAmount}, 0))`,
    count:   sql`COUNT(*)`,
  })
  .from(orders)
  .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
  .innerJoin(courses,    eq(orderItems.courseId, courses.id))
  .where(
    and(
      eq(courses.authorId, teacherId),
      eq(orders.status, 'COMPLETED'),
      gte(orders.createdAt, startOf12MonthsAgo),
    )
  )
  .groupBy(sql`strftime('%Y-%m', ${orders.createdAt})`)
  .orderBy(sql`strftime('%Y-%m', ${orders.createdAt})`)
```

**New schema addition — `order_items`:**
```typescript
// lib/db/schema/orders.ts — additive migration (non-breaking)
export const orderItems = sqliteTable('order_items', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId:   text('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  courseId:  text('course_id').notNull().references(() => courses.id),
  price:     real('price').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})
```

> Wave 3 checkout handlers must be updated to also insert rows into `order_items` when processing a completed order. This is a non-breaking additive change.

---

### API

#### `GET /api/teacher/stats` — Teacher Dashboard Stats

**Auth:** Required. Role: `TEACHER`.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalStudents":     248,
      "totalRevenue":      12450.00,
      "totalCourses":      5,
      "publishedCourses":  4,
      "avgCompletionRate": 67.3
    },
    "courses": [
      {
        "id":               "uuid",
        "title":            "React Masterclass",
        "slug":             "react-masterclass",
        "thumbnailUrl":     "https://cdn.yourlms.com/thumbnails/uuid.jpg",
        "status":           "PUBLISHED",
        "enrolledStudents": 112,
        "completionRate":   74.2,
        "totalRevenue":     5560.00,
        "rating":           4.8,
        "reviewCount":      34
      }
    ],
    "recentEnrollments": [
      {
        "studentName": "Alice Johnson",
        "avatarUrl":   "https://...",
        "courseTitle": "React Masterclass",
        "enrolledAt":  "2026-11-18T14:22:00Z"
      }
    ]
  }
}
```

---

#### `GET /api/teacher/revenue` — Revenue Analytics

**Auth:** Required. Role: `TEACHER`.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period` | `'7d' \| '30d' \| '90d' \| '12m'` | `'12m'` | Time range for the chart |
| `courseId` | `string (uuid)` | (none) | Filter to a single course |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "totalRevenue":  12450.00,
    "periodRevenue": 3200.00,
    "periodOrders":  64,
    "chart": [
      { "period": "2026-10", "revenue": 2100.00, "orders": 42 },
      { "period": "2026-11", "revenue": 1100.00, "orders": 22 }
    ],
    "byCourse": [
      {
        "courseId":   "uuid",
        "title":      "React Masterclass",
        "revenue":    8000.00,
        "orders":     160,
        "percentage": 64.3
      }
    ],
    "recentOrders": [
      {
        "orderId":     "uuid",
        "studentName": "Bob Lee",
        "courseTitle": "React Masterclass",
        "amount":      49.99,
        "gateway":     "STRIPE",
        "createdAt":   "2026-11-18T10:05:00Z"
      }
    ]
  }
}
```

---

### Service Layer

```typescript
// lib/services/teacher-stats.service.ts
export class TeacherStatsService {
  async getDashboardStats(teacherId: string): Promise<TeacherDashboardDto> {
    const [summary, courses, recentEnrollments] = await Promise.all([
      this.getAggregateSummary(teacherId),
      this.getCourseBreakdown(teacherId),
      this.getRecentEnrollments(teacherId, 5),
    ])
    return { summary, courses, recentEnrollments }
  }

  async getRevenue(teacherId: string, period: RevenuePeriod, courseId?: string): Promise<TeacherRevenueDto> {
    const [chart, byCourse, recentOrders] = await Promise.all([
      this.getRevenueChart(teacherId, period, courseId),
      this.getRevenueByCourse(teacherId, period),
      this.getRecentOrders(teacherId, 10),
    ])
    return {
      totalRevenue:  await this.getTotalRevenue(teacherId),
      periodRevenue: chart.reduce((sum, p) => sum + p.revenue, 0),
      periodOrders:  chart.reduce((sum, p) => sum + p.orders, 0),
      chart,
      byCourse,
      recentOrders,
    }
  }
}
```

---

### Frontend

#### Routes
- `/teacher/dashboard` → `src/app/(teacher)/dashboard/page.tsx`
- `/teacher/revenue` → `src/app/(teacher)/revenue/page.tsx`

#### Rendering Strategy
**CSR (Client Components)** — data is private and user-specific; Recharts requires browser APIs.

#### Components

```
src/components/teacher/
├── TeacherDashboardPage.tsx    # Main dashboard layout
├── StatsSummaryBar.tsx         # 4 KPI cards: students, revenue, courses, avg completion
├── CourseStatCard.tsx          # Per-course card: thumbnail, enrolled count, completion%, revenue
├── RecentEnrollmentsList.tsx   # Latest 5 enrollments (avatar, name, course, date)
│
├── TeacherRevenuePage.tsx      # Revenue analytics layout
├── RevenuePeriodSelector.tsx   # 7d / 30d / 90d / 12m toggle
├── RevenueLineChart.tsx        # Recharts LineChart for time-series revenue
├── RevenueByCourseTable.tsx    # Course breakdown table with mini progress bars
└── RecentOrdersTable.tsx       # Paginated order list (student, course, amount, gateway)
```

**`RevenueLineChart` — Recharts implementation:**
```tsx
// components/teacher/RevenueLineChart.tsx
'use client'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function RevenueLineChart({ data }: { data: ChartPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="period" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`} />
        <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, 'Revenue']} />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

#### TanStack Query Hooks
```typescript
// hooks/useTeacherStats.ts
export function useTeacherStats() {
  return useQuery({
    queryKey: ['teacher-stats'],
    queryFn:  () => apiClient.get('/api/teacher/stats'),
    staleTime: 5 * 60 * 1000,   // 5 minutes
  })
}

export function useTeacherRevenue(period: RevenuePeriod, courseId?: string) {
  return useQuery({
    queryKey: ['teacher-revenue', period, courseId],
    queryFn:  () => apiClient.get('/api/teacher/revenue', { params: { period, courseId } }),
    staleTime: 5 * 60 * 1000,
  })
}
```

---

### Tests

#### Unit — `TeacherStatsService`
```typescript
describe('TeacherStatsService', () => {
  it('only returns stats for courses owned by the requesting teacher')
  it('computes completionRate as (fully_completed_enrollments / total_enrollments) * 100')
  it('computes avgCompletionRate as the mean of per-course completion rates')
  it('filters revenue by period correctly for 7d, 30d, 90d, and 12m')
  it('filters revenue by courseId when provided')
  it('returns empty chart array when no orders exist in the period')
})
```

#### Integration — Teacher API Routes
```typescript
describe('GET /api/teacher/stats', () => {
  it('returns 401 when unauthenticated')
  it('returns 403 when role is STUDENT')
  it("returns only the requesting teacher's data, not other teachers'")
  it('returns correct summary totals for a known dataset')
})

describe('GET /api/teacher/revenue', () => {
  it('returns 400 for an invalid period param')
  it('returns chart data with one entry per month for 12m period')
  it('filters byCourse correctly when courseId param is provided')
})
```

---

### Definition of Done

- [ ] Teacher can access `/teacher/dashboard` and see their aggregate stats in 4 KPI cards
- [ ] Per-course breakdown cards show correct enrolled count, completion rate, and revenue
- [ ] Revenue page renders a line chart with correct monthly data (Recharts)
- [ ] Period toggle (7d / 30d / 90d / 12m) updates the chart and summary correctly
- [ ] Course filter dropdown filters the chart to a single course
- [ ] All data is scoped to the requesting teacher — no cross-teacher data leakage
- [ ] Skeleton loaders shown while data loads
- [ ] All unit and integration tests pass

---

## Slice 4.4 — Course Completion Certificate

### Goal

When a student completes 100% of a course, they receive a **downloadable PDF certificate** hosted on S3. The generation flow is fully **asynchronous**: completing the last lesson fires an Inngest event (`certificate/generate`), the Inngest worker renders a React-PDF document, uploads it to S3, and updates the `enrollments` table with `certificateUrl`. The student is notified in-app and via email. The student can also manually trigger generation via a button on the course player page if the certificate URL is missing.

---

### Database — Schema Addition

```typescript
// lib/db/schema/enrollments.ts — additive migration (non-breaking)
export const enrollments = sqliteTable('enrollments', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId:      text('student_id').references(() => users.id),
  courseId:       text('course_id').references(() => courses.id),
  orderId:        text('order_id').references(() => orders.id),
  enrolledAt:     text('enrolled_at').$defaultFn(() => new Date().toISOString()),
  expiresAt:      text('expires_at'),
  status:         text('status', { enum: ['ACTIVE', 'EXPIRED', 'REVOKED'] }).default('ACTIVE'),
  // New fields added in Wave 4:
  certificateUrl: text('certificate_url'),   // S3 URL, null until generated
  certIssuedAt:   text('cert_issued_at'),    // ISO timestamp of issuance
})
```

**Migration:**
```sql
-- drizzle/migrations/0004_add_certificate_url.sql
ALTER TABLE enrollments ADD COLUMN certificate_url TEXT;
ALTER TABLE enrollments ADD COLUMN cert_issued_at  TEXT;
```

---

### API

#### `POST /api/courses/:courseId/certificate` — Request Certificate

Manually triggers certificate generation (idempotent — returns READY if already generated).

**Auth:** Required. Role: `STUDENT`. Enrollment + 100% completion check enforced.

**Request:** `{}` (empty body)

**Response `202 Accepted` (generation triggered):**
```json
{
  "success": true,
  "data": {
    "status":  "PROCESSING",
    "message": "Your certificate is being generated. You'll receive an email when it's ready."
  }
}
```

**Response `200 OK` (already generated):**
```json
{
  "success": true,
  "data": {
    "status":         "READY",
    "certificateUrl": "https://cdn.yourlms.com/certs/signed-uuid.pdf"
  }
}
```

**Errors:**
| Code | Status | Meaning |
|------|--------|---------|
| `NOT_ENROLLED` | 403 | Student is not enrolled |
| `COURSE_NOT_COMPLETED` | 422 | Course is not 100% complete |

---

#### `GET /api/courses/:courseId/certificate` — Get Certificate Status

**Auth:** Required.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "status":         "READY",
    "certificateUrl": "https://cdn.yourlms.com/certs/signed-uuid.pdf",
    "certIssuedAt":   "2026-11-20T18:42:00Z"
  }
}
```

Possible `status` values: `"NOT_EARNED"` | `"PROCESSING"` | `"READY"`.

---

### Inngest Worker — `certificate/generate`

```typescript
// lib/inngest/certificate.functions.ts
import { inngest }            from '../inngest/client'
import { renderToBuffer }     from '@react-pdf/renderer'
import { CertificateDocument } from '@/components/certificate/CertificateDocument'
import { PutObjectCommand }   from '@aws-sdk/client-s3'

export const generateCertificate = inngest.createFunction(
  { id: 'certificate-generate', retries: 3 },
  { event: 'certificate/generate' },

  async ({ event, step }) => {
    const { userId, courseId, enrollmentId } = event.data

    // Step 1: Fetch student and course data
    const { student, course } = await step.run('fetch-data', async () => {
      const student = await db.query.users.findFirst({ where: eq(users.id, userId) })
      const course  = await db.query.courses.findFirst({ where: eq(courses.id, courseId) })
      if (!student || !course) throw new NonRetriableError('User or course not found')
      return { student, course }
    })

    // Step 2: Verify course is still 100% complete
    await step.run('verify-completion', async () => {
      const isComplete = await progressService.checkCourseCompletion(enrollmentId, courseId)
      if (!isComplete) throw new NonRetriableError('Course is not fully completed')
    })

    // Step 3: Render PDF
    const pdfBuffer = await step.run('render-pdf', async () => {
      return renderToBuffer(
        <CertificateDocument
          studentName={student.fullName}
          courseTitle={course.title}
          instructorName="[Instructor Name]"
          issuedAt={new Date().toISOString()}
          certificateId={`CERT-${enrollmentId.slice(0, 8).toUpperCase()}`}
        />
      )
    })

    // Step 4: Upload to S3
    const s3Key = await step.run('upload-to-s3', async () => {
      const key = `certificates/${userId}/${courseId}/${enrollmentId}.pdf`
      await s3Client.send(new PutObjectCommand({
        Bucket:      process.env.AWS_S3_BUCKET!,
        Key:         key,
        Body:        pdfBuffer,
        ContentType: 'application/pdf',
        ACL:         'private',
      }))
      return key
    })

    // Step 5: Update enrollment record
    const certUrl = await step.run('update-enrollment', async () => {
      const publicUrl = `${process.env.CLOUDFRONT_BASE_URL}/${s3Key}`
      await db
        .update(enrollments)
        .set({ certificateUrl: publicUrl, certIssuedAt: new Date().toISOString() })
        .where(eq(enrollments.id, enrollmentId))
      return publicUrl
    })

    // Step 6: Send certificate-ready email
    await step.run('send-email', async () => {
      await resend.emails.send({
        from:    'certificates@yourlms.com',
        to:      student.email,
        subject: `🎓 Your certificate for "${course.title}" is ready!`,
        html:    renderCertificateEmail({ studentName: student.fullName, courseTitle: course.title, certUrl }),
      })
    })

    // Step 7: Create in-app notification
    await step.run('create-notification', async () => {
      await inngest.send({
        name: 'notification/in-app-create',
        data: {
          userId,
          title:   '🎓 Certificate Ready!',
          message: `Your certificate for "${course.title}" is now available to download.`,
          link:    `/dashboard/my-courses/${courseId}`,
        },
      })
    })

    return { certUrl, enrollmentId }
  }
)
```

---

### Certificate PDF Design — `CertificateDocument`

```tsx
// components/certificate/CertificateDocument.tsx
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer'

Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf' },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 'bold' },
  ],
})

const styles = StyleSheet.create({
  page:        { backgroundColor: '#FFFFFF', padding: 60, fontFamily: 'Inter' },
  header:      { textAlign: 'center', marginBottom: 40 },
  logo:        { width: 120, height: 40, marginBottom: 20, alignSelf: 'center' },
  title:       { fontSize: 36, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  subtitle:    { fontSize: 14, color: '#6b7280', marginBottom: 40 },
  body:        { textAlign: 'center', marginBottom: 40 },
  studentName: { fontSize: 28, fontWeight: 'bold', color: '#2563eb', marginBottom: 12 },
  courseTitle: { fontSize: 18, color: '#374151', marginBottom: 20 },
  footer:      { flexDirection: 'row', justifyContent: 'space-between', marginTop: 60 },
  certId:      { fontSize: 10, color: '#9ca3af' },
  date:        { fontSize: 10, color: '#9ca3af' },
})

export function CertificateDocument({ studentName, courseTitle, instructorName, issuedAt, certificateId }) {
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Image src="/brand/logo.png" style={styles.logo} />
          <Text style={styles.title}>Certificate of Completion</Text>
          <Text style={styles.subtitle}>This certifies that</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.studentName}>{studentName}</Text>
          <Text style={styles.subtitle}>has successfully completed</Text>
          <Text style={styles.courseTitle}>{courseTitle}</Text>
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            Instructed by {instructorName}
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.certId}>Certificate ID: {certificateId}</Text>
          <Text style={styles.date}>
            Issued:{' '}
            {new Date(issuedAt).toLocaleDateString('en-IN', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
```

---

### Frontend — Certificate UI

**Student Dashboard (`/dashboard`) — `CompletedCourseCard`:**
```tsx
<Button asChild variant="outline" size="sm">
  <a href={certificateUrl} target="_blank" download>
    <DownloadIcon className="mr-2 h-4 w-4" /> Download Certificate
  </a>
</Button>
```

**Course Player Page — `useCertificate` hook:**
```typescript
// hooks/useCertificate.ts
export function useCertificate(courseId: string) {
  const [status, setStatus] = useState<'NOT_EARNED' | 'PROCESSING' | 'READY'>('NOT_EARNED')
  const [certUrl, setCertUrl] = useState<string | null>(null)

  const requestCert = async () => {
    setStatus('PROCESSING')
    await apiClient.post(`/api/courses/${courseId}/certificate`)

    // Poll every 5 seconds, give up after 2 minutes
    const pollInterval = setInterval(async () => {
      const result = await apiClient.get(`/api/courses/${courseId}/certificate`)
      if (result.data.status === 'READY') {
        setStatus('READY')
        setCertUrl(result.data.certificateUrl)
        clearInterval(pollInterval)
      }
    }, 5_000)
    setTimeout(() => clearInterval(pollInterval), 2 * 60 * 1000)
  }

  return { status, certUrl, requestCert }
}
```

The "Get My Certificate" banner renders at the top of the course player when `courseCompleted === true && certificateUrl === null`, switching to a download link once `status === 'READY'`.

---

### Tests

#### Unit — Inngest `certificate/generate`
```typescript
describe('generateCertificate Inngest function', () => {
  it('renders a PDF buffer with correct student name and course title')
  it('uploads the PDF buffer to S3 under the correct key path')
  it('updates enrollments.certificateUrl after a successful S3 upload')
  it('sends an email to the student with the certificate URL')
  it('throws NonRetriableError when course is not 100% complete')
  it('throws NonRetriableError when student or course is not found')
  it('sends an in-app notification after certificate is ready')
})
```

#### Unit — `ProgressService.checkCourseCompletion`
```typescript
describe('checkCourseCompletion', () => {
  it('returns true only when ALL lessons are isCompleted = true')
  it('returns false when any lesson is not completed')
  it('correctly counts lessons across multiple modules')
})
```

#### Integration — Certificate API Routes
```typescript
describe('POST /api/courses/:courseId/certificate', () => {
  it('returns 401 when unauthenticated')
  it('returns 403 when NOT_ENROLLED')
  it('returns 422 when course is not 100% complete')
  it('returns 202 and fires Inngest event when course is complete and cert not yet generated')
  it('returns 200 with certificateUrl when cert is already generated (idempotent)')
})

describe('GET /api/courses/:courseId/certificate', () => {
  it('returns status: NOT_EARNED when course is not complete')
  it('returns status: PROCESSING when cert generation is in flight')
  it('returns status: READY with certificateUrl when cert is generated')
})
```

---

### Definition of Done

- [ ] Completing the last lesson fires the Inngest `certificate/generate` event
- [ ] The Inngest worker renders a valid, well-designed A4 landscape PDF certificate
- [ ] The certificate is uploaded to S3 and the enrollment record is updated with the URL
- [ ] Student receives a certificate-ready email from Resend
- [ ] Student receives an in-app notification
- [ ] `GET /api/courses/:courseId/certificate` returns `PROCESSING` then `READY`
- [ ] Student can download the certificate from the completed courses section on the dashboard
- [ ] The "Get My Certificate" button on the course player triggers generation and polls for status
- [ ] Certificate generation is idempotent — multiple triggers don't create duplicate S3 objects
- [ ] All unit and integration tests pass

---

## Wave 4 Shared Infrastructure

### Inngest Functions Registered in Wave 4

| Event Name | Function File | Triggered By |
|------------|--------------|--------------|
| `certificate/generate` | `lib/inngest/certificate.functions.ts` | `ProgressService` (auto on course completion) + `POST /api/courses/:id/certificate` (manual) |
| `notification/in-app-create` | `lib/inngest/notification.functions.ts` | `generateCertificate` step 7 |
| `email/certificate-ready` | `lib/inngest/email.functions.ts` | `generateCertificate` step 6 |

### Recharts Integration

```bash
npm install recharts
```

Recharts is used exclusively in `(teacher)/revenue/page.tsx` as a Client Component. Wrap in `dynamic()` with `ssr: false` to prevent SSR hydration mismatch with canvas:

```typescript
// app/(teacher)/revenue/page.tsx
import dynamic from 'next/dynamic'

const RevenueLineChart = dynamic(
  () => import('@/components/teacher/RevenueLineChart').then(m => m.RevenueLineChart),
  { ssr: false, loading: () => <div className="h-[300px] animate-pulse bg-muted rounded-lg" /> }
)
```

### New Drizzle Migrations (Wave 4)

| Migration File | Change |
|----------------|--------|
| `0004_add_certificate_url.sql` | Adds `certificate_url` + `cert_issued_at` to `enrollments` |
| `0005_add_order_items.sql` | Adds `order_items` table for per-course revenue attribution |

Run after implementing:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Environment Variables

No new environment variables are introduced in Wave 4. `CLOUDFRONT_BASE_URL` and `AWS_S3_BUCKET` were introduced in Wave 2.

### SSR Shell + CSR Hydration Pattern

All Wave 4 portals follow the **Shell + Hydration** pattern:

```
Server Component (page.tsx)
  → Renders page shell (layout, sidebar, navigation) → instant, non-blank first paint
  → Mounts Client Component (DashboardPage, LessonPlayerPage, TeacherDashboardPage, etc.)
      → Client Component fetches data via TanStack Query
      → Shows skeleton loaders while fetching
      → Renders real content on hydration
```

This gives all protected portals an instant non-blank paint without leaking private data in SSR.

---

## Wave 4 — Delivery Checklist

| Slice | API Endpoints | Service | Frontend | Tests | Done |
|-------|--------------|---------|----------|-------|------|
| 4.1 Student Dashboard | `GET /api/users/me/dashboard` | `DashboardService` | Dashboard, Continue Learning, Live Sessions, Completed | Unit + Integration | [ ] |
| 4.2 Video Player & Progress | `GET /api/courses/:id/lessons/:id`<br>`PATCH /api/lessons/:id/progress`<br>`POST /api/.../complete` | `ProgressService` | `VideoPlayer`, `CurriculumSidebar`, `ProgressPoller`, `LessonNav` | Unit + Integration | [ ] |
| 4.3 Teacher Dashboard & Revenue | `GET /api/teacher/stats`<br>`GET /api/teacher/revenue` | `TeacherStatsService` | KPI cards, revenue chart, order table, period selector | Unit + Integration | [ ] |
| 4.4 Completion Certificate | `POST /api/courses/:id/certificate`<br>`GET /api/courses/:id/certificate` | Inngest worker + `CertificateDocument` | Cert banner, download button, `useCertificate` poll hook | Unit + Integration | [ ] |

**Wave 4 is complete when:** A full student learning journey can be demonstrated in staging — login → dashboard → resume a lesson → watch to completion → certificate email arrives → PDF downloaded from dashboard.
