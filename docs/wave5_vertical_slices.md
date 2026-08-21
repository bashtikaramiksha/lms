# 🌊 Wave 5 — Vertical Slices
## LMS Platform · Blog & CMS

> **Target Date:** December 8, 2026
> **Theme:** Content marketing engine — a full-featured blog, block-based CMS page builder, global site settings, SEO tooling, and XML sitemap generation to power organic growth.
> **Definition of Done:** All 5 slices pass unit and integration tests. An Admin can publish a blog post and a CMS page that are discoverable by search engines (with correct meta tags, JSON-LD, and sitemap entries). A Teacher can author and publish a blog post. Public readers can browse, filter, and read blog content. All pages render correctly via SSR/ISR.

---

## Table of Contents

1. [Slice 5.1 — Blog Post Authoring (Admin & Teacher)](#slice-51--blog-post-authoring-admin--teacher)
2. [Slice 5.2 — Public Blog Listing & Post Detail](#slice-52--public-blog-listing--post-detail)
3. [Slice 5.3 — CMS Page Builder (Admin)](#slice-53--cms-page-builder-admin)
4. [Slice 5.4 — Global Site Settings](#slice-54--global-site-settings)
5. [Slice 5.5 — SEO Infrastructure: Sitemap, robots.txt & JSON-LD](#slice-55--seo-infrastructure-sitemap-robotstxt--json-ld)
6. [Wave 5 Shared Infrastructure](#wave-5-shared-infrastructure)

---

## Slice 5.1 — Blog Post Authoring (Admin & Teacher)

### Goal

Admins and Teachers can create, edit, schedule, and publish blog posts through a dedicated authoring UI at `/admin/blog` and `/teacher/blog`. Posts are authored in the **TipTap** rich text editor (already in the stack). Each post has full SEO fields (meta title, meta description, OG image, canonical URL) and a scheduling system for future publishing. Scheduled publishing is handled by an **Inngest cron** function that checks for posts due every 15 minutes. Admins can manage all posts; Teachers can only manage their own.

---

### Database — New Tables

```typescript
// lib/db/schema/blog.ts

// Blog categories
export const blogCategories = sqliteTable('blog_categories', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:      text('name').notNull(),
  slug:      text('slug').unique().notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})

// Blog tags (many-to-many with posts)
export const blogTags = sqliteTable('blog_tags', {
  id:   text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').unique().notNull(),
  slug: text('slug').unique().notNull(),
})

// Join table: post ↔ tags
export const blogPostTags = sqliteTable('blog_post_tags', {
  postId: text('post_id').notNull().references(() => blogPosts.id, { onDelete: 'cascade' }),
  tagId:  text('tag_id').notNull().references(() => blogTags.id,  { onDelete: 'cascade' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.tagId] }),
}))
```

> The `blog_posts` table was defined in the architecture doc (Wave 1 schema). The additions here are the **categories** and **tags** tables.

**Migration:**
```sql
-- drizzle/migrations/0006_blog_categories_tags.sql
CREATE TABLE blog_categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE NOT NULL,
  created_at TEXT
);

CREATE TABLE blog_tags (
  id   TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL
);

CREATE TABLE blog_post_tags (
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES blog_tags(id)  ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Add categoryId FK to blog_posts (additive)
ALTER TABLE blog_posts ADD COLUMN category_id TEXT REFERENCES blog_categories(id);
```

---

### API

#### `GET /api/blog/categories` — List Categories

**Auth:** None (public).

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Web Development", "slug": "web-development", "postCount": 14 }
  ]
}
```

---

#### `POST /api/blog/posts` — Create Draft Post

**Auth:** Required. Role: `TEACHER` or `ADMIN`.

**Request (Zod schema):**
```typescript
// lib/validations/blog.schema.ts
export const createBlogPostSchema = z.object({
  title:        z.string().min(3).max(200),
  slug:         z.string().min(3).max(200).regex(/^[a-z0-9-]+$/),
  excerpt:      z.string().max(500).optional(),
  content:      z.string().optional(),          // TipTap HTML output
  featuredImage: z.string().url().optional(),
  categoryId:   z.string().uuid().optional(),
  tagIds:       z.array(z.string().uuid()).optional(),
  status:       z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']).default('DRAFT'),
  scheduledFor: z.string().datetime().optional(), // required when status = SCHEDULED
  seoTitle:     z.string().max(60).optional(),
  seoDesc:      z.string().max(160).optional(),
  ogImageUrl:   z.string().url().optional(),
  canonicalUrl: z.string().url().optional(),
})
```

> When `status = SCHEDULED`, `scheduledFor` must be a future datetime — validated by Zod's `.refine()`.

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id":     "uuid",
    "slug":   "getting-started-with-react",
    "status": "DRAFT"
  }
}
```

**Errors:**
| Code | Status | Meaning |
|------|--------|---------|
| `SLUG_CONFLICT` | 409 | A post with this slug already exists |
| `SCHEDULED_FOR_PAST` | 422 | `scheduledFor` is in the past |

---

#### `PATCH /api/blog/posts/:id` — Update Post

**Auth:** Required. Teachers can only update their own posts. Admins can update any.

**Request:** Same shape as `createBlogPostSchema` but all fields optional (partial update).

**Response `200`:**
```json
{
  "success": true,
  "data": { "id": "uuid", "status": "PUBLISHED", "publishedAt": "2026-12-01T10:00:00Z" }
}
```

> When `status` is changed to `PUBLISHED` and `publishedAt` is null, the server sets `publishedAt = now()`.

---

#### `DELETE /api/blog/posts/:id` — Delete Post

**Auth:** Required. Admin only (Teachers may only archive via status = DRAFT).

**Response `204 No Content`.**

---

#### `GET /api/admin/blog/posts` — Admin Post List (Paginated)

**Auth:** Required. Role: `ADMIN`.

**Query params:** `page`, `limit`, `status`, `authorId`, `categoryId`, `search`.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid", "title": "Getting Started with React", "slug": "getting-started-with-react",
      "status": "PUBLISHED", "author": { "fullName": "Jane Smith" },
      "category": { "name": "Web Development" },
      "publishedAt": "2026-12-01T10:00:00Z", "createdAt": "2026-11-28T12:00:00Z"
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 20, "hasNext": true }
}
```

---

### Inngest — Scheduled Post Publisher

```typescript
// lib/inngest/blog.functions.ts
export const publishScheduledPosts = inngest.createFunction(
  { id: 'blog-publish-scheduled', concurrency: 1 },
  { cron: '*/15 * * * *' },   // every 15 minutes

  async ({ step }) => {
    const now = new Date().toISOString()

    // Find all SCHEDULED posts whose scheduledFor has passed
    const duePosts = await step.run('find-due-posts', async () => {
      return db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.status, 'SCHEDULED'),
            lte(blogPosts.scheduledFor, now),
          )
        )
    })

    // Publish each one
    await step.run('publish-posts', async () => {
      for (const post of duePosts) {
        await db
          .update(blogPosts)
          .set({ status: 'PUBLISHED', publishedAt: now })
          .where(eq(blogPosts.id, post.id))
      }
    })

    return { published: duePosts.length }
  }
)
```

---

### Service Layer

```typescript
// lib/services/blog.service.ts
export class BlogService {
  async createPost(dto: CreateBlogPostDto, authorId: string): Promise<BlogPostRecord> {
    // 1. Check slug uniqueness
    const existing = await db.query.blogPosts.findFirst({ where: eq(blogPosts.slug, dto.slug) })
    if (existing) throw new ConflictError('SLUG_CONFLICT')

    // 2. Validate scheduledFor is future
    if (dto.status === 'SCHEDULED' && dto.scheduledFor) {
      if (new Date(dto.scheduledFor) <= new Date()) throw new UnprocessableError('SCHEDULED_FOR_PAST')
    }

    // 3. Insert post
    const [post] = await db.insert(blogPosts).values({
      ...dto,
      authorId,
      publishedAt: dto.status === 'PUBLISHED' ? new Date().toISOString() : null,
    }).returning()

    // 4. Insert tag associations
    if (dto.tagIds?.length) {
      await db.insert(blogPostTags).values(dto.tagIds.map(tagId => ({ postId: post.id, tagId })))
    }

    return post
  }

