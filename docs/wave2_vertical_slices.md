# 🌊 Wave 2 — Vertical Slices
## LMS Platform · Course Ecosystem

> **Target Date:** October 20, 2026
> **Theme:** Full course lifecycle — creation, curriculum building, publishing, public browsing, and course detail pages.
> **Definition of Done:** All 5 slices pass unit tests, integration tests, and can be demonstrated end-to-end in staging with at least one published course visible to an anonymous visitor.

---

## Table of Contents

1. [Slice 2.1 — Course Creation Wizard](#slice-21--course-creation-wizard-steps-13)
2. [Slice 2.2 — Curriculum Builder](#slice-22--curriculum-builder-modules--lessons)
3. [Slice 2.3 — Course SEO and Publishing](#slice-23--course-seo--publishing)
4. [Slice 2.4 — Public Course Listing and Filters](#slice-24--public-course-listing--filters)
5. [Slice 2.5 — Course Detail Page](#slice-25--course-detail-page)
6. [Wave 2 Shared Infrastructure](#wave-2-shared-infrastructure)

---
## Slice 2.1 — Course Creation Wizard (Steps 1–3)

### Goal
An approved Teacher (or Admin) can create a new course draft by completing a 3-step wizard: **Basic Info** (title, description, category, level, language), **Type and Pricing** (RECORDED vs LIVE, price, discount price, access duration), and **Media** (thumbnail upload via S3 presigned URL, optional preview video URL). The course is saved as a `DRAFT` and is not publicly visible until published.

---

### Database Schema

```typescript
// lib/db/schema/courses.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const categories = sqliteTable('categories', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:      text('name').unique().notNull(),
  slug:      text('slug').unique().notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})

export const courses = sqliteTable('courses', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:          text('title').notNull(),
  slug:           text('slug').unique().notNull(),
  description:    text('description'),
  shortDesc:      text('short_desc'),
  thumbnailUrl:   text('thumbnail_url'),
  previewUrl:     text('preview_url'),
  type:           text('type', { enum: ['RECORDED', 'LIVE'] }).notNull(),
  status:         text('status', {
                    enum: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED']
                  }).default('DRAFT').notNull(),
  level:          text('level', { enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] }),
  language:       text('language').default('English'),
  price:          real('price').default(0),
  discountPrice:  real('discount_price'),
  accessDuration: integer('access_duration'),
  authorId:       text('author_id').notNull().references(() => users.id),
  categoryId:     text('category_id').references(() => categories.id),
  isFeatured:     integer('is_featured', { mode: 'boolean' }).default(false),
  seoTitle:       text('seo_title'),
  seoDesc:        text('seo_description'),
  ogImageUrl:     text('og_image_url'),
  createdAt:      text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt:      text('updated_at').$defaultFn(() => new Date().toISOString()),
})

export type Course    = typeof courses.$inferSelect
export type NewCourse = typeof courses.$inferInsert
```

**Indexes:**
```sql
CREATE INDEX idx_courses_slug     ON courses(slug);
CREATE INDEX idx_courses_status   ON courses(status);
CREATE INDEX idx_courses_author   ON courses(author_id);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_categories_slug  ON categories(slug);
```

---

### Business Logic

**Rules:**
1. Only `role = TEACHER` with `status = ACTIVE` (approved) or `role = ADMIN` can create courses.
2. Slug is auto-generated from title (`slugify(title)`) and must be globally unique. If a collision occurs, append a short random suffix (`-a3b9`).
3. `price` must be >= 0. Free courses have `price = 0`.
4. `discountPrice` must be `< price` if set.
5. `accessDuration = null` means lifetime access.
6. Thumbnail upload uses a **presigned S3 PUT URL** — the client uploads directly to S3; the server only stores the resulting public URL.
7. Allowed thumbnail MIME types: `image/jpeg`, `image/png`, `image/webp`. Max size: **5 MB**.
8. Course is always created with `status = DRAFT`.

**Slug Generation Flow:**
```
slugify("Introduction to Python")
  → "introduction-to-python"
  → check uniqueness in DB
  → if taken → "introduction-to-python-a3b9"
```

---

### API

#### `GET /api/categories`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Web Development", "slug": "web-development" },
    { "id": "uuid", "name": "Data Science",    "slug": "data-science"    }
  ]
}
```

---

#### `POST /api/courses` — Create Course Draft

**Auth:** Required. Role: `TEACHER` (status `ACTIVE`) or `ADMIN`.

**Request (Zod schema):**
```typescript
// lib/validations/course.schema.ts
export const createCourseSchema = z.object({
  title:          z.string().min(10).max(120),
  shortDesc:      z.string().max(200).optional(),
  description:    z.string().optional(),
  type:           z.enum(['RECORDED', 'LIVE']),
  level:          z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  language:       z.string().default('English'),
  price:          z.number().min(0),
  discountPrice:  z.number().positive().optional(),
  accessDuration: z.number().int().positive().optional(),
  categoryId:     z.string().uuid().optional(),
  thumbnailUrl:   z.string().url().optional(),
  previewUrl:     z.string().url().optional(),
})
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id":     "uuid",
    "slug":   "introduction-to-python",
    "status": "DRAFT",
    "title":  "Introduction to Python"
  }
}
```

**Error Responses:**
| Status | Code | Trigger |
|--------|------|---------|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields |
| `403` | `TEACHER_NOT_APPROVED` | Teacher status is not ACTIVE |
| `400` | `INVALID_DISCOUNT_PRICE` | discountPrice >= price |
| `500` | `INTERNAL_ERROR` | DB failure |

---

#### `POST /api/uploads/course-thumbnail` — Get S3 Presigned URL

**Auth:** Required. Role: `TEACHER` or `ADMIN`.

**Request:**
```typescript
export const thumbnailPresignSchema = z.object({
  filename:  z.string().max(255),
  mimeType:  z.enum(['image/jpeg', 'image/png', 'image/webp']),
  sizeBytes: z.number().int().max(5 * 1024 * 1024),
})
```

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.amazonaws.com/bucket/thumbnails/uuid.jpg?X-Amz-...",
    "publicUrl": "https://cdn.yourlms.com/thumbnails/uuid.jpg",
    "expiresIn": 300
  }
}
```

---

#### `PATCH /api/courses/{id}` — Update Course Draft

**Auth:** Required. Role: Owner `TEACHER` or `ADMIN`.

Accepts any subset of `createCourseSchema` fields. Returns the updated course object.

**Error Responses:**
| Status | Code | Trigger |
|--------|------|---------|
| `404` | `COURSE_NOT_FOUND` | Course does not exist |
| `403` | `NOT_COURSE_OWNER` | Caller is not the author or Admin |
| `422` | `CANNOT_EDIT_PUBLISHED` | Cannot edit a PUBLISHED course |

---

### Backend Logic (Service Layer)

```typescript
// lib/services/course.service.ts

export class CourseService {
  async createCourse(
    dto: CreateCourseDto,
    authorId: string,
    authorRole: UserRole,
    authorStatus: UserStatus,
  ): Promise<{ id: string; slug: string; status: CourseStatus }> {
    if (authorRole === 'TEACHER' && authorStatus !== 'ACTIVE') {
      throw new AppError('TEACHER_NOT_APPROVED', 403)
    }
    if (dto.discountPrice !== undefined && dto.discountPrice >= dto.price) {
      throw new AppError('INVALID_DISCOUNT_PRICE', 400)
    }
    const slug = await this.generateUniqueSlug(dto.title)
    const [course] = await db
      .insert(courses)
      .values({ ...dto, slug, authorId, status: 'DRAFT' })
      .returning({ id: courses.id, slug: courses.slug, status: courses.status })
    return course
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true })
    const existing = await db.query.courses.findFirst({ where: eq(courses.slug, base) })
    if (!existing) return base
    const suffix = crypto.randomBytes(2).toString('hex')
    return `${base}-${suffix}`
  }

  async getThumbnailPresignedUrl(
    filename: string,
    mimeType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    const key       = `thumbnails/${crypto.randomUUID()}-${filename}`
    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: key, ContentType: mimeType }),
      { expiresIn: 300 },
    )
    return { uploadUrl, publicUrl: `${process.env.NEXT_PUBLIC_CDN_URL}/${key}` }
  }

  async updateCourse(
    courseId: string,
    callerId: string,
    callerRole: UserRole,
    dto: Partial<UpdateCourseDto>,
  ): Promise<Course> {
    const course = await this.findCourseOrThrow(courseId)
    if (callerRole !== 'ADMIN' && course.authorId !== callerId) throw new AppError('NOT_COURSE_OWNER', 403)
    if (course.status === 'PUBLISHED') throw new AppError('CANNOT_EDIT_PUBLISHED', 422)
    const [updated] = await db
      .update(courses)
      .set({ ...dto, updatedAt: new Date().toISOString() })
      .where(eq(courses.id, courseId))
      .returning()
    return updated
  }

  private async findCourseOrThrow(id: string): Promise<Course> {
    const course = await db.query.courses.findFirst({ where: eq(courses.id, id) })
    if (!course) throw new AppError('COURSE_NOT_FOUND', 404)
    return course
  }
}
```

---

### Unit Tests

```typescript
// __tests__/services/course.service.test.ts
describe('CourseService.createCourse()', () => {
  it('creates a DRAFT course for an approved TEACHER', async () => {
    const result = await courseService.createCourse(
      { title: 'Python for Beginners', type: 'RECORDED', price: 0 },
      'teacher-uuid', 'TEACHER', 'ACTIVE',
    )
    expect(result.status).toBe('DRAFT')
    expect(result.slug).toMatch(/^python-for-beginners/)
  })

  it('throws TEACHER_NOT_APPROVED for pending teacher', async () => {
    await expect(
      courseService.createCourse({ title: 'Test', type: 'RECORDED', price: 0 },
        'teacher-uuid', 'TEACHER', 'PENDING_APPROVAL')
    ).rejects.toMatchObject({ code: 'TEACHER_NOT_APPROVED' })
  })

  it('auto-resolves slug collision with a 4-char hex suffix', async () => {
    await courseService.createCourse({ title: 'Dupe Title', type: 'RECORDED', price: 0 }, 't', 'TEACHER', 'ACTIVE')
    const second = await courseService.createCourse({ title: 'Dupe Title', type: 'RECORDED', price: 0 }, 't', 'TEACHER', 'ACTIVE')
    expect(second.slug).toMatch(/^dupe-title-[a-f0-9]{4}$/)
  })

  it('throws INVALID_DISCOUNT_PRICE when discountPrice >= price', async () => {
    await expect(
      courseService.createCourse({ title: 'Bad Price', type: 'RECORDED', price: 100, discountPrice: 150 }, 't', 'TEACHER', 'ACTIVE')
    ).rejects.toMatchObject({ code: 'INVALID_DISCOUNT_PRICE' })
  })

  it('allows ADMIN to create a course', async () => {
    const result = await courseService.createCourse({ title: 'Admin Course', type: 'RECORDED', price: 0 }, 'admin-uuid', 'ADMIN', 'ACTIVE')
    expect(result.status).toBe('DRAFT')
  })
})

describe('CourseService.updateCourse()', () => {
  it('updates title for course owner', async () => { /* ... */ })
  it('allows ADMIN to update any course', async () => { /* ... */ })
  it('throws NOT_COURSE_OWNER for non-owner teacher', async () => { /* ... */ })
  it('throws CANNOT_EDIT_PUBLISHED for published course', async () => { /* ... */ })
  it('throws COURSE_NOT_FOUND for unknown courseId', async () => { /* ... */ })
})
```

---

### Integration Tests

```typescript
// __tests__/integration/course-create.test.ts
describe('POST /api/courses [integration]', () => {
  it('returns 201 with slug and DRAFT status for approved teacher', async () => {
    const res = await testClient.post('/api/courses').set('Authorization', `Bearer ${teacherToken}`)
      .json({ title: 'React Masterclass', type: 'RECORDED', price: 49.99 })
    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('DRAFT')
    expect(res.body.data.slug).toBe('react-masterclass')
  })
  it('returns 403 for PENDING_APPROVAL teacher', async () => { /* ... */ })
  it('returns 403 for STUDENT role', async () => { /* ... */ })
  it('returns 400 on invalid Zod input (price = -1)', async () => { /* ... */ })
})

describe('POST /api/uploads/course-thumbnail [integration]', () => {
  it('returns a valid presigned upload URL', async () => { /* ... */ })
  it('rejects unsupported MIME type', async () => { /* ... */ })
  it('rejects file size > 5 MB', async () => { /* ... */ })
})

describe('PATCH /api/courses/{id} [integration]', () => {
  it('updates course title for owner', async () => { /* ... */ })
  it('returns 403 for non-owner', async () => { /* ... */ })
  it('returns 422 when editing a PUBLISHED course', async () => { /* ... */ })
})
```

---

## Slice 2.2 — Curriculum Builder (Modules & Lessons)

### Goal
A Teacher can build a full course curriculum via a drag-and-drop builder UI. Modules (chapters) can be created, reordered, renamed, and deleted. Each module contains Lessons of type `VIDEO`, `ARTICLE`, `QUIZ`, or `LIVE_SESSION`. Video lessons support direct-to-S3 upload with a progress indicator. Any lesson can be marked as a free preview. Lesson ordering is preserved via an integer `order` field.

---

### Database Schema

```typescript
// lib/db/schema/curriculum.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const modules = sqliteTable('modules', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId:  text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  title:     text('title').notNull(),
  order:     integer('order').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})

export const lessons = sqliteTable('lessons', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  moduleId:  text('module_id').notNull().references(() => modules.id, { onDelete: 'cascade' }),
  title:     text('title').notNull(),
  type:      text('type', { enum: ['VIDEO', 'ARTICLE', 'QUIZ', 'LIVE_SESSION'] }).notNull(),
  order:     integer('order').notNull(),
  videoUrl:  text('video_url'),
  duration:  integer('duration'),
  content:   text('content'),
  isPreview: integer('is_preview', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})
```

**Indexes:**
```sql
CREATE INDEX idx_modules_course ON modules(course_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
```

---

### Business Logic

**Rules:**
1. Only the course **owner** (Teacher) or **Admin** can manage curriculum.
2. Course must have `status = DRAFT` or `PENDING_REVIEW` to allow edits.
3. Module `order` values are 1-indexed and contiguous. Reorder updates all affected rows in one transaction.
4. Lesson `order` follows the same rule within each module.
5. Video upload uses a **presigned S3 PUT URL**. Max video size: **2 GB**. Allowed types: `video/mp4`, `video/webm`.
6. `duration` (seconds) is set by the client after `ffprobe` extraction via `PATCH /api/lessons/{id}`.
7. At most **3 lessons per course** can have `isPreview = true`.
8. Deleting a module cascades to all its lessons.

**Reorder Algorithm:**
```
PATCH /api/courses/{id}/modules/reorder
  body: { orderedIds: ["mod-c", "mod-a", "mod-b"] }

  → transaction:
      UPDATE modules SET order = 1 WHERE id = 'mod-c'
      UPDATE modules SET order = 2 WHERE id = 'mod-a'
      UPDATE modules SET order = 3 WHERE id = 'mod-b'
```

---

### API

#### `POST /api/courses/{courseId}/modules`

```typescript
export const createModuleSchema = z.object({ title: z.string().min(2).max(120) })
```

**Response `201`:** `{ "id": "uuid", "title": "Getting Started", "order": 1 }`

#### `PATCH /api/modules/{id}` — Update Module title. Returns updated module.

#### `DELETE /api/modules/{id}` — Cascade deletes all lessons. Returns `204`.

#### `PATCH /api/courses/{courseId}/modules/reorder`

```typescript
export const reorderSchema = z.object({ orderedIds: z.array(z.string().uuid()).min(1) })
```

#### `POST /api/modules/{moduleId}/lessons`

```typescript
export const createLessonSchema = z.object({
  title:     z.string().min(2).max(120),
  type:      z.enum(['VIDEO', 'ARTICLE', 'QUIZ', 'LIVE_SESSION']),
  isPreview: z.boolean().default(false),
})
```

**Response `201`:** `{ "id": "uuid", "title": "Intro Video", "type": "VIDEO", "order": 1, "isPreview": false }`

#### `PATCH /api/lessons/{id}` — Update Lesson

```typescript
export const updateLessonSchema = z.object({
  title:     z.string().min(2).max(120).optional(),
  content:   z.string().optional(),
  videoUrl:  z.string().url().optional(),
  duration:  z.number().int().positive().optional(),
  isPreview: z.boolean().optional(),
})
```

**Error:** `409 MAX_PREVIEWS_EXCEEDED` — Setting `isPreview = true` would exceed 3 free previews.

#### `DELETE /api/lessons/{id}` — Returns `204`. Reorders remaining lessons.

#### `PATCH /api/modules/{moduleId}/lessons/reorder` — Same shape: `{ orderedIds: string[] }`.

#### `POST /api/uploads/lesson-video` — Get Video Presigned URL

```typescript
export const videoPresignSchema = z.object({
  lessonId:  z.string().uuid(),
  filename:  z.string().max(255),
  mimeType:  z.enum(['video/mp4', 'video/webm']),
  sizeBytes: z.number().int().max(2 * 1024 * 1024 * 1024),
})
```

**Response `200`:** `{ "uploadUrl": "...", "publicUrl": "...", "expiresIn": 3600 }`

#### `GET /api/courses/{courseId}/curriculum` — Full curriculum (Teacher view, includes videoUrls)

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid", "title": "Getting Started", "order": 1,
      "lessons": [
        { "id": "uuid", "title": "Intro Video", "type": "VIDEO", "order": 1,
          "duration": 312, "isPreview": true, "videoUrl": "https://cdn.yourlms.com/..." }
      ]
    }
  ]
}
```

---

### Backend Logic (Service Layer)

```typescript
// lib/services/course.service.ts (continued)

