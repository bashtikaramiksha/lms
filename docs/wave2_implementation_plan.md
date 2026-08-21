# 🌊 Wave 2 Implementation Plan & Execution Record
## LMS Platform · Course Lifecycle & Curriculum Ecosystem

---

| Document Info | Details |
| :--- | :--- |
| **Document Title** | Wave 2 Implementation Plan & Execution Record |
| **Target Wave** | Wave 2 — Course Ecosystem |
| **Tech Stack** | Next.js 15 (App Router), TypeScript, Tailwind CSS, Drizzle ORM, libSQL / SQLite / Turso, AWS S3 SDK |
| **Current Status** | ✅ **All 5 Slices (2.1, 2.2, 2.3, 2.4, 2.5) Fully Executed & Verified** |
| **Date** | August 20, 2026 |

---

## 1. Executive Summary

Wave 2 delivers the full lifecycle of courses on the LMS Platform — from draft creation, module and lesson curriculum building, S3-powered video uploads, SEO metadata and publishing workflows, through to public course discovery, filtering, and rich course detail presentation.

- **Slice 2.1**: Establishes the core course database schema, categories, backend validation, S3/local presigned upload architecture, and the teacher-facing 3-step Course Creation Wizard.
- **Slice 2.2**: Delivers the hierarchical Curriculum Builder (Modules & Lessons) with direct video uploading (up to 2 GB), duration detection, free preview enforcement (max 3 per course), and atomic reordering.
- **Slice 2.3**: Delivers Course SEO metadata configuration, the 8-point server-side publish readiness checklist, status lifecycle workflows (`DRAFT` → `PENDING_REVIEW` → `PUBLISHED` → `ARCHIVED`), SQLite FTS5 full-text search indexing, and Inngest background notification events.
- **Slice 2.4**: Delivers the public Course Catalog (`/courses`) with full-text FTS5 keyword search, multi-facet filtering (category, skill level, format), 4 sort options, cursor-based pagination, Redis caching with 60s TTL, and Next.js ISR.
- **Slice 2.5**: Delivers the public Course Detail Page (`/courses/:slug`) with curriculum accordion, video preview gating, instructor statistics, review presentation, ISR with 30s revalidation, and Schema.org `Course` JSON-LD structured data.

---

## 2. Database Architecture & Schema Extensions

### Schema Files:
- [`src/lib/db/schema/courses.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/courses.ts)
- [`src/lib/db/schema/curriculum.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/curriculum.ts)
- [`src/lib/db/schema/enrollments.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/enrollments.ts)
- [`src/lib/db/schema/reviews.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/reviews.ts)

#### `categories` Table
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `text` | Primary Key, UUID |
| `name` | `text` | Unique, Not Null |
| `slug` | `text` | Unique, Not Null (Indexed) |
| `created_at` | `text` | ISO8601 timestamp |