  async updatePost(postId: string, dto: UpdateBlogPostDto, requesterId: string, role: string): Promise<void> {
    const post = await db.query.blogPosts.findFirst({ where: eq(blogPosts.id, postId) })
    if (!post) throw new NotFoundError('POST_NOT_FOUND')
    if (role !== 'ADMIN' && post.authorId !== requesterId) throw new ForbiddenError('NOT_YOUR_POST')

    const patch: Partial<typeof blogPosts.$inferInsert> = { ...dto }
    if (dto.status === 'PUBLISHED' && !post.publishedAt) {
      patch.publishedAt = new Date().toISOString()
    }

    await db.update(blogPosts).set(patch).where(eq(blogPosts.id, postId))

    if (dto.tagIds !== undefined) {
      await db.delete(blogPostTags).where(eq(blogPostTags.postId, postId))
      if (dto.tagIds.length) {
        await db.insert(blogPostTags).values(dto.tagIds.map(tagId => ({ postId, tagId })))
      }
    }
  }
}
```

---

### Frontend

#### Routes
- `/admin/blog` → `src/app/(admin)/blog/page.tsx` — Post list + management table
- `/admin/blog/new` → `src/app/(admin)/blog/new/page.tsx` — Post creation form
- `/admin/blog/[id]/edit` → `src/app/(admin)/blog/[id]/edit/page.tsx` — Post editor
- `/teacher/blog` → `src/app/(teacher)/blog/page.tsx` — Teacher's own posts list
- `/teacher/blog/new` → `src/app/(teacher)/blog/new/page.tsx`

#### Components

```
src/components/blog/
├── PostEditorPage.tsx         # Shared editor shell (used by both admin + teacher routes)
├── PostEditorForm.tsx         # Full form: title, slug, content, SEO, scheduling
├── TipTapEditor.tsx           # Rich text editor wrapper (TipTap + extensions)
├── ImageUploadButton.tsx      # S3 presigned URL upload inside editor
├── SeoFieldsPanel.tsx         # Collapsible panel: meta title, desc, OG image, canonical
├── SchedulingPanel.tsx        # Status selector + date/time picker for SCHEDULED
├── TagSelector.tsx            # Multi-select combobox for blog tags (create-on-type)
├── PostsAdminTable.tsx        # Sortable, filterable table with Bulk actions
└── PostStatusBadge.tsx        # DRAFT / PUBLISHED / SCHEDULED badge with color
```

**`TipTapEditor` — extensions:**
```typescript
// components/blog/TipTapEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit     from '@tiptap/starter-kit'
import Image          from '@tiptap/extension-image'
import Link           from '@tiptap/extension-link'
import Highlight      from '@tiptap/extension-highlight'
import Placeholder    from '@tiptap/extension-placeholder'
import { DOMPurify }  from 'isomorphic-dompurify'

// Output is DOMPurify-sanitized before being stored/rendered
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'img', 'strong', 'em', 'code', 'pre', 'blockquote'] })
}
```

**Slug auto-generation:**
```typescript
// Derived from title on blur if slug field is empty
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}
```

---

### Tests

#### Unit — `BlogService`
```typescript
describe('BlogService.createPost', () => {
  it('throws SLUG_CONFLICT when a post with the same slug already exists')
  it('throws SCHEDULED_FOR_PAST when scheduledFor is in the past')
  it('sets publishedAt to now when status is PUBLISHED')
  it('leaves publishedAt null when status is DRAFT')
  it('inserts tag associations correctly')
})

describe('BlogService.updatePost', () => {
  it('throws NOT_YOUR_POST when a Teacher tries to update another author\'s post')
  it('allows Admin to update any post regardless of authorId')
  it('sets publishedAt when status transitions to PUBLISHED for the first time')
  it('replaces all tag associations on update')
})
```

#### Unit — `publishScheduledPosts` Inngest function
```typescript
describe('publishScheduledPosts cron', () => {
  it('publishes all SCHEDULED posts whose scheduledFor <= now()')
  it('does not publish posts whose scheduledFor is in the future')
  it('sets status = PUBLISHED and publishedAt = now for each due post')
  it('returns count of published posts')
})
```

#### Integration — Blog Admin API
```typescript
describe('POST /api/blog/posts', () => {
  it('returns 401 when unauthenticated')
  it('returns 403 when role is STUDENT')
  it('returns 409 when slug already exists')
  it('returns 422 when status is SCHEDULED and scheduledFor is in the past')
  it('returns 201 with correct shape for a valid DRAFT post')
  it('returns 201 with publishedAt set for status = PUBLISHED')
})

