# 🌊 Wave 4 Implementation Plan & Execution Record
## LMS Platform · Learning Experience & Progress Architecture

---

| Document Info | Details |
| :--- | :--- |
| **Document Title** | Wave 4 Implementation Plan & Execution Record |
| **Target Wave** | Wave 4 — Learning Experience |
| **Tech Stack** | Next.js 15 (App Router), TypeScript, Tailwind CSS, TanStack Query, Drizzle ORM, libSQL / SQLite / Turso, Recharts, Inngest |
| **Current Status** | 🚀 **Wave 4 Fully Executed & Verified (4/4 Slices Complete)** |
| **Date** | August 21, 2026 |

---

## 1. Executive Summary

Wave 4 establishes the **student learning world** and **teacher studio analytics** — enabling enrolled students to track their progress, watch lessons with automated watch-time tracking, earn completion certificates, and access live interactive sessions; while providing teachers with scoped student progress metrics and revenue reporting.

- **Slice 4.1 (Completed & Verified)**: Personalized Student Dashboard (`/dashboard`) surfacing **Continue Learning** (in-progress courses with resume deep-links), **Upcoming Live Sessions** (scheduled webinars with 15-minute `joinUrl` security access control), **Completed Courses** (with certificate downloads), and aggregated learning metrics.
- **Slice 4.2 (Completed & Verified)**: Course Video Player & Progress Tracking (`/dashboard/my-courses/:courseId/lessons/:lessonId`) with debounced 10s watch progress syncing, monotonic progress preservation, auto-completion at `>= 80%` watch time, manual completion for articles/quizzes, collapsible curriculum sidebar checkmarks, contiguous navigation across module boundaries, and celebratory completion notifications.
- **Slice 4.3 (Completed & Verified)**: Teacher Dashboard & Revenue Portal (`/teacher/dashboard`, `/teacher/revenue`) with course KPI cards, Recharts time-series revenue graphs, period filtering (`7d`, `30d`, `90d`, `12m`), course breakdown distribution tables, order transaction ledgers, and multi-tenant teacher data isolation.
- **Slice 4.4 (Completed & Verified)**: Course Completion Certificate (`/api/courses/:id/certificate`) with asynchronous Inngest generation, idempotent certificate issuance, enrollment record updates (`certificateUrl`, `certIssuedAt`), Resend email delivery, `useCertificate` polling hook, and `CertificateModal` download dialog.

---

## 2. Database Architecture & Schema Extensions

### Schema Files:
- [`src/lib/db/schema/lesson-progress.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/lesson-progress.ts)
- [`src/lib/db/schema/live-sessions.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/live-sessions.ts)
- [`src/lib/db/schema/enrollments.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/enrollments.ts)
- [`src/lib/db/schema/curriculum.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/curriculum.ts)
- [`src/lib/db/schema/courses.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/courses.ts)
- [`src/lib/db/schema/orders.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/orders.ts)

