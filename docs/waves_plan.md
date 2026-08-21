# 🌊 Wave-Based Delivery Plan
## LMS Platform — Vertical Slice Architecture

> A **Wave** = a group of end-to-end vertical slices delivered together as a shippable increment.
> A **Vertical Slice** = a complete feature that cuts through all layers: UI → API → Service → DB.

---

## Summary

| Wave | Theme | Vertical Slices | Target Date |
|------|-------|-----------------|-------------|
| [Wave 1](#wave-1--foundation--identity) | Foundation & Identity | 4 slices | Oct 6, 2026 |
| [Wave 2](#wave-2--course-ecosystem) | Course Ecosystem | 5 slices | Oct 20, 2026 |
| [Wave 3](#wave-3--commerce-engine) | Commerce Engine | 4 slices | Nov 3, 2026 |
| [Wave 4](#wave-4--learning-experience) | Learning Experience | 4 slices | Nov 24, 2026 |
| [Wave 5](#wave-5--content--discovery) | Content & Discovery | 4 slices | Dec 8, 2026 |
| [Wave 6](#wave-6--live-classes--go-live) | Live Classes & Go-Live | 4 slices | Dec 22, 2026 |

**Total: 6 Waves | 25 Vertical Slices**

---

## Wave 1 — Foundation & Identity
> *Build the skeleton. No feature works without this.*

**Theme:** Auth system, DB schema, role-based routing, and infra setup.

| # | Vertical Slice | Layers Touched | Outcome |
|---|---------------|----------------|---------|
| 1.1 | **User Registration & Email Verification** | UI (Register page) → API `/auth/register` → `AuthService` → `users` table → Resend (email) | New users can sign up as Student or Teacher and verify their email |
| 1.2 | **Login, JWT & Role-Based Redirect** | UI (Login page) → API `/auth/login` → JWT + refresh token → Redis (session) → Role-based redirect | Users can log in and are routed to their correct portal |
| 1.3 | **Forgot Password & Reset Flow** | UI (Forgot/Reset pages) → API `/auth/forgot-password` + `/auth/reset-password` → Email token → DB update | Users can recover account access via email |
| 1.4 | **Admin: User Management Panel** | UI (`/admin/users`) → API `/users` (list, approve, suspend) → `AuthService` → `users` table | Admin can view, approve teachers, suspend/delete users |

**Infrastructure Delivered:**
- PostgreSQL schema (all core tables migrated via Prisma)
- Redis instance running (sessions + rate limiting)
- NextAuth.js configured with JWT + Google OAuth
- CI/CD pipeline (GitHub Actions → Vercel + Railway)
- Base middleware stack (CORS, rate limit, auth guard, RBAC)

---

## Wave 2 — Course Ecosystem
> *The core product. Courses are the heartbeat of the LMS.*

**Theme:** Full course lifecycle — creation, curriculum, publishing, and browsing.

| # | Vertical Slice | Layers Touched | Outcome |
|---|---------------|----------------|---------|
| 2.1 | **Course Creation Wizard (Steps 1–3)** | UI (5-step wizard: basic info, type/pricing, media) → API `POST /courses` → `CourseService` → `courses` table → S3 (thumbnail upload) | Teacher can create a course draft with all metadata and thumbnail |
| 2.2 | **Curriculum Builder (Modules & Lessons)** | UI (drag-drop builder) → API `/courses/:id/modules` + `/lessons` → `modules` + `lessons` tables → S3 (video upload) | Teacher can build a full curriculum with videos and articles |
| 2.3 | **Course SEO & Publishing** | UI (Step 5: SEO fields + publish) → API `POST /courses/:id/publish` → `CourseService.publishCourse()` → status → `PENDING_REVIEW` or `PUBLISHED` | Teacher can publish a course; Admin can approve and make it live |
| 2.4 | **Public Course Listing & Filters** | UI (`/courses` with search, filters, sort) → API `GET /courses` → DB (FTS index) → Redis cache → Course cards | Any visitor can browse and filter the course catalog |
| 2.5 | **Course Detail Page** | UI (`/courses/:slug` with tabs: overview, curriculum, instructor, reviews) → API `GET /courses/:slug` → SSR → `courses` + `modules` + `lessons` + `users` | Full course detail page is publicly viewable with free preview lessons |

**Infrastructure Delivered:**
- AWS S3 + CloudFront CDN for video/image delivery
- Full-text search indexes on `courses` table
- ISR configured for course listing (60s revalidation)

---

## Wave 3 — Commerce Engine
> *Turn browsers into buyers. Revenue starts here.*

**Theme:** Cart, checkout, payments, coupons, and enrollment activation.

| # | Vertical Slice | Layers Touched | Outcome |
|---|---------------|----------------|---------|
| 3.1 | **Shopping Cart** | UI (`/cart`) → localStorage (guest) + DB (logged-in) → API `GET/POST /cart` → `cart_items` table | Students can add/remove courses from cart, cart persists across sessions |
| 3.2 | **Checkout & Stripe Payment** | UI (`/checkout`) → API `POST /payments/create-intent` → Stripe SDK → Webhook `/webhooks/stripe` → `orders` + `enrollments` tables → Resend (receipt) | Students can pay via Stripe card and get enrolled instantly |
| 3.3 | **Razorpay Payment Flow** | UI (Razorpay modal) → API `POST /payments/razorpay/create-order` → Razorpay SDK → Webhook → enrollment activation | Students in India can pay via Razorpay UPI/cards |
| 3.4 | **Coupon System & Admin Refunds** | UI (coupon field in cart + admin `/admin/payments`) → API `/coupons/validate` + `/payments/refund` → `coupons` + `orders` tables → Stripe/Razorpay refund API | Admin can issue coupons and process full/partial refunds |

**Infrastructure Delivered:**
- Stripe + Razorpay webhook endpoints (signature verification)
- PDF invoice generation (React-PDF)
- BullMQ `email-queue` for async receipt delivery

---

## Wave 4 — Learning Experience
> *The student's world. Progress, completion, and dashboards.*

**Theme:** Student portal, video player, progress tracking, teacher dashboard, and certificates.

| # | Vertical Slice | Layers Touched | Outcome |
|---|---------------|----------------|---------|
| 4.1 | **Student Dashboard** | UI (`/dashboard`) → API `GET /users/me/enrollments` → `enrollments` + `lesson_progress` → Dashboard sections (continue learning, upcoming sessions, completed) | Students see a personalized home with all their courses and progress |
| 4.2 | **Course Video Player & Progress Tracking** | UI (`/dashboard/courses/:id/lessons/:id`) → API `PATCH /lessons/:id/progress` → `lesson_progress` table (debounced every 10s) → auto-mark complete at 80% | Students can watch videos, track progress, and resume exactly where they left off |
| 4.3 | **Teacher Dashboard & Revenue View** | UI (`/teacher/dashboard` + `/teacher/revenue`) → API `GET /teacher/stats` → aggregated `orders` + `enrollments` + `lesson_progress` → Recharts | Teachers see enrolled student counts, revenue breakdown, and course performance |
| 4.4 | **Course Completion Certificate** | UI (certificate download button in student portal) → API `POST /courses/:id/certificate` → BullMQ `certificate-queue` → React-PDF → S3 → signed URL | Students who complete 100% of a course get a downloadable PDF certificate |

**Infrastructure Delivered:**
- BullMQ `certificate-queue` worker
- Recharts integrated for analytics visualizations
- SSR shell + CSR hydration for all dashboard portals

---

## Wave 5 — Content & Discovery
> *Grow organically. Content drives SEO, SEO drives students.*

**Theme:** Blog, CMS, SEO infrastructure, search, and notifications.

| # | Vertical Slice | Layers Touched | Outcome |
|---|---------------|----------------|---------|
| 5.1 | **Blog — Create, Publish & Public View** | UI (teacher/admin blog editor with TipTap + `/blog` public listing + `/blog/:slug` post page) → API `/blog/posts` CRUD → `blog_posts` + `blog_categories` tables → SSR | Teachers and Admins can write and publish SEO-optimized blog posts publicly |
| 5.2 | **CMS — Static Pages & Site Settings** | UI (`/admin/pages` block editor + dynamic `/:slug` public pages + `/admin/settings`) → API `/cms/pages` + `/cms/settings` → `pages` + `site_settings` tables → ISR | Admin can build static pages (About, FAQ, Privacy) and manage global site config |
| 5.3 | **SEO Engine** | Automatic XML sitemap (`/sitemap.xml`), `robots.txt` from CMS, JSON-LD structured data on course + blog pages, canonical URLs, OG tags | All public pages are fully indexable by Google with rich results support |
| 5.4 | **Search & In-App Notifications** | UI (global search bar + notification bell) → API `GET /search?q=` → PostgreSQL FTS → Redis cache + API `GET /notifications` → `notifications` table + BullMQ `notification-queue` | Students and teachers can search courses/blog and receive in-app + email notifications |

**Infrastructure Delivered:**
- TipTap rich text editor integrated
- Dynamic `sitemap.xml` generation (Next.js route handler)
- JSON-LD structured data components for Google Rich Results
- BullMQ `notification-queue` worker

---

## Wave 6 — Live Classes & Go-Live
> *The final frontier. Real-time teaching delivered at scale.*

**Theme:** Live session scheduling, Zoom/Meet integration, student join flow, and production launch.

| # | Vertical Slice | Layers Touched | Outcome |
|---|---------------|----------------|---------|
| 6.1 | **Teacher: Schedule Live Session & Generate Meeting Link** | UI (Curriculum Builder → Lesson Type: Live Session) → API `POST /live/sessions` → `LiveSessionService` → Zoom API or Google Calendar API → `live_sessions` table (join_url + host_url) | Teachers can schedule sessions and auto-generate Zoom/Meet links |
| 6.2 | **Student: Live Session Join Flow** | UI (`/dashboard/live/:sessionId` — countdown, Join button activates 15 min before) → API `GET /live/sessions/:id/join` → enrollment check + timing window → returns join_url | Enrolled students can join live classes at the right time via a gated join button |
| 6.3 | **Session Reminders & Cancellation** | BullMQ scheduled jobs → Resend email (24h + 1h reminders) + API `DELETE /live/sessions/:id` → status `CANCELLED` → notify all enrolled students via email | Students are reminded about upcoming sessions and notified of cancellations |
| 6.4 | **UAT, QA Pass & Production Launch** | E2E tests (Playwright), load testing, security audit, Vercel production deploy, DNS cutover, post-launch monitoring (Sentry + Vercel Analytics) | Platform is fully tested, deployed to production, and live for real users |

**Infrastructure Delivered:**
- Zoom OAuth app configured and connected
- Google Calendar API service account configured
- Playwright E2E test suite covering all critical flows
- Sentry error monitoring + Vercel Analytics active
- Production environment fully configured (SSL, env vars, DB migrations)

---

## Visual Timeline

```
Sept 22 ──── Oct 6 ──── Oct 20 ──── Nov 3 ──── Nov 24 ──── Dec 8 ──── Dec 22 ──── Jan 19
   │            │           │          │           │           │           │           │
Kickoff      Wave 1      Wave 2     Wave 3      Wave 4      Wave 5      Wave 6    🚀 LAUNCH
             (4 slices)  (5 slices) (4 slices)  (4 slices)  (4 slices)  (4 slices)
             Auth+DB     Courses    Commerce    Learning    Content     Live
```

---

## Wave Dependency Map

```
Wave 1 (Auth + DB)
  └── Wave 2 (Courses) ← needs users, roles, file storage
        └── Wave 3 (Commerce) ← needs courses to buy
              └── Wave 4 (Learning) ← needs enrollments from commerce
                    └── Wave 5 (Content + SEO) ← needs users, courses for blog/search
                          └── Wave 6 (Live) ← needs courses, enrollments, notifications
```

Each wave is **independently deliverable and demonstrable** to stakeholders.