describe('PATCH /api/blog/posts/:id', () => {
  it('returns 403 when Teacher tries to update another author\'s post')
  it('allows Admin to update any post')
  it('updates tag associations correctly')
})
```

---

### Definition of Done

- [ ] Admin and Teacher can create, edit, and delete blog posts via the authoring UI
- [ ] TipTap rich text editor supports bold, italic, headings, lists, links, and image uploads
- [ ] Slug is auto-generated from title but can be manually overridden
- [ ] SEO fields panel is collapsible and pre-fills seoTitle from title when empty
- [ ] `status = SCHEDULED` requires a future date — form prevents past date selection
- [ ] Scheduled posts are automatically published within 15 minutes of their `scheduledFor` time
- [ ] Admin post table supports filtering by status, author, and category; bulk status update works
- [ ] Teachers only see their own posts in the `/teacher/blog` list
- [ ] All unit and integration tests pass

---

## Slice 5.2 — Public Blog Listing & Post Detail

### Goal

The public-facing blog at `/blog` renders an **ISR-cached listing** of published posts with pagination, category/tag filtering, and a search bar. Individual post pages at `/blog/[slug]` render the full post with the author's bio, related posts, and a social share bar. Both pages are **fully SSR/ISR rendered** for SEO: each page includes correct `<title>`, meta description, OG tags, and JSON-LD `BlogPosting` schema. No authentication is required.

---

### Database — Queries Used

No new tables. Reads from `blog_posts`, `blog_categories`, `blog_tags`, `blog_post_tags`, `users`.

**Listing query (Drizzle):**
```typescript
// lib/services/blog-public.service.ts

const posts = await db
  .select({
    id:           blogPosts.id,
    title:        blogPosts.title,
    slug:         blogPosts.slug,
    excerpt:      blogPosts.excerpt,
    featuredImage: blogPosts.featuredImage,
    publishedAt:  blogPosts.publishedAt,
    category:     { id: blogCategories.id, name: blogCategories.name, slug: blogCategories.slug },
    author:       { fullName: users.fullName, avatarUrl: users.avatarUrl },
  })
  .from(blogPosts)
  .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
  .leftJoin(users, eq(blogPosts.authorId, users.id))
  .where(
    and(
      eq(blogPosts.status, 'PUBLISHED'),
      categoryId ? eq(blogPosts.categoryId, categoryId) : undefined,
      search ? sql`${blogPosts.title} LIKE ${'%' + search + '%'}` : undefined,
    )
  )
  .orderBy(desc(blogPosts.publishedAt))
  .limit(limit)
  .offset(offset)
```

**Related posts query (same category, exclude current post):**
```typescript
const related = await db
  .select({ id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug,
            featuredImage: blogPosts.featuredImage, publishedAt: blogPosts.publishedAt })
  .from(blogPosts)
  .where(and(
    eq(blogPosts.status, 'PUBLISHED'),
    eq(blogPosts.categoryId, currentPost.categoryId),
    ne(blogPosts.id, currentPost.id),
  ))
  .orderBy(desc(blogPosts.publishedAt))
  .limit(3)
```

---

### API

#### `GET /api/blog/posts` — Public Post Listing

**Auth:** None.

**Query params:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `12` | Posts per page |
| `category` | `string (slug)` | — | Filter by category slug |
| `tag` | `string (slug)` | — | Filter by tag slug |
| `search` | `string` | — | Full-text search on title |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Getting Started with React",
      "slug": "getting-started-with-react",
      "excerpt": "Learn the fundamentals of React in this comprehensive guide.",
      "featuredImage": "https://cdn.yourlms.com/blog/react-intro.jpg",
      "publishedAt": "2026-12-01T10:00:00Z",
      "category": { "name": "Web Development", "slug": "web-development" },
      "author": { "fullName": "Jane Smith", "avatarUrl": "https://..." },
      "tags": [{ "name": "React", "slug": "react" }]
    }
  ],
  "meta": { "total": 42, "page": 1, "limit": 12, "hasNext": true }
}
```

---

#### `GET /api/blog/posts/:slug` — Single Post (Public)

**Auth:** None.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Getting Started with React",
    "slug": "getting-started-with-react",
    "content": "<h2>Introduction</h2><p>React is a...</p>",
    "excerpt": "Learn the fundamentals of React...",
    "featuredImage": "https://cdn.yourlms.com/blog/react-intro.jpg",
    "publishedAt": "2026-12-01T10:00:00Z",
    "category":  { "name": "Web Development", "slug": "web-development" },
    "author": {
      "fullName": "Jane Smith",
      "avatarUrl": "https://...",
      "bio": "Frontend engineer and educator with 10 years of experience."
    },
    "tags": [{ "name": "React", "slug": "react" }],
    "seo": {
      "seoTitle": "Getting Started with React — LMS Blog",
      "seoDesc": "A complete beginner's guide to React.",
      "ogImageUrl": "https://cdn.yourlms.com/blog/og/react-intro.jpg",
      "canonicalUrl": "https://yourlms.com/blog/getting-started-with-react"
    },
    "relatedPosts": [
      { "id": "uuid", "title": "React Hooks in Depth", "slug": "react-hooks-in-depth", "featuredImage": "https://...", "publishedAt": "2026-11-28T09:00:00Z" }
    ]
  }
}
```

**Errors:**
| Code | Status | Meaning |
|------|--------|---------|
| `POST_NOT_FOUND` | 404 | No published post with this slug |

---

### Frontend

#### Routes
- `/blog` → `src/app/(public)/blog/page.tsx` — ISR, revalidate: 300s
- `/blog/[slug]` → `src/app/(public)/blog/[slug]/page.tsx` — ISR, revalidate: 300s

#### Rendering Strategy
**ISR (Incremental Static Regeneration)** — revalidate every 300 seconds. On-demand revalidation via `revalidatePath('/blog')` called from the `PATCH /api/blog/posts/:id` handler when status changes to PUBLISHED.

#### Metadata Generation
```typescript
// app/(public)/blog/[slug]/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await blogPublicService.getPostBySlug(params.slug)
  if (!post) return {}
  return {
    title:       post.seo.seoTitle  ?? `${post.title} — LMS Blog`,
    description: post.seo.seoDesc  ?? post.excerpt,
    openGraph: {
      title:       post.seo.seoTitle ?? post.title,
      description: post.seo.seoDesc  ?? post.excerpt,
      images:      [{ url: post.seo.ogImageUrl ?? post.featuredImage }],
      type:        'article',
      publishedTime: post.publishedAt,
      authors:     [post.author.fullName],
    },
    alternates: { canonical: post.seo.canonicalUrl ?? `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}` },
  }
}
```

#### `generateStaticParams` — Pre-generate top posts
```typescript
export async function generateStaticParams() {
  const slugs = await blogPublicService.getPublishedSlugs()   // top 50 most recent
  return slugs.map(slug => ({ slug }))
}
```

#### Components

```
src/components/blog/
├── BlogListingPage.tsx        # Page shell: hero header, filter bar, post grid, pagination
├── BlogFilterBar.tsx          # Category pills + tag filter + search input
├── BlogPostCard.tsx           # Card: featured image, category badge, title, excerpt, author, date
├── BlogPostDetail.tsx         # Full post: featured image, content renderer, author bio card
├── RichContentRenderer.tsx    # Renders TipTap HTML safely (dangerouslySetInnerHTML + DOMPurify)
├── AuthorBioCard.tsx          # Author avatar, name, bio — displayed below post content
├── RelatedPostsGrid.tsx       # 3-column grid of related post cards
├── SocialShareBar.tsx         # Share buttons: Twitter/X, LinkedIn, copy link
└── BlogBreadcrumb.tsx         # Home > Blog > [Category] > [Post title]
```

**`RichContentRenderer` — DOMPurify on client:**
```tsx
// components/blog/RichContentRenderer.tsx
'use client'
import DOMPurify from 'dompurify'