async addModule(courseId: string, callerId: string, callerRole: UserRole, title: string): Promise<Module> {
  await this.assertCourseOwnerAndEditable(courseId, callerId, callerRole)
  const lastModule = await db.query.modules.findFirst({
    where: eq(modules.courseId, courseId),
    orderBy: [desc(modules.order)],
  })
  const order = (lastModule?.order ?? 0) + 1
  const [mod] = await db.insert(modules).values({ courseId, title, order }).returning()
  return mod
}

async reorderModules(courseId: string, callerId: string, callerRole: UserRole, orderedIds: string[]): Promise<void> {
  await this.assertCourseOwnerAndEditable(courseId, callerId, callerRole)
  await db.transaction(async (tx) => {
    for (let i = 0; i < orderedIds.length; i++) {
      await tx.update(modules).set({ order: i + 1, updatedAt: new Date().toISOString() })
        .where(and(eq(modules.id, orderedIds[i]), eq(modules.courseId, courseId)))
    }
  })
}

async addLesson(moduleId: string, callerId: string, callerRole: UserRole, dto: CreateLessonDto): Promise<Lesson> {
  const mod = await db.query.modules.findFirst({ where: eq(modules.id, moduleId) })
  if (!mod) throw new AppError('MODULE_NOT_FOUND', 404)
  await this.assertCourseOwnerAndEditable(mod.courseId, callerId, callerRole)
  if (dto.isPreview) await this.assertPreviewLimit(mod.courseId)
  const lastLesson = await db.query.lessons.findFirst({
    where: eq(lessons.moduleId, moduleId),
    orderBy: [desc(lessons.order)],
  })
  const order = (lastLesson?.order ?? 0) + 1
  const [lesson] = await db.insert(lessons).values({ ...dto, moduleId, order }).returning()
  return lesson
}