#### `courses` Table
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `text` | Primary Key, UUID |
| `title` | `text` | Not Null (10–120 chars) |
| `slug` | `text` | Unique, Auto-generated (Indexed) |
| `description` | `text` | Rich description |
| `short_desc` | `text` | Subtitle (max 200 chars) |
| `thumbnail_url` | `text` | Public CDN / local upload URL |
| `preview_url` | `text` | Promotional video URL |
| `type` | `text` | Enum: `RECORDED`, `LIVE` |
| `status` | `text` | Enum: `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `ARCHIVED` (Default: `DRAFT`) |
| `level` | `text` | Enum: `BEGINNER`, `INTERMEDIATE`, `ADVANCED` |
| `language` | `text` | Default: `English` |
| `price` | `real` | Default: 0 |
| `discount_price` | `real` | Nullable (must be `< price`) |
| `access_duration` | `integer` | Nullable (null = Lifetime access) |
| `author_id` | `text` | References `users.id` (`onDelete: cascade`) |
| `category_id` | `text` | References `categories.id` (`onDelete: set null`) |
| `is_featured` | `integer (boolean)` | Default: `false` |
| `seo_title` | `text` | Nullable |
| `seo_description` | `text` | Nullable |
| `og_image_url` | `text` | Nullable |
| `created_at`, `updated_at` | `text` | ISO8601 timestamps |

#### `enrollments` Table
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `text` | Primary Key, UUID |
| `user_id` | `text` | References `users.id` (`onDelete: cascade`, Indexed) |
| `course_id` | `text` | References `courses.id` (`onDelete: cascade`, Indexed) |
| `status` | `text` | Enum: `ACTIVE`, `COMPLETED`, `CANCELLED` (Default: `ACTIVE`) |
| `enrolled_at` | `text` | ISO8601 timestamp |
| `expires_at` | `text` | Nullable ISO8601 timestamp |

#### `reviews` Table
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `text` | Primary Key, UUID |
| `course_id` | `text` | References `courses.id` (`onDelete: cascade`, Indexed) |
| `student_id` | `text` | References `users.id` (`onDelete: cascade`, Indexed) |
| `rating` | `integer` | 1–5 score |
| `comment` | `text` | Review text |
| `created_at` | `text` | ISO8601 timestamp |

---

## 3. Slice 2.1 Implementation Record: Course Creation Wizard

### Goal
Approved teachers (and admins) can create new course drafts using a 3-step wizard with real-time preview, validated pricing rules, slug generation with collision fallback, and thumbnail upload.

### Components Built
1. **Validation Schemas** ([`src/lib/validations/course.ts`](file:///d:/Projects/cloud%20planning/src/lib/validations/course.ts)): `createCourseSchema`, `updateCourseSchema`, `thumbnailPresignSchema`.
2. **Service Layer** ([`src/lib/services/course.service.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/course.service.ts)): `createCourse`, `updateCourse`, `getThumbnailPresignedUrl`, `getCategories`, `getTeacherCourses`.
3. **API Endpoints**:
   - `GET /api/categories`
   - `GET /api/courses`
   - `POST /api/courses`
   - `GET /api/courses/[id]`
   - `PATCH /api/courses/[id]`
   - `POST /api/uploads/course-thumbnail`