export function RichContentRenderer({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html)
  return (
    <article
      className="prose prose-lg dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
```

> `prose` class comes from `@tailwindcss/typography` plugin — gives beautiful default styling to HTML content without per-tag CSS.

**`SocialShareBar` — copy-to-clipboard with visual feedback:**
```tsx
export function SocialShareBar({ url, title }: SocialShareBarProps) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  // …
}
```

---

### Tests

#### Unit — `BlogPublicService`
```typescript
describe('BlogPublicService.getPosts', () => {
  it('only returns PUBLISHED posts — never DRAFT or SCHEDULED')
  it('filters by category slug correctly')
  it('filters by tag slug correctly')
  it('applies full-text search on title')
  it('returns correct pagination meta (total, hasNext)')
})

describe('BlogPublicService.getPostBySlug', () => {
  it('returns 404 for a DRAFT post accessed by slug')
  it('returns 404 for a non-existent slug')
  it('returns the full post with author, tags, and relatedPosts')
  it('limits relatedPosts to 3 items from the same category')
})
```

#### Integration — Public Blog API
```typescript
describe('GET /api/blog/posts', () => {
  it('returns 200 with only published posts')
  it('filters by category param correctly')
  it('paginates correctly with page and limit params')
  it('returns empty data array when no posts match filters')
})

describe('GET /api/blog/posts/:slug', () => {
  it('returns 404 for a draft post')
  it('returns 200 with full post data for a published post')
  it('returns correct relatedPosts from the same category')
})
```

---

### Definition of Done

- [ ] `/blog` renders an ISR-cached grid of published posts with correct meta tags
- [ ] Category pills and tag filters update the post list without a full page reload (Next.js `useRouter` + `searchParams`)
- [ ] Blog search filters posts by title (debounced, 300ms)
- [ ] Each post card shows featured image, category badge, title, excerpt, author name, and relative date
- [ ] `/blog/[slug]` renders with correct OG tags, canonical URL, and `BlogPosting` JSON-LD (see Slice 5.5)
- [ ] Author bio card is displayed below the post content
- [ ] Related posts grid shows up to 3 posts from the same category
- [ ] Social share bar copies link to clipboard with a visual "Copied!" confirmation
- [ ] Non-existent or draft slugs return a Next.js 404 page
- [ ] All unit and integration tests pass

---

## Slice 5.3 — CMS Page Builder (Admin)

### Goal

Admins can create and manage **static content pages** (About, FAQ, Privacy Policy, Terms, etc.) at `/admin/cms`. Pages are composed from a library of **content blocks**: Hero, RichText, ImageWithText, FAQ Accordion, CTA Banner, and Divider. Each block is rendered as a JSON array stored in `pages.blocks`. The public page at `/[slug]` (catch-all route) reads the block array and renders the appropriate React component for each block type. New blocks can be added without schema migrations — only new React components are required.

---

### Database — `pages` Table (Defined in Architecture)

The `pages` table was defined in the architecture doc. No new migrations needed for this slice.

```typescript
// lib/db/schema/pages.ts (already exists)
export const pages = sqliteTable('pages', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:     text('title').notNull(),
  slug:      text('slug').unique().notNull(),
  blocks:    text('blocks', { mode: 'json' }),   // JSON array of ContentBlock[]
  status:    text('status', { enum: ['DRAFT', 'PUBLISHED'] }).default('DRAFT'),
  inNav:     integer('in_nav', { mode: 'boolean' }).default(false),
  navLabel:  text('nav_label'),
  seoTitle:  text('seo_title'),
  seoDesc:   text('seo_description'),
  ogImageUrl: text('og_image_url'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})
```

**ContentBlock TypeScript type:**
```typescript
// types/cms.types.ts

export type BlockType = 'HERO' | 'RICH_TEXT' | 'IMAGE_WITH_TEXT' | 'FAQ' | 'CTA_BANNER' | 'DIVIDER'

export interface BaseBlock { id: string; type: BlockType }

export interface HeroBlock extends BaseBlock {
  type: 'HERO'
  heading:    string
  subheading: string
  ctaLabel:   string
  ctaHref:    string
  bgImageUrl: string
}

export interface RichTextBlock extends BaseBlock {
  type:    'RICH_TEXT'
  content: string    // TipTap HTML
}

export interface ImageWithTextBlock extends BaseBlock {
  type:      'IMAGE_WITH_TEXT'
  imageUrl:  string
  imageAlt:  string
  heading:   string
  body:      string
  imageLeft: boolean
}

export interface FaqBlock extends BaseBlock {
  type:  'FAQ'
  items: Array<{ question: string; answer: string }>
}

export interface CtaBannerBlock extends BaseBlock {
  type:       'CTA_BANNER'
  heading:    string
  subheading: string
  ctaLabel:   string
  ctaHref:    string
  bgColor:    string
}

export interface DividerBlock extends BaseBlock {
  type: 'DIVIDER'
}

export type ContentBlock =
  | HeroBlock | RichTextBlock | ImageWithTextBlock
  | FaqBlock  | CtaBannerBlock | DividerBlock

export type BlocksArray = ContentBlock[]
```

---

### API

#### `GET /api/cms/pages` — List Pages (Admin)

**Auth:** Required. Role: `ADMIN`.

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid", "title": "About Us", "slug": "about",
      "status": "PUBLISHED", "inNav": true, "navLabel": "About",
      "updatedAt": "2026-11-30T12:00:00Z"
    }
  ]
}
```

---

#### `POST /api/cms/pages` — Create Page

**Auth:** Required. Role: `ADMIN`.

**Request (Zod):**
```typescript
export const createPageSchema = z.object({
  title:     z.string().min(1).max(200),
  slug:      z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  blocks:    z.array(z.any()).default([]),
  status:    z.enum(['DRAFT', 'PUBLISHED']).default('DRAFT'),
  inNav:     z.boolean().default(false),
  navLabel:  z.string().max(50).optional(),
  seoTitle:  z.string().max(60).optional(),
  seoDesc:   z.string().max(160).optional(),
  ogImageUrl: z.string().url().optional(),
})
```

**Response `201`:**
```json
{ "success": true, "data": { "id": "uuid", "slug": "about" } }
```

---

#### `PATCH /api/cms/pages/:id` — Update Page

**Auth:** Required. Role: `ADMIN`.

**Request:** Partial of `createPageSchema`.

**Side effect:** When `status` changes to `PUBLISHED`, calls `revalidatePath('/[slug]')` and `revalidatePath('/(public)/[slug]')` to purge ISR cache.

**Response `200`:**
```json
{ "success": true, "data": { "id": "uuid", "status": "PUBLISHED" } }
```

---

#### `GET /api/cms/pages/:slug` — Get Public Page Content

**Auth:** None (public).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "title": "About Us",
    "slug": "about",
    "blocks": [
      { "id": "blk-1", "type": "HERO", "heading": "About LMS Platform", "subheading": "Empowering educators worldwide.", "ctaLabel": "Browse Courses", "ctaHref": "/courses", "bgImageUrl": "https://..." },
      { "id": "blk-2", "type": "RICH_TEXT", "content": "<p>We believe in...</p>" }
    ],
    "seo": { "seoTitle": "About Us — LMS Platform", "seoDesc": "Learn about our mission..." }
  }
}
```

---

### Service Layer

```typescript
// lib/services/cms.service.ts
export class CmsService {
  async getPublicPage(slug: string): Promise<PublicPageDto> {
    const page = await db.query.pages.findFirst({
      where: and(eq(pages.slug, slug), eq(pages.status, 'PUBLISHED'))
    })
    if (!page) throw new NotFoundError('PAGE_NOT_FOUND')
    return page
  }