async updateLesson(lessonId: string, callerId: string, callerRole: UserRole, dto: UpdateLessonDto): Promise<Lesson> {
  const lesson = await db.query.lessons.findFirst({ where: eq(lessons.id, lessonId) })
  if (!lesson) throw new AppError('LESSON_NOT_FOUND', 404)
  const mod = await db.query.modules.findFirst({ where: eq(modules.id, lesson.moduleId) })
  await this.assertCourseOwnerAndEditable(mod!.courseId, callerId, callerRole)
  if (dto.isPreview === true && !lesson.isPreview) await this.assertPreviewLimit(mod!.courseId)
  const [updated] = await db.update(lessons)
    .set({ ...dto, updatedAt: new Date().toISOString() })
    .where(eq(lessons.id, lessonId)).returning()
  return updated
}

private async assertPreviewLimit(courseId: string): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(and(eq(modules.courseId, courseId), eq(lessons.isPreview, true)))
  if (count >= 3) throw new AppError('MAX_PREVIEWS_EXCEEDED', 409)
}

private async assertCourseOwnerAndEditable(courseId: string, callerId: string, callerRole: UserRole): Promise<void> {
  const course = await this.findCourseOrThrow(courseId)
  if (callerRole !== 'ADMIN' && course.authorId !== callerId) throw new AppError('NOT_COURSE_OWNER', 403)
  if (course.status === 'PUBLISHED' || course.status === 'ARCHIVED') throw new AppError('CANNOT_EDIT_PUBLISHED', 422)
}
```

---

### Unit Tests

```typescript
describe('CourseService.addModule()', () => {
  it('adds a module with order = 1 to an empty course', async () => { /* ... */ })
  it('increments order for subsequent modules', async () => { /* ... */ })
  it('throws NOT_COURSE_OWNER for non-owner teacher', async () => { /* ... */ })
  it('throws CANNOT_EDIT_PUBLISHED for published course', async () => { /* ... */ })
})

describe('CourseService.reorderModules()', () => {
  it('updates order values in a single transaction', async () => { /* ... */ })
  it('ignores IDs not belonging to the course', async () => { /* ... */ })
})

describe('CourseService.addLesson()', () => {
  it('adds VIDEO lesson and increments order', async () => { /* ... */ })
  it('adds ARTICLE lesson with HTML content', async () => { /* ... */ })
  it('throws MAX_PREVIEWS_EXCEEDED when > 3 previews exist', async () => { /* ... */ })
  it('throws MODULE_NOT_FOUND for invalid moduleId', async () => { /* ... */ })
})

describe('CourseService.updateLesson()', () => {
  it('updates videoUrl and duration after upload', async () => { /* ... */ })
  it('throws MAX_PREVIEWS_EXCEEDED when promoting a 4th lesson to preview', async () => { /* ... */ })
})
```

---

### Integration Tests

```typescript
describe('POST /api/courses/{courseId}/modules [integration]', () => {
  it('creates module with auto-assigned order', async () => { /* ... */ })
  it('returns 403 for non-owner', async () => { /* ... */ })
  it('returns 422 for published course', async () => { /* ... */ })
})

