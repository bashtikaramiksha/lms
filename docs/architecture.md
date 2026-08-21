# Software Architecture Document (SAD)
## Learning Management System (LMS) Platform

---

| Document Info | Details |
|---------------|---------|
| **Document Title** | Software Architecture Document — LMS Platform |
| **Prepared By** | [Tech Lead / Solutions Architect] |
| **Reviewed By** | [CTO, Senior Developers] |
| **Approved By** | [Approver Name] |
| **Issue Date** | August 20, 2026 |
| **Version** | v2.0 |
| **Status** | Draft |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v0.1 | August 15, 2026 | [Author] | Initial draft |
| v1.0 | August 20, 2026 | [Author] | Full architecture complete (Go + Vite) |
| v2.0 | August 20, 2026 | [Author] | Stack migration: Next.js + TypeScript + Turso |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Architecture Goals & Constraints](#2-architecture-goals--constraints)
3. [System Context (C4 Level 1)](#3-system-context-c4-level-1)
4. [Container Architecture (C4 Level 2)](#4-container-architecture-c4-level-2)
5. [Component Architecture (C4 Level 3)](#5-component-architecture-c4-level-3)
6. [Technology Stack](#6-technology-stack)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Backend Architecture](#8-backend-architecture)
9. [Database Architecture](#9-database-architecture)
10. [API Design](#10-api-design)
11. [Authentication & Security Architecture](#11-authentication--security-architecture)
12. [Third-Party Integration Architecture](#12-third-party-integration-architecture)
13. [File Storage Architecture](#13-file-storage-architecture)
14. [Deployment & Infrastructure](#14-deployment--infrastructure)
15. [Scalability & Performance Strategy](#15-scalability--performance-strategy)
16. [Observability & Monitoring](#16-observability--monitoring)
17. [Disaster Recovery & Backup](#17-disaster-recovery--backup)
18. [Architecture Decision Records (ADRs)](#18-architecture-decision-records-adrs)

---

## 1. Introduction

### 1.1 Purpose

This Software Architecture Document (SAD) describes the **technical architecture** of the LMS platform. It provides a comprehensive view of the system's structure, technology choices, component interactions, deployment topology, and cross-cutting concerns such as security, scalability, and reliability.

This document is intended for:
- **Software Engineers** — to understand the system structure and implement accordingly
- **DevOps/Infrastructure Engineers** — to configure deployment and CI/CD
- **Security Engineers** — to review and audit the security posture
- **Tech Leads** — to make informed architectural decisions

### 1.2 Architectural Style

The system follows a **Next.js Full-Stack Monolith** approach:

- **Frontend:** React 19 (Next.js 15 App Router) — Server Components for SSR/ISR, Client Components for interactivity, served via Vercel Edge Network
- **Backend:** Next.js Route Handlers (Node.js 22 runtime) — stateless API handlers co-located in the same codebase, handling all business logic and data access
- **Database:** Turso (libSQL / edge SQLite) — globally distributed, low-latency database accessed directly from Route Handlers via Drizzle ORM
- **Background Jobs:** Inngest — serverless, durable workflow engine requiring no Redis or message broker
- **Phase 2 (v2.0+):** Extract high-load services (video processing, notifications) into independent Node.js microservices or edge functions as traffic grows

This approach delivers **TypeScript end-to-end**, native SSR/ISR for SEO, a single unified deployment on Vercel, and zero infrastructure overhead from eliminating Redis.

---

## 2. Architecture Goals & Constraints

### 2.1 Architecture Quality Attributes (Non-Functional)

| Attribute | Target | Strategy |
|-----------|--------|----------|
| **Performance** | LCP < 2.5s, TTFB < 200ms | Next.js SSR/ISR, Vercel Edge, Turso edge replication |
| **Scalability** | 10,000+ concurrent users | Vercel serverless auto-scaling, stateless Route Handlers |
| **Availability** | 99.9% uptime | Vercel multi-region, Turso HA replicas |
| **Security** | OWASP Top 10 compliant | NextAuth.js, HTTPS, input sanitization via Zod, RBAC |
| **SEO** | Full search engine indexability | Next.js SSR/ISR natively for all public pages |
| **Maintainability** | Clean module boundaries | Feature-based folder structure, TypeScript strict mode |
| **Observability** | Full trace visibility | Structured logging via Pino, Sentry, Vercel Analytics |
| **Developer Experience** | Fast iteration cycle | TypeScript end-to-end, Next.js fast refresh, unified monorepo |

### 2.2 Architectural Constraints

| Constraint | Rationale |
|-----------|-----------|
| Must use SSR for public pages | SEO requirement |
| Stateless API layer | Horizontal scaling without sticky sessions |
| No native mobile app in v1.0 | Budget and timeline constraint |
| PCI-DSS compliance delegated to payment providers | Security constraint |
| All video content must be served via CDN | Performance requirement |
| Multi-tenancy not required in v1.0 | Single platform, not SaaS |
| No Redis / no self-managed message broker | Operational simplicity — use managed serverless alternatives |

---

## 3. System Context (C4 Level 1)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL WORLD                               │
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                        │
│  │  Admin   │   │  Teacher │   │  Student │                        │
│  │  (User)  │   │  (User)  │   │  (User)  │                        │
│  └────┬─────┘   └────┬─────┘   └────┬─────┘                        │
│       │              │              │                                │
│       └──────────────┼──────────────┘                               │
│                      │ HTTPS                                        │
│                      ▼                                              │
│          ┌───────────────────────┐                                  │
│          │                       │                                  │
│          │     LMS PLATFORM      │◄──── Search Engines (SEO)        │
│          │   (Next.js on Vercel) │                                  │
│          └───────────┬───────────┘                                  │
│                      │                                              │
│         ┌────────────┼────────────────────────┐                     │
│         │            │            │            │                    │
│    ┌────▼───┐   ┌────▼───┐  ┌────▼───┐  ┌────▼───┐                │
│    │  Zoom  │   │ Google │  │ Stripe │  │Razorpay│                │
│    │  API   │   │  Meet  │  │  API   │  │  API   │                │
│    └────────┘   └────────┘  └────────┘  └────────┘                │
│                                                                     │
│    ┌────────┐   ┌────────┐  ┌────────┐  ┌────────┐                │
│    │  AWS   │   │ Email  │  │ Google │  │Inngest │                │
│    │   S3   │   │(Resend)│  │Analytics│  │  API   │                │
│    └────────┘   └────────┘  └────────┘  └────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Container Architecture (C4 Level 2)

```
┌─────────────────────────────────────────────────────────────────┐
│                        LMS PLATFORM                              │
│                  (Single Next.js Application)                    │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Next.js App Router  (Port 3000 / Vercel)       │   │
│  │                                                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │   │
│  │  │  Public Web  │  │ Admin Panel │  │  Teacher Portal  │  │   │
│  │  │ (SSR / ISR) │  │  (RSC+CSR)  │  │   (RSC+CSR)      │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘  │   │
│  │         │                │                   │             │   │
│  │         └────────────────┼───────────────────┘             │   │
│  │                          │                                  │   │
│  │  ┌───────────────────────▼──────────────────────────────┐  │   │
│  │  │         API Layer (Next.js Route Handlers)            │  │   │
│  │  │  /api/auth  /api/courses  /api/payments  /api/users   │  │   │
│  │  │  /api/blog  /api/cms  /api/webhooks  /api/live        │  │   │
│  │  └───────────────────────┬──────────────────────────────┘  │   │
│  │                          │                                  │   │
│  │  ┌───────────────────────▼──────────────────────────────┐  │   │
│  │  │           Business Logic / Service Layer              │  │   │
│  │  │  AuthService  CourseService  PaymentService           │  │   │
│  │  │  LiveService  BlogService   CmsService  SearchService │  │   │
│  │  └───────────────────────┬──────────────────────────────┘  │   │
│  │                          │                                  │   │
│  │  ┌───────────────────────▼──────────────────────────────┐  │   │
│  │  │           Data Access Layer (Drizzle ORM)             │  │   │
│  │  └───────────────────────┬──────────────────────────────┘  │   │
│  └──────────────────────────┼───────────────────────────────┘   │
│                             │                                     │
│  ┌─────────────────────────▼──────────────────────────────────┐  │
│  │              Turso Database (libSQL / Edge SQLite)          │  │
│  │              Primary + Read Replicas (Multi-region)         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │              Inngest (Serverless Job Queue)                  │  │
│  │   Emails, Certificate generation, Session reminders         │  │
│  └─────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Component Architecture (C4 Level 3)

### 5.1 API Layer Components

```
/api
├── auth/
│   ├── [...nextauth]     GET/POST  NextAuth.js handler (login, logout, OAuth)
│   ├── register          POST      Creates new user account
│   ├── verify-email      GET       Verifies email with token
│   └── reset-password    POST      Resets password with token
│
├── users/
│   ├── me                GET       Current user profile
│   ├── me                PATCH     Update profile
│   ├── [id]              GET       Public profile (teacher)
│   └── (admin)
│       ├── /             GET       List all users (paginated)
│       ├── [id]          PATCH     Update any user
│       ├── [id]/approve  POST      Approve teacher
│       └── [id]/suspend  POST      Suspend user
│
├── courses/
│   ├── /                 GET       Public course listing
│   ├── /                 POST      Create course (Auth: Teacher/Admin)
│   ├── [slug]            GET       Single course (public)
│   ├── [id]              PATCH     Update course (Auth: Owner/Admin)
│   ├── [id]              DELETE    Soft delete (Auth: Admin)
│   ├── [id]/publish      POST      Publish course
│   ├── [id]/modules      POST      Add module
│   ├── [id]/lessons      POST      Add lesson
│   ├── [id]/enroll       GET       Check enrollment status
│   └── [id]/reviews      GET/POST  Course reviews
│
├── lessons/
│   ├── [id]/progress     PATCH     Update watch progress
│   └── [id]/complete     POST      Mark lesson complete
│
├── live/
│   ├── sessions/         GET       List sessions for teacher
│   ├── sessions/         POST      Create live session
│   ├── sessions/[id]     PATCH     Update session
│   ├── sessions/[id]     DELETE    Cancel session
│   └── sessions/[id]/join GET      Get join URL for student
│
├── payments/
│   ├── create-intent     POST      Create Stripe payment intent
│   ├── razorpay/create   POST      Create Razorpay order
│   └── orders            GET       Order history (Auth: Student)
│
├── webhooks/
│   ├── stripe            POST      Stripe webhook handler
│   ├── razorpay          POST      Razorpay webhook handler
│   └── inngest           POST      Inngest event webhook
│
├── blog/
│   ├── posts             GET       Public blog listing
│   ├── posts             POST      Create post (Auth: Teacher/Admin)
│   ├── posts/[slug]      GET       Single post (public)
│   ├── posts/[id]        PATCH     Update post
│   └── categories        GET       Blog categories
│
├── cms/
│   ├── pages             GET/POST  CMS pages
│   ├── pages/[slug]      GET       Public page content
│   ├── settings          GET       Site settings (public: logo, nav)
│   └── settings          PATCH     Update settings (Auth: Admin)
│
└── search/
    └── /                 GET       Full-text search
```

---

### 5.2 Service Layer Components

```
AuthService
  ├── register(dto)            → hashes password, creates user, triggers Inngest email event
  ├── verifyEmail(token)       → marks email as verified
  └── resetPassword(token, newPassword)

CourseService
  ├── createCourse(dto, userId)    → creates draft course
  ├── publishCourse(courseId)      → validates completeness, changes status
  ├── getCourseWithDetails(slug)   → fetches course with modules/lessons/instructor
  ├── updateProgress(lessonId, userId, percent) → updates lesson progress
  └── checkEnrollment(courseId, userId)

PaymentService
  ├── createStripeIntent(cartItems, userId)   → creates Payment Intent
  ├── createRazorpayOrder(cartItems, userId)  → creates Razorpay order
  ├── handleStripeWebhook(payload, sig)       → verifies + processes
  ├── handleRazorpayWebhook(payload, sig)     → verifies + processes
  └── processEnrollments(orderId)             → grants course access, triggers Inngest

LiveSessionService
  ├── createSession(dto, teacherId) → creates session, calls Zoom/Meet API
  ├── generateZoomLink(sessionData) → calls Zoom API, stores links
  ├── generateMeetLink(sessionData) → calls Google Calendar API, stores link
  ├── getJoinUrl(sessionId, userId) → validates enrollment + timing window
  └── cancelSession(sessionId)      → updates status, triggers Inngest reminder cancel

NotificationService (via Inngest events)
  ├── send("email/verification", { to, token })
  ├── send("email/purchase-receipt", { to, orderId })
  ├── send("email/session-reminder", { to, sessionId, minutesBefore })
  └── send("certificate/generate", { userId, courseId, enrollmentId })
```

---

## 6. Technology Stack

### 6.1 Full Stack Breakdown

#### Frontend & Full-Stack Framework

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Framework** | Next.js (App Router) | 15.x | SSR/ISR/CSR hybrid, file-based routing, API Routes co-located |
| **UI Library** | React | 19.x | Server Components, concurrent rendering, ecosystem |
| **Language** | TypeScript | 5.x | Strict type safety end-to-end, fewer runtime errors |
| **Styling** | Tailwind CSS | 4.x | Utility-first, rapid development, consistent design system |
| **UI Components** | shadcn/ui | Latest | Accessible, customizable, built on Radix UI |
| **Rich Text Editor** | TipTap | 2.x | Extensible ProseMirror-based editor |
| **Client State** | Zustand | 5.x | Lightweight, no boilerplate, client-side only state |
| **Server State** | TanStack Query | 5.x | Caching, pagination, optimistic updates (Client Components) |
| **Forms** | React Hook Form + Zod | Latest | Performance + schema-based validation |
| **Charts** | Recharts | 2.x | React-native charting, flexible |
| **Drag & Drop** | DnD Kit | 6.x | Accessible, performant drag-and-drop |
| **PDF Generation** | React-PDF | 4.x | Invoice + certificate generation |

#### Backend (Node.js via Next.js Route Handlers)

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Runtime** | Node.js | 22 LTS | Stable, long-term support, native fetch, excellent ecosystem |
| **API Layer** | Next.js Route Handlers | 15.x | Co-located with frontend, no separate server process |
| **Auth** | NextAuth.js (Auth.js) | v5 | JWT + database sessions, OAuth, credential providers |
| **Validation** | Zod | 3.x | Schema-first validation, TypeScript inference, shared client/server |
| **Background Jobs** | Inngest | Latest | Serverless durable functions, no broker/Redis needed |
| **Config** | @t3-oss/env-nextjs | Latest | Type-safe environment variables with Zod schemas |
| **OAuth** | NextAuth.js built-in | v5 | Google OAuth 2.0 via NextAuth providers |
| **Payments** | stripe (Node SDK) | Latest | Official Stripe SDK for Node.js |
| **Razorpay** | razorpay (Node SDK) | Latest | Official Razorpay SDK for Node.js |
| **File Storage** | @aws-sdk/client-s3 | 3.x | S3 presigned URL generation, bucket operations |
| **Email** | Resend SDK | Latest | Official Resend Node.js SDK |
| **Rate Limiting** | @upstash/ratelimit | Latest | HTTP-based rate limiting, no Redis server required |
| **Testing** | Vitest + Testing Library | Latest | Fast unit tests, React component testing |
| **Linting** | ESLint + Prettier | Latest | Code quality and formatting |

#### Data Layer

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Database** | Turso (libSQL) | Latest | Edge-distributed SQLite, global low latency, no server management |
| **ORM** | Drizzle ORM | Latest | TypeScript-native, type-safe queries, lightweight, SQL-like API |
| **Migrations** | Drizzle Kit | Latest | Schema diff + migration file generation from Drizzle schema |
| **DB Client** | @libsql/client | Latest | Official Turso/libSQL client for Node.js |
| **File Storage** | AWS S3 | — | Scalable, durable, CDN-compatible |
| **CDN** | AWS CloudFront | — | Edge caching for videos and static assets |
| **Monitoring** | Sentry (Next.js SDK) + Vercel Analytics | — | Error tracking + Web Vitals + usage metrics |
| **CI/CD** | GitHub Actions | — | Automated test, lint, build, deploy pipeline |
| **Deployment** | Vercel | — | Native Next.js hosting, edge functions, global CDN |

---

### 6.2 Technology Dependency Map

```
Browser
  └── Next.js App (React 19 + TypeScript 5.x)
        ├── Tailwind CSS 4 + shadcn/ui (styles + components)
        ├── Next.js App Router (file-based routing, layouts)
        ├── TanStack Query (client-side server state / API calls)
        ├── Zustand (global client state: cart, theme)
        └── React Hook Form + Zod (forms + validation)
              │
              │ Route Handlers (Next.js API)  ←→  Server Components (RSC)
              ▼
        Node.js Runtime (Next.js Route Handlers)
              ├── NextAuth.js v5 (auth / sessions)
              ├── Zod (server-side input validation)
              ├── Drizzle ORM
              │     └── @libsql/client → Turso (libSQL)
              ├── Inngest (background jobs / durable events)
              ├── stripe (Stripe payments)
              ├── razorpay (Razorpay payments)
              ├── @aws-sdk/client-s3 (S3 presigned URLs)
              ├── resend (transactional email)
              └── @upstash/ratelimit (HTTP rate limiting)
```

---

## 7. Frontend Architecture

### 7.1 Next.js App Router Folder Structure

```
src/
├── app/                          # Next.js App Router root
│   │
│   ├── layout.tsx                # Root layout (HTML shell, fonts, providers)
│   ├── page.tsx                  # Home page (SSR)
│   ├── not-found.tsx             # 404 page
│   ├── error.tsx                 # Global error boundary
│   │
│   ├── (public)/                 # Public route group
│   │   ├── courses/
│   │   │   ├── page.tsx          # Course catalog (ISR, revalidate: 60s)
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Course detail (ISR, revalidate: 30s)
│   │   ├── blog/
│   │   │   ├── page.tsx          # Blog listing (ISR, revalidate: 300s)
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Blog post (ISR, revalidate: 300s)
│   │   ├── instructors/
│   │   │   └── [id]/page.tsx     # Teacher public profile (SSR)
│   │   └── [slug]/
│   │       └── page.tsx          # CMS dynamic pages (ISR)
│   │
│   ├── (auth)/                   # Auth route group (no nav layout)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── (dashboard)/              # Student portal (protected)
│   │   ├── layout.tsx            # Dashboard layout + auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── my-courses/
│   │   │   └── [id]/page.tsx     # Course player
│   │   ├── live-sessions/page.tsx
│   │   └── profile/page.tsx
│   │
│   ├── (teacher)/                # Teacher portal (protected, role: TEACHER)
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── courses/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx      # Course creation wizard
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       └── edit/page.tsx
│   │   └── revenue/page.tsx
│   │
│   ├── (admin)/                  # Admin panel (protected, role: ADMIN)
│   │   ├── layout.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── users/page.tsx
│   │   ├── courses/page.tsx
│   │   ├── blog/page.tsx
│   │   ├── cms/page.tsx
│   │   ├── payments/page.tsx
│   │   └── settings/page.tsx
│   │
│   └── api/                      # Next.js Route Handlers
│       ├── auth/[...nextauth]/route.ts
│       ├── users/route.ts
│       ├── courses/route.ts
│       ├── payments/route.ts
│       ├── webhooks/
│       │   ├── stripe/route.ts
│       │   ├── razorpay/route.ts
│       │   └── inngest/route.ts
│       └── inngest/route.ts      # Inngest function registration
│
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── shared/                   # Reusable across all portals
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── CourseCard.tsx
│   │   ├── VideoPlayer.tsx
│   │   └── RichTextEditor.tsx
│   ├── dashboard/                # Student-specific components
│   ├── teacher/                  # Teacher-specific components
│   ├── admin/                    # Admin-specific components
│   └── blog/                     # Blog-specific components
│
├── lib/
│   ├── db/
│   │   ├── index.ts              # Drizzle client + Turso connection
│   │   └── schema/               # Drizzle schema definitions
│   │       ├── users.ts
│   │       ├── courses.ts
│   │       ├── lessons.ts
│   │       ├── orders.ts
│   │       └── blog.ts
│   ├── auth.ts                   # NextAuth.js v5 config
│   ├── inngest.ts                # Inngest client + function definitions
│   ├── s3.ts                     # S3 presigned URL helpers
│   ├── email.ts                  # Resend email client
│   ├── ratelimit.ts              # Upstash Ratelimit config
│   └── validations/              # Zod schemas (shared client + server)
│       ├── auth.schema.ts
│       ├── course.schema.ts
│       └── payment.schema.ts
│
├── hooks/                        # Custom React hooks (Client Components)
│   ├── useAuth.ts
│   ├── useCourses.ts
│   └── useProgress.ts
│
├── store/                        # Zustand stores
│   ├── cartStore.ts
│   └── uiStore.ts
│
├── types/                        # Shared TypeScript interfaces
│   ├── user.types.ts
│   ├── course.types.ts
│   └── payment.types.ts
│
└── middleware.ts                 # Next.js middleware (auth guard, rate limiting)
```

### 7.2 Page Rendering Strategy

Next.js App Router provides native SSR, ISR, and CSR — no meta-tag injection workarounds needed.

| Page | Strategy | Revalidate | SEO |
|------|----------|------------|-----|
| Home | SSR (Server Component) | On-demand | ✅ Full |
| Course Listing | ISR | 60 seconds | ✅ Full |
| Course Detail | ISR | 30 seconds | ✅ Full (JSON-LD, OG) |
| Blog Post | ISR | 300 seconds | ✅ Full |
| CMS Pages | ISR | On-demand (`revalidatePath`) | ✅ Full |
| Student Dashboard | CSR (Client Component) | — | ❌ Protected |
| Teacher Portal | CSR (Client Component) | — | ❌ Protected |
| Admin Panel | CSR (Client Component) | — | ❌ Protected |

### 7.3 Server vs. Client Components

```
Server Components (RSC) — default, no 'use client'
  ├── Page layouts, course listings, blog posts
  ├── Data fetching directly from Drizzle (no API roundtrip)
  ├── Metadata generation (generateMetadata)
  └── Static/ISR shell rendering

Client Components — 'use client' directive
  ├── Interactive forms, modals, dropdowns
  ├── Video player, drag-and-drop curriculum builder
  ├── Shopping cart, checkout flow
  └── Any component using useState, useEffect, browser APIs
```

---

## 8. Backend Architecture

### 8.1 Next.js Route Handler Project Structure

```
src/app/api/
├── auth/
│   ├── [...nextauth]/route.ts    # NextAuth.js catch-all handler
│   ├── register/route.ts
│   ├── verify-email/route.ts
│   └── reset-password/route.ts
│
├── users/
│   ├── route.ts                  # GET /api/users (admin)
│   └── [id]/
│       ├── route.ts
│       ├── approve/route.ts
│       └── suspend/route.ts
│
├── courses/
│   ├── route.ts                  # GET (listing), POST (create)
│   └── [id]/
│       ├── route.ts              # GET, PATCH, DELETE
│       ├── publish/route.ts
│       ├── modules/route.ts
│       ├── lessons/route.ts
│       ├── enroll/route.ts
│       └── reviews/route.ts
│
├── payments/
│   ├── create-intent/route.ts
│   ├── razorpay/create/route.ts
│   └── orders/route.ts
│
├── webhooks/
│   ├── stripe/route.ts
│   ├── razorpay/route.ts
│   └── inngest/route.ts          # Inngest webhook receiver
│
├── inngest/route.ts              # Inngest serve() registration
├── blog/route.ts
├── cms/route.ts
├── live/route.ts
└── search/route.ts

src/lib/
├── db/
│   ├── index.ts                  # createClient(@libsql/client) + drizzle()
│   └── schema/                   # Drizzle table definitions
│
├── services/                     # Business logic (used by Route Handlers + RSC)
│   ├── auth.service.ts
│   ├── course.service.ts
│   ├── payment.service.ts
│   ├── live.service.ts
│   └── search.service.ts
│
├── inngest/                      # Inngest function definitions
│   ├── client.ts                 # createInngestClient()
│   ├── email.functions.ts        # email/verification, email/receipt
│   ├── notification.functions.ts # notification/in-app
│   └── certificate.functions.ts  # certificate/generate
│
└── middleware/                   # Reusable middleware helpers
    ├── withAuth.ts               # Session validation wrapper
    ├── withRole.ts               # Role guard wrapper
    └── withRatelimit.ts          # Upstash rate limit wrapper
```

### 8.2 Request Lifecycle

```
HTTP Request
    │
    ▼
Next.js Middleware (middleware.ts)
    ├── Route matching (public vs. protected)
    ├── Session check via NextAuth.js getToken()
    └── Redirect unauthenticated requests to /login
    │
    ▼
Next.js Route Handler (app/api/.../route.ts)
    │
    ├── Rate Limit Check (@upstash/ratelimit — HTTP-based)
    │
    ├── Parse & Validate Request Body (Zod schema)
    │
    ├── Auth Check (withAuth wrapper → NextAuth session)
    │
    ├── Role Check (withRole wrapper → session.user.role)
    │
    ├── Call Service Layer (business logic)
    │       ├── Drizzle ORM → Turso (libSQL)
    │       ├── Next.js unstable_cache (in-memory/edge cache)
    │       └── External API Call (Stripe, Zoom, etc.)
    │
    └── Return NextResponse.json(responseEnvelope)
```

### 8.3 Background Job Architecture (Inngest)

Inngest replaces Redis-backed job queues entirely. Functions are serverless, durable, and retried automatically.

```
Event Trigger (Route Handler)
    │
    ▼
inngest.send({ name: "email/purchase-receipt", data: { orderId, userId } })
    │
    ▼
Inngest Platform (cloud relay)
    │
    ▼
POST /api/inngest  (Next.js Route Handler receives event)
    │
    ├── email/send-verification      → Resend SDK → send email
    ├── email/purchase-receipt       → Resend SDK → send receipt
    ├── email/session-reminder       → Resend SDK → send reminder (scheduled)
    ├── notification/in-app-create   → Drizzle → insert notification record
    └── certificate/generate-pdf    → React-PDF → S3 upload → Drizzle update
```

**Inngest advantages over Redis/BullMQ:**
- Zero infrastructure (no Redis instance to manage)
- Built-in retry with exponential backoff
- Scheduled events (`step.sleep`, `step.waitForEvent`)
- Full event history and replay in Inngest dashboard
- Works natively with Vercel serverless

### 8.4 Middleware Stack

```typescript
// middleware.ts — Applied at the edge before every request
1. Route Matcher         (skip /api/webhooks/*, /_next/*, /public/*)
2. Session Token Check   (NextAuth.js getToken() — reads JWT cookie)
3. Role-Based Redirect   (redirect /admin/* if role !== ADMIN)
4. Protected Route Guard (redirect /(dashboard)/* if unauthenticated)

// Per-route middleware wrappers (inside Route Handlers)
5. Rate Limiter          (@upstash/ratelimit — sliding window, HTTP-based)
6. Zod Validation        (parse request body/params against schema)
7. Auth Session          (withAuth — verify session exists)
8. Role Guard            (withRole('ADMIN') — check role in session)
```

---

## 9. Database Architecture

### 9.1 Turso (libSQL) Overview

Turso is a **globally distributed SQLite** database service built on **libSQL** (an open-source SQLite fork). Key characteristics:

| Feature | Detail |
|---------|--------|
| **Wire protocol** | libSQL HTTP + WebSocket |
| **Query language** | SQL (SQLite dialect) |
| **Data types** | TEXT, INTEGER, REAL, BLOB, NULL |
| **ORM** | Drizzle ORM (TypeScript-native) |
| **Replication** | Primary + read replicas across regions |
| **Edge access** | Direct HTTP access from Vercel Edge Functions |
| **Connection** | Stateless HTTP — no connection pooling needed |
| **Pricing** | Per-database, per-row-read model |

### 9.2 Drizzle Schema Definitions

#### `users`
```typescript
// lib/db/schema/users.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email:         text('email').unique().notNull(),
  passwordHash:  text('password_hash'),          // null for OAuth users
  fullName:      text('full_name').notNull(),
  avatarUrl:     text('avatar_url'),
  bio:           text('bio'),
  role:          text('role', { enum: ['ADMIN', 'TEACHER', 'STUDENT'] }).default('STUDENT'),
  status:        text('status', { enum: ['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED', 'REJECTED'] }).default('ACTIVE'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  createdAt:     text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt:     text('updated_at').$defaultFn(() => new Date().toISOString()),
})
```

#### `courses`
```typescript
export const courses = sqliteTable('courses', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:         text('title').notNull(),
  slug:          text('slug').unique().notNull(),
  description:   text('description'),
  shortDesc:     text('short_desc'),
  thumbnailUrl:  text('thumbnail_url'),
  previewUrl:    text('preview_url'),
  type:          text('type', { enum: ['RECORDED', 'LIVE'] }).notNull(),
  status:        text('status', { enum: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED'] }).default('DRAFT'),
  level:         text('level', { enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] }),
  language:      text('language').default('English'),
  price:         real('price').default(0),
  discountPrice: real('discount_price'),
  accessDuration: integer('access_duration'),    // days; null = lifetime
  authorId:      text('author_id').references(() => users.id),
  categoryId:    text('category_id').references(() => categories.id),
  isFeatured:    integer('is_featured', { mode: 'boolean' }).default(false),
  seoTitle:      text('seo_title'),
  seoDesc:       text('seo_description'),
  ogImageUrl:    text('og_image_url'),
  createdAt:     text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt:     text('updated_at').$defaultFn(() => new Date().toISOString()),
})
```

#### `modules`
```typescript
export const modules = sqliteTable('modules', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  courseId:  text('course_id').references(() => courses.id, { onDelete: 'cascade' }),
  title:     text('title').notNull(),
  order:     integer('order').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})
```

#### `lessons`
```typescript
export const lessons = sqliteTable('lessons', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  moduleId:  text('module_id').references(() => modules.id, { onDelete: 'cascade' }),
  title:     text('title').notNull(),
  type:      text('type', { enum: ['VIDEO', 'ARTICLE', 'QUIZ', 'LIVE_SESSION'] }),
  order:     integer('order').notNull(),
  videoUrl:  text('video_url'),
  duration:  integer('duration'),               // seconds
  content:   text('content'),                   // HTML for articles
  isPreview: integer('is_preview', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})
```

#### `live_sessions`
```typescript
export const liveSessions = sqliteTable('live_sessions', {
  id:          text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  lessonId:    text('lesson_id').references(() => lessons.id),
  courseId:    text('course_id').references(() => courses.id),
  teacherId:   text('teacher_id').references(() => users.id),
  title:       text('title'),
  scheduledAt: text('scheduled_at').notNull(),
  duration:    integer('duration').notNull(),   // minutes
  platform:    text('platform', { enum: ['ZOOM', 'GOOGLE_MEET'] }),
  joinUrl:     text('join_url'),
  hostUrl:     text('host_url'),
  status:      text('status', { enum: ['SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED'] }).default('SCHEDULED'),
  recordingUrl: text('recording_url'),
  createdAt:   text('created_at').$defaultFn(() => new Date().toISOString()),
})
```

#### `enrollments`
```typescript
export const enrollments = sqliteTable('enrollments', {
  id:         text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId:  text('student_id').references(() => users.id),
  courseId:   text('course_id').references(() => courses.id),
  orderId:    text('order_id').references(() => orders.id),
  enrolledAt: text('enrolled_at').$defaultFn(() => new Date().toISOString()),
  expiresAt:  text('expires_at'),              // null = lifetime
  status:     text('status', { enum: ['ACTIVE', 'EXPIRED', 'REVOKED'] }).default('ACTIVE'),
})
```

#### `lesson_progress`
```typescript
export const lessonProgress = sqliteTable('lesson_progress', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  enrollmentId:  text('enrollment_id').references(() => enrollments.id),
  lessonId:      text('lesson_id').references(() => lessons.id),
  watchPercent:  real('watch_percent').default(0),
  isCompleted:   integer('is_completed', { mode: 'boolean' }).default(false),
  lastWatchedAt: text('last_watched_at'),
})
```

#### `orders`
```typescript
export const orders = sqliteTable('orders', {
  id:               text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  studentId:        text('student_id').references(() => users.id),
  totalAmount:      real('total_amount'),
  currency:         text('currency').default('INR'),
  status:           text('status', { enum: ['PENDING', 'COMPLETED', 'REFUNDED', 'FAILED'] }),
  paymentGateway:   text('payment_gateway', { enum: ['STRIPE', 'RAZORPAY'] }),
  gatewayOrderId:   text('gateway_order_id'),
  gatewayPaymentId: text('gateway_payment_id'),
  couponId:         text('coupon_id'),
  discountAmount:   real('discount_amount').default(0),
  createdAt:        text('created_at').$defaultFn(() => new Date().toISOString()),
})
```

#### `blog_posts`
```typescript
export const blogPosts = sqliteTable('blog_posts', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:          text('title').notNull(),
  slug:           text('slug').unique().notNull(),
  excerpt:        text('excerpt'),
  content:        text('content'),              // HTML from TipTap
  featuredImage:  text('featured_image'),
  authorId:       text('author_id').references(() => users.id),
  categoryId:     text('category_id'),
  status:         text('status', { enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED'] }).default('DRAFT'),
  publishedAt:    text('published_at'),
  scheduledFor:   text('scheduled_for'),
  seoTitle:       text('seo_title'),
  seoDesc:        text('seo_description'),
  ogImageUrl:     text('og_image_url'),
  canonicalUrl:   text('canonical_url'),
  createdAt:      text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt:      text('updated_at').$defaultFn(() => new Date().toISOString()),
})
```

#### `pages` (CMS)
```typescript
export const pages = sqliteTable('pages', {
  id:             text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title:          text('title').notNull(),
  slug:           text('slug').unique().notNull(),
  blocks:         text('blocks', { mode: 'json' }),  // JSON array of content blocks
  status:         text('status', { enum: ['DRAFT', 'PUBLISHED'] }).default('DRAFT'),
  inNav:          integer('in_nav', { mode: 'boolean' }).default(false),
  navLabel:       text('nav_label'),
  seoTitle:       text('seo_title'),
  seoDesc:        text('seo_description'),
  ogImageUrl:     text('og_image_url'),
  createdAt:      text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt:      text('updated_at').$defaultFn(() => new Date().toISOString()),
})
```

### 9.3 Database Indexing Strategy

```sql
-- Drizzle Kit migrations generate these indexes

-- Frequently queried fields
CREATE INDEX idx_courses_slug ON courses(slug);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_author ON courses(author_id);
CREATE INDEX idx_courses_category ON courses(category_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_orders_student ON orders(student_id);
CREATE INDEX idx_lessons_module ON lessons(module_id);
CREATE INDEX idx_sessions_scheduled ON live_sessions(scheduled_at);
CREATE INDEX idx_blog_slug ON blog_posts(slug);
CREATE INDEX idx_blog_status ON blog_posts(status);

-- Unique composite constraints
CREATE UNIQUE INDEX idx_enrollment_unique ON enrollments(student_id, course_id);
CREATE UNIQUE INDEX idx_progress_unique ON lesson_progress(enrollment_id, lesson_id);
```

> **Note:** Turso (libSQL) uses SQLite's FTS5 extension for full-text search. Full-text search indexes are created using SQLite's virtual table syntax rather than PostgreSQL's `tsvector`.

```sql
-- Full-text search via SQLite FTS5
CREATE VIRTUAL TABLE courses_fts USING fts5(
  title, description, content='courses', content_rowid='rowid'
);

CREATE VIRTUAL TABLE blog_fts USING fts5(
  title, excerpt, content='blog_posts', content_rowid='rowid'
);
```

### 9.4 Database Connection

```typescript
// lib/db/index.ts
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

export const db = drizzle(client, { schema })
```

Turso uses **stateless HTTP connections** — no connection pooler (PgBouncer) or connection limit management needed. Each Vercel serverless function invocation opens a lightweight HTTP connection to Turso and closes it on completion.

---

## 10. API Design

### 10.1 API Design Principles

| Principle | Implementation |
|-----------|---------------|
| RESTful conventions | Standard HTTP verbs and status codes |
| Versioning | URL-based `/api/v1/...` (ready for future v2) |
| Consistent response shape | All responses follow envelope pattern |
| Pagination | Cursor-based for scalability |
| Error responses | Standardized error object |
| Type safety | Zod schema validates request; TypeScript types inferred |

### 10.2 Standard Response Envelope

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": {                    // optional, for paginated responses
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasNext": true,
    "nextCursor": "eyJpZCI6..."
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "COURSE_NOT_FOUND",
    "message": "The requested course does not exist.",
    "field": "courseId"       // optional, for validation errors
  }
}
```

### 10.3 HTTP Status Code Convention

| Status | When Used |
|--------|-----------|
| 200 OK | Successful GET, PATCH |
| 201 Created | Successful POST (resource created) |
| 204 No Content | Successful DELETE |
| 400 Bad Request | Validation failure, malformed request |
| 401 Unauthorized | Missing or invalid auth session |
| 403 Forbidden | Valid session but insufficient role |
| 404 Not Found | Resource does not exist |
| 409 Conflict | Duplicate resource (e.g., email exists) |
| 422 Unprocessable | Semantic validation failure |
| 429 Too Many Requests | Rate limit exceeded |
| 500 Internal Server Error | Unhandled server error |

### 10.4 Rate Limiting Strategy

Using **@upstash/ratelimit** — HTTP-based sliding window, no Redis server required.

| Endpoint Group | Limit |
|----------------|-------|
| Auth (login, register) | 10 req/min per IP |
| Public API (courses, blog) | 100 req/min per IP |
| Authenticated API | 200 req/min per user |
| Webhooks | No limit (validated by signature) |
| Upload endpoints | 10 req/min per user |

```typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'  // Upstash Redis — HTTP only, no server

export const authRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  prefix: 'ratelimit:auth',
})
```

---

## 11. Authentication & Security Architecture

### 11.1 NextAuth.js v5 Authentication Flow

```
Login Request (credentials or Google OAuth)
    │
    ▼
NextAuth.js signIn() handler (/api/auth/[...nextauth])
    │
    ├── Credentials Provider
    │       ├── Validate email + password (Zod)
    │       ├── Fetch user from Turso via Drizzle
    │       ├── bcrypt compare password
    │       └── Return user object → NextAuth creates session
    │
    └── Google OAuth Provider
            ├── Redirect to Google OAuth consent
            ├── Receive code → exchange for tokens
            └── Upsert user in Turso → NextAuth creates session
    │
    ▼
NextAuth creates JWT session token
    ├── Session stored as: signed httpOnly cookie (JWT strategy)
    ├── Token payload: { id, email, role, name, image }
    └── Cookie: __Secure-next-auth.session-token (httpOnly, Secure, SameSite=lax)

Subsequent Requests:
    Client sends cookie automatically (browser)
    │
    ▼
middleware.ts → getToken({ req }) → validates JWT cookie
    │
    ├── Valid → proceed; session available in route handlers via auth()
    └── Invalid / missing → redirect to /login
```

### 11.2 RBAC (Role-Based Access Control) Matrix

| Resource | Guest | Student | Teacher | Admin |
|----------|-------|---------|---------|-------|
| Browse courses | ✅ | ✅ | ✅ | ✅ |
| View blog/pages | ✅ | ✅ | ✅ | ✅ |
| Purchase courses | ❌ | ✅ | ✅ | ✅ |
| Access enrolled course | ❌ | ✅ | — | ✅ |
| Create courses | ❌ | ❌ | ✅ | ✅ |
| Manage own courses | ❌ | ❌ | ✅ | ✅ |
| Manage ALL courses | ❌ | ❌ | ❌ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| Access Admin Panel | ❌ | ❌ | ❌ | ✅ |
| Create blog posts | ❌ | ❌ | ✅ | ✅ |
| Manage CMS/settings | ❌ | ❌ | ❌ | ✅ |

### 11.3 Security Controls

| Control | Implementation |
|---------|---------------|
| **Password Hashing** | bcryptjs with cost factor 12 |
| **HTTPS Only** | Enforced by Vercel; HSTS header set |
| **SQL Injection** | Drizzle ORM parameterized queries (never raw SQL with user input) |
| **XSS Prevention** | React auto-escapes JSX; TipTap output sanitized with DOMPurify |
| **CSRF Protection** | NextAuth.js CSRF token on all mutation endpoints |
| **Content Security Policy** | CSP headers configured in `next.config.ts` via `headers()` |
| **Rate Limiting** | @upstash/ratelimit HTTP sliding window per IP and per user |
| **Input Validation** | Zod schemas on all API route inputs (both client and server) |
| **Webhook Verification** | Stripe: HMAC-SHA256 signature; Razorpay: same |
| **File Upload Security** | Type + size validation before issuing S3 presigned URL |
| **Secrets Management** | Vercel Environment Variables (encrypted at rest); @t3-oss/env-nextjs validates at build time |
| **Audit Logging** | All admin actions logged with userId, action, timestamp, IP via Pino |

---

## 12. Third-Party Integration Architecture

### 12.1 Zoom Integration

```
Teacher Action: Schedule Live Session (Zoom selected)
    │
    ▼
LMS Route Handler → Zoom API
  POST https://api.zoom.us/v2/users/{zoomUserId}/meetings
  Headers: Authorization: Bearer {teacher_zoom_oauth_token}
  Body: {
    topic: sessionTitle,
    type: 2,                  // Scheduled meeting
    start_time: ISO8601,
    duration: minutes,
    timezone: "Asia/Kolkata",
    settings: {
      waiting_room: false,
      join_before_host: false
    }
  }
    │
    ▼
Response: {
  join_url: "https://zoom.us/j/...",   → stored as live_sessions.join_url
  start_url: "https://zoom.us/s/..."   → stored as live_sessions.host_url
}
```

**Teacher OAuth Setup:**
- Teacher connects Zoom account in profile settings
- NextAuth.js custom Zoom OAuth provider (PKCE flow)
- Access token + refresh token stored encrypted in Turso (`users` table)

---

### 12.2 Google Meet Integration

```
Teacher Action: Schedule Live Session (Google Meet selected)
    │
    ▼
LMS Route Handler → Google Calendar API
  POST https://www.googleapis.com/calendar/v3/calendars/primary/events
  Headers: Authorization: Bearer {teacher_google_oauth_token}
  Body: {
    summary: sessionTitle,
    start: { dateTime: ISO8601, timeZone: "Asia/Kolkata" },
    end: { dateTime: ISO8601, timeZone: "Asia/Kolkata" },
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" }
      }
    }
  }
    │
    ▼
Response: {
  hangoutLink: "https://meet.google.com/xxx-yyyy-zzz"
  → stored as both join_url and host_url (same link for Meet)
}
```

---

### 12.3 Stripe Integration

```
┌─────────────────────────────────────────────────────────────┐
│                    STRIPE INTEGRATION                         │
│                                                              │
│  Frontend (Next.js)      Route Handler        Stripe         │
│                                                              │
│  [Checkout Page]                                             │
│       │                                                      │
│       ├──POST /api/payments/create-intent──►                 │
│       │       ◄──{client_secret}──────────                   │
│       │                                                      │
│  [Stripe Elements]                                           │
│  (card form rendered)                                        │
│       │                                                      │
│       ├──stripe.confirmCardPayment(secret)──► Stripe         │
│       │                                          │           │
│       │                           POST webhook ──┘           │
│       │                   /api/webhooks/stripe               │
│       │                           │                          │
│       │                    Verify HMAC sig                   │
│       │                           │                          │
│       │              Create Order + Enrollments (Drizzle)    │
│       │                           │                          │
│       │              inngest.send("email/purchase-receipt")  │
│       │                                                      │
│  ◄──redirect /checkout/success                               │
└─────────────────────────────────────────────────────────────┘
```

---

### 12.4 Email (Resend) Integration via Inngest

```
Event Trigger (Route Handler)
    │
    ▼
inngest.send({ name: "email/purchase-receipt", data: { to, orderId } })
    │
    ▼
Inngest Platform (async relay, durable)
    │
    ▼
POST /api/inngest  (Inngest calls our Next.js Route Handler)
    │
    ▼
Inngest Function executes:
  └── Resend SDK → resend.emails.send({
        from: "noreply@yourdomain.com",
        to: recipient,
        subject: "Your purchase receipt",
        react: <PurchaseReceiptEmail orderId={orderId} />
      })
```

> Inngest handles retries, backoff, and scheduling — no queue infrastructure needed.

---

## 13. File Storage Architecture

### 13.1 S3 Bucket Structure

```
lms-platform-bucket/
├── courses/
│   ├── {courseId}/
│   │   ├── thumbnail.jpg
│   │   ├── preview.mp4
│   │   └── lessons/
│   │       └── {lessonId}/
│   │           ├── video.mp4
│   │           └── attachments/
│   │               └── notes.pdf
│
├── blog/
│   └── {postId}/
│       └── featured.jpg
│
├── users/
│   └── {userId}/
│       └── avatar.jpg
│
├── cms/
│   └── media/
│       └── {filename}
│
└── certificates/
    └── {certificateId}.pdf
```

### 13.2 Upload Flow (Direct-to-S3)

```
Client → Request presigned URL
    │
    ▼
Next.js Route Handler: @aws-sdk/client-s3 → getSignedUrl(PutObjectCommand)
    → Returns: { presignedUrl, fileKey }
    │
    ▼
Client: PUT {file} directly to presignedUrl (bypasses Next.js server)
    │
    ▼
Client: Notify Route Handler of successful upload
    → Route Handler saves { fileKey } to Turso via Drizzle
    │
    ▼
File served via CloudFront CDN:
    https://cdn.yourdomain.com/{fileKey}
```

**Benefits:** Server never handles large file bytes → lower memory, faster uploads, works within Vercel's 4.5MB request body limit.

### 13.3 Video Delivery

```
Video Upload (S3)
    │
    ▼
CloudFront Distribution
    │
    ├── Signed URLs for protected videos (enrolled students only)
    │     └── URL expires after 4 hours (1 session)
    │         Generated by @aws-sdk/cloudfront-signer
    │
    └── Public URLs for preview videos (free preview)
```

---

## 14. Deployment & Infrastructure

### 14.1 Deployment Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        INTERNET                               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │     Vercel      │
                   │  (Next.js App)  │
                   │                 │
                   │  ┌───────────┐  │
                   │  │ Edge CDN  │  │   ← Static assets, ISR pages
                   │  │(Next.js   │  │
                   │  │ Cache)    │  │
                   │  └─────┬─────┘  │
                   │        │        │
                   │  ┌─────▼─────┐  │
                   │  │Serverless │  │   ← Route Handlers, SSR pages
                   │  │Functions  │  │
                   │  │(Node.js)  │  │
                   │  └─────┬─────┘  │
                   └────────┼────────┘
                            │
           ┌────────────────┼───────────────────┐
           │                │                   │
    ┌──────▼──────┐  ┌──────▼──────┐  ┌────────▼───────┐
    │   Turso     │  │   Inngest   │  │  AWS S3 +      │
    │  (libSQL)   │  │  (Serverless│  │  CloudFront    │
    │  Primary +  │  │   Jobs)     │  │  (Files +      │
    │  Replicas   │  │             │  │   Videos)      │
    └─────────────┘  └─────────────┘  └────────────────┘
```

### 14.2 Environment Configuration

| Environment | Purpose | Deployment |
|-------------|---------|------------|
| `development` | Local dev | `localhost:3000` (Next.js dev server) |
| `preview` | PR previews | Vercel preview URLs (auto) |
| `staging` | QA & testing | `staging.yourdomain.com` |
| `production` | Live platform | `yourdomain.com` |

### 14.3 CI/CD Pipeline (GitHub Actions)

```yaml
# Unified Next.js Pipeline
On: Push to main / PR merge

Steps:
1.  Checkout code
2.  Setup Node.js 22 LTS
3.  Install dependencies (npm ci)
4.  Type check (tsc --noEmit)
5.  Lint (eslint . --max-warnings 0)
6.  Run unit tests (vitest run)
7.  Run Drizzle schema check (drizzle-kit check)
8.  Build Next.js app (next build)
9.  Deploy to Vercel (vercel --prod)
10. Run DB migrations (drizzle-kit migrate --config=drizzle.config.ts)
11. Run E2E tests (Playwright) [staging only]
12. Notify Slack on success/failure
```

### 14.4 Environment Variables

```bash
# ── Database (Turso) ──────────────────────────────────────────
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=...

# ── Auth (NextAuth.js) ────────────────────────────────────────
NEXTAUTH_SECRET=...          # Random 32-char secret
NEXTAUTH_URL=https://yourdomain.com

# ── OAuth ─────────────────────────────────────────────────────
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# ── Payments ──────────────────────────────────────────────────
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...

# ── Zoom ──────────────────────────────────────────────────────
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...

# ── AWS S3 ────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
AWS_S3_BUCKET=lms-platform
AWS_CLOUDFRONT_URL=https://cdn.yourdomain.com
CLOUDFRONT_KEY_PAIR_ID=...
CLOUDFRONT_PRIVATE_KEY=...

# ── Email ─────────────────────────────────────────────────────
RESEND_API_KEY=...
EMAIL_FROM=noreply@yourdomain.com

# ── Rate Limiting (Upstash — HTTP only, no Redis server) ──────
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# ── Background Jobs ───────────────────────────────────────────
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# ── App Config ────────────────────────────────────────────────
PLATFORM_COMMISSION_PERCENT=20
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## 15. Scalability & Performance Strategy

### 15.1 Caching Architecture

Next.js App Router provides a multi-layer caching system without any external cache server:

```
Request for /courses (public listing)
    │
    ├── L1: Vercel Edge Network (CDN)
    │         ISR: stale-while-revalidate
    │         Revalidates: every 60 seconds or on revalidatePath()
    │
    ├── L2: Next.js Full Route Cache (server-side HTML cache)
    │         Cached at build time or first request
    │         Invalidated: revalidatePath('/courses') or revalidateTag('courses')
    │
    ├── L3: Next.js Data Cache (unstable_cache / fetch cache)
    │         Key: course:list:{filters}
    │         TTL: 60 seconds
    │         Invalidated: revalidateTag('courses') on publish/unpublish
    │
    └── L4: Turso Query (only on full cache miss)
              Edge-replicated → low latency from any region
```

| Data Type | Cache Layer | TTL / Strategy |
|-----------|------------|----------------|
| Public course listing | Vercel Edge + Next.js Full Route Cache | ISR 60s |
| Course detail (public) | Vercel Edge + Next.js Data Cache | ISR 30s |
| Blog post list | Vercel Edge + Next.js Full Route Cache | ISR 300s |
| CMS Pages | Next.js Full Route Cache | On-demand revalidation |
| Site settings | Next.js Data Cache (unstable_cache) | 3600s |
| User profile (private) | No cache (dynamic) | — |

### 15.2 Database Performance (Turso)

| Strategy | Detail |
|----------|--------|
| **Edge replication** | Read replicas in multiple regions (Turso automatic) |
| **Stateless connections** | HTTP connections per request, no pool management |
| **Proper indexing** | All FK fields + frequently filtered columns |
| **Pagination** | Cursor-based (not OFFSET) for large datasets |
| **Selective fields** | Drizzle `.select({ id: courses.id, title: courses.title })` |
| **Embedded replicas** | For ultra-low latency (Turso embedded replica in same process) |

### 15.3 Horizontal Scaling Plan

| Scale Trigger | Action |
|---------------|--------|
| CPU > 70% sustained | Vercel auto-scales serverless functions — no manual action |
| Turso read latency > 50ms | Add replica in closer region via Turso dashboard |
| Inngest job queue depth > 1000 | Upgrade Inngest plan; functions auto-scale |
| File storage > 1TB | Review S3 lifecycle policies, enable compression |
| 100k+ users | Extract notification/email into dedicated Inngest app |

---

## 16. Observability & Monitoring

### 16.1 Logging

```typescript
// Structured JSON logs via Pino (every API request)
import pino from 'pino'

const logger = pino({ level: process.env.LOG_LEVEL ?? 'info' })

// Example request log
logger.info({
  timestamp: new Date().toISOString(),
  method: 'POST',
  path: '/api/payments/create-intent',
  status: 201,
  durationMs: 145,
  userId: session.user.id,
  requestId: crypto.randomUUID(),
})
```

- Log levels: `error`, `warn`, `info`, `debug`
- Error logs include: stack trace, userId, request body (PII redacted)
- Logs shipped to: **Vercel Log Drains** → Axiom / Logtail

### 16.2 Error Tracking

- **Sentry Next.js SDK** (`@sentry/nextjs`) integrated via `instrumentation.ts`
- Captures: unhandled errors in Route Handlers, RSC errors, client JS errors
- Each error tagged with: userId, role, URL, environment
- Alert: Slack notification for new error events
- Performance tracing: Sentry traces + Vercel Speed Insights

### 16.3 Performance Monitoring

| Metric | Tool | Alert Threshold |
|--------|------|----------------|
| Core Web Vitals (LCP, CLS, INP) | Vercel Speed Insights + Sentry | LCP > 3s |
| API response time (p95) | Vercel Analytics + Sentry Performance | > 200ms |
| Database query time | Drizzle + Sentry spans | > 100ms |
| Error rate | Sentry | > 1% of requests |
| Uptime | BetterUptime / UptimeRobot | < 99.9% |
| Inngest job failure rate | Inngest Dashboard | > 5% failure |
| Build time | Vercel Deployments | > 5 minutes |

### 16.4 Health Check Endpoint

```typescript
// app/api/health/route.ts
export async function GET() {
  const dbOk = await checkTursoConnection()
  const storageOk = await checkS3Bucket()

  return NextResponse.json({
    status: dbOk && storageOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'ok' : 'error',
      storage: storageOk ? 'ok' : 'error',
      inngest: 'external',   // monitored by Inngest dashboard
    },
    version: process.env.npm_package_version ?? '1.0.0',
  })
}
```

---

## 17. Disaster Recovery & Backup

### 17.1 Backup Strategy

| Asset | Backup Method | Frequency | Retention |
|-------|--------------|-----------|-----------|
| Turso DB | Turso automated point-in-time snapshots | Continuous | 30 days |
| S3 Files | S3 Cross-Region Replication | Real-time | Permanent |
| Code | GitHub | Every commit | Permanent |
| Environment Variables | Vercel project export | Monthly | 12 months |
| Inngest event log | Inngest built-in event history | Per event | 7 days (free) / 90 days (pro) |

### 17.2 Recovery Objectives

| Metric | Target |
|--------|--------|
| **RTO** (Recovery Time Objective) | < 1 hour |
| **RPO** (Recovery Point Objective) | < 15 minutes (Turso PITR) |
| **MTTR** (Mean Time to Recover) | < 30 minutes for app restarts (Vercel redeploy) |

### 17.3 Incident Response Flow

```
Alert Fires (Sentry / BetterUptime)
    │
    ▼
On-call engineer notified (PagerDuty / Slack)
    │
    ▼
Assess severity:
  ├── P1 (Platform down)     → Vercel redeploy / Turso restore → Status page update
  ├── P2 (Core feature down) → Fix within 2 hours → hotfix deploy to Vercel
  └── P3 (Minor issue)       → Fix in next deploy
    │
    ▼
Post-incident: Root cause analysis (RCA) document
```

---

## 18. Architecture Decision Records (ADRs)

### ADR-001: Next.js Full-Stack over Decoupled Go + React (Vite)

| | |
|-|-|
| **Status** | Accepted |
| **Decision** | Use Next.js 15 (App Router) as the single full-stack framework for both frontend and backend |
| **Context** | Previous architecture used React (Vite) SPA + Go (Gin) as a separate REST API server. Team now adopts TypeScript end-to-end and prefers a single deployment. |
| **Pros** | TypeScript end-to-end; native SSR/ISR (no separate meta-tag injection hack); single Vercel deployment; co-located API routes; React Server Components reduce client bundle size |
| **Cons** | Node.js Route Handlers are slower than Go for CPU-bound tasks; vendor lock-in to Next.js; cold starts on serverless |
| **Alternatives Considered** | Go + React Vite (rejected: two languages, two deployments, SEO workaround complexity); Express.js + React (rejected: no SSR, separate deployment); Remix (rejected: smaller ecosystem than Next.js) |

---

### ADR-002: Turso (libSQL) over PostgreSQL

| | |
|-|-|
| **Status** | Accepted |
| **Decision** | Use Turso (libSQL — edge-distributed SQLite) as the primary database |
| **Context** | Previous architecture used PostgreSQL 16 on Railway with PgBouncer for connection pooling. Goal is to reduce infrastructure overhead and achieve edge-native data access. |
| **Pros** | Zero server management; globally distributed read replicas; stateless HTTP connections (no pooler needed); SQLite dialect is simple and familiar; excellent Drizzle ORM integration; generous free tier |
| **Cons** | SQLite has no native `tsvector` full-text search (use FTS5 instead); no stored procedures; REAL instead of DECIMAL for money (use integer cents); limited to SQLite data types |
| **Alternatives Considered** | PostgreSQL on Railway (rejected: connection pooler needed, separate managed service, higher operational cost); PlanetScale (rejected: MySQL dialect, no SQLite); Neon (rejected: PostgreSQL but serverless, more complex than Turso for this scale) |

---

### ADR-003: Drizzle ORM over Prisma

| | |
|-|-|
| **Status** | Accepted |
| **Decision** | Use Drizzle ORM as the data access layer for Turso/libSQL |
| **Context** | Need a TypeScript ORM that works natively with libSQL/SQLite and the Next.js/Node.js runtime. |
| **Pros** | TypeScript-first; SQL-like API with full type inference; lightweight (no Rust binary, no query engine); excellent Turso/libSQL support; Drizzle Kit for migrations; works in Edge runtime |
| **Cons** | Less feature-rich than Prisma for complex relations; smaller community than Prisma; no built-in seeding tool |
| **Alternatives Considered** | Prisma (rejected: Prisma's query engine is a Rust binary that doesn't work well in edge runtime; less mature libSQL adapter); GORM (rejected: Go only); raw @libsql/client (rejected: no type safety, verbose) |

---

### ADR-004: NextAuth.js v5 over Custom JWT Implementation

| | |
|-|-|
| **Status** | Accepted |
| **Decision** | Use NextAuth.js v5 (Auth.js) for all authentication |
| **Context** | Previous architecture used custom RS256 JWT generation/validation in Go with manual refresh token storage. Need a simpler, battle-tested auth solution for Node.js. |
| **Pros** | Built-in Google OAuth provider; credential provider for email+password; Drizzle adapter for Turso session storage; CSRF protection built-in; automatic token rotation; active maintenance |
| **Cons** | Less control over JWT payload; v5 still evolving (breaking changes possible); opinionated session handling |
| **Alternatives Considered** | Custom JWT with jose (rejected: more boilerplate, manual OAuth flow, manual CSRF protection); Clerk (rejected: third-party dependency, cost at scale, less control); Lucia Auth (rejected: smaller community, more manual setup than NextAuth) |

---

### ADR-005: Inngest over BullMQ / Redis for Background Jobs

| | |
|-|-|
| **Status** | Accepted |
| **Decision** | Use Inngest for all asynchronous background job processing |
| **Context** | Previous architecture used Asynq (Go, Redis-backed). With Node.js and no Redis requirement, need a serverless-native job queue. |
| **Pros** | Zero infrastructure (no Redis, no broker); serverless and Vercel-native; durable execution with built-in retry and backoff; event scheduling (`step.sleep`); full event history and replay dashboard; free tier sufficient for v1.0 |
| **Cons** | External SaaS dependency (Inngest cloud); cold start on Vercel means function execution is slightly delayed; limited to Inngest's pricing at high volume |
| **Alternatives Considered** | BullMQ (rejected: requires Redis which was explicitly excluded); Trigger.dev (rejected: similar to Inngest but less mature ecosystem); Vercel Cron Jobs (rejected: no retry, no event-driven triggers, only cron); QStash by Upstash (rejected: more complex setup, no step functions) |

---

*Document Classification: Confidential — Internal Use Only*
*[Your Organization Name] | v2.0 | August 20, 2026*