  async updatePage(pageId: string, dto: UpdatePageDto): Promise<void> {
    await db.update(pages)
      .set({ ...dto, updatedAt: new Date().toISOString() })
      .where(eq(pages.id, pageId))

    if (dto.status === 'PUBLISHED') {
      const page = await db.query.pages.findFirst({ where: eq(pages.id, pageId) })
      if (page) revalidatePath(`/${page.slug}`)
    }
  }
}
```

---

### Frontend

#### Routes
- `/admin/cms` → `src/app/(admin)/cms/page.tsx` — Page management list
- `/admin/cms/new` → `src/app/(admin)/cms/new/page.tsx`
- `/admin/cms/[id]/edit` → `src/app/(admin)/cms/[id]/edit/page.tsx`
- `/[slug]` → `src/app/(public)/[slug]/page.tsx` — **Catch-all ISR page** (revalidate on-demand)

#### Components

```
src/components/cms/
│
├── BlockEditor/
│   ├── BlockEditorCanvas.tsx      # DnD Kit sortable canvas of blocks
│   ├── BlockToolbar.tsx           # "+ Add Block" palette (lists all block types)
│   ├── BlockWrapper.tsx           # Each block: move up/down handles, edit, delete
│   ├── editors/
│   │   ├── HeroBlockEditor.tsx
│   │   ├── RichTextBlockEditor.tsx
│   │   ├── ImageWithTextBlockEditor.tsx
│   │   ├── FaqBlockEditor.tsx
│   │   └── CtaBannerBlockEditor.tsx
│   └── BlockEditorState.ts        # Zustand store: blocks array, addBlock, removeBlock, moveBlock
│
└── BlockRenderer/
    ├── BlockRenderer.tsx           # Switch on block.type → correct renderer component
    ├── HeroBlockRenderer.tsx
    ├── RichTextBlockRenderer.tsx
    ├── ImageWithTextBlockRenderer.tsx
    ├── FaqBlockRenderer.tsx        # Uses shadcn/ui Accordion
    ├── CtaBannerBlockRenderer.tsx
    └── DividerBlockRenderer.tsx
```

**`BlockEditorState` — Zustand store:**
```typescript
// components/cms/BlockEditor/BlockEditorState.ts
interface BlockEditorStore {
  blocks:      ContentBlock[]
  setBlocks:   (blocks: ContentBlock[]) => void
  addBlock:    (type: BlockType) => void
  removeBlock: (id: string) => void
  updateBlock: (id: string, patch: Partial<ContentBlock>) => void
  moveBlock:   (fromIndex: number, toIndex: number) => void
}

export const useBlockEditor = create<BlockEditorStore>((set) => ({
  blocks: [],
  setBlocks: (blocks) => set({ blocks }),
  addBlock: (type) => set((state) => ({
    blocks: [...state.blocks, createDefaultBlock(type)],
  })),
  removeBlock: (id) => set((state) => ({
    blocks: state.blocks.filter(b => b.id !== id),
  })),
  updateBlock: (id, patch) => set((state) => ({
    blocks: state.blocks.map(b => b.id === id ? { ...b, ...patch } : b),
  })),
  moveBlock: (from, to) => set((state) => {
    const blocks = [...state.blocks]
    const [moved] = blocks.splice(from, 1)
    blocks.splice(to, 0, moved)
    return { blocks }
  }),
}))
```

**`BlockRenderer` — public page rendering switch:**
```tsx
// components/cms/BlockRenderer/BlockRenderer.tsx
export function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'HERO':             return <HeroBlockRenderer          {...block} />
    case 'RICH_TEXT':        return <RichTextBlockRenderer      {...block} />
    case 'IMAGE_WITH_TEXT':  return <ImageWithTextBlockRenderer {...block} />
    case 'FAQ':              return <FaqBlockRenderer           {...block} />
    case 'CTA_BANNER':       return <CtaBannerBlockRenderer     {...block} />
    case 'DIVIDER':          return <DividerBlockRenderer />
    default:                 return null
  }
}
```

---

### Tests

#### Unit — `CmsService`
```typescript
describe('CmsService.getPublicPage', () => {
  it('throws PAGE_NOT_FOUND for a DRAFT page accessed publicly')
  it('throws PAGE_NOT_FOUND for a non-existent slug')
  it('returns the full page with blocks array for a PUBLISHED page')
})

describe('CmsService.updatePage', () => {
  it('calls revalidatePath with the correct slug when status changes to PUBLISHED')
  it('does not call revalidatePath when status remains DRAFT')
  it('updates the updatedAt timestamp on every save')
})
```

#### Unit — `BlockEditorState` (Zustand)
```typescript
describe('BlockEditorStore', () => {
  it('addBlock appends a new block with a unique id')
  it('removeBlock removes the block with the matching id')
  it('moveBlock correctly reorders blocks')
  it('updateBlock merges the patch into the correct block')
})
```

#### Integration — CMS API
```typescript
describe('POST /api/cms/pages', () => {
  it('returns 401 when unauthenticated')
  it('returns 403 when role is TEACHER or STUDENT')
  it('returns 409 when slug already exists')
  it('returns 201 with correct page shape')
})