#### `lesson_progress` Table (Slice 4.1 & 4.2)
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `text` | Primary Key, UUID (`$defaultFn: crypto.randomUUID()`) |
| `enrollment_id` | `text` | Foreign Key → `enrollments.id` (`onDelete: cascade`, Indexed) |
| `lesson_id` | `text` | Foreign Key → `lessons.id` (`onDelete: cascade`, Indexed) |
| `watch_percent` | `real` | Default: 0, Max watched percentage (never decreases) |
| `is_completed` | `integer` (boolean) | Default: 0, Auto-set to true when `watch_percent >= 80` |
| `last_watched_at` | `text` | ISO8601 timestamp of last interaction |
| `created_at` | `text` | ISO8601 timestamp |
| `updated_at` | `text` | ISO8601 timestamp |

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_lesson_progress_unique ON lesson_progress(enrollment_id, lesson_id);
CREATE INDEX idx_lesson_progress_enrollment ON lesson_progress(enrollment_id);
CREATE INDEX idx_lesson_progress_lesson ON lesson_progress(lesson_id);
```

#### `live_sessions` Table (Slice 4.1 & Wave 6)
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `text` | Primary Key, UUID (`$defaultFn: crypto.randomUUID()`) |
| `lesson_id` | `text` | Foreign Key → `lessons.id` (`onDelete: set null`) |
| `course_id` | `text` | Foreign Key → `courses.id` (`onDelete: cascade`, Indexed) |
| `teacher_id` | `text` | Foreign Key → `users.id` (`onDelete: cascade`, Indexed) |
| `title` | `text` | Session title |
| `scheduled_at` | `text` | ISO8601 scheduled start timestamp (Indexed) |
| `duration` | `integer` | Session duration in minutes |
| `platform` | `text` | Enum: `ZOOM`, `GOOGLE_MEET` |
| `join_url` | `text` | Student join URL (masked until 15 mins prior) |
| `host_url` | `text` | Teacher host URL |
| `status` | `text` | Enum: `SCHEDULED`, `LIVE`, `ENDED`, `CANCELLED` (Indexed) |
| `recording_url` | `text` | Cloud recording URL |

#### `enrollments` Extensions (Slice 4.1 & 4.4)
- `certificate_url`: S3/CDN PDF URL, populated on course completion.
- `cert_issued_at`: Timestamp of certificate issuance.

---

## 3. Slice 4.1 Implementation Record: Student Dashboard

### Goal
Every enrolled student lands on a personalized home at `/dashboard` after login. The dashboard surfaces:
1. **Continue Learning** (in-progress courses with animated progress bars and last-watched lesson deep-links)
2. **Upcoming Live Sessions** (scheduled webinars with live countdowns and 15-minute `joinUrl` access control)
3. **Completed Courses** (courses at 100% progress with certificate downloads)
4. **Summary KPI Counters** (Enrolled, In Progress, Hours Learned, Certificates)

### Delivered Components
- Created [`src/lib/db/schema/lesson-progress.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/lesson-progress.ts) and [`src/lib/db/schema/live-sessions.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/live-sessions.ts).
- Created [`src/lib/services/dashboard.service.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/dashboard.service.ts).
- Created [`src/app/api/users/me/dashboard/route.ts`](file:///d:/Projects/cloud%20planning/src/app/api/users/me/dashboard/route.ts).
- Created UI components: [`DashboardPage.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/DashboardPage.tsx), [`CourseProgressCard.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/CourseProgressCard.tsx), [`ContinueLearningSection.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/ContinueLearningSection.tsx), [`LiveSessionTile.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/LiveSessionTile.tsx), [`UpcomingSessionsSection.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/UpcomingSessionsSection.tsx), [`CompletedCourseCard.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/CompletedCourseCard.tsx), [`CompletedCoursesSection.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/CompletedCoursesSection.tsx).
- Verified via test suite: [`src/lib/services/__tests__/dashboard.service.test.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/__tests__/dashboard.service.test.ts).

---

## 4. Slice 4.2 Implementation Record: Video Player & Progress Tracking

### Goal
Enrolled students navigate to `/dashboard/my-courses/:courseId/lessons/:lessonId` and watch lesson videos or read articles. Progress is tracked automatically with debounced 10-second syncs, automatic completion at `>= 80%` watch time, contiguous navigation across modules, and visual checkmarks in the curriculum sidebar.

### Delivered Components
- Created [`src/lib/validations/progress.ts`](file:///d:/Projects/cloud%20planning/src/lib/validations/progress.ts).
- Created [`src/lib/services/progress.service.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/progress.service.ts).
- Created REST API routes:
  - `GET /api/courses/[id]/lessons/[lessonId]`
  - `POST /api/courses/[id]/lessons/[lessonId]/complete`
  - `PATCH /api/lessons/[id]/progress`
- Created UI components: [`VideoPlayer.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/VideoPlayer.tsx), [`CurriculumSidebar.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/CurriculumSidebar.tsx), [`LessonNav.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/LessonNav.tsx), [`LessonPlayerPage.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/LessonPlayerPage.tsx).
- Created route: [`src/app/(dashboard)/my-courses/[courseId]/lessons/[lessonId]/page.tsx`](file:///d:/Projects/cloud%20planning/src/app/(dashboard)/my-courses/[courseId]/lessons/[lessonId]/page.tsx).
- Verified via test suite: [`src/lib/services/__tests__/progress.service.test.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/__tests__/progress.service.test.ts).

---

## 5. Slice 4.3 Implementation Record: Teacher Dashboard & Revenue View

### Goal
Teachers access a dual-page portal: `/teacher/dashboard` for course completion and student enrollment analytics, and `/teacher/revenue` for interactive time-series revenue graphs, single-course drill-down filtering, course distribution tables, and recent order ledgers. All metrics are strictly teacher-scoped.

### Delivered Components
- Installed `recharts` for responsive SVG charting.
- Created [`src/lib/services/teacher-stats.service.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/teacher-stats.service.ts).
- Created REST API routes:
  - `GET /api/teacher/stats`
  - `GET /api/teacher/revenue`
- Created UI components: [`StatsSummaryBar.tsx`](file:///d:/Projects/cloud%20planning/src/components/teacher/StatsSummaryBar.tsx), [`CourseStatCard.tsx`](file:///d:/Projects/cloud%20planning/src/components/teacher/CourseStatCard.tsx), [`RecentEnrollmentsList.tsx`](file:///d:/Projects/cloud%20planning/src/components/teacher/RecentEnrollmentsList.tsx), [`RevenuePeriodSelector.tsx`](file:///d:/Projects/cloud%20planning/src/components/teacher/RevenuePeriodSelector.tsx), [`RevenueLineChart.tsx`](file:///d:/Projects/cloud%20planning/src/components/teacher/RevenueLineChart.tsx), [`RevenueByCourseTable.tsx`](file:///d:/Projects/cloud%20planning/src/components/teacher/RevenueByCourseTable.tsx), [`RecentOrdersTable.tsx`](file:///d:/Projects/cloud%20planning/src/components/teacher/RecentOrdersTable.tsx), [`TeacherDashboardPage.tsx`](file:///d:/Projects/cloud%20planning/src/components/teacher/TeacherDashboardPage.tsx), [`TeacherRevenuePage.tsx`](file:///d:/Projects/cloud%20planning/src/components/teacher/TeacherRevenuePage.tsx).
- Created routes: [`/teacher/dashboard`](file:///d:/Projects/cloud%20planning/src/app/(teacher)/teacher/dashboard/page.tsx) and [`/teacher/revenue`](file:///d:/Projects/cloud%20planning/src/app/(teacher)/teacher/revenue/page.tsx).
- Verified via test suite: [`src/lib/services/__tests__/teacher-stats.service.test.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/__tests__/teacher-stats.service.test.ts).

---

## 6. Slice 4.4 Implementation Record: Course Completion Certificate

### Goal
Students completing 100% of a course receive an official certificate of completion with automated, idempotent generation, S3/CDN storage URL, database enrollment status update, email delivery via Resend, and download actions across the dashboard and player.

### Delivered Components

#### 1. Service Layer
- Created [`src/lib/services/certificate.service.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/certificate.service.ts):
  - `getCertificateStatus(userId, courseId)`: Checks enrollment and 100% completion status, returning `NOT_EARNED` | `PROCESSING` | `READY`.
  - `requestCertificate(userId, courseId)`: Idempotently triggers certificate generation and returns `status: "READY"` with certificate URL.
  - `generateCertificate(userId, courseId, enrollmentId)`: Generates verified certificate record, updates `enrollments.certificateUrl` & `certIssuedAt`, sets status `COMPLETED`, and dispatches email via Resend.

#### 2. Inngest Background Worker
- Created [`src/lib/inngest/certificate.functions.ts`](file:///d:/Projects/cloud%20planning/src/lib/inngest/certificate.functions.ts): Function `generateCertificateFunction` listening on `certificate/generate`.
- Created [`src/app/api/inngest/route.ts`](file:///d:/Projects/cloud%20planning/src/app/api/inngest/route.ts): Endpoint serving all Inngest functions (`course`, `payment`, `certificate`).

#### 3. REST API Routes
- Created [`src/app/api/courses/[id]/certificate/route.ts`](file:///d:/Projects/cloud%20planning/src/app/api/courses/[id]/certificate/route.ts):
  - `GET`: Status polling endpoint.
  - `POST`: Idempotent certificate generation trigger (202 Accepted / 200 OK).

#### 4. Frontend & Client Components
- Created [`src/hooks/useCertificate.ts`](file:///d:/Projects/cloud%20planning/src/hooks/useCertificate.ts): Query and mutation hook with automatic 4-second polling during `PROCESSING` state.
- Created [`src/components/certificate/CertificateModal.tsx`](file:///d:/Projects/cloud%20planning/src/components/certificate/CertificateModal.tsx): Modal dialog with certificate verification details and PDF download trigger.
- Updated [`src/components/dashboard/LessonPlayerPage.tsx`](file:///d:/Projects/cloud%20planning/src/components/dashboard/LessonPlayerPage.tsx): Embedded certificate claim banner and modal integration on 100% progress.

#### 5. Verification Results
- **Automated Test Suite**: [`src/lib/services/__tests__/certificate.service.test.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/__tests__/certificate.service.test.ts)
  - ✅ Non-enrolled user blocked with 403 `NOT_ENROLLED`
  - ✅ Incomplete course returns `NOT_EARNED` and rejects premature requests with 422 `COURSE_NOT_COMPLETED`
  - ✅ 100% completed course generates certificate with `certificateUrl`
  - ✅ Database enrollment record updated with `certificateUrl` & `certIssuedAt`
  - ✅ Subsequent status and generation requests return identical certificate (idempotency verified)
- **Type Checking**: `npx tsc --noEmit` passed with 0 errors.
