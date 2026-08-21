# 🌊 Wave 1 Implementation Plan & Execution Record
## LMS Platform · Foundation, Identity & Governance

---

| Document Info | Details |
| :--- | :--- |
| **Document Title** | Wave 1 Implementation Plan & Execution Record |
| **Target Wave** | Wave 1 — Foundation & Identity |
| **Tech Stack** | Next.js 15 (App Router), TypeScript, Tailwind CSS, Drizzle ORM, libSQL / SQLite, NextAuth.js v5 |
| **Status** | ✅ Executed & Verified (Local SQLite Mode) |
| **Date** | August 20, 2026 |

---

## 1. Executive Summary

Wave 1 establishes the foundational infrastructure, database architecture, authentication system, role-based access control (RBAC), and user governance moderation tools for the LMS platform.

The system is configured to support **zero-dependency local development via SQLite (`file:./local.db`)** with seamless plug-and-play capability for **Turso Cloud** in staging/production.

---

## 2. Environment Configuration

### Files
- **[`.env.example`](file:///d:/Projects/cloud%20planning/.env.example):** Template documentation for all cloud services and secrets.
- **[`.env.local`](file:///d:/Projects/cloud%20planning/.env.local):** Active local environment file.
- **[`src/lib/env.ts`](file:///d:/Projects/cloud%20planning/src/lib/env.ts):** Runtime validator built using `@t3-oss/env-nextjs` and `zod`.

### Environment Variables Specification

```env
# Runtime
NODE_ENV=development

# NextAuth v5
AUTH_SECRET=<32-byte-hex-secret>
AUTH_URL=http://localhost:3000

# Google OAuth (Optional)
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# Database — Turso (libSQL) / Local SQLite
TURSO_DATABASE_URL=file:./local.db
TURSO_AUTH_TOKEN=

# Email Service — Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@example.com

# Media Storage — AWS S3 / Cloudflare R2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=lms-platform-media

# Background Jobs & Queues — Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Rate Limiting — Upstash Redis
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Payment Gateways — Stripe & Razorpay
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

---

## 3. Database Architecture & Schema

### Drizzle Configuration: [`drizzle.config.ts`](file:///d:/Projects/cloud%20planning/drizzle.config.ts)
- Dialect: `turso`
- Schema Directory: `./src/lib/db/schema/index.ts`
- Migration Target: `./src/lib/db/migrations`

### Database Client: [`src/lib/db/client.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/client.ts)
Initializes `@libsql/client` with automatic detection of `file:./local.db` or `libsql://` cloud endpoints.

### Tables Implemented

#### `users` ([`src/lib/db/schema/users.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/users.ts))
| Column | Type | Constraints / Description |
| :--- | :--- | :--- |
| `id` | `text` | Primary Key, UUID |
| `email` | `text` | Unique, Not Null |
| `password_hash` | `text` | Bcrypt hash (cost 12), nullable for OAuth |
| `full_name` | `text` | Not Null |
| `avatar_url` | `text` | Nullable |
| `bio` | `text` | Nullable |
| `role` | `text` | Enum: `ADMIN`, `TEACHER`, `STUDENT` (Default: `STUDENT`) |
| `status` | `text` | Enum: `ACTIVE`, `PENDING_APPROVAL`, `SUSPENDED`, `REJECTED` |
| `email_verified` | `integer (boolean)` | Default `false` |
| `email_verify_token` | `text` | SHA-256 hash of random 32-byte hex token |
| `email_verify_expires_at` | `text` | ISO8601 timestamp (24-hour expiration) |
| `reset_password_token` | `text` | SHA-256 hash (1-hour expiration) |
| `reset_password_expires_at`| `text` | ISO8601 timestamp |
| `created_at`, `updated_at`| `text` | ISO8601 timestamp |

#### `accounts` ([`src/lib/db/schema/accounts.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/accounts.ts))
OAuth accounts table linked to `users.id` with `onDelete: 'cascade'`.

#### `sessions` ([`src/lib/db/schema/sessions.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/sessions.ts))
NextAuth database sessions table.

#### `verification_tokens` ([`src/lib/db/schema/verification-tokens.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/verification-tokens.ts))
Compound primary key `(identifier, token)` for verification links.

#### `audit_logs` ([`src/lib/db/schema/audit-logs.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/schema/audit-logs.ts))
Tracks administrative actions (`APPROVE_TEACHER`, `REJECT_TEACHER`, `SUSPEND_USER`, `RESTORE_USER`, `CHANGE_ROLE`) with admin ID, target user ID, IP address, and JSON metadata.

---

## 4. Vertical Slices Implementation

### Slice 0 — Bootstrap & Skeleton
- **Scaffolding:** Next.js 15 (App Router), TypeScript, Tailwind CSS.
- **Design Tokens:** Modern dark theme, glassmorphism utilities (`glass-card`, `glass-panel`), and gradient accents.
- **Seed Script:** [`src/lib/db/seed.ts`](file:///d:/Projects/cloud%20planning/src/lib/db/seed.ts) creating `admin@lms.local` / `AdminPass123!`.

### Slice 1.1 — Registration & Email Verification
- **Service Layer:** [`src/lib/services/auth.service.ts`](file:///d:/Projects/cloud%20planning/src/lib/services/auth.service.ts)
  - Validates inputs via Zod schema ([`src/lib/validations/auth.ts`](file:///d:/Projects/cloud%20planning/src/lib/validations/auth.ts)).
  - Checks email uniqueness.
  - Hashes passwords with bcrypt.
  - Dispatches verification email via Resend with local development simulator fallback.
- **Endpoints:**
  - `POST /api/auth/register`
  - `GET /api/auth/verify-email?token={token}`
- **UI:** [`/register`](file:///d:/Projects/cloud%20planning/src/app/(auth)/register/page.tsx) with interactive Student/Teacher role selection.

### Slice 1.2 — Login, JWT & Role-Based Access Control
- **NextAuth Configuration:**
  - [`src/lib/auth.config.ts`](file:///d:/Projects/cloud%20planning/src/lib/auth.config.ts): Edge-compatible JWT/Session callbacks and routing rules.
  - [`src/lib/auth.ts`](file:///d:/Projects/cloud%20planning/src/lib/auth.ts): Node.js runtime credentials provider with bcrypt comparison and database lookup.
- **Edge Middleware:** [`src/middleware.ts`](file:///d:/Projects/cloud%20planning/src/middleware.ts) protecting `/dashboard`, `/teacher/*`, and `/admin/*`.
- **UI:**
  - [`/login`](file:///d:/Projects/cloud%20planning/src/app/(auth)/login/page.tsx)
  - [`/dashboard`](file:///d:/Projects/cloud%20planning/src/app/(dashboard)/dashboard/page.tsx) (Student Portal)
  - [`/teacher/dashboard`](file:///d:/Projects/cloud%20planning/src/app/(teacher)/teacher/dashboard/page.tsx) (Teacher Studio)
  - [`/pending-approval`](file:///d:/Projects/cloud%20planning/src/app/pending-approval/page.tsx) (Pending Teacher Screen)

### Slice 1.3 — Forgot Password & Reset Flow
- **Service Methods:** `requestPasswordReset(email)` & `resetPassword(token, newPassword)`.
- **Endpoints:**
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password`
- **UI:**
  - [`/forgot-password`](file:///d:/Projects/cloud%20planning/src/app/(auth)/forgot-password/page.tsx)
  - [`/reset-password`](file:///d:/Projects/cloud%20planning/src/app/(auth)/reset-password/page.tsx)

### Slice 1.4 — Admin User Management & Audit Panel
- **Endpoints:**
  - `GET /api/admin/users`: Search, filter by role and status, paginated output.
  - `PATCH /api/admin/users/[id]`: Status updates (Approve/Reject/Suspend/Restore) and role promotions, with automatic audit log entries.
- **UI:**
  - [`/admin/dashboard`](file:///d:/Projects/cloud%20planning/src/app/(admin)/admin/dashboard/page.tsx)
  - [`src/app/(admin)/admin/dashboard/user-table.tsx`](file:///d:/Projects/cloud%20planning/src/app/(admin)/admin/dashboard/user-table.tsx): Client table with instant actions.

---

## 5. Verification & Test Run

| Verification Step | Command / Method | Result |
| :--- | :--- | :---: |
| **Dependencies Installation** | `npm install` | ✅ 709 packages installed |
| **Database Schema Push** | `npx drizzle-kit push --force` | ✅ All tables & indexes created in `local.db` |
| **Database Seeding** | `npm run db:seed` | ✅ Seeded `admin@lms.local` |
| **TypeScript & Build Check** | `npm run build` | ✅ 17 routes compiled with 0 errors |
| **UI Endpoints Validation** | Browser Subagent | ✅ Verified Home, Login, Register, Forgot Password |
| **Dev Server Liveness** | `npm run dev` | ✅ Active at `http://localhost:3000` |

---

## 6. Seed Credentials Reference

| Role | Email | Password | Status |
| :--- | :--- | :--- | :--- |
| **Superadmin** | `admin@lms.local` | `AdminPass123!` | Active, Verified |