describe('GET /api/cms/pages/:slug', () => {
  it('returns 404 for DRAFT pages')
  it('returns 200 with blocks array for PUBLISHED pages')
})
```

---

### Definition of Done

- [ ] Admin can create a CMS page with a slug, title, and block array
- [ ] Block editor canvas shows all blocks in order with DnD Kit drag handles for reordering
- [ ] "+ Add Block" palette lets Admin pick from all 6 block types
- [ ] Each block type has a dedicated inline editor form (no modal required)
- [ ] Changes auto-save to local Zustand state; manual "Save" button persists to API
- [ ] Publishing a page calls `revalidatePath` — the public page reflects changes within seconds
- [ ] Public `/[slug]` page renders all blocks correctly with proper ISR caching
- [ ] Pages set as `inNav = true` appear in the Navbar (consumed by `GET /api/cms/settings` — Slice 5.4)
- [ ] All unit and integration tests pass

---

## Slice 5.4 — Global Site Settings

### Goal

A single **Global Settings** admin panel at `/admin/settings` allows Admins to configure platform-wide values: logo, site name, favicon, default SEO meta, social media links, footer text, and navigation menu order. Settings are stored in a flat key-value `settings` table and exposed via a public `GET /api/cms/settings` endpoint that is consumed by the `RootLayout` (Server Component) on every page render — making settings available site-wide with no client-side fetch.

---

### Database — New `settings` Table

```typescript
// lib/db/schema/settings.ts
export const settings = sqliteTable('settings', {
  key:       text('key').primaryKey(),   // e.g. 'site_name', 'logo_url'
  value:     text('value'),              // JSON-serializable string
  updatedAt: text('updated_at').$defaultFn(() => new Date().toISOString()),
})
```

**Migration:**
```sql
-- drizzle/migrations/0007_settings.sql
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT
);

-- Seed defaults
INSERT INTO settings (key, value) VALUES
  ('site_name',          '"LMS Platform"'),
  ('logo_url',           'null'),
  ('favicon_url',        'null'),
  ('seo_default_title',  '"LMS Platform — Learn from the Best"'),
  ('seo_default_desc',   '"Browse hundreds of courses taught by expert instructors."'),
  ('seo_og_image',       'null'),
  ('footer_text',        '"© 2026 LMS Platform. All rights reserved."'),
  ('social_twitter',     'null'),
  ('social_linkedin',    'null'),
  ('social_youtube',     'null'),
  ('social_instagram',   'null'),
  ('announcement_text',  'null'),
  ('announcement_active','false');
```

---

### API

#### `GET /api/cms/settings` — Get All Public Settings

**Auth:** None (public — consumed by Server Components).

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "siteName":          "LMS Platform",
    "logoUrl":           "https://cdn.yourlms.com/brand/logo.png",
    "faviconUrl":        "https://cdn.yourlms.com/brand/favicon.ico",
    "seoDefaultTitle":   "LMS Platform — Learn from the Best",
    "seoDefaultDesc":    "Browse hundreds of courses taught by expert instructors.",
    "seoOgImage":        "https://cdn.yourlms.com/brand/og.jpg",
    "footerText":        "© 2026 LMS Platform. All rights reserved.",
    "social": {
      "twitter":   "https://twitter.com/yourlms",
      "linkedin":  "https://linkedin.com/company/yourlms",
      "youtube":   null,
      "instagram": null
    },
    "announcement": {
      "text":   "🎉 New courses added this week!",
      "active": true
    },
    "navPages": [
      { "slug": "about",   "navLabel": "About",   "order": 1 },
      { "slug": "contact", "navLabel": "Contact",  "order": 2 }
    ]
  }
}
```

> `navPages` is computed by joining `pages` where `inNav = true`, ordered by `navLabel` alphabetically.

**Caching:** This endpoint is called from a **Next.js Server Component with `unstable_cache`** — cached for 60 seconds, invalidated on settings update.

---

#### `PATCH /api/cms/settings` — Update Settings

**Auth:** Required. Role: `ADMIN`.

**Request:**
```typescript
export const updateSettingsSchema = z.object({
  siteName:        z.string().min(1).max(100).optional(),
  logoUrl:         z.string().url().nullable().optional(),
  faviconUrl:      z.string().url().nullable().optional(),
  seoDefaultTitle: z.string().max(60).optional(),
  seoDefaultDesc:  z.string().max(160).optional(),
  seoOgImage:      z.string().url().nullable().optional(),
  footerText:      z.string().max(300).optional(),
  social: z.object({
    twitter:   z.string().url().nullable().optional(),
    linkedin:  z.string().url().nullable().optional(),
    youtube:   z.string().url().nullable().optional(),
    instagram: z.string().url().nullable().optional(),
  }).optional(),
  announcement: z.object({
    text:   z.string().max(200),
    active: z.boolean(),
  }).optional(),
})
```

**Side effect:** After update, calls `revalidateTag('cms-settings')` to purge the cached `unstable_cache` result.

**Response `200`:**
```json
{ "success": true, "data": { "updated": ["siteName", "logoUrl"] } }
```

---

### Service Layer

```typescript
// lib/services/settings.service.ts
export class SettingsService {
  async getAll(): Promise<SiteSettings> {
    const rows = await db.select().from(settings)
    return this.deserialize(rows)
  }

  async update(dto: UpdateSettingsDto): Promise<string[]> {
    const entries = this.serialize(dto)
    for (const [key, value] of entries) {
      await db.insert(settings)
        .values({ key, value, updatedAt: new Date().toISOString() })
        .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date().toISOString() } })
    }
    revalidateTag('cms-settings')
    return entries.map(([key]) => key)
  }

  private deserialize(rows: SettingsRow[]): SiteSettings {
    const map = Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value ?? 'null')]))
    return {
      siteName:        map['site_name']        ?? 'LMS Platform',
      logoUrl:         map['logo_url'],
      // ... etc
    }
  }
}
```

---

### Frontend

#### Route
- `/admin/settings` → `src/app/(admin)/settings/page.tsx`

#### Root Layout Integration
```tsx
// app/layout.tsx (Server Component)
import { unstable_cache } from 'next/cache'
import { settingsService } from '@/lib/services/settings.service'

const getCachedSettings = unstable_cache(
  () => settingsService.getAll(),
  ['cms-settings'],
  { revalidate: 60, tags: ['cms-settings'] }
)

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getCachedSettings()

  return (
    <html lang="en">
      <head>
        <link rel="icon" href={settings.faviconUrl ?? '/favicon.ico'} />
      </head>
      <body>
        <SettingsProvider settings={settings}>
          <Navbar />
          {settings.announcement.active && <AnnouncementBanner text={settings.announcement.text} />}
          {children}
          <Footer />
        </SettingsProvider>
      </body>
    </html>
  )
}
```

#### Components

```
src/components/admin/settings/
├── SiteSettingsPage.tsx          # Tabbed settings panel (General, SEO, Social, Announcement)
├── GeneralSettingsTab.tsx        # Site name, logo upload, favicon upload, footer text
├── SeoSettingsTab.tsx            # Default title, description, OG image
├── SocialSettingsTab.tsx         # Twitter, LinkedIn, YouTube, Instagram URL inputs
├── AnnouncementSettingsTab.tsx   # Banner text + active toggle
└── LogoUploadWidget.tsx          # Presigned S3 upload for logo/favicon
```