describe('PATCH /api/courses/{courseId}/modules/reorder [integration]', () => {
  it('reorders modules in correct sequence', async () => { /* ... */ })
  it('is atomic — all orders update or none', async () => { /* ... */ })
})

describe('POST /api/modules/{moduleId}/lessons [integration]', () => {
  it('creates VIDEO lesson linked to module', async () => { /* ... */ })
  it('enforces 3-preview limit', async () => { /* ... */ })
})

describe('POST /api/uploads/lesson-video [integration]', () => {
  it('returns a presigned URL for valid mp4 request', async () => { /* ... */ })
  it('rejects oversized video (> 2 GB)', async () => { /* ... */ })
})
```

---

## Slice 2.3 — Course SEO & Publishing

### Goal
A Teacher completes SEO metadata (SEO title, meta description, OG image) then submits the course for review. The system validates completeness before any status change. Admins approve `PENDING_REVIEW` courses, pushing them to `PUBLISHED`. All invalid-publish attempts return detailed failure messages.

---

### Database Schema

No new tables. Extends `courses` with the `seoTitle`, `seoDesc`, `ogImageUrl` columns (already in schema from Slice 2.1).

**Status lifecycle:**
```
DRAFT → PENDING_REVIEW → PUBLISHED
PUBLISHED → ARCHIVED
ARCHIVED → DRAFT  (re-edit cycle)
```

---

### Business Logic

**Publish Readiness Checklist (enforced server-side):**

| Requirement | Check |
|-------------|-------|
| `title` set | `title.length >= 10` |
| `description` set | `description !== null` |
| `thumbnailUrl` set | `thumbnailUrl !== null` |
| `type` set | `type !== null` |
| `price >= 0` | `price >= 0` |
| At least 1 module | `modules.count >= 1` |
| All modules have >= 1 lesson | Per-module check |
| All VIDEO lessons have `videoUrl` | Per-lesson check |

**Status Transition Rules:**
1. `TEACHER` can move: `DRAFT → PENDING_REVIEW`.
2. `ADMIN` can move: `DRAFT → PUBLISHED`, `PENDING_REVIEW → PUBLISHED`, `PUBLISHED → ARCHIVED`.
3. No one can move from `PUBLISHED` back to `DRAFT` — must archive first.

---

### API

#### `POST /api/courses/{id}/submit` — Submit for Review (Teacher only)

Validates checklist → transitions to `PENDING_REVIEW` → fires Inngest event to notify Admins.

**Response `200`:** `{ "id": "uuid", "status": "PENDING_REVIEW" }`

**Error Responses:**
| Status | Code | Trigger |
|--------|------|---------|
| `422` | `COURSE_INCOMPLETE` | Checklist fails; includes `details` array |
| `422` | `INVALID_STATE_TRANSITION` | Course not in DRAFT |
| `403` | `NOT_COURSE_OWNER` | Caller is not the author |

**COURSE_INCOMPLETE body shape:**
```json
{
  "success": false,
  "error": {
    "code": "COURSE_INCOMPLETE",
    "message": "Course is missing required information before it can be submitted.",
    "details": [
      "thumbnailUrl is required",
      "Module 'Getting Started' has no lessons",
      "Lesson 'Intro Video' is missing a video file"
    ]
  }
}
```

---

#### `POST /api/courses/{id}/publish` — Publish (Admin only)

Validates checklist → transitions to `PUBLISHED` → updates FTS index → fires Inngest `course/published`.

**Response `200`:** `{ "id": "uuid", "slug": "react-masterclass", "status": "PUBLISHED" }`

---

#### `POST /api/courses/{id}/archive` — Archive (Admin only)

Sets `status = ARCHIVED`. Course disappears from public listing immediately. Existing enrollments are preserved.

---

#### `PATCH /api/courses/{id}/seo` — Update SEO Fields (Owner or Admin; DRAFT/PENDING_REVIEW only)

```typescript
export const seoSchema = z.object({
  seoTitle:   z.string().min(10).max(70).optional(),
  seoDesc:    z.string().min(50).max(160).optional(),
  ogImageUrl: z.string().url().optional(),
})
```

---

#### `GET /api/courses/{id}/publish-checklist` — Readiness Check (Owner or Admin)

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "ready": false,
    "checks": [
      { "name": "title",                "passed": true },
      { "name": "description",          "passed": true },
      { "name": "thumbnailUrl",         "passed": false, "message": "Thumbnail is required" },
      { "name": "hasModules",           "passed": true },
      { "name": "allModulesHaveLessons","passed": false, "message": "Module 'Module 2' has no lessons" },
      { "name": "allVideosUploaded",    "passed": true }
    ]
  }
}
```

---

### Backend Logic (Service Layer)

```typescript
// lib/services/course.service.ts (continued)

async checkPublishReadiness(courseId: string): Promise<{ ready: boolean; failures: string[] }> {
  const course = await this.findCourseOrThrow(courseId)
  const mods   = await db.query.modules.findMany({
    where: eq(modules.courseId, courseId),
    with:  { lessons: true },
    orderBy: [asc(modules.order)],
  })

  const failures: string[] = []
  if (!course.title || course.title.length < 10) failures.push('title is required (min 10 chars)')
  if (!course.description)                        failures.push('description is required')
  if (!course.thumbnailUrl)                       failures.push('thumbnailUrl is required')
  if (!course.type)                               failures.push('course type must be set')
  if (mods.length === 0)                          failures.push('at least 1 module is required')

  for (const mod of mods) {
    if (mod.lessons.length === 0) failures.push(`Module '${mod.title}' has no lessons`)
    for (const lesson of mod.lessons) {
      if (lesson.type === 'VIDEO' && !lesson.videoUrl) {
        failures.push(`Lesson '${lesson.title}' is missing a video file`)
      }
    }
  }
  return { ready: failures.length === 0, failures }
}

async submitForReview(courseId: string, teacherId: string): Promise<Course> {
  const course = await this.findCourseOrThrow(courseId)
  if (course.authorId !== teacherId) throw new AppError('NOT_COURSE_OWNER', 403)
  if (course.status !== 'DRAFT')     throw new AppError('INVALID_STATE_TRANSITION', 422)

  const { ready, failures } = await this.checkPublishReadiness(courseId)
  if (!ready) throw new AppError('COURSE_INCOMPLETE', 422, { details: failures })

  const [updated] = await db.update(courses)
    .set({ status: 'PENDING_REVIEW', updatedAt: new Date().toISOString() })
    .where(eq(courses.id, courseId)).returning()

  await inngest.send({ name: 'course/submitted-for-review', data: { courseId, teacherId, courseTitle: course.title } })
  return updated
}

async publishCourse(courseId: string, adminId: string): Promise<Course> {
  const course = await this.findCourseOrThrow(courseId)
  if (!['DRAFT', 'PENDING_REVIEW'].includes(course.status)) throw new AppError('INVALID_STATE_TRANSITION', 422)

  const { ready, failures } = await this.checkPublishReadiness(courseId)
  if (!ready) throw new AppError('COURSE_INCOMPLETE', 422, { details: failures })

  const [updated] = await db.update(courses)
    .set({ status: 'PUBLISHED', updatedAt: new Date().toISOString() })
    .where(eq(courses.id, courseId)).returning()

  await upsertCourseFts(courseId)
  await inngest.send({ name: 'course/published', data: { courseId, adminId, teacherId: course.authorId } })
  return updated
}
```

---

### Background Jobs (Inngest)

