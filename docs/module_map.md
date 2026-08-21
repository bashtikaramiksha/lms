# 🗺️ LMS Platform — Module Map

> Derived from [fdd.md](file:///d:/Projects/cloud%20planning/docs/fdd.md) & [rfp.md](file:///d:/Projects/cloud%20planning/docs/rfp.md)

---

## Platform Portals Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LMS PLATFORM                                 │
├──────────────┬──────────────────┬──────────────┬────────────────────┤
│  Public Web  │  Student Portal  │Teacher Portal│   Admin Panel      │
│     /        │  /dashboard/*    │  /teacher/*  │    /admin/*        │
│  (All Users) │  (Students)      │  (Teachers)  │    (Admins)        │
└──────────────┴──────────────────┴──────────────┴────────────────────┘
                         ↕ Shared Backend ↕
```

---

## Module Index

| # | Module | Portals Involved | Priority |
|---|--------|-----------------|----------|
| M01 | Authentication & User Management | All | Must Have |
| M02 | Course Management | Public, Teacher, Admin | Must Have |
| M03 | Live Class Management | Student, Teacher, Admin | Must Have |
| M04 | E-Commerce & Payments | Public, Student, Admin | Must Have |
| M05 | Student Learning Portal | Student | Must Have |
| M06 | Teacher Dashboard | Teacher | Must Have |
| M07 | Admin Panel | Admin | Must Have |
| M08 | Blog | Public, Teacher, Admin | Must Have |
| M09 | CMS & Site Settings | Admin | Must Have |
| M10 | SEO Engine | Public (SSR) | Must Have |
| M11 | Notifications & Emails | All (background) | Must Have |
| M12 | Search & Discovery | Public, Student | Must Have |

---

## M01 — Authentication & User Management

```
M01: Auth & User Management
├── 1.1  Registration             /register
│         ├── Role selection (Student / Teacher)
│         ├── Email verification flow
│         └── Teacher → PENDING_APPROVAL status
├── 1.2  Login                   /login
│         ├── JWT (15 min) + Refresh Token (7 days)
│         ├── Google OAuth 2.0
│         └── Role-based redirect (Admin / Teacher / Student)
├── 1.3  Forgot / Reset Password /forgot-password, /reset-password
│         └── Token-based (1 hr expiry), invalidates all sessions
├── 1.4  User Profile            /dashboard/profile | /teacher/profile
│         ├── Common: Name, Photo, Bio, Phone, Website, Socials
│         └── Teacher-only: Expertise, Payment Details, Title
└── 1.5  Admin User Management   /admin/users
          ├── List + Filter + Search
          └── Actions: View / Approve / Reject / Suspend / Delete / Promote
```

**Key Data Entities:** `User`, `Role`, `RefreshToken`, `VerificationToken`

---

## M02 — Course Management

```
M02: Course Management
├── 2.1  Course Creation Wizard  /teacher/courses/create
│         ├── Step 1: Basic Info (title, slug, desc, category, tags, level)
│         ├── Step 2: Type & Pricing (Recorded/Live, Free/Paid, access duration)
│         ├── Step 3: Media (thumbnail, preview video)
│         ├── Step 4: Curriculum Builder
│         │           ├── Modules (sections)
│         │           └── Lessons: Video | Article | Quiz | Live Session
│         └── Step 5: SEO & Publish (meta title, desc, OG image, status)
├── 2.2  Course Listing (Public) /courses
│         ├── Filters: Category, Type, Level, Price
│         ├── Sort: Newest / Popular / Price / Rating
│         └── Course Cards (grid layout)
├── 2.3  Course Detail Page      /courses/{slug}
│         ├── Hero (title, instructor, rating, level)
│         ├── Sticky Sidebar (price, Buy Now, Wishlist)
│         └── Tabs: Overview | Curriculum | Instructor | Reviews
├── 2.4  Course Review & Rating
│         ├── Eligibility: Enrolled + ≥ 20% complete
│         ├── Fields: Stars (1–5), Title, Body
│         └── One review per student; editable within 30 days
└── 2.5  Admin Course Management /admin/courses
          └── Full CRUD + Approve/Reject teacher courses
```

**Key Data Entities:** `Course`, `Module`, `Lesson`, `Review`, `Category`, `Tag`

---

## M03 — Live Class Management

```
M03: Live Class Management
├── 3.1  Schedule Live Session   (within Curriculum Builder, Step 4)
│         ├── Fields: Title, Date, Time, Duration, Platform, Description
│         ├── Zoom: POST /v2/users/{id}/meetings → join_url + start_url
│         └── Google Meet: Calendar API → conferenceData → hangoutLink
├── 3.2  Student Live Session    /dashboard/live/{sessionId}
│         ├── Pre-Session  (>15 min before): countdown, join disabled
│         ├── Active       (≤15 min before): Join button enabled, "Live Now"
│         └── Post-Session: "Ended", recording link, Mark Complete
└── 3.3  Teacher Session Mgmt   /teacher/sessions
          ├── Session list: status, enrolled count, platform
          ├── Start Class → opens host URL (Zoom start_url or Meet link)
          └── Cancel Session → reason → email all enrolled students
```

**Key Data Entities:** `LiveSession`, `SessionEnrollment`  
**External APIs:** Zoom API, Google Calendar/Meet API

---

## M04 — E-Commerce & Payments

```
M04: E-Commerce & Payments
├── 4.1  Shopping Cart           /cart
│         ├── Persistent (DB for logged-in, localStorage for guests)
│         ├── Guest cart merges on login
│         └── Duplicate enrollment check
├── 4.2  Coupon System
│         ├── Types: PERCENT | FIXED
│         └── Validation: active, not expired, usage limit, per-user
├── 4.3  Checkout                /checkout
│         ├── Stripe Flow: Payment Intent → Elements → confirmCardPayment → Webhook
│         └── Razorpay Flow: Create Order → Modal → Webhook (HMAC SHA256)
│             Both: Create Order + Enrollments + Send Invoice Email
├── 4.4  Checkout Success        /checkout/success
├── 4.5  Invoice / Receipt
│         └── PDF (server-side): itemized, tax, transaction ID, refund note
└── 4.6  Refund Management       /admin/payments
          └── Admin: Full/Partial refund → revoke enrollment → email student
```

**Key Data Entities:** `Cart`, `CartItem`, `Order`, `OrderItem`, `Coupon`, `CouponUsage`, `Enrollment`  
**External APIs:** Stripe, Razorpay  
**Webhooks:** `/api/webhooks/stripe`, `/api/webhooks/razorpay`

---

## M05 — Student Learning Portal

```
M05: Student Learning Portal
├── 5.1  Student Dashboard       /dashboard
│         ├── Welcome Banner + streak
│         ├── Continue Learning widget
│         ├── My Courses grid (% completion)
│         └── Upcoming Live Sessions
├── 5.2  Course Player (Recorded) /dashboard/courses/{courseId}/lessons/{lessonId}
│         ├── Video player: speed, quality, captions, PiP, fullscreen
│         ├── Progress tracking: every 10s, complete at ≥80% watched
│         ├── Curriculum Sidebar: ✓ done | ► active | ○ not started | 🔒 locked
│         └── Lesson tabs: Notes | Resources | Q&A
├── 5.3  My Courses              /dashboard/courses
│         └── Filter: All / In Progress / Completed
├── 5.4  Completion Certificate
│         ├── Trigger: 100% lessons completed
│         └── PDF download with unique certificate ID
└── 5.5  Order History           /dashboard/orders
          └── Receipts, invoice download, enrolled courses
```

**Key Data Entities:** `LessonProgress`, `CourseProgress`, `Certificate`

---

## M06 — Teacher Dashboard

```
M06: Teacher Dashboard
├── 6.1  Dashboard Overview      /teacher/dashboard
│         ├── Total Revenue, Enrolled Students, Active Courses
│         └── Recent enrollments + upcoming sessions
├── 6.2  My Courses              /teacher/courses
│         ├── Status: Draft | Pending Review | Published | Archived
│         └── CRUD: create, edit, delete own courses
├── 6.3  Session Management      /teacher/sessions
│         └── (see M03.3)
├── 6.4  Revenue Dashboard       /teacher/revenue
│         ├── Total earnings, per-course breakdown
│         └── Payout history + request payout
├── 6.5  Students                /teacher/students
│         └── View enrolled students per course
└── 6.6  Blog Posts              /teacher/blog
          └── Create/edit own blog posts
```

---

## M07 — Admin Panel

```
M07: Admin Panel
├── 7.1  Admin Dashboard         /admin/dashboard
│         └── Platform analytics: Users, Revenue, Enrollments, Courses
├── 7.2  User Management         /admin/users
│         └── (see M01.5)
├── 7.3  Course Management       /admin/courses
│         └── Full CRUD + approve/reject teacher submissions
├── 7.4  Category & Tag Mgmt     /admin/categories
├── 7.5  Payment & Orders        /admin/payments
│         ├── Transaction history, order lookup
│         └── Refund management (see M04.6)
├── 7.6  Coupon Management       /admin/coupons
│         └── Create/edit/disable discount codes
├── 7.7  Revenue Split Config    /admin/settings/revenue
│         └── Platform commission % per teacher payout
├── 7.8  Blog Management         /admin/blog
│         └── Full CRUD on all blog posts
└── 7.9  CMS & Settings          /admin/cms
          └── (see M09)
```

---

## M08 — Blog

```
M08: Blog
├── 8.1  Blog Listing            /blog
│         └── Filter by category, tag; paginated
├── 8.2  Blog Post Detail        /blog/{slug}
│         ├── Title, featured image, content (rich text)
│         ├── Author bio block
│         ├── Tags + categories
│         └── Related posts sidebar
├── 8.3  Blog Editor             /admin/blog/create | /teacher/blog/create
│         ├── Rich text editor (images, embeds, formatting)
│         ├── SEO fields: meta title, desc, canonical, OG image
│         └── Post scheduling (future date/time publish)
└── 8.4  Comment System          (Nice to Have)
          └── With admin moderation
```

**Key Data Entities:** `BlogPost`, `BlogCategory`, `BlogTag`, `Comment`

---

## M09 — CMS & Site Settings

```
M09: CMS & Site Settings
├── 9.1  Static Pages            /admin/cms/pages
│         ├── Page builder blocks: Hero, Text, Image, CTA, FAQ
│         └── SEO meta per page
├── 9.2  Media Library           /admin/cms/media
│         └── Upload, browse, delete images/files (S3/Cloudinary)
├── 9.3  Global Site Settings    /admin/settings
│         ├── Logo, favicon, site name
│         ├── Nav menu + footer links
│         ├── Social links
│         └── Announcement banner
└── 9.4  Robots.txt & Sitemap
          └── Managed from CMS settings
```

---

## M10 — SEO Engine

```
M10: SEO Engine (Auto + Managed)
├── 10.1 Per-Page Meta Tags      (all public pages)
│         └── title, description, canonical URL, OG tags
├── 10.2 XML Sitemap             /sitemap.xml
│         └── Auto-includes: courses, blog posts, static pages
├── 10.3 robots.txt              /robots.txt
│         └── CMS-configurable
├── 10.4 JSON-LD Structured Data
│         └── Course schema (Google Rich Results)
└── 10.5 SERP Preview            (in CMS editor)
          └── Live Google search result preview
```

---

## M11 — Notifications & Emails

```
M11: Notifications & Emails
Transactional Emails:
├── Registration: Email verification link
├── Teacher Approval / Rejection
├── Purchase Confirmation + PDF Invoice
├── Password Reset
├── Live Session Reminder (before session)
├── Session Cancellation notice (to enrolled students)
├── Refund Confirmation
└── Certificate generation notice

In-App Notifications:
├── Teacher: new enrollment, course review submitted
├── Student: session starting soon, session cancelled
└── Admin: new teacher registration, course pending review
```

**External Services:** Resend / SendGrid / Nodemailer

---

## M12 — Search & Discovery

```
M12: Search & Discovery
├── 12.1 Global Course Search    /courses?q=...
│         └── Full-text across title + description
├── 12.2 Filter System
│         ├── Category (multi-select)
│         ├── Course Type (Recorded / Live)
│         ├── Level (Beginner / Intermediate / Advanced)
│         └── Price (Free / Paid / Range slider)
├── 12.3 Sort Options
│         └── Newest | Most Popular | Price Low-High | Rating
└── 12.4 Wishlist / Save Later   (Nice to Have)
```

---

## Cross-Module Data Flow

```
[Student Registers]
      │
      ▼
  M01: Auth ──────────────────────────────────┐
      │                                        │
      ▼                                        ▼
  M12: Browse/Search                      M07: Admin
      │                                   (approve teacher)
      ▼
  M02: Course Detail
      │
      ▼
  M04: Cart → Checkout → Payment
      │           │
      │      M11: Email (invoice)
      │
      ▼
  M05: Student Portal (access granted)
      │
      ├──► M05: Course Player (Recorded)
      │         └── Progress → M05: Certificate
      │
      └──► M03: Live Session (join class)
                └── M11: Reminder emails
```

---

## External Integration Map

| Module | Integration | Usage |
|--------|-------------|-------|
| M01 | Google OAuth 2.0 | Social login |
| M03 | Zoom API | Generate meeting links |
| M03 | Google Calendar/Meet API | Generate meeting links |
| M04 | Stripe | Card payments + webhooks |
| M04 | Razorpay | UPI/card payments + webhooks |
| M02, M09 | AWS S3 / Cloudinary | Video, image, file storage |
| M11 | Resend / SendGrid | Transactional emails |
| M07 | Google Analytics / Mixpanel | Usage analytics |

---

## Tech Stack Mapping per Module

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (SSR/SSG) |
| API Layer | REST / tRPC |
| Auth | JWT + Refresh Tokens + NextAuth |
| Database | PostgreSQL via Prisma ORM |
| File Storage | AWS S3 or Cloudinary |
| Email | Resend / SendGrid |
| Video Conf. | Zoom API + Google Calendar API |
| Payments | Stripe + Razorpay |
| Deployment | Vercel / AWS / Railway + CI/CD |