4. **UI**:
   - Course Wizard ([`src/app/(teacher)/teacher/courses/new/page.tsx`](file:///d:/Projects/cloud%20planning/src/app/(teacher)/teacher/courses/new/page.tsx))
   - Teacher Dashboard ([`src/app/(teacher)/teacher/dashboard/page.tsx`](file:///d:/Projects/cloud%20planning/src/app/(teacher)/teacher/dashboard/page.tsx))

---

## 4. Slice 2.2 Implementation Record: Curriculum Builder

### Goal
Teachers and Admins can build and manage a complete hierarchical course curriculum (Modules and Lessons of type `VIDEO`, `ARTICLE`, `QUIZ`, `LIVE_SESSION`), upload videos up to 2 GB with direct presigned URLs and progress indicators, configure free preview quotas (max 3 per course), and reorder modules & lessons with atomic persistence.

### Components Built
1. **Validation Schemas** ([`src/lib/validations/curriculum.ts`](file:///d:/Projects/cloud%20planning/src/lib/validations/curriculum.ts)): `createModuleSchema`, `updateModuleSchema`, `reorderSchema`, `createLessonSchema`, `updateLessonSchema`, `videoPresignSchema`.
2. **Service Layer Methods** ([`src/lib/services/course.service.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/course.service.ts)): `addModule`, `updateModule`, `deleteModule`, `reorderModules`, `addLesson`, `updateLesson`, `deleteLesson`, `reorderLessons`, `getVideoPresignedUrl`, `getCurriculum`.
3. **API Endpoints**:
   - `GET /api/courses/[id]/curriculum`
   - `POST /api/courses/[id]/modules`
   - `PATCH /api/courses/[id]/modules/reorder`
   - `PATCH /api/modules/[id]`
   - `DELETE /api/modules/[id]`
   - `POST /api/modules/[id]/lessons`
   - `PATCH /api/modules/[id]/lessons/reorder`
   - `PATCH /api/lessons/[id]`
   - `DELETE /api/lessons/[id]`
   - `POST /api/uploads/lesson-video`
4. **Frontend UI**:
   - Curriculum Builder Component ([`src/components/curriculum/curriculum-builder.tsx`](file:///d:/Projects/cloud%20planning/src/components/curriculum/curriculum-builder.tsx))

---

## 5. Slice 2.3 Implementation Record: Course SEO & Publishing

### Goal
Teachers configure SEO metadata (title, meta description, OG social image) with live preview snippets and submit course drafts for review. An 8-point server-side publish readiness checklist validates complete information before any transition. Admins review and approve courses to `PUBLISHED`, sync SQLite FTS5 search indexes, and archive courses as needed.

### Components Built

#### 1. FTS Search Helpers ([`src/lib/db/fts.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/fts.ts))
- `initFtsTable`: Initializes `courses_fts` virtual table using SQLite FTS5.
- `upsertCourseFts`: Inserts / updates course title, description, and shortDesc in the full-text search table.
- `removeCourseFts`: Cleans up search rows when a course is archived or deleted.

#### 2. Validation Schemas ([`src/lib/validations/course.ts`](file:///d:/Projects/cloud%20planning/src/lib/validations/course.ts))
- `seoSchema`: Validates `seoTitle` (10–70 chars), `seoDesc` (50–160 chars), and `ogImageUrl` (URL).

#### 3. Background Jobs ([`src/lib/inngest/course.functions.ts`](file:///d:/Projects/cloud%20planning/src/lib/inngest/course.functions.ts))
- `notifyAdminOfSubmission`: Inngest event handler for `course/submitted-for-review` notifying platform administrators.
- `notifyTeacherOfPublish`: Inngest event handler for `course/published` notifying instructors when their course goes live.

#### 4. Service Layer Methods ([`src/lib/services/course.service.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/course.service.ts))
- `checkPublishReadiness`: Evaluates 8 criteria (title, description, thumbnail, type, price >= 0, module count >= 1, non-empty modules, uploaded videos for VIDEO lessons).
- `updateCourseSeo`: Updates course SEO fields (restricted to DRAFT/PENDING_REVIEW).
- `submitForReview`: Validates checklist, transitions `DRAFT` → `PENDING_REVIEW`, and triggers admin notification.
- `publishCourse`: Admin-only transition to `PUBLISHED`, validates checklist, syncs FTS index, and triggers teacher notification.
- `archiveCourse`: Admin-only transition to `ARCHIVED` and removes from FTS index.
- `unarchiveCourse`: Admin-only transition from `ARCHIVED` back to `DRAFT`.

#### 5. API Endpoints
- `GET /api/courses/[id]/publish-checklist`: Fetches live readiness state and failure details.
- `PATCH /api/courses/[id]/seo`: Updates course SEO metadata.
- `POST /api/courses/[id]/submit`: Submits draft course for review.
- `POST /api/courses/[id]/publish`: Admin endpoint to publish course.
- `POST /api/courses/[id]/archive`: Admin endpoint to archive course.

#### 6. Frontend UI: Course Studio
- **Integrated Course Studio** ([`src/app/(teacher)/teacher/courses/[id]/edit/page.tsx`](file:///d:/Projects/cloud%20planning/src/app/(teacher)/teacher/courses/[id]/edit/page.tsx)):
  - 4-tab interface: **Course Details**, **Curriculum Builder**, **SEO & Social**, **Publishing & Review**.
  - **SEO Tab**: Live character counters for SEO Title & Meta Description, Open Graph image preview, and Google SERP simulator card.
  - **Publishing Tab**: Lifecycle status badge, 8-point interactive readiness checklist cards (Pass/Fail), and "Submit for Review" CTA button with admin quick actions.

---

## 6. Slice 2.4 Implementation Record: Public Course Listing & Filters

### Goal
Any visitor can browse the course catalog at `/courses`. The listing supports **text search** (SQLite FTS5), **category**, **skill level**, and **format type** filters, **4 sort modes** (`newest`, `price_asc`, `price_desc`, `popular`), cursor-based pagination, Redis caching with 60s TTL, and Next.js ISR.

### Components Built

#### 1. Validation Schemas & Types ([`src/lib/validations/course.ts`](file:///d:/Projects/cloud%20planning/src/lib/validations/course.ts))
- `listCoursesSchema`: Validates query parameters (`q`, `category`, `level`, `type`, `sort`, `cursor`, `limit`).
- `CourseCard`: Comprehensive return contract including category, instructor avatar & full name, lesson count, total duration in seconds, and active enrollment count.
- `PaginatedResult<T>`: Standardized response with `data` array and `meta` (`hasNext`, `nextCursor`, `total`).

#### 2. Caching Infrastructure ([`src/lib/redis.ts`](file:///d:/Projects/cloud%20planning/src/lib/redis.ts))
- Upstash Redis client with automatic local memory fallback (`get`, `set` with 60s TTL, `del`, `clear`).

#### 3. Service Layer ([`src/lib/services/course.service.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/course.service.ts))
- `listPublicCourses`: Enforces `status = 'PUBLISHED'`, FTS5 wildcard search, multi-facet filtering, sorting, and cursor pagination.

#### 4. API Endpoints ([`src/app/api/courses/route.ts`](file:///d:/Projects/cloud%20planning/src/app/api/courses/route.ts))
- `GET /api/courses`: Public catalog endpoint returning `{ success: true, data: CourseCard[], meta: { hasNext, nextCursor } }`.

#### 5. Frontend UI & Pages
- **Course Catalog Page** ([`src/app/courses/page.tsx`](file:///d:/Projects/cloud%20planning/src/app/courses/page.tsx)): ISR route with 60s revalidation.
- **Components**: `CourseCatalog`, `CourseCard`, `CourseFilters`, `CourseGridSkeleton`.

---

## 7. Slice 2.5 Implementation Record: Course Detail Page

### Goal
Any visitor can view the full course detail page at `/courses/:slug`. The page displays overview, hierarchical curriculum tree, instructor profile with stats, reviews breakdown, preview lesson playback, gated video URLs for non-enrolled visitors, ISR with 30s revalidation, and Schema.org `Course` JSON-LD structured data.

### Components Built

#### 1. Database Schema ([`src/lib/db/schema/reviews.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/reviews.ts))
- `reviews` table with course & student relations, ratings (1–5), comments, and compound unique index.

#### 2. Validation Schemas & Types ([`src/lib/validations/course.ts`](file:///d:/Projects/cloud%20planning/src/lib/validations/course.ts))
- `CourseDetail`, `CurriculumModuleDetail`, `CurriculumLessonDetail`, `InstructorDetail`, `CourseReviewItem`, `PaginatedReviews`.

#### 3. Service Layer ([`src/lib/services/course.service.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/course.service.ts))
- `getCourseDetail`: Gated video URL masking, curriculum tree assembly, instructor course & student stats, rating averages.
- `getCourseReviews`: Paginated reviews endpoint.

#### 4. API Endpoints
- `GET /api/courses/[id]`: Returns full public `CourseDetail` (with fallback to draft for owner/admin).
- `GET /api/courses/[id]/reviews`: Returns paginated reviews for a published course.

#### 5. Frontend UI & Detail Page
- **Course Detail Page** ([`src/app/courses/[slug]/page.tsx`](file:///d:/Projects/cloud%20planning/src/app/courses/[slug]/page.tsx)): ISR route with `revalidate = 30`, dynamic metadata generation, Schema.org `Course` JSON-LD, 2-column layout with sticky enrollment card.
- **Curriculum Accordion** ([`src/components/courses/course-curriculum-accordion.tsx`](file:///d:/Projects/cloud%20planning/src/components/courses/course-curriculum-accordion.tsx)): Interactive section collapse/expand with preview triggers and lock indicators.
- **Preview Player Modal** ([`src/components/courses/course-preview-player-modal.tsx`](file:///d:/Projects/cloud%20planning/src/components/courses/course-preview-player-modal.tsx)): HTML5 video player for free preview lessons.

---

## 8. Verification & Test Summary

| Test Case | Method | Result |
| :--- | :--- | :---: |
| **Category Retrieval** | Service Test | ✅ Retrieved categories |
| **Course Draft Creation** | Service Test | ✅ Created with unique slug and `DRAFT` status |
| **Slug Collision Resolution** | Service Test | ✅ Generated `-8acf` suffix |
| **Approval Guard** | Service Test | ✅ Rejected unapproved teacher with `403` |
| **Discount Price Validation** | Service Test | ✅ Rejected `discount >= price` with `400` |
| **Draft Modification** | Service Test | ✅ Successfully updated title and price |
| **Upload Presigning (Thumbnail)** | Service Test | ✅ Generated presigned URLs |
| **Module Creation & Contiguous Ordering** | Integration Test | ✅ Modules ordered contiguously |
| **Module Inline Rename** | Integration Test | ✅ Renamed successfully |
| **Module Atomic Reorder** | Integration Test | ✅ Reordered contiguously |
| **Lesson Creation & Types** | Integration Test | ✅ Added Video and Article lessons |
| **Free Preview Limit Enforcement** | Integration Test | ✅ Threw `MAX_PREVIEWS_EXCEEDED` (409) on 4th preview |
| **Lesson Video Upload & Duration** | Integration Test | ✅ Video metadata and URL persisted |
| **Lesson Atomic Reorder** | Integration Test | ✅ Reordered lessons within module |
| **Lesson Deletion & Order Normalization** | Integration Test | ✅ Deleted lesson and normalized sequence |
| **Module Cascade Deletion** | Integration Test | ✅ Deleted module and all nested lessons |
| **Publish Readiness (Incomplete Draft)** | Service Test | ✅ Caught missing description, thumbnail, modules |
| **Submit Rejection (Incomplete Draft)** | Service Test | ✅ Threw `COURSE_INCOMPLETE` (422) with failure list |
| **SEO Metadata Update** | Service Test | ✅ Updated `seoTitle`, `seoDesc`, `ogImageUrl` |
| **Video URL Checklist Check** | Service Test | ✅ Caught video lesson missing file |
| **Submit for Review (Complete Draft)** | Service Test | ✅ Transitioned `DRAFT` → `PENDING_REVIEW` |
| **Publish Guard (Teacher blocked)** | Service Test | ✅ Threw `FORBIDDEN` (403) for teacher publish |
| **Publish by Admin & FTS Sync** | Service Test | ✅ Transitioned to `PUBLISHED` & updated `courses_fts` |
| **Edit Lock on Published Course** | Service Test | ✅ Blocked edits with `CANNOT_EDIT_PUBLISHED` (422) |
| **Course Archival by Admin** | Service Test | ✅ Transitioned to `ARCHIVED` & removed from FTS |
| **Course Unarchival by Admin** | Service Test | ✅ Transitioned `ARCHIVED` → `DRAFT` |
| **Public Filter: Only PUBLISHED Courses** | Service Test | ✅ Excluded DRAFT/ARCHIVED courses |
| **Public Filter: Category Slug** | Service Test | ✅ Filtered by category slug |
| **Public Filter: Skill Level** | Service Test | ✅ Filtered by BEGINNER, INTERMEDIATE, ADVANCED |
| **Public Filter: Format Type** | Service Test | ✅ Filtered by RECORDED and LIVE |
| **Public Sort: 4 Sort Modes** | Service Test | ✅ Verified `newest`, `price_asc`, `price_desc`, `popular` |
| **Full-Text Search (FTS5)** | Service Test | ✅ MATCH query in `courses_fts` for query >= 3 chars |
| **Search Fallback (LIKE)** | Service Test | ✅ Substring matching for query < 3 chars |
| **Cursor-based Pagination** | Service Test | ✅ Returned `hasNext` and `nextCursor` |
| **Redis / Memory Cache (60s)** | Service Test | ✅ Cached filter queries, bypassed on search |
| **API Endpoint Validation (400 / 200)** | API Test | ✅ Validated sort parameters and pagination metadata |
| **Course Detail: Published Course** | Service Test | ✅ Returned complete detail object |
| **Course Detail: 404 for DRAFT Course** | Service Test | ✅ Correctly returned 404 COURSE_NOT_FOUND |
| **Course Detail: 404 for Unknown Slug** | Service Test | ✅ Correctly returned 404 |
| **Preview Gating: Unauthenticated** | Service Test | ✅ Included preview videoUrls, masked non-preview |
| **Preview Gating: Enrolled Student** | Service Test | ✅ Expose all videoUrls when user is enrolled |
| **Instructor Stats** | Service Test | ✅ Calculated published courseCount & studentCount |
| **Review Stats & Aggregation** | Service Test | ✅ Calculated avgRating & reviewCount |
| **Curriculum Duration Sum** | Service Test | ✅ Accurately summed durations across all modules |
| **Paginated Reviews API Route** | API Test | ✅ Returned reviews with student info & cursor |
| **Course Detail API Route** | API Test | ✅ Returned 200 with full detail |
| **Typecheck** | `npx tsc --noEmit` | ✅ 0 errors across entire project |

---

## 9. Conclusion: Wave 2 Complete! 🎉

All 5 vertical slices of Wave 2 (2.1, 2.2, 2.3, 2.4, 2.5) are fully built, integrated, typechecked, and verified end-to-end. The platform now supports the entire course lifecycle:
1. Teacher Course Creation Wizard
2. Hierarchical Curriculum Builder & S3 Video Uploads
3. SEO Configuration, Readiness Checklist & Publishing Workflow
4. Public Course Discovery Catalog & FTS5 Search
5. Rich Course Detail Page with Syllabus Preview & SEO Structured Data