```typescript
// lib/inngest/course.functions.ts

export const notifyAdminOfSubmission = inngest.createFunction(
  { id: 'course/submitted-for-review', retries: 3 },
  { event: 'course/submitted-for-review' },
  async ({ event, step }) => {
    const { courseTitle, teacherId } = event.data
    const admins = await step.run('fetch-admins', () =>
      db.query.users.findMany({
        where: and(eq(users.role, 'ADMIN'), eq(users.status, 'ACTIVE')),
        columns: { email: true, fullName: true },
      })
    )
    await step.run('send-notifications', () =>
      Promise.all(admins.map((admin) =>
        resend.emails.send({
          from: 'noreply@yourlms.com', to: admin.email,
          subject: `Course Submitted for Review: ${courseTitle}`,
          html: renderCourseSubmissionEmail({ courseTitle, adminName: admin.fullName }),
        })
      ))
    )
  }
)

export const notifyTeacherOfPublish = inngest.createFunction(
  { id: 'course/published', retries: 3 },
  { event: 'course/published' },
  async ({ event, step }) => {
    const { teacherId } = event.data
    const teacher = await step.run('fetch-teacher', () =>
      db.query.users.findFirst({ where: eq(users.id, teacherId) })
    )
    await step.run('send-email', () =>
      resend.emails.send({
        from: 'noreply@yourlms.com', to: teacher!.email,
        subject: 'Your course is now LIVE! 🎉',
        html: renderCoursePublishedEmail({ fullName: teacher!.fullName }),
      })
    )
  }
)
```

---

### Unit Tests

```typescript
describe('CourseService.checkPublishReadiness()', () => {
  it('returns ready=true for a fully complete course', async () => { /* ... */ })
  it('fails when thumbnailUrl is missing', async () => { /* ... */ })
  it('fails when a module has no lessons', async () => { /* ... */ })
  it('fails when a VIDEO lesson has no videoUrl', async () => { /* ... */ })
  it('returns ALL failures, not just the first', async () => { /* ... */ })
})

describe('CourseService.submitForReview()', () => {
  it('transitions DRAFT → PENDING_REVIEW for complete course', async () => { /* ... */ })
  it('fires inngest course/submitted-for-review event', async () => { /* ... */ })
  it('throws COURSE_INCOMPLETE with details array for incomplete course', async () => { /* ... */ })
  it('throws INVALID_STATE_TRANSITION for non-DRAFT course', async () => { /* ... */ })
  it('throws NOT_COURSE_OWNER for non-owner', async () => { /* ... */ })
})

describe('CourseService.publishCourse()', () => {
  it('transitions PENDING_REVIEW → PUBLISHED', async () => { /* ... */ })
  it('transitions DRAFT → PUBLISHED directly (admin shortcut)', async () => { /* ... */ })
  it('fires inngest course/published event', async () => { /* ... */ })
  it('updates FTS index on publish', async () => { /* ... */ })
  it('throws INVALID_STATE_TRANSITION for already-published course', async () => { /* ... */ })
})
```

---

### Integration Tests

```typescript
describe('POST /api/courses/{id}/submit [integration]', () => {
  it('returns 200 and status=PENDING_REVIEW for complete course', async () => { /* ... */ })
  it('returns 422 COURSE_INCOMPLETE with details for incomplete course', async () => { /* ... */ })
  it('returns 403 for non-owner teacher', async () => { /* ... */ })
  it('returns 403 for STUDENT', async () => { /* ... */ })
})

describe('POST /api/courses/{id}/publish [integration]', () => {
  it('returns 200 and status=PUBLISHED for ADMIN', async () => { /* ... */ })
  it('returns 403 for TEACHER', async () => { /* ... */ })
  it('returns 422 for already-PUBLISHED course', async () => { /* ... */ })
})

describe('GET /api/courses/{id}/publish-checklist [integration]', () => {
  it('returns ready=false for a draft course missing thumbnail', async () => { /* ... */ })
  it('returns ready=true for a fully built course', async () => { /* ... */ })
})
```

---

## Slice 2.4 — Public Course Listing & Filters

### Goal
Any visitor can browse the course catalog at `/courses`. The listing supports **text search** (FTS5), **category**, **level**, **type** filters, **4 sort modes**, and cursor-based pagination. The page is ISR (60s revalidation). Filter-only results are Redis-cached for 60s.

---

### Database Schema

No new tables. Uses `courses`, `categories`, `users`, `enrollments`, and the FTS5 virtual table:

```sql
-- Created at migration time
CREATE VIRTUAL TABLE courses_fts USING fts5(
  title, description, content='courses', content_rowid='rowid'
);
```

---

### Business Logic

**Rules:**
1. Only `status = PUBLISHED` courses are returned.
2. Full-text search uses **SQLite FTS5** (`MATCH` query). Falls back to `LIKE` for queries < 3 chars.
3. Cursor-based pagination: default 12 per page, max 48.
4. Sort options:
   - `newest` → `ORDER BY courses.createdAt DESC`
   - `price_asc` → `ORDER BY courses.price ASC`
   - `price_desc` → `ORDER BY courses.price DESC`
   - `popular` → `ORDER BY enrollmentCount DESC`
5. Search results (`q` present) are **not Redis-cached**. Filter-only results are cached 60s.
6. Each result card includes instructor name, avatar, enrollment count, lesson count, total duration.

---

### API

#### `GET /api/courses` — Public Course Listing

**Auth:** Not required.

**Query Parameters:**
```typescript
export const listCoursesSchema = z.object({
  q:        z.string().max(100).optional(),
  category: z.string().optional(),
  level:    z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']).optional(),
  type:     z.enum(['RECORDED', 'LIVE']).optional(),
  sort:     z.enum(['newest', 'price_asc', 'price_desc', 'popular']).default('newest'),
  cursor:   z.string().optional(),
  limit:    z.coerce.number().min(1).max(48).default(12),
})
```

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid", "title": "React Masterclass", "slug": "react-masterclass",
      "shortDesc": "Build real-world apps with React 19",
      "thumbnailUrl": "https://cdn.yourlms.com/thumbnails/uuid.jpg",
      "price": 49.99, "discountPrice": 29.99,
      "type": "RECORDED", "level": "INTERMEDIATE",
      "category": { "name": "Web Development", "slug": "web-development" },
      "instructor": { "id": "uuid", "fullName": "Jane Smith", "avatarUrl": "https://..." },
      "enrollmentCount": 347, "lessonCount": 42, "totalDuration": 18720,
      "createdAt": "2026-09-28T08:00:00.000Z"
    }
  ],
  "meta": { "total": 128, "hasNext": true, "nextCursor": "eyJpZCI6InV1aWQifQ==" }
}
```

---

### Backend Logic (Service Layer)

```typescript
// lib/services/course.service.ts (continued)