---

### Tests

#### Unit — `SettingsService`
```typescript
describe('SettingsService.getAll', () => {
  it('returns default values when no settings rows exist')
  it('correctly deserializes JSON-stringified values')
})

describe('SettingsService.update', () => {
  it('upserts each key-value pair correctly')
  it('calls revalidateTag(\'cms-settings\') after update')
  it('returns only the list of keys that were updated')
})
```

#### Integration — Settings API
```typescript
describe('GET /api/cms/settings', () => {
  it('returns 200 with all settings in the expected shape')
  it('includes navPages from pages where inNav = true')
})

describe('PATCH /api/cms/settings', () => {
  it('returns 401 when unauthenticated')
  it('returns 403 when role is TEACHER or STUDENT')
  it('validates logoUrl is a valid URL when provided')
  it('updates only the keys specified in the request body')
})
```

---

### Definition of Done

- [ ] Admin Settings panel has 4 tabs: General, SEO, Social, Announcement
- [ ] Logo and favicon can be uploaded and previewed before saving
- [ ] Announcement banner can be toggled on/off with live preview text
- [ ] Saving settings purges the `unstable_cache` — next page load reflects new values within 1 request
- [ ] Site name appears in the browser tab on all pages (via `layout.tsx` metadata)
- [ ] Navbar dynamically shows CMS pages marked as `inNav = true`
- [ ] Footer renders footer text from settings
- [ ] All unit and integration tests pass

---

## Slice 5.5 — SEO Infrastructure: Sitemap, robots.txt & JSON-LD

### Goal

Deliver the full SEO technical foundation: an **auto-generated XML sitemap** at `/sitemap.xml` covering all published courses, blog posts, and CMS pages; a configurable **`robots.txt`** at `/robots.txt`; and **JSON-LD structured data** embedded on Course Detail pages (`Course` schema) and Blog Post pages (`BlogPosting` schema) for Google Rich Results. All are implemented using Next.js 15's built-in `sitemap.ts` and `robots.ts` route conventions — no external libraries required.

---

### Database — Queries Used

No new tables. Reads from `courses` (published), `blog_posts` (published), `pages` (published).

---

### API

These are **not** `/api/*` routes. They are Next.js special file routes.