async listPublicCourses(query: ListCoursesQuery): Promise<PaginatedResult<CourseCard>> {
  const { q, category, level, type, sort, cursor, limit } = query

  const cacheKey = q ? null : `courses:list:${JSON.stringify({ category, level, type, sort, cursor, limit })}`
  if (cacheKey) {
    const cached = await redis.get<PaginatedResult<CourseCard>>(cacheKey)
    if (cached) return cached
  }

  let categoryId: string | undefined
  if (category) {
    const cat = await db.query.categories.findFirst({ where: eq(categories.slug, category) })
    categoryId = cat?.id
  }

  const conditions: SQL[] = [eq(courses.status, 'PUBLISHED')]
  if (categoryId) conditions.push(eq(courses.categoryId, categoryId))
  if (level)      conditions.push(eq(courses.level, level))
  if (type)       conditions.push(eq(courses.type, type))
  if (cursor)     conditions.push(lt(courses.createdAt, cursor))

  if (q && q.length >= 3) {
    const ftsResults = await db.run(sql`SELECT rowid FROM courses_fts WHERE courses_fts MATCH ${q + '*'} LIMIT 100`)
    const courseIds  = (ftsResults.rows as { rowid: number }[]).map((r) => String(r.rowid))
    if (courseIds.length === 0) return { data: [], meta: { hasNext: false } }
    conditions.push(inArray(courses.id, courseIds))
  } else if (q) {
    conditions.push(like(courses.title, `%${q}%`))
  }

  const enrollmentCountSq = db
    .select({ courseId: enrollments.courseId, count: sql<number>`count(*)`.as('count') })
    .from(enrollments)
    .where(eq(enrollments.status, 'ACTIVE'))
    .groupBy(enrollments.courseId)
    .as('enrollment_counts')

  const orderBy =
    sort === 'price_asc'  ? [asc(courses.price)] :
    sort === 'price_desc' ? [desc(courses.price)] :
    sort === 'popular'    ? [desc(enrollmentCountSq.count)] :
                            [desc(courses.createdAt)]

  const rows = await db
    .select({
      id: courses.id, title: courses.title, slug: courses.slug,
      shortDesc: courses.shortDesc, thumbnailUrl: courses.thumbnailUrl,
      price: courses.price, discountPrice: courses.discountPrice,
      type: courses.type, level: courses.level, createdAt: courses.createdAt,
      category: { name: categories.name, slug: categories.slug },
      instructor: { id: users.id, fullName: users.fullName, avatarUrl: users.avatarUrl },
      enrollmentCount: sql<number>`coalesce(${enrollmentCountSq.count}, 0)`,
    })
    .from(courses)
    .leftJoin(categories,        eq(courses.categoryId, categories.id))
    .leftJoin(users,             eq(courses.authorId,   users.id))
    .leftJoin(enrollmentCountSq, eq(courses.id, enrollmentCountSq.courseId))
    .where(and(...conditions))
    .orderBy(...orderBy)
    .limit(limit + 1)

  const hasNext    = rows.length > limit
  const data       = hasNext ? rows.slice(0, limit) : rows
  const nextCursor = hasNext ? data[data.length - 1].createdAt : undefined
  const result     = { data, meta: { hasNext, nextCursor } }

  if (cacheKey) await redis.set(cacheKey, result, { ex: 60 })
  return result
}
```

---

### Frontend (ISR Page)

```typescript
// app/(public)/courses/page.tsx
export const revalidate = 60

export const metadata: Metadata = {
  title:       'Browse Courses — LMS Platform',
  description: 'Explore our library of recorded and live courses across web development, data science, design, and more.',
}

export default async function CoursesPage({ searchParams }: { searchParams: Record<string, string> }) {
  const initialData = await courseService.listPublicCourses({
    category: searchParams.category,
    level:    searchParams.level as any,
    type:     searchParams.type  as any,
    sort:     (searchParams.sort ?? 'newest') as any,
    limit:    12,
  })

  return (
    <main>
      <h1>Browse All Courses</h1>
      <CourseFilters categories={await courseService.getCategories()} />
      <Suspense fallback={<CourseGridSkeleton />}>
        <CourseGrid initialData={initialData} />
      </Suspense>
    </main>
  )
}
```

---

### Unit Tests

```typescript
describe('CourseService.listPublicCourses()', () => {
  it('returns only PUBLISHED courses', async () => { /* ... */ })
  it('filters by category slug', async () => { /* ... */ })
  it('filters by level=BEGINNER', async () => { /* ... */ })
  it('filters by type=LIVE', async () => { /* ... */ })
  it('sorts by price ascending', async () => { /* ... */ })
  it('returns FTS results for query >= 3 chars', async () => { /* ... */ })
  it('falls back to LIKE for query < 3 chars', async () => { /* ... */ })
  it('returns empty array when FTS finds no matches', async () => { /* ... */ })
  it('includes instructor name and avatar in each result', async () => { /* ... */ })
  it('returns hasNext=true and nextCursor when more results exist', async () => { /* ... */ })
  it('uses Redis cache for non-search requests', async () => { /* ... */ })
  it('skips Redis cache when q param is present', async () => { /* ... */ })
})
```

---

### Integration Tests

```typescript
describe('GET /api/courses [integration]', () => {
  it('returns 200 with published courses for unauthenticated user', async () => { /* ... */ })
  it('excludes DRAFT courses from results', async () => { /* ... */ })
  it('returns empty data for category with no courses', async () => { /* ... */ })
  it('respects ?limit=6 parameter', async () => { /* ... */ })
  it('returns next page via ?cursor param', async () => { /* ... */ })
  it('searches courses by ?q=python', async () => { /* ... */ })
  it('filters by ?level=BEGINNER', async () => { /* ... */ })
  it('sorts by ?sort=price_asc', async () => { /* ... */ })
  it('returns 400 for invalid ?sort value', async () => { /* ... */ })
})
```

---

## Slice 2.5 — Course Detail Page

### Goal
Any visitor can view the full course detail page at `/courses/:slug`. The page displays: overview (title, description, thumbnail), curriculum tree (modules + lesson metadata), instructor profile + stats, and a reviews section (read-only — write path is Wave 4). Preview lessons are playable by all visitors; other lesson `videoUrl` values are gated by enrollment. The page is ISR (30s revalidation) and includes JSON-LD `Course` structured data.

---

### Database Schema

```typescript
// lib/db/schema/reviews.ts
export const reviews = sqliteTable('reviews', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId:  text('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  studentId: text('student_id').notNull().references(() => users.id),
  rating:    integer('rating').notNull(),              // 1–5
  comment:   text('comment'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})
```

**Indexes:**
```sql
CREATE INDEX idx_reviews_course  ON reviews(course_id);
CREATE INDEX idx_reviews_student ON reviews(student_id);
CREATE UNIQUE INDEX idx_review_unique ON reviews(course_id, student_id);
```

**Computed at query-time (not stored):**
- `avgRating` — `AVG(reviews.rating)`
- `reviewCount` — `COUNT(reviews)`
- `enrollmentCount` — `COUNT(active enrollments)`
- `lessonCount` — `COUNT(lessons)`
- `totalDuration` — `SUM(lessons.duration)`

---

### Business Logic

**Rules:**
1. Only `status = PUBLISHED` courses are accessible publicly — any other status returns `404`.
2. Curriculum tree is returned without `videoUrl` by default.
3. `isPreview = true` lessons include `videoUrl` for **all** visitors (authenticated or not).
4. All lesson `videoUrls` are included when the requesting user **is enrolled**.
5. `isEnrolled` flag is derived from the requesting user's session (optional auth).
6. Instructor stats (`courseCount`, `studentCount`) are computed from their PUBLISHED courses.
7. Reviews are paginated (latest first, default 10 per page).
8. JSON-LD `Course` schema is rendered server-side in a `<script type="application/ld+json">` tag.

---

### API

#### `GET /api/courses/{slug}` — Course Detail

**Auth:** Optional (affects `isEnrolled` and `videoUrl` visibility).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid", "title": "React Masterclass", "slug": "react-masterclass",
    "description": "<p>Learn React 19 from scratch...</p>",
    "shortDesc": "Build real-world apps with React 19",
    "thumbnailUrl": "https://cdn.yourlms.com/thumbnails/uuid.jpg",
    "previewUrl": "https://cdn.yourlms.com/videos/preview.mp4",
    "type": "RECORDED", "level": "INTERMEDIATE", "language": "English",
    "price": 49.99, "discountPrice": 29.99, "accessDuration": null,
    "isEnrolled": false,
    "enrollmentCount": 347, "lessonCount": 42,
    "totalDuration": 18720, "avgRating": 4.7, "reviewCount": 89,
    "seoTitle": "React Masterclass | LMS Platform",
    "seoDesc": "Join 347 students learning React 19...",
    "category": { "name": "Web Development", "slug": "web-development" },
    "instructor": {
      "id": "uuid", "fullName": "Jane Smith", "avatarUrl": "https://...",
      "bio": "Senior engineer with 10 years React experience.",
      "courseCount": 4, "studentCount": 1289
    },
    "curriculum": [
      {
        "id": "uuid", "title": "Getting Started", "order": 1,
        "lessons": [
          { "id": "uuid", "title": "Welcome", "type": "VIDEO", "order": 1,
            "duration": 312, "isPreview": true, "videoUrl": "https://cdn.yourlms.com/videos/welcome.mp4" },
          { "id": "uuid", "title": "Setup", "type": "VIDEO", "order": 2,
            "duration": 540, "isPreview": false, "videoUrl": null }
        ]
      }
    ]
  }
}
```

---

#### `GET /api/courses/{slug}/reviews` — Paginated Reviews

**Auth:** Optional.

**Query:** `cursor`, `limit` (default 10, max 50).

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid", "rating": 5,
      "comment": "Absolutely fantastic course!",
      "createdAt": "2026-10-01T14:30:00.000Z",
      "student": { "fullName": "Alice Doe", "avatarUrl": "https://..." }
    }
  ],
  "meta": { "hasNext": true, "nextCursor": "eyJpZCI6InV1aWQifQ==" }
}
```

---

### Backend Logic (Service Layer)

```typescript
// lib/services/course.service.ts (continued)

async getCourseDetail(slug: string, requestingUserId?: string): Promise<CourseDetail> {
  const course = await db.query.courses.findFirst({
    where: and(eq(courses.slug, slug), eq(courses.status, 'PUBLISHED')),
  })
  if (!course) throw new AppError('COURSE_NOT_FOUND', 404)

  const instructor = await db.query.users.findFirst({
    where: eq(users.id, course.authorId),
    columns: { id: true, fullName: true, avatarUrl: true, bio: true },
  })

  const [instructorStats] = await db
    .select({
      courseCount:  sql<number>`count(distinct ${courses.id})`,
      studentCount: sql<number>`count(distinct ${enrollments.studentId})`,
    })
    .from(courses)
    .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
    .where(and(eq(courses.authorId, course.authorId), eq(courses.status, 'PUBLISHED')))

  const curriculum = await db.query.modules.findMany({
    where:   eq(modules.courseId, course.id),
    with:    { lessons: { orderBy: [asc(lessons.order)] } },
    orderBy: [asc(modules.order)],
  })

  const isEnrolled = requestingUserId
    ? !!(await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.studentId, requestingUserId),
          eq(enrollments.courseId, course.id),
          eq(enrollments.status, 'ACTIVE')
        ),
      }))
    : false

  const sanitizedCurriculum = curriculum.map((mod) => ({
    ...mod,
    lessons: mod.lessons.map((lesson) => ({
      ...lesson,
      videoUrl: lesson.isPreview || isEnrolled ? lesson.videoUrl : null,
    })),
  }))

  const [stats] = await db
    .select({
      enrollmentCount: sql<number>`count(distinct ${enrollments.studentId})`,
      lessonCount:     sql<number>`count(distinct ${lessons.id})`,
      totalDuration:   sql<number>`coalesce(sum(${lessons.duration}), 0)`,
      avgRating:       sql<number>`coalesce(avg(${reviews.rating}), 0)`,
      reviewCount:     sql<number>`count(distinct ${reviews.id})`,
    })
    .from(courses)
    .leftJoin(modules,     eq(modules.courseId,     courses.id))
    .leftJoin(lessons,     eq(lessons.moduleId,     modules.id))
    .leftJoin(enrollments, eq(enrollments.courseId, courses.id))
    .leftJoin(reviews,     eq(reviews.courseId,     courses.id))
    .where(eq(courses.id, course.id))

  return { ...course, isEnrolled, instructor: { ...instructor!, ...instructorStats }, curriculum: sanitizedCurriculum, ...stats }
}
```

---

### Frontend (ISR Page)

```typescript
// app/(public)/courses/[slug]/page.tsx
export const revalidate = 30

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const course = await courseService.getCourseDetail(params.slug).catch(() => null)
  if (!course) return { title: 'Course Not Found' }
  return {
    title:       course.seoTitle ?? `${course.title} | LMS Platform`,
    description: course.seoDesc  ?? course.shortDesc ?? undefined,
    openGraph: {
      title: course.seoTitle ?? course.title,
      description: course.seoDesc ?? course.shortDesc ?? undefined,
      images: course.ogImageUrl ? [course.ogImageUrl] : [],
      type: 'website',
    },
  }
}

export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  const session = await auth()
  const course  = await courseService.getCourseDetail(params.slug, session?.user?.id).catch(() => null)
  if (!course) notFound()

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Course',
    name: course.title,
    description: course.shortDesc ?? course.description,
    provider: { '@type': 'Organization', name: 'LMS Platform', sameAs: process.env.NEXT_PUBLIC_APP_URL },
    author:   { '@type': 'Person', name: course.instructor.fullName },
    aggregateRating: course.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: course.avgRating.toFixed(1),
      reviewCount: course.reviewCount,
      bestRating: '5', worstRating: '1',
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: course.discountPrice ?? course.price,
      priceCurrency: 'INR',
      availability: 'https://schema.org/InStock',
    },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CourseHero course={course} />
      <CourseTabs course={course} />
    </>
  )
}
```

---

### Unit Tests

```typescript
describe('CourseService.getCourseDetail()', () => {
  it('returns full course detail for a PUBLISHED course', async () => { /* ... */ })
  it('throws COURSE_NOT_FOUND for a DRAFT course slug', async () => { /* ... */ })
  it('throws COURSE_NOT_FOUND for unknown slug', async () => { /* ... */ })
  it('includes videoUrl for isPreview=true lessons (unauthenticated)', async () => { /* ... */ })
  it('returns videoUrl=null for non-preview lessons when not enrolled', async () => { /* ... */ })
  it('returns videoUrl for all lessons when user is enrolled', async () => { /* ... */ })
  it('includes instructor courseCount and studentCount', async () => { /* ... */ })
  it('returns avgRating=0 when no reviews exist', async () => { /* ... */ })
  it('computes totalDuration correctly across all modules', async () => { /* ... */ })
})
```

---

### Integration Tests

```typescript
describe('GET /api/courses/{slug} [integration]', () => {
  it('returns 200 with full detail for published course (unauthenticated)', async () => { /* ... */ })
  it('returns 404 for DRAFT course', async () => { /* ... */ })
  it('returns 404 for unknown slug', async () => { /* ... */ })
  it('returns isEnrolled=false for authenticated but non-enrolled student', async () => { /* ... */ })
  it('returns isEnrolled=true for enrolled student', async () => { /* ... */ })
  it('returns videoUrl for preview lessons to unauthenticated user', async () => { /* ... */ })
  it('hides videoUrl for non-preview lessons from unauthenticated user', async () => { /* ... */ })
  it('returns all lesson videoUrls to enrolled student', async () => { /* ... */ })
})

describe('GET /api/courses/{slug}/reviews [integration]', () => {
  it('returns paginated reviews for published course', async () => { /* ... */ })
  it('returns empty data for course with no reviews', async () => { /* ... */ })
})
```

---

## Wave 2 Shared Infrastructure

### Complete Table List — Wave 2

| Table | Purpose | First Used In |
|-------|---------|---------------|
| `categories` | Course category taxonomy | Slice 2.1 |
| `courses` | Core course entity with full metadata | Slice 2.1 |
| `modules` | Course chapters / sections | Slice 2.2 |
| `lessons` | Individual content units | Slice 2.2 |
| `reviews` | Student ratings and comments | Slice 2.5 (display-only; write path: Wave 4) |

**Run migrations:**
```bash
npx drizzle-kit generate   # diff schema → generate SQL migration files
npx drizzle-kit migrate    # apply to Turso database
```

---

### AWS S3 + CloudFront Configuration

```typescript
// lib/s3.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