#### `/sitemap.xml` → `src/app/sitemap.ts`

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { courses, blogPosts, pages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const revalidate = 3600   // regenerate every 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL!

  // Fetch all published content
  const [publishedCourses, publishedPosts, publishedPages] = await Promise.all([
    db.select({ slug: courses.slug, updatedAt: courses.updatedAt })
      .from(courses).where(eq(courses.status, 'PUBLISHED')),
    db.select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
      .from(blogPosts).where(eq(blogPosts.status, 'PUBLISHED')),
    db.select({ slug: pages.slug, updatedAt: pages.updatedAt })
      .from(pages).where(eq(pages.status, 'PUBLISHED')),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}`,         lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE_URL}/courses`, lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${BASE_URL}/blog`,    lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
  ]

  const courseRoutes: MetadataRoute.Sitemap = publishedCourses.map(c => ({
    url:              `${BASE_URL}/courses/${c.slug}`,
    lastModified:     new Date(c.updatedAt),
    changeFrequency:  'weekly',
    priority:         0.8,
  }))

  const blogRoutes: MetadataRoute.Sitemap = publishedPosts.map(p => ({
    url:              `${BASE_URL}/blog/${p.slug}`,
    lastModified:     new Date(p.updatedAt),
    changeFrequency:  'monthly',
    priority:         0.7,
  }))

  const pageRoutes: MetadataRoute.Sitemap = publishedPages.map(p => ({
    url:              `${BASE_URL}/${p.slug}`,
    lastModified:     new Date(p.updatedAt),
    changeFrequency:  'monthly',
    priority:         0.6,
  }))

  return [...staticRoutes, ...courseRoutes, ...blogRoutes, ...pageRoutes]
}
```

---

#### `/robots.txt` → `src/app/robots.ts`

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL!
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/(admin)/', '/(teacher)/', '/(dashboard)/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
```

---

### JSON-LD Structured Data

#### Course Detail Page — `Course` Schema

```typescript
// app/(public)/courses/[slug]/page.tsx
export default async function CourseDetailPage({ params }: Props) {
  const course = await courseService.getCourseBySlug(params.slug)
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL!

  const courseJsonLd = {
    '@context':    'https://schema.org',
    '@type':       'Course',
    'name':        course.title,
    'description': course.description,
    'url':         `${BASE_URL}/courses/${course.slug}`,
    'image':       course.thumbnailUrl,
    'provider': {
      '@type': 'Organization',
      'name':  'LMS Platform',
      'url':   BASE_URL,
    },
    'instructor': {
      '@type': 'Person',
      'name':  course.author.fullName,
    },
    'offers': {
      '@type':         'Offer',
      'price':         course.discountPrice ?? course.price,
      'priceCurrency': 'INR',
      'availability':  'https://schema.org/InStock',
    },
    'aggregateRating': course.reviewCount > 0 ? {
      '@type':       'AggregateRating',
      'ratingValue': course.avgRating,
      'ratingCount': course.reviewCount,
    } : undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      {/* Page content */}
    </>
  )
}
```

---

#### Blog Post Page — `BlogPosting` Schema

```typescript
// app/(public)/blog/[slug]/page.tsx
const blogPostJsonLd = {
  '@context':         'https://schema.org',
  '@type':            'BlogPosting',
  'headline':         post.title,
  'description':      post.excerpt,
  'image':            post.featuredImage,
  'datePublished':    post.publishedAt,
  'dateModified':     post.updatedAt,
  'author': {
    '@type': 'Person',
    'name':  post.author.fullName,
    'url':   `${BASE_URL}/instructors/${post.author.id}`,
  },
  'publisher': {
    '@type': 'Organization',
    'name':  'LMS Platform',
    'logo': {
      '@type': 'ImageObject',
      'url':   `${BASE_URL}/brand/logo.png`,
    },
  },
  'mainEntityOfPage': {
    '@type': '@id',
    '@id':   `${BASE_URL}/blog/${post.slug}`,
  },
}
```

---

### Service Layer — SEO Helpers

```typescript
// lib/services/seo.service.ts
export class SeoService {
  /**
   * Returns the count of published content for sitemap monitoring.
   * Used by health checks and admin dashboard.
   */
  async getSitemapStats(): Promise<{ courses: number; blogPosts: number; pages: number }> {
    const [c, b, p] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)` }).from(courses).where(eq(courses.status, 'PUBLISHED')),
      db.select({ count: sql<number>`COUNT(*)` }).from(blogPosts).where(eq(blogPosts.status, 'PUBLISHED')),
      db.select({ count: sql<number>`COUNT(*)` }).from(pages).where(eq(pages.status, 'PUBLISHED')),
    ])
    return { courses: c[0].count, blogPosts: b[0].count, pages: p[0].count }
  }
}
```

---

### Tests

#### Unit — `sitemap.ts`
```typescript
describe('sitemap()', () => {
  it('includes the home, courses listing, and blog listing as static routes')
  it('includes one entry per published course with correct URL and lastModified')
  it('includes one entry per published blog post with correct URL')
  it('includes one entry per published CMS page with correct URL')
  it('does not include DRAFT courses, posts, or pages')
  it('sets priority 1.0 for home, 0.9 for course listing, 0.8 for individual courses')
})
```

#### Unit — JSON-LD helpers
```typescript
describe('Course JSON-LD', () => {
  it('includes aggregateRating only when reviewCount > 0')
  it('uses discountPrice over price in the Offer block when set')
  it('sets priceCurrency to INR')
})

describe('BlogPosting JSON-LD', () => {
  it('uses seoTitle for headline when set, falls back to post.title')
  it('sets datePublished and dateModified correctly')
  it('includes correct publisher.logo.url')
})
```

#### Integration — Sitemap & Robots
```typescript
describe('GET /sitemap.xml', () => {
  it('returns a valid XML response with Content-Type: application/xml')
  it('includes all published course URLs')
  it('includes all published blog post URLs')
  it('excludes draft content')
})

describe('GET /robots.txt', () => {
  it('disallows /api/ crawling')
  it('disallows /(admin)/ crawling')
  it('includes the sitemap URL')
})
```

---

### Definition of Done

- [ ] `/sitemap.xml` returns valid XML containing all published courses, blog posts, and CMS pages
- [ ] Sitemap regenerates within 1 hour when new content is published (ISR revalidate: 3600)
- [ ] `/robots.txt` disallows `/api/`, admin, teacher, and student portals; includes sitemap URL
- [ ] Course detail pages include a `<script type="application/ld+json">` with `Course` schema — verified via Google Rich Results Test
- [ ] Blog post pages include `BlogPosting` JSON-LD — verified via Google Rich Results Test
- [ ] `aggregateRating` block is omitted from Course JSON-LD when `reviewCount === 0`
- [ ] JSON-LD output contains no undefined or null values (clean serialization)
- [ ] All unit and integration tests pass

---

## Wave 5 Shared Infrastructure

### New npm Packages

```bash
npm install isomorphic-dompurify @types/dompurify @tailwindcss/typography
```

| Package | Usage |
|---------|-------|
| `isomorphic-dompurify` | Sanitize TipTap HTML output on server and client |
| `@tailwindcss/typography` | `prose` classes for rendering blog/CMS rich text |

> TipTap and its extensions are already in the stack from the architecture doc.

---

### New Inngest Functions (Wave 5)

| Event / Cron | Function File | Trigger |
|---|---|---|
| `cron: */15 * * * *` | `lib/inngest/blog.functions.ts` → `publishScheduledPosts` | Cron: every 15 minutes |

---

### New Drizzle Migrations (Wave 5)

| Migration File | Change |
|---|---|
| `0006_blog_categories_tags.sql` | Creates `blog_categories`, `blog_tags`, `blog_post_tags`; adds `category_id` FK to `blog_posts` |
| `0007_settings.sql` | Creates `settings` key-value table with seed defaults |

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

---

### On-Demand ISR Revalidation — Summary

| Action | Revalidates |
|--------|-------------|
| Blog post published / updated | `revalidatePath('/blog')`, `revalidatePath('/blog/[slug]')` |
| CMS page published / updated | `revalidatePath('/[slug]')` |
| Settings updated | `revalidateTag('cms-settings')` |
| Course published (existing behaviour) | `revalidatePath('/courses')`, `revalidatePath('/courses/[slug]')` |

---

### New Environment Variables (Wave 5)

| Variable | Where Used |
|----------|-----------|
| `NEXT_PUBLIC_SITE_URL` | Sitemap, robots.txt, JSON-LD canonical URLs, OG URLs |

> Add `NEXT_PUBLIC_SITE_URL=https://yourlms.com` to both `.env.local` and Vercel Environment Variables.

---

### SEO Completeness Checklist (Wave 5 Output)

| Feature | Implementation | Status |
|---------|---------------|--------|
| Title tags | `generateMetadata` on every page | ✅ |
| Meta description | `generateMetadata` on every page | ✅ |
| OG tags (title, desc, image) | `generateMetadata` → `openGraph` | ✅ |
| Canonical URL | `generateMetadata` → `alternates.canonical` | ✅ |
| XML Sitemap | `app/sitemap.ts` | ✅ |
| robots.txt | `app/robots.ts` | ✅ |
| JSON-LD — Course | Inline script in course detail page | ✅ |
| JSON-LD — BlogPosting | Inline script in blog post page | ✅ |
| SSR public pages | Next.js Server Components + ISR | ✅ |

---

## Wave 5 — Delivery Checklist

| Slice | Key API / Files | Service | Frontend | Tests | Done |
|-------|----------------|---------|----------|-------|------|
| 5.1 Blog Authoring | `POST/PATCH/DELETE /api/blog/posts`<br>`GET /api/admin/blog/posts` | `BlogService`, `publishScheduledPosts` (Inngest) | Admin + Teacher blog editors, TipTap, SEO panel, scheduling | Unit + Integration | [ ] |
| 5.2 Public Blog | `GET /api/blog/posts`<br>`GET /api/blog/posts/:slug` | `BlogPublicService` | Blog listing (ISR), post detail (ISR), author bio, related posts, share bar | Unit + Integration | [ ] |
| 5.3 CMS Page Builder | `POST/PATCH /api/cms/pages`<br>`GET /api/cms/pages/:slug` | `CmsService` | Block editor (DnD Kit), 6 block types, public `/(public)/[slug]` renderer | Unit + Integration | [ ] |
| 5.4 Global Site Settings | `GET/PATCH /api/cms/settings` | `SettingsService` | Admin settings panel (4 tabs), RootLayout integration, Navbar nav items | Unit + Integration | [ ] |
| 5.5 SEO Infrastructure | `app/sitemap.ts`<br>`app/robots.ts`<br>JSON-LD in course + blog pages | `SeoService` | No new UI — server-side only | Unit + Integration | [ ] |

**Wave 5 is complete when:** An Admin can publish a blog post, create and publish a CMS page, configure global settings, and all content is discoverable by search engines with correct meta tags, JSON-LD structured data, a valid XML sitemap, and a correctly configured robots.txt.