export async function createPresignedPutUrl(key: string, mime: string, ttl = 300): Promise<string> {
  return getSignedUrl(
    s3Client,
    new PutObjectCommand({ Bucket: process.env.AWS_S3_BUCKET!, Key: key, ContentType: mime }),
    { expiresIn: ttl },
  )
}

export function getPublicCdnUrl(key: string): string {
  return `${process.env.NEXT_PUBLIC_CDN_URL}/${key}`
}
```

**S3 Bucket CORS policy (for browser presigned PUT uploads):**
```json
[
  {
    "AllowedHeaders": ["Content-Type", "Content-Length"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["https://yourlms.com", "http://localhost:3000"],
    "MaxAgeSeconds": 3000
  }
]
```

---

### FTS Index Helpers

```typescript
// lib/db/fts.ts

export async function upsertCourseFts(courseId: string): Promise<void> {
  await db.run(sql`
    INSERT INTO courses_fts(rowid, title, description)
    SELECT rowid, title, coalesce(description, '')
    FROM courses WHERE id = ${courseId}
    ON CONFLICT(rowid) DO UPDATE
      SET title = excluded.title, description = excluded.description
  `)
}

export async function removeCourseFts(courseId: string): Promise<void> {
  await db.run(sql`
    DELETE FROM courses_fts WHERE rowid = (SELECT rowid FROM courses WHERE id = ${courseId})
  `)
}
```

---

### Middleware Additions — Wave 2

```typescript
// lib/middleware/withRole.ts (additions)
export const withTeacherOrAdmin = withRole(['TEACHER', 'ADMIN'])
// Course owner checks are enforced in the service layer (NOT_COURSE_OWNER guard)
```

**Rate Limits — Wave 2:**
| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/courses` | 10 req | 1 hour / user |
| `POST /api/uploads/course-thumbnail` | 20 req | 1 hour / user |
| `POST /api/uploads/lesson-video` | 50 req | 1 hour / user |
| `GET /api/courses` | 100 req | 1 min / IP |
| `GET /api/courses/{slug}` | 200 req | 1 min / IP |

---

### Environment Variables (New in Wave 2)

```env
# AWS S3 + CloudFront
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=yourlms-media
NEXT_PUBLIC_CDN_URL=https://cdn.yourlms.com
```

> **Note:** Upstash Redis (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`) is already configured in Wave 1 for rate limiting. The same instance is reused for course listing caching in Wave 2.

---

### File Delivery Checklist

| File | Type | Slice |
|------|------|-------|
| `lib/db/schema/courses.ts` | Schema | 2.1 |
| `lib/db/schema/curriculum.ts` | Schema | 2.2 |
| `lib/db/schema/reviews.ts` | Schema | 2.5 |
| `lib/db/fts.ts` | FTS helpers | 2.3, 2.4 |
| `lib/s3.ts` | S3 presign helpers | 2.1, 2.2 |
| `lib/validations/course.schema.ts` | Zod | 2.1 – 2.3 |
| `lib/services/course.service.ts` | Service | 2.1 – 2.5 |
| `lib/inngest/course.functions.ts` | Inngest jobs | 2.3 |
| `app/api/categories/route.ts` | Route Handler | 2.1 |
| `app/api/courses/route.ts` | Route Handler | 2.1, 2.4 |
| `app/api/courses/[id]/route.ts` | Route Handler | 2.1 |
| `app/api/courses/[id]/submit/route.ts` | Route Handler | 2.3 |
| `app/api/courses/[id]/publish/route.ts` | Route Handler | 2.3 |
| `app/api/courses/[id]/archive/route.ts` | Route Handler | 2.3 |
| `app/api/courses/[id]/seo/route.ts` | Route Handler | 2.3 |
| `app/api/courses/[id]/publish-checklist/route.ts` | Route Handler | 2.3 |
| `app/api/courses/[id]/modules/route.ts` | Route Handler | 2.2 |
| `app/api/courses/[id]/modules/reorder/route.ts` | Route Handler | 2.2 |
| `app/api/courses/[id]/curriculum/route.ts` | Route Handler | 2.2 |
| `app/api/modules/[id]/route.ts` | Route Handler | 2.2 |
| `app/api/modules/[id]/lessons/route.ts` | Route Handler | 2.2 |
| `app/api/modules/[id]/lessons/reorder/route.ts` | Route Handler | 2.2 |
| `app/api/lessons/[id]/route.ts` | Route Handler | 2.2 |
| `app/api/uploads/course-thumbnail/route.ts` | Route Handler | 2.1 |
| `app/api/uploads/lesson-video/route.ts` | Route Handler | 2.2 |
| `app/(public)/courses/page.tsx` | ISR Page | 2.4 |
| `app/(public)/courses/[slug]/page.tsx` | ISR Page | 2.5 |
| `components/shared/CourseCard.tsx` | Component | 2.4 |
| `components/teacher/CourseWizard.tsx` | Component | 2.1 |
| `components/teacher/CurriculumBuilder.tsx` | Component | 2.2 |
| `__tests__/services/course.service.test.ts` | Unit Test | 2.1 – 2.5 |
| `__tests__/integration/course-create.test.ts` | Integration Test | 2.1 |
| `__tests__/integration/curriculum.test.ts` | Integration Test | 2.2 |
| `__tests__/integration/course-publish.test.ts` | Integration Test | 2.3 |
| `__tests__/integration/course-listing.test.ts` | Integration Test | 2.4 |
| `__tests__/integration/course-detail.test.ts` | Integration Test | 2.5 |

---

### Wave 2 Definition of Done

- [ ] A Teacher with `status = ACTIVE` can complete the 3-step wizard and save a course draft
- [ ] Thumbnail uploads go directly to S3 via presigned URL; URL stored in `courses.thumbnailUrl`
- [ ] A Teacher can build a full curriculum: add/rename/delete modules and lessons, reorder via drag-and-drop
- [ ] Video lesson files upload directly to S3 via presigned URL with a 2 GB size limit
- [ ] Free preview lessons (max 3 per course) are playable by unauthenticated visitors
- [ ] Publish readiness checklist correctly identifies all incomplete courses with detailed failure messages
- [ ] A Teacher can submit for review (`DRAFT → PENDING_REVIEW`); all active Admins are notified via email
- [ ] An Admin can publish a course directly or approve a submitted course (`PENDING_REVIEW → PUBLISHED`)
- [ ] Published courses appear in the public listing at `/courses` with correct filters and sort applied
- [ ] FTS5 index is updated on publish so full-text search immediately returns the new course
- [ ] `/courses` is ISR with 60s revalidation; filter-only API results are Redis-cached for 60s
- [ ] Course detail page at `/courses/:slug` is ISR with 30s revalidation
- [ ] JSON-LD `Course` structured data is rendered on every course detail page
- [ ] `isEnrolled` flag is correctly computed based on the authenticated user's active enrollment
- [ ] Non-preview, non-enrolled lesson `videoUrl` is `null` in the API response
- [ ] Unit test coverage >= 80% for `course.service.ts`
- [ ] All integration tests pass against a seeded test DB with at least 3 published courses
- [ ] AWS S3 CORS policy configured; direct browser-to-S3 uploads succeed in staging
- [ ] CloudFront CDN serves all media assets; no raw S3 URLs are exposed in production
- [ ] Drizzle migrations applied cleanly (new tables: `categories`, `modules`, `lessons`, `reviews`)
- [ ] FTS5 virtual table created and populated for all seed courses
- [ ] CI/CD pipeline passes lint + test + build on every PR
