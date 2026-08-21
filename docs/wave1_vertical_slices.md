# 🌊 Wave 1 — Vertical Slices
## LMS Platform · Foundation & Identity

> **Target Date:** October 6, 2026  
> **Theme:** Auth system, DB schema, role-based routing, and infrastructure setup.  
> **Definition of Done:** All 4 slices pass unit tests, integration tests, and can be demonstrated end-to-end in staging.

---

## Table of Contents

0. [Slice 0 — Project Setup & Bootstrap](#slice-0--project-setup--bootstrap)
1. [Slice 1.1 — User Registration & Email Verification](#slice-11--user-registration--email-verification)
2. [Slice 1.2 — Login, JWT & Role-Based Redirect](#slice-12--login-jwt--role-based-redirect)
3. [Slice 1.3 — Forgot Password & Reset Flow](#slice-13--forgot-password--reset-flow)
4. [Slice 1.4 — Admin: User Management Panel](#slice-14--admin-user-management-panel)
5. [Wave 1 Shared Infrastructure](#wave-1-shared-infrastructure)

---

## Slice 0 — Project Setup & Bootstrap

### 🎯 Goal
Stand up the complete project skeleton — repository, folder structure, tooling, environment variables, database connection, auth config, background jobs, email, and CI/CD — so that every Wave 1 feature slice has a working foundation to build on. **No user-facing feature is delivered here, but nothing in Wave 1 can start without this slice being done.**

> **Owner:** Tech Lead / Senior Engineer  
> **Duration:** ~2 days (Sept 22–23, 2026)  
> **Blocker for:** All of Wave 1 (Slices 1.1–1.4)

---

### 📋 Pre-Requisites (Accounts & Services to Set Up First)

Before writing a single line of code, create accounts and collect API keys for:

| Service | What You Need | Where to Get It |
|---------|--------------|-----------------|
| **GitHub** | Repo created, team members invited | github.com |
| **Vercel** | Project linked to GitHub repo | vercel.com |
| **Turso** | Database URL + Auth Token | turso.tech |
| **Upstash** | Redis REST URL + Token (for rate limiting) | upstash.com |
| **Resend** | API Key + verified sending domain | resend.com |
| **AWS S3** | Bucket name, region, Access Key ID, Secret Key | aws.amazon.com |
| **Inngest** | Event Key + Signing Key | inngest.com |
| **Google OAuth** | Client ID + Client Secret | console.cloud.google.com |

---

### 🏗️ Step 1 — Scaffold the Project

```bash
# 1. Create Next.js 15 app with TypeScript, Tailwind CSS 4, App Router
npx create-next-app@latest lms-platform \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd lms-platform

# 2. Install all production dependencies
npm install \
  next-auth@beta \
  drizzle-orm \
  @libsql/client \
  inngest \
  resend \
  stripe \
  razorpay \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  @upstash/ratelimit \
  @upstash/redis \
  @t3-oss/env-nextjs \
  zod \
  zustand \
  @tanstack/react-query \
  react-hook-form \
  @hookform/resolvers \
  recharts \
  @dnd-kit/core \
  @dnd-kit/sortable \
  @react-pdf/renderer \
  @tiptap/react \
  @tiptap/starter-kit \
  @tiptap/extension-image \
  @tiptap/extension-link \
  bcryptjs \
  pino \
  pino-pretty \
  class-variance-authority \
  clsx \
  tailwind-merge \
  lucide-react

# 3. Install dev dependencies
npm install -D \
  drizzle-kit \
  vitest \
  @vitejs/plugin-react \
  @testing-library/react \
  @testing-library/user-event \
  @testing-library/jest-dom \
  @types/bcryptjs \
  prettier \
  prettier-plugin-tailwindcss \
  eslint-config-prettier \
  husky \
  lint-staged \
  @playwright/test

# 4. Install shadcn/ui
npx shadcn@latest init
# Choose: New York style, CSS variables: yes
```

---

### 📁 Step 2 — Establish Folder Structure

Create the following directories and placeholder files to establish the full architecture upfront:

```
src/
├── app/
│   ├── (public)/
│   │   ├── courses/
│   │   └── blog/
│   ├── (auth)/
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (dashboard)/
│   │   ├── layout.tsx         ← auth guard for students
│   │   └── dashboard/
│   ├── (teacher)/
│   │   ├── layout.tsx         ← auth guard for teachers
│   │   └── dashboard/
│   ├── (admin)/
│   │   ├── layout.tsx         ← auth guard for admins
│   │   └── dashboard/
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── users/route.ts
│       ├── courses/route.ts
│       ├── webhooks/
│       │   ├── stripe/route.ts
│       │   ├── razorpay/route.ts
│       │   └── inngest/route.ts
│       └── inngest/route.ts
│
├── components/
│   ├── ui/                    ← shadcn/ui components live here
│   ├── shared/
│   ├── dashboard/
│   ├── teacher/
│   ├── admin/
│   └── blog/
│
├── lib/
│   ├── db/
│   │   ├── index.ts           ← Drizzle client
│   │   └── schema/
│   │       ├── index.ts       ← re-exports all schemas
│   │       ├── users.ts
│   │       ├── courses.ts
│   │       ├── lessons.ts
│   │       ├── orders.ts
│   │       └── blog.ts
│   ├── auth.ts                ← NextAuth.js config
│   ├── inngest.ts             ← Inngest client + function definitions
│   ├── s3.ts                  ← S3 client helpers
│   ├── resend.ts              ← Resend email client
│   ├── stripe.ts              ← Stripe client
│   ├── razorpay.ts            ← Razorpay client
│   ├── rate-limit.ts          ← Upstash rate limiter
│   └── utils.ts               ← cn(), formatCurrency(), etc.
│
├── services/
│   ├── auth.service.ts
│   ├── course.service.ts
│   ├── payment.service.ts
│   ├── live-session.service.ts
│   └── notification.service.ts
│
├── hooks/                     ← Custom React hooks
├── types/                     ← Shared TypeScript types
├── env.ts                     ← @t3-oss/env-nextjs config
└── middleware.ts              ← NextAuth.js + RBAC middleware
```

```bash
# Quick-create the directory tree
mkdir -p src/app/\(public\)/courses src/app/\(public\)/blog
mkdir -p src/app/\(auth\)/login src/app/\(auth\)/register src/app/\(auth\)/forgot-password
mkdir -p src/app/\(dashboard\)/dashboard
mkdir -p src/app/\(teacher\)/dashboard
mkdir -p src/app/\(admin\)/dashboard
mkdir -p src/app/api/auth/\[...nextauth\]
mkdir -p src/app/api/webhooks/stripe src/app/api/webhooks/razorpay src/app/api/webhooks/inngest
mkdir -p src/components/ui src/components/shared src/components/dashboard src/components/teacher src/components/admin src/components/blog
mkdir -p src/lib/db/schema
mkdir -p src/services src/hooks src/types
```

---

### 🔐 Step 3 — Environment Variables

Create `.env.local` (never commit this) and `.env.example` (commit this as documentation):

```bash
# .env.local
# ─────────────────────────────────────────────
# App
# ─────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# ─────────────────────────────────────────────
# NextAuth.js v5
# ─────────────────────────────────────────────
AUTH_SECRET=                          # openssl rand -base64 32
AUTH_URL=http://localhost:3000

# Google OAuth
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# ─────────────────────────────────────────────
# Database — Turso (libSQL)
# ─────────────────────────────────────────────
TURSO_DATABASE_URL=                   # libsql://your-db.turso.io
TURSO_AUTH_TOKEN=                     # from Turso dashboard

# ─────────────────────────────────────────────
# Email — Resend
# ─────────────────────────────────────────────
RESEND_API_KEY=                       # re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# ─────────────────────────────────────────────
# File Storage — AWS S3
# ─────────────────────────────────────────────
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-south-1
AWS_S3_BUCKET_NAME=lms-platform-media

# ─────────────────────────────────────────────
# Background Jobs — Inngest
# ─────────────────────────────────────────────
INNGEST_EVENT_KEY=                    # from Inngest dashboard
INNGEST_SIGNING_KEY=                  # from Inngest dashboard

# ─────────────────────────────────────────────
# Rate Limiting — Upstash Redis
# ─────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# ─────────────────────────────────────────────
# Payments
# ─────────────────────────────────────────────
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=                # from `stripe listen` or Stripe dashboard

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# ─────────────────────────────────────────────
# Monitoring
# ─────────────────────────────────────────────
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=

# ─────────────────────────────────────────────
# Live Classes (Wave 6 — configure later)
# ─────────────────────────────────────────────
# ZOOM_CLIENT_ID=
# ZOOM_CLIENT_SECRET=
# ZOOM_ACCOUNT_ID=
# GOOGLE_CALENDAR_SERVICE_ACCOUNT_JSON=
```

**Type-safe env validation** — create `src/env.ts`:

```typescript
// src/env.ts
import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    NODE_ENV:                z.enum(["development", "test", "production"]),
    AUTH_SECRET:             z.string().min(32),
    AUTH_GOOGLE_ID:          z.string().min(1),
    AUTH_GOOGLE_SECRET:      z.string().min(1),
    TURSO_DATABASE_URL:      z.string().url(),
    TURSO_AUTH_TOKEN:        z.string().min(1),
    RESEND_API_KEY:          z.string().startsWith("re_"),
    RESEND_FROM_EMAIL:       z.string().email(),
    AWS_ACCESS_KEY_ID:       z.string().min(1),
    AWS_SECRET_ACCESS_KEY:   z.string().min(1),
    AWS_REGION:              z.string().min(1),
    AWS_S3_BUCKET_NAME:      z.string().min(1),
    INNGEST_EVENT_KEY:       z.string().min(1),
    INNGEST_SIGNING_KEY:     z.string().min(1),
    UPSTASH_REDIS_REST_URL:  z.string().url(),
    UPSTASH_REDIS_REST_TOKEN:z.string().min(1),
    STRIPE_SECRET_KEY:       z.string().startsWith("sk_"),
    STRIPE_WEBHOOK_SECRET:   z.string().startsWith("whsec_"),
    RAZORPAY_KEY_ID:         z.string().min(1),
    RAZORPAY_KEY_SECRET:     z.string().min(1),
    RAZORPAY_WEBHOOK_SECRET: z.string().min(1),
    SENTRY_DSN:              z.string().url().optional(),
  },
  client: {
    NEXT_PUBLIC_APP_URL:          z.string().url(),
    NEXT_PUBLIC_SENTRY_DSN:       z.string().url().optional(),
  },
  runtimeEnv: {
    NODE_ENV:                      process.env.NODE_ENV,
    AUTH_SECRET:                   process.env.AUTH_SECRET,
    AUTH_GOOGLE_ID:                process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET:            process.env.AUTH_GOOGLE_SECRET,
    TURSO_DATABASE_URL:            process.env.TURSO_DATABASE_URL,
    TURSO_AUTH_TOKEN:              process.env.TURSO_AUTH_TOKEN,
    RESEND_API_KEY:                process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL:             process.env.RESEND_FROM_EMAIL,
    AWS_ACCESS_KEY_ID:             process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY:         process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION:                    process.env.AWS_REGION,
    AWS_S3_BUCKET_NAME:            process.env.AWS_S3_BUCKET_NAME,
    INNGEST_EVENT_KEY:             process.env.INNGEST_EVENT_KEY,
    INNGEST_SIGNING_KEY:           process.env.INNGEST_SIGNING_KEY,
    UPSTASH_REDIS_REST_URL:        process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN:      process.env.UPSTASH_REDIS_REST_TOKEN,
    STRIPE_SECRET_KEY:             process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET:         process.env.STRIPE_WEBHOOK_SECRET,
    RAZORPAY_KEY_ID:               process.env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET:           process.env.RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET:       process.env.RAZORPAY_WEBHOOK_SECRET,
    SENTRY_DSN:                    process.env.SENTRY_DSN,
    NEXT_PUBLIC_APP_URL:           process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SENTRY_DSN:        process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
})
```

> **Rule:** Import `env` from `@/env` everywhere — never use `process.env` directly in code.

---

### 🗄️ Step 4 — Database Setup (Drizzle + Turso)

**`src/lib/db/index.ts`** — Drizzle client:

```typescript
// src/lib/db/index.ts
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { env } from '@/env'
import * as schema from './schema'

const client = createClient({
  url:       env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })
export type DB = typeof db
```

**`drizzle.config.ts`** — in project root:

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

config({ path: '.env.local' })

export default {
  schema:    './src/lib/db/schema/index.ts',
  out:       './drizzle/migrations',
  dialect:   'turso',
  dbCredentials: {
    url:       process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
} satisfies Config
```

**Add to `package.json` scripts:**

```json
{
  "scripts": {
    "dev":           "next dev",
    "build":         "next build",
    "start":         "next start",
    "lint":          "next lint",
    "format":        "prettier --write .",
    "typecheck":     "tsc --noEmit",
    "test":          "vitest",
    "test:ui":       "vitest --ui",
    "test:e2e":      "playwright test",
    "db:generate":   "drizzle-kit generate",
    "db:migrate":    "drizzle-kit migrate",
    "db:studio":     "drizzle-kit studio",
    "db:push":       "drizzle-kit push",
    "inngest:dev":   "npx inngest-cli@latest dev"
  }
}
```

**Verify Turso connection:**

```bash
# Run this once to confirm DB connection works before proceeding
npm run db:push
# Should output: "Changes applied" or "No changes"
```

---

### 🔑 Step 5 — NextAuth.js v5 Configuration

**`src/lib/auth.ts`:**

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Credentials from 'next-auth/providers/credentials'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'
import { env } from '@/env'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { users } from '@/lib/db/schema/users'
import { eq } from 'drizzle-orm'

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter:   DrizzleAdapter(db),
  providers: [
    Google({
      clientId:     env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1)

        if (!user || !user.passwordHash) return null
        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        if (!valid) return null
        if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED')
        if (user.status !== 'ACTIVE') throw new Error('ACCOUNT_SUSPENDED')

        return { id: user.id, email: user.email, name: user.fullName, role: user.role }
      },
    }),
  ],
  session:  { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id   = user.id
        token.role = (user as any).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id   = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn:  '/login',
    error:   '/login',
  },
})
```

**`src/app/api/auth/[...nextauth]/route.ts`:**

```typescript
// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

**Extend NextAuth session type** — `src/types/next-auth.d.ts`:

```typescript
// src/types/next-auth.d.ts
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id:   string
      role: 'ADMIN' | 'TEACHER' | 'STUDENT'
    } & DefaultSession['user']
  }
}
```

---

### ⚙️ Step 6 — Middleware (RBAC Route Protection)

**`src/middleware.ts`:**

```typescript
// src/middleware.ts
import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_ROUTES: Record<string, string[]> = {
  '/dashboard':   ['STUDENT', 'ADMIN'],
  '/teacher':     ['TEACHER', 'ADMIN'],
  '/admin':       ['ADMIN'],
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Determine if route requires a specific role
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) {
      if (!session) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      if (!allowedRoles.includes(session.user.role)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
      break
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
}
```

---

### 📨 Step 7 — Inngest Setup (Background Jobs)

**`src/lib/inngest.ts`:**

```typescript
// src/lib/inngest.ts
import { Inngest } from 'inngest'
import { env } from '@/env'

export const inngest = new Inngest({
  id:       'lms-platform',
  eventKey: env.INNGEST_EVENT_KEY,
})

// Type-safe event map — expand as new events are added
export type Events = {
  'email/verification':     { data: { to: string; token: string; name: string } }
  'email/purchase-receipt': { data: { to: string; orderId: string } }
  'email/session-reminder': { data: { to: string; sessionId: string; minutesBefore: number } }
  'certificate/generate':   { data: { userId: string; courseId: string; enrollmentId: string } }
}
```

**Inngest Route Handler** — `src/app/api/inngest/route.ts`:

```typescript
// src/app/api/inngest/route.ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
// Import all functions here as they are created
// import { sendVerificationEmail } from '@/lib/inngest/functions/send-verification-email'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // sendVerificationEmail,  ← add functions here
  ],
})
```

**Inngest Webhook Handler** — `src/app/api/webhooks/inngest/route.ts`:

```typescript
// src/app/api/webhooks/inngest/route.ts
// This is where Inngest sends events from the cloud
export { POST } from '@/app/api/inngest/route'
```

**Local dev — run Inngest Dev Server alongside Next.js:**

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run inngest:dev
# Opens Inngest Dev UI at http://localhost:8288
```

---

### 📧 Step 8 — Resend Email Client

**`src/lib/resend.ts`:**

```typescript
// src/lib/resend.ts
import { Resend } from 'resend'
import { env } from '@/env'

export const resend = new Resend(env.RESEND_API_KEY)
export const FROM_EMAIL = env.RESEND_FROM_EMAIL

// Helper: send a transactional email
export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string
  subject: string
  react: React.ReactElement
}) {
  const { data, error } = await resend.emails.send({
    from:    FROM_EMAIL,
    to,
    subject,
    react,
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }

  return data
}
```

---

### 🪣 Step 9 — AWS S3 Client

**`src/lib/s3.ts`:**

```typescript
// src/lib/s3.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '@/env'
import { randomUUID } from 'crypto'

export const s3 = new S3Client({
  region:      env.AWS_REGION,
  credentials: {
    accessKeyId:     env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
})

/**
 * Generate a presigned URL for direct browser-to-S3 upload.
 * The client uploads the file; our server never handles the binary.
 */
export async function getPresignedUploadUrl({
  folder,
  fileName,
  contentType,
  expiresIn = 300, // 5 minutes
}: {
  folder:      string   // e.g., 'thumbnails', 'videos', 'avatars'
  fileName:    string
  contentType: string
  expiresIn?:  number
}) {
  const ext = fileName.split('.').pop()
  const key = `${folder}/${randomUUID()}.${ext}`

  const command = new PutObjectCommand({
    Bucket:      env.AWS_S3_BUCKET_NAME,
    Key:         key,
    ContentType: contentType,
  })

  const url = await getSignedUrl(s3, command, { expiresIn })

  return {
    uploadUrl: url,
    publicUrl: `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
    key,
  }
}
```

---

### 🛡️ Step 10 — Rate Limiting

**`src/lib/rate-limit.ts`:**

```typescript
// src/lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/env'

const redis = new Redis({
  url:   env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
})

// Auth endpoints: 10 requests per 10 minutes per IP
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 m'),
  prefix:  'rl:auth',
})

// General API: 100 requests per minute per IP
export const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  prefix:  'rl:api',
})

// Helper to check rate limit in Route Handlers
export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ success: boolean; remaining: number; reset: Date }> {
  const { success, remaining, reset } = await limiter.limit(identifier)
  return { success, remaining, reset: new Date(reset) }
}
```

---

### 🔧 Step 11 — Dev Tooling (ESLint, Prettier, Husky)

**`prettier.config.js`:**

```javascript
// prettier.config.js
/** @type {import("prettier").Config} */
export default {
  semi:           false,
  singleQuote:    true,
  tabWidth:       2,
  trailingComma:  'es5',
  printWidth:     100,
  plugins:        ['prettier-plugin-tailwindcss'],
}
```

**`.eslintrc.json`** — extend with Prettier:

```json
{
  "extends": ["next/core-web-vitals", "next/typescript", "prettier"],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

**Husky + lint-staged setup:**

```bash
# Initialize Husky
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

**`package.json`** — add lint-staged config:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

**`tsconfig.json`** — ensure strict mode and path aliases:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### 🚀 Step 12 — CI/CD Bootstrap (GitHub Actions + Vercel)

**`.github/workflows/ci.yml`:**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  ci:
    name: Lint · Typecheck · Test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js 22
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Typecheck
        run: npm run typecheck

      - name: Lint
        run: npm run lint

      - name: Unit Tests
        run: npm run test
        env:
          # Minimal env for tests — use test values
          NODE_ENV: test
          AUTH_SECRET: test-secret-at-least-32-characters-long
          TURSO_DATABASE_URL: file:./test.db
          TURSO_AUTH_TOKEN: test-token

  e2e:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    needs: ci
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_APP_URL: http://localhost:3000
```

**Vercel Setup:**

```bash
# Link Vercel project (run once)
npx vercel link

# Add all environment variables to Vercel
# Go to: vercel.com → Project → Settings → Environment Variables
# Add all keys from .env.local for Production + Preview environments
```

**`.vercelignore`:**

```
.env.local
drizzle/
*.test.ts
*.spec.ts
```

---

### ✅ Slice 0 — Definition of Done

Before declaring Slice 0 complete and moving to Slice 1.1, verify **all** of the following:

| Checkpoint | Verification Command / Method |
|-----------|-------------------------------|
| ✅ Project scaffolded | `npm run dev` → app loads at `localhost:3000` |
| ✅ TypeScript strict mode | `npm run typecheck` → 0 errors |
| ✅ ESLint clean | `npm run lint` → 0 errors |
| ✅ Prettier configured | `npm run format` → no diffs |
| ✅ Husky hooks active | `git commit` → lint-staged runs |
| ✅ Drizzle connected to Turso | `npm run db:push` → success |
| ✅ Drizzle Studio accessible | `npm run db:studio` → opens browser UI |
| ✅ `.env.local` fully populated | All required keys present, no empty strings |
| ✅ `env.ts` validates on startup | `npm run dev` starts without env errors |
| ✅ NextAuth route responds | `GET /api/auth/providers` → returns JSON |
| ✅ Inngest Dev UI connects | `npm run inngest:dev` → Dev UI at `localhost:8288` |
| ✅ S3 presigned URL works | Manual test: call `getPresignedUploadUrl()` and upload a test file |
| ✅ Resend test email delivered | Send test email to your inbox via Resend dashboard |
| ✅ Rate limiter responds | Hit auth endpoint 11 times → 12th returns `429` |
| ✅ CI pipeline green | Push to `develop` branch → GitHub Actions passes |
| ✅ Vercel preview deploy | Open PR → Vercel comment with preview URL appears |
| ✅ shadcn/ui components work | Add one `<Button>` from shadcn to home page |

> **🚧 Do not start Slice 1.1 until every row above is ✅**

---


## Slice 1.1 — User Registration & Email Verification

### 🎯 Goal
New users (Students or Teachers) can self-register with name, email, and password. On successful registration, a verification email is dispatched. The account remains unverified until the user clicks the link. Teacher accounts additionally remain in `PENDING_APPROVAL` status until an Admin approves them.

---

### 🗄️ Database Schema

```typescript
// lib/db/schema/users.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email:         text('email').unique().notNull(),
  passwordHash:  text('password_hash'),                    // null for OAuth-only users
  fullName:      text('full_name').notNull(),
  avatarUrl:     text('avatar_url'),
  bio:           text('bio'),
  role:          text('role', {
                   enum: ['ADMIN', 'TEACHER', 'STUDENT']
                 }).default('STUDENT').notNull(),
  status:        text('status', {
                   enum: ['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED', 'REJECTED']
                 }).default('ACTIVE').notNull(),
  emailVerified:        integer('email_verified', { mode: 'boolean' }).default(false),
  emailVerifyToken:     text('email_verify_token'),         // one-time token, hashed
  emailVerifyExpiresAt: text('email_verify_expires_at'),   // ISO8601
  createdAt:     text('created_at').$defaultFn(() => new Date().toISOString()),
  updatedAt:     text('updated_at').$defaultFn(() => new Date().toISOString()),
})

export type User    = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
```

**Indexes:**
```sql
CREATE INDEX idx_users_email         ON users(email);
CREATE INDEX idx_users_role          ON users(role);
CREATE INDEX idx_users_status        ON users(status);
CREATE INDEX idx_users_verify_token  ON users(email_verify_token);
```

---

### ⚙️ Business Logic

**Rules:**
1. Email must be unique across all users.
2. Password minimum 8 characters; hashed with `bcrypt` (cost 12).
3. Student role → status defaults to `ACTIVE`, but `emailVerified = false`.
4. Teacher role → status defaults to `PENDING_APPROVAL`, `emailVerified = false`.
5. Email verification token is a random 32-byte hex string, stored hashed (SHA-256), expires in **24 hours**.
6. A user with `emailVerified = false` cannot access protected routes.
7. Duplicate registration (same email) returns `409 Conflict`.

**Flow:**
```
POST /api/auth/register
  │
  ├── Zod validate body (name, email, password, role)
  ├── Check email uniqueness → DB query
  ├── Hash password (bcrypt, cost 12)
  ├── Generate emailVerifyToken (32 bytes crypto.randomBytes → hex)
  ├── Hash token for DB storage (SHA-256)
  ├── Insert user row (role=STUDENT → status=ACTIVE, role=TEACHER → status=PENDING_APPROVAL)
  ├── Fire Inngest event: "email/send-verification" { to, token (raw), userId }
  └── Return 201 { userId, email, role }
```

---

### 🔌 API

#### `POST /api/auth/register`

**Request:**
```typescript
// Zod schema: lib/validations/auth.schema.ts
export const registerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(72),
  role:     z.enum(['STUDENT', 'TEACHER']),
})
```

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "STUDENT",
    "message": "Registration successful. Please check your email to verify your account."
  }
}
```

**Error Responses:**
| Status | Code | Trigger |
|--------|------|---------|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields |
| `409` | `EMAIL_ALREADY_EXISTS` | Duplicate email |
| `500` | `INTERNAL_ERROR` | DB or hashing failure |

---

#### `GET /api/auth/verify-email?token={rawToken}`

**Business Logic:**
1. Hash incoming `token` (SHA-256) → query DB for matching `emailVerifyToken`.
2. Verify token not expired (`emailVerifyExpiresAt > now`).
3. Set `emailVerified = true`, `emailVerifyToken = null`, `emailVerifyExpiresAt = null`.
4. If Teacher: keep `status = PENDING_APPROVAL` (awaiting Admin approval).
5. If Student: keep `status = ACTIVE` — can now access the student portal.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully.",
    "role": "STUDENT"
  }
}
```

**Error Responses:**
| Status | Code | Trigger |
|--------|------|---------|
| `400` | `INVALID_TOKEN` | Token not found or already used |
| `410` | `TOKEN_EXPIRED` | Token older than 24h |

---

### 🧩 Backend Logic (Service Layer)

```typescript
// lib/services/auth.service.ts

export class AuthService {
  /**
   * Registers a new user.
   * - Hashes password with bcrypt
   * - Generates and stores SHA-256 hashed verification token
   * - Fires Inngest verification email event
   */
  async register(dto: RegisterDto): Promise<{ userId: string; email: string; role: UserRole }> {
    // 1. Check email uniqueness
    const existing = await db.query.users.findFirst({
      where: eq(users.email, dto.email),
    })
    if (existing) throw new AppError('EMAIL_ALREADY_EXISTS', 409)

    // 2. Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12)

    // 3. Generate verification token
    const rawToken    = crypto.randomBytes(32).toString('hex')
    const tokenHash   = createHash('sha256').update(rawToken).digest('hex')
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // 4. Determine initial status
    const status: UserStatus = dto.role === 'TEACHER' ? 'PENDING_APPROVAL' : 'ACTIVE'

    // 5. Insert user
    const [user] = await db
      .insert(users)
      .values({
        fullName:             dto.fullName,
        email:                dto.email,
        passwordHash,
        role:                 dto.role,
        status,
        emailVerifyToken:     tokenHash,
        emailVerifyExpiresAt: tokenExpiry,
      })
      .returning({ id: users.id, email: users.email, role: users.role })

    // 6. Fire Inngest event (non-blocking)
    await inngest.send({
      name: 'email/send-verification',
      data: { to: user.email, rawToken, userId: user.id },
    })

    return { userId: user.id, email: user.email, role: user.role }
  }

  /**
   * Verifies a user's email using their raw token.
   */
  async verifyEmail(rawToken: string): Promise<{ role: UserRole }> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex')

    const user = await db.query.users.findFirst({
      where: eq(users.emailVerifyToken, tokenHash),
    })

    if (!user)                                             throw new AppError('INVALID_TOKEN', 400)
    if (new Date(user.emailVerifyExpiresAt!) < new Date()) throw new AppError('TOKEN_EXPIRED', 410)

    await db
      .update(users)
      .set({ emailVerified: true, emailVerifyToken: null, emailVerifyExpiresAt: null })
      .where(eq(users.id, user.id))

    return { role: user.role }
  }
}
```

---

### 🔔 Background Job (Inngest)

```typescript
// lib/inngest/email.functions.ts

export const sendVerificationEmail = inngest.createFunction(
  { id: 'email/send-verification', retries: 3 },
  { event: 'email/send-verification' },
  async ({ event, step }) => {
    const { to, rawToken } = event.data
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/verify-email?token=${rawToken}`

    await step.run('send-email', () =>
      resend.emails.send({
        from:    'noreply@yourlms.com',
        to,
        subject: 'Verify your email — LMS Platform',
        html:    renderVerificationEmail({ verifyUrl }),
      })
    )
  }
)
```

---

### ✅ Unit Tests

```typescript
// __tests__/services/auth.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '@/lib/services/auth.service'

describe('AuthService.register()', () => {
  const authService = new AuthService()

  it('creates a STUDENT user with status ACTIVE', async () => {
    const result = await authService.register({
      fullName: 'Alice Doe', email: 'alice@test.com',
      password: 'securePassword1!', role: 'STUDENT',
    })
    expect(result.role).toBe('STUDENT')
  })

  it('creates a TEACHER user with status PENDING_APPROVAL', async () => {
    await authService.register({
      fullName: 'Bob Teacher', email: 'bob@test.com',
      password: 'securePassword1!', role: 'TEACHER',
    })
    const dbUser = await db.query.users.findFirst({ where: eq(users.email, 'bob@test.com') })
    expect(dbUser?.status).toBe('PENDING_APPROVAL')
  })

  it('throws EMAIL_ALREADY_EXISTS on duplicate email', async () => {
    await authService.register({ fullName: 'First', email: 'dup@test.com', password: 'pass1234!', role: 'STUDENT' })
    await expect(
      authService.register({ fullName: 'Second', email: 'dup@test.com', password: 'pass1234!', role: 'STUDENT' })
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_EXISTS' })
  })

  it('hashes the password — plaintext never stored', async () => {
    await authService.register({ fullName: 'Eve', email: 'eve@test.com', password: 'mypassword', role: 'STUDENT' })
    const dbUser = await db.query.users.findFirst({ where: eq(users.email, 'eve@test.com') })
    expect(dbUser?.passwordHash).not.toBe('mypassword')
    expect(await bcrypt.compare('mypassword', dbUser!.passwordHash!)).toBe(true)
  })
})

describe('AuthService.verifyEmail()', () => {
  it('marks emailVerified = true on valid token', async () => { /* ... */ })
  it('throws INVALID_TOKEN for unknown token', async () => { /* ... */ })
  it('throws TOKEN_EXPIRED for token older than 24h', async () => { /* ... */ })
  it('nullifies token after successful verification', async () => { /* ... */ })
})
```

---

### 🔗 Integration Tests

```typescript
// __tests__/integration/register.test.ts

describe('POST /api/auth/register [integration]', () => {
  it('returns 201 and fires verification email event', async () => {
    const res = await testClient.post('/api/auth/register').json({
      fullName: 'Test User', email: 'test@integration.com',
      password: 'Secure123!', role: 'STUDENT',
    })
    expect(res.status).toBe(201)
    expect(res.body.data.role).toBe('STUDENT')
    expect(mockInngest.send).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'email/send-verification' })
    )
  })

  it('returns 409 on duplicate email', async () => {
    await testClient.post('/api/auth/register').json({ email: 'dup@integration.com', /* ... */ })
    const res = await testClient.post('/api/auth/register').json({ email: 'dup@integration.com', /* ... */ })
    expect(res.status).toBe(409)
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS')
  })

  it('returns 400 on invalid Zod input', async () => {
    const res = await testClient.post('/api/auth/register').json({ email: 'not-an-email' })
    expect(res.status).toBe(400)
  })
})

describe('GET /api/auth/verify-email [integration]', () => {
  it('verifies email and returns 200', async () => { /* seed user with token → call endpoint → assert emailVerified */ })
  it('returns 410 on expired token', async () => { /* seed user with expired token → assert 410 */ })
  it('returns 400 on invalid token', async () => { /* call with garbage token → assert 400 */ })
})
```

---

---

## Slice 1.2 — Login, JWT & Role-Based Redirect

### 🎯 Goal
Registered and verified users can log in with email/password or Google OAuth. On success, a NextAuth.js session (JWT) is created. The client is redirected to the correct portal based on role: `/dashboard` (Student), `/teacher/dashboard` (Teacher), `/admin/dashboard` (Admin). Unverified accounts are blocked with a clear message.

---

### 🗄️ Database Schema

```typescript
// lib/db/schema/accounts.ts
export const accounts = sqliteTable('accounts', {
  id:                text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:            text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:              text('type').notNull(),               // 'oauth' | 'credentials'
  provider:          text('provider').notNull(),           // 'google' | 'credentials'
  providerAccountId: text('provider_account_id').notNull(),
  accessToken:       text('access_token'),
  refreshToken:      text('refresh_token'),
  expiresAt:         integer('expires_at'),
  tokenType:         text('token_type'),
  scope:             text('scope'),
  idToken:           text('id_token'),
  sessionState:      text('session_state'),
})

export const sessions = sqliteTable('sessions', {
  id:           text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionToken: text('session_token').unique().notNull(),
  userId:       text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires:      text('expires').notNull(),
})
```

**Indexes:**
```sql
CREATE INDEX idx_accounts_userId   ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider, provider_account_id);
CREATE INDEX idx_sessions_token    ON sessions(session_token);
CREATE INDEX idx_sessions_userId   ON sessions(user_id);
```

---

### ⚙️ Business Logic

**Rules:**
1. Credentials login: verify email + bcrypt password comparison.
2. `emailVerified = false` → reject with `EMAIL_NOT_VERIFIED`.
3. `status = SUSPENDED` → reject with `ACCOUNT_SUSPENDED`.
4. JWT payload includes: `{ sub: userId, role, status, emailVerified }`.
5. Google OAuth: auto-creates user with `role = STUDENT` if no account exists.
6. Session JWT expires in **7 days**.

**Role → Redirect Map:**
| Role | Status | Redirect |
|------|--------|----------|
| `ADMIN` | `ACTIVE` | `/admin/dashboard` |
| `TEACHER` | `ACTIVE` | `/teacher/dashboard` |
| `TEACHER` | `PENDING_APPROVAL` | `/pending-approval` |
| `STUDENT` | `ACTIVE` | `/dashboard` |

---

### 🔌 API

#### `POST /api/auth/[...nextauth]` — NextAuth.js handler

```typescript
// lib/auth.ts
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        return authService.validateCredentials(parsed.data.email, parsed.data.password)
      },
    }),
    Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role          = (user as any).role
        token.status        = (user as any).status
        token.emailVerified = (user as any).emailVerified
      }
      return token
    },
    async session({ session, token }) {
      session.user.id            = token.sub!
      session.user.role          = token.role as string
      session.user.status        = token.status as string
      session.user.emailVerified = token.emailVerified as boolean
      return session
    },
  },
  pages: { signIn: '/login' },
})
```

---

### 🧩 Backend Logic (Service Layer)

```typescript
// lib/services/auth.service.ts (continued)

async validateCredentials(email: string, password: string): Promise<User | null> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })

  if (!user || !user.passwordHash) return null  // No account or OAuth-only

  const passwordValid = await bcrypt.compare(password, user.passwordHash)
  if (!passwordValid) return null

  if (!user.emailVerified)         throw new AppError('EMAIL_NOT_VERIFIED', 403)
  if (user.status === 'SUSPENDED') throw new AppError('ACCOUNT_SUSPENDED', 403)

  return user
}
```

**RBAC Middleware:**
```typescript
// middleware.ts
export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isAdminRoute   = nextUrl.pathname.startsWith('/admin')
  const isTeacherRoute = nextUrl.pathname.startsWith('/teacher')
  const isDashboard    = nextUrl.pathname.startsWith('/dashboard')

  if (!session && (isAdminRoute || isTeacherRoute || isDashboard))
    return NextResponse.redirect(new URL('/login', req.url))

  if (isAdminRoute && session?.user.role !== 'ADMIN')
    return NextResponse.redirect(new URL('/unauthorized', req.url))

  if (isTeacherRoute && session?.user.role !== 'TEACHER')
    return NextResponse.redirect(new URL('/unauthorized', req.url))

  return NextResponse.next()
})

export const config = {
  matcher: ['/admin/:path*', '/teacher/:path*', '/dashboard/:path*'],
}
```

---

### ✅ Unit Tests

```typescript
describe('AuthService.validateCredentials()', () => {
  it('returns user on correct email + password', async () => { /* ... */ })
  it('returns null on wrong password', async () => { /* ... */ })
  it('throws EMAIL_NOT_VERIFIED for unverified user', async () => { /* ... */ })
  it('throws ACCOUNT_SUSPENDED for suspended user', async () => { /* ... */ })
  it('returns null for OAuth-only user (no passwordHash)', async () => { /* ... */ })
})
```

---

### 🔗 Integration Tests

```typescript
describe('Credentials Login [integration]', () => {
  it('creates JWT session and sets cookie on valid login', async () => { /* ... */ })
  it('blocks login for unverified email', async () => { /* ... */ })
  it('blocks login for suspended user', async () => { /* ... */ })
})

describe('Middleware RBAC [integration]', () => {
  it('redirects unauthenticated user from /dashboard to /login', async () => { /* ... */ })
  it('redirects STUDENT from /admin to /unauthorized', async () => { /* ... */ })
  it('allows ADMIN to access /admin routes', async () => { /* ... */ })
  it('allows TEACHER to access /teacher routes', async () => { /* ... */ })
})
```

---

---

## Slice 1.3 — Forgot Password & Reset Flow

### 🎯 Goal
Users who have forgotten their password can request a reset link via email. The link contains a short-lived token. Clicking it allows the user to set a new password. Tokens are **single-use** and expire in **1 hour**.

---

### 🗄️ Database Schema

**Additional columns on `users` table (same migration as 1.1):**

```typescript
export const users = sqliteTable('users', {
  // ... existing columns from Slice 1.1

  passwordResetToken:     text('password_reset_token'),        // SHA-256 hashed
  passwordResetExpiresAt: text('password_reset_expires_at'),   // ISO8601
})
```

**Index:**
```sql
CREATE INDEX idx_users_reset_token ON users(password_reset_token);
```

> **Design Decision:** No separate `password_reset_tokens` table — a single active token per user is enforced by storing it directly on the user row. Issuing a new reset request overwrites the previous token, preventing stale token accumulation.

---

### ⚙️ Business Logic

**Rules:**
1. If email does not exist → return `200` silently (prevent email enumeration attack).
2. Only `emailVerified = true` users can reset passwords.
3. Token: 32-byte random hex, stored as SHA-256 hash, raw token sent in email URL.
4. Token expires in **1 hour**.
5. On successful reset: hash new password, clear token fields, invalidate all sessions for the user.
6. New password cannot equal the current password (bcrypt comparison).

---

### 🔌 API

#### `POST /api/auth/forgot-password`

```typescript
export const forgotPasswordSchema = z.object({
  email: z.string().email(),
})
```

**Response `200` (always):**
```json
{
  "success": true,
  "data": { "message": "If that email is registered, a reset link has been sent." }
}
```

---

#### `POST /api/auth/reset-password`

```typescript
export const resetPasswordSchema = z.object({
  token:       z.string().length(64),    // raw 32-byte hex = 64 chars
  newPassword: z.string().min(8).max(72),
})
```

**Response `200`:**
```json
{
  "success": true,
  "data": { "message": "Password reset successful. Please log in with your new password." }
}
```

**Error Responses:**
| Status | Code | Trigger |
|--------|------|---------|
| `400` | `INVALID_RESET_TOKEN` | Token not found |
| `410` | `RESET_TOKEN_EXPIRED` | Token older than 1 hour |
| `400` | `SAME_PASSWORD` | New password identical to current |

---

### 🧩 Backend Logic (Service Layer)

```typescript
async forgotPassword(email: string): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) })
  if (!user || !user.emailVerified) return  // Silent — no enumeration

  const rawToken    = crypto.randomBytes(32).toString('hex')
  const tokenHash   = createHash('sha256').update(rawToken).digest('hex')
  const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString()

  await db
    .update(users)
    .set({ passwordResetToken: tokenHash, passwordResetExpiresAt: tokenExpiry })
    .where(eq(users.id, user.id))

  await inngest.send({
    name: 'email/send-password-reset',
    data: { to: email, rawToken, userId: user.id },
  })
}

async resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = createHash('sha256').update(rawToken).digest('hex')

  const user = await db.query.users.findFirst({
    where: eq(users.passwordResetToken, tokenHash),
  })

  if (!user) throw new AppError('INVALID_RESET_TOKEN', 400)
  if (new Date(user.passwordResetExpiresAt!) < new Date()) throw new AppError('RESET_TOKEN_EXPIRED', 410)

  if (user.passwordHash) {
    const isSame = await bcrypt.compare(newPassword, user.passwordHash)
    if (isSame) throw new AppError('SAME_PASSWORD', 400)
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)

  await db.transaction(async (tx) => {
    await tx.update(users)
      .set({ passwordHash, passwordResetToken: null, passwordResetExpiresAt: null })
      .where(eq(users.id, user.id))

    // Invalidate all active sessions
    await tx.delete(sessions).where(eq(sessions.userId, user.id))
  })
}
```

---

### 🔔 Background Job (Inngest)

```typescript
export const sendPasswordResetEmail = inngest.createFunction(
  { id: 'email/send-password-reset', retries: 3 },
  { event: 'email/send-password-reset' },
  async ({ event, step }) => {
    const { to, rawToken } = event.data
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`

    await step.run('send-email', () =>
      resend.emails.send({
        from:    'noreply@yourlms.com',
        to,
        subject: 'Reset your password — LMS Platform',
        html:    renderPasswordResetEmail({ resetUrl }),
      })
    )
  }
)
```

---

### ✅ Unit Tests

```typescript
describe('AuthService.forgotPassword()', () => {
  it('stores a hashed reset token for valid verified user', async () => { /* ... */ })
  it('silently succeeds for non-existent email', async () => { /* ... */ })
  it('silently succeeds for unverified user', async () => { /* ... */ })
  it('fires inngest email event for valid user', async () => { /* ... */ })
  it('overwrites previous token on second request', async () => { /* ... */ })
})

describe('AuthService.resetPassword()', () => {
  it('resets password and clears token fields', async () => { /* ... */ })
  it('invalidates all sessions on reset', async () => { /* ... */ })
  it('throws INVALID_RESET_TOKEN for unknown token', async () => { /* ... */ })
  it('throws RESET_TOKEN_EXPIRED for expired token', async () => { /* ... */ })
  it('throws SAME_PASSWORD when new matches current', async () => { /* ... */ })
})
```

---

### 🔗 Integration Tests

```typescript
describe('POST /api/auth/forgot-password [integration]', () => {
  it('returns 200 and fires event for valid email', async () => { /* ... */ })
  it('returns 200 for non-existent email (no enumeration)', async () => { /* ... */ })
  it('returns 400 for invalid email format', async () => { /* ... */ })
})

describe('POST /api/auth/reset-password [integration]', () => {
  it('resets password with valid token', async () => { /* ... */ })
  it('allows login with new password after reset', async () => { /* ... */ })
  it('blocks login with old password after reset', async () => { /* ... */ })
  it('returns 410 for expired token', async () => { /* ... */ })
  it('returns 400 for invalid token', async () => { /* ... */ })
})
```

---

---

## Slice 1.4 — Admin: User Management Panel

### 🎯 Goal
Admins can view all platform users in a paginated, searchable table. They can approve pending Teacher accounts, suspend active users, reactivate suspended users, and soft-delete accounts. All state-changing actions are written to an audit log.

---

### 🗄️ Database Schema

```typescript
// lib/db/schema/audit.ts
export const auditLogs = sqliteTable('audit_logs', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  actorId:   text('actor_id').references(() => users.id),    // Admin performing action
  targetId:  text('target_id').references(() => users.id),   // User being acted upon
  action:    text('action').notNull(),                        // See action enum below
  metadata:  text('metadata', { mode: 'json' }),              // Extra context
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
})

// Actions: 'APPROVE_TEACHER' | 'SUSPEND_USER' | 'REACTIVATE_USER' | 'DELETE_USER'
```

**Indexes:**
```sql
CREATE INDEX idx_audit_actor   ON audit_logs(actor_id);
CREATE INDEX idx_audit_target  ON audit_logs(target_id);
CREATE INDEX idx_audit_action  ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
```

---

### ⚙️ Business Logic

**Rules:**
1. Only `role = ADMIN` can access all endpoints (middleware + `withRole` wrapper).
2. **Approve Teacher:** Target must have `role = TEACHER`, `status = PENDING_APPROVAL` → sets `ACTIVE`.
3. **Suspend User:** Sets `status = SUSPENDED`, purges all sessions. Cannot suspend another ADMIN.
4. **Reactivate User:** Sets `status = ACTIVE` for `SUSPENDED` users.
5. **Soft Delete:** Sets `status = REJECTED`. Cannot delete another ADMIN.
6. All write operations append to `audit_logs`.
7. List pagination: cursor-based, default 20, max 100 per page.

---

### 🔌 API

#### `GET /api/users` — List All Users

**Query Parameters:**
```typescript
export const listUsersSchema = z.object({
  cursor: z.string().optional(),
  limit:  z.coerce.number().min(1).max(100).default(20),
  role:   z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  status: z.enum(['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED', 'REJECTED']).optional(),
  search: z.string().max(100).optional(),    // matches name OR email
})
```

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fullName": "Bob Teacher",
      "email": "bob@example.com",
      "role": "TEACHER",
      "status": "PENDING_APPROVAL",
      "emailVerified": true,
      "createdAt": "2026-09-22T10:00:00.000Z"
    }
  ],
  "meta": { "total": 148, "hasNext": true, "nextCursor": "eyJpZCI6InV1aWQifQ==" }
}
```

---

#### `POST /api/users/{id}/approve` · `POST /api/users/{id}/suspend` · `POST /api/users/{id}/reactivate` · `DELETE /api/users/{id}`

All return:
```json
{ "success": true, "data": { "id": "uuid", "status": "<new_status>" } }
```

**Error Responses:**
| Status | Code | Trigger |
|--------|------|---------|
| `404` | `USER_NOT_FOUND` | Target user does not exist |
| `403` | `CANNOT_ACT_ON_ADMIN` | Target is an ADMIN |
| `422` | `INVALID_STATE_TRANSITION` | Wrong current state for action |

---

### 🧩 Backend Logic (Service Layer)

```typescript
// lib/services/user.service.ts

export class UserService {
  async listUsers(query: ListUsersQuery): Promise<PaginatedResult<SafeUser>> {
    const { cursor, limit, role, status, search } = query

    const conditions = [
      role   ? eq(users.role,   role)   : undefined,
      status ? eq(users.status, status) : undefined,
      search ? or(
        like(users.fullName, `%${search}%`),
        like(users.email,    `%${search}%`)
      ) : undefined,
      cursor ? gt(users.createdAt, cursor) : undefined,
    ].filter(Boolean)

    const rows = await db.query.users.findMany({
      where: and(...conditions),
      limit: limit + 1,
      columns: {
        passwordHash: false, emailVerifyToken: false,
        emailVerifyExpiresAt: false, passwordResetToken: false,
        passwordResetExpiresAt: false,
      },
      orderBy: [asc(users.createdAt)],
    })

    const hasNext    = rows.length > limit
    const data       = hasNext ? rows.slice(0, limit) : rows
    const nextCursor = hasNext ? data[data.length - 1].createdAt : undefined
    return { data, meta: { hasNext, nextCursor } }
  }

  async approveTeacher(adminId: string, targetId: string): Promise<SafeUser> {
    const target = await this.findUserOrThrow(targetId)
    if (target.role !== 'TEACHER' || target.status !== 'PENDING_APPROVAL')
      throw new AppError('INVALID_STATE_TRANSITION', 422)

    const [updated] = await db
      .update(users).set({ status: 'ACTIVE' })
      .where(eq(users.id, targetId)).returning()

    await this.audit(adminId, targetId, 'APPROVE_TEACHER')
    await inngest.send({ name: 'email/teacher-approved', data: { to: target.email, fullName: target.fullName } })

    return updated
  }

  async suspendUser(adminId: string, targetId: string): Promise<SafeUser> {
    const target = await this.findUserOrThrow(targetId)
    if (target.role === 'ADMIN') throw new AppError('CANNOT_ACT_ON_ADMIN', 403)

    const [updated] = await db
      .update(users).set({ status: 'SUSPENDED' })
      .where(eq(users.id, targetId)).returning()

    await db.delete(sessions).where(eq(sessions.userId, targetId))
    await this.audit(adminId, targetId, 'SUSPEND_USER')
    return updated
  }

  async reactivateUser(adminId: string, targetId: string): Promise<SafeUser> {
    await this.findUserOrThrow(targetId)
    const [updated] = await db
      .update(users).set({ status: 'ACTIVE' })
      .where(and(eq(users.id, targetId), eq(users.status, 'SUSPENDED'))).returning()

    await this.audit(adminId, targetId, 'REACTIVATE_USER')
    return updated
  }

  async softDeleteUser(adminId: string, targetId: string): Promise<SafeUser> {
    const target = await this.findUserOrThrow(targetId)
    if (target.role === 'ADMIN') throw new AppError('CANNOT_ACT_ON_ADMIN', 403)

    const [updated] = await db
      .update(users).set({ status: 'REJECTED' })
      .where(eq(users.id, targetId)).returning()

    await this.audit(adminId, targetId, 'DELETE_USER')
    return updated
  }

  private async audit(actorId: string, targetId: string, action: string): Promise<void> {
    await db.insert(auditLogs).values({ actorId, targetId, action })
  }

  private async findUserOrThrow(id: string): Promise<User> {
    const user = await db.query.users.findFirst({ where: eq(users.id, id) })
    if (!user) throw new AppError('USER_NOT_FOUND', 404)
    return user
  }
}
```

---

### ✅ Unit Tests

```typescript
describe('UserService.listUsers()', () => {
  it('returns paginated list of all users', async () => { /* ... */ })
  it('filters by role=TEACHER', async () => { /* ... */ })
  it('filters by status=PENDING_APPROVAL', async () => { /* ... */ })
  it('searches by partial email match', async () => { /* ... */ })
  it('returns hasNext=true when more rows exist beyond limit', async () => { /* ... */ })
  it('excludes passwordHash and token fields from response', async () => { /* ... */ })
})

describe('UserService.approveTeacher()', () => {
  it('sets status=ACTIVE for PENDING_APPROVAL teacher', async () => { /* ... */ })
  it('writes an audit log entry', async () => { /* ... */ })
  it('fires inngest email/teacher-approved event', async () => { /* ... */ })
  it('throws INVALID_STATE_TRANSITION for non-pending user', async () => { /* ... */ })
  it('throws USER_NOT_FOUND for unknown targetId', async () => { /* ... */ })
})

describe('UserService.suspendUser()', () => {
  it('sets status=SUSPENDED and deletes sessions', async () => { /* ... */ })
  it('throws CANNOT_ACT_ON_ADMIN when target is ADMIN', async () => { /* ... */ })
  it('writes audit log entry', async () => { /* ... */ })
})

describe('UserService.reactivateUser()', () => {
  it('sets status=ACTIVE for SUSPENDED user', async () => { /* ... */ })
})

describe('UserService.softDeleteUser()', () => {
  it('sets status=REJECTED and writes audit log', async () => { /* ... */ })
  it('throws CANNOT_ACT_ON_ADMIN when target is ADMIN', async () => { /* ... */ })
})
```

---

### 🔗 Integration Tests

```typescript
describe('GET /api/users [integration — Admin only]', () => {
  it('returns 200 with paginated users for ADMIN session', async () => { /* ... */ })
  it('returns 401 for unauthenticated request', async () => { /* ... */ })
  it('returns 403 for STUDENT or TEACHER session', async () => { /* ... */ })
  it('filters by ?role=TEACHER&status=PENDING_APPROVAL', async () => { /* ... */ })
  it('searches by ?search=bob', async () => { /* ... */ })
  it('does not expose passwordHash in response', async () => { /* ... */ })
})

describe('POST /api/users/{id}/approve [integration]', () => {
  it('approves pending teacher → status becomes ACTIVE', async () => { /* ... */ })
  it('returns 422 for non-pending user', async () => { /* ... */ })
  it('returns 403 for non-ADMIN caller', async () => { /* ... */ })
})

describe('POST /api/users/{id}/suspend [integration]', () => {
  it('suspends user and destroys their sessions', async () => { /* ... */ })
  it('returns 403 when trying to suspend an ADMIN', async () => { /* ... */ })
})

describe('DELETE /api/users/{id} [integration]', () => {
  it('soft-deletes user → status=REJECTED', async () => { /* ... */ })
  it('returns 403 when trying to delete an ADMIN', async () => { /* ... */ })
})
```

---

---

## Wave 1 Shared Infrastructure

### 🗄️ Complete Table List — Wave 1

| Table | Purpose | First Used In |
|-------|---------|---------------|
| `users` | Core user identity, auth state, tokens | Slice 1.1 |
| `accounts` | OAuth provider accounts (NextAuth adapter) | Slice 1.2 |
| `sessions` | Active JWT sessions (NextAuth adapter) | Slice 1.2 |
| `verification_tokens` | NextAuth internal verification tokens | Slice 1.2 |
| `audit_logs` | Admin action history | Slice 1.4 |

**Run migrations:**
```bash
npx drizzle-kit generate   # diff schema → generate SQL migration files
npx drizzle-kit migrate    # apply to Turso database
```

---

### 🔒 Middleware Stack (Applied Order)

```
HTTP Request
  │
  1. Edge Middleware (middleware.ts)
  │   ├─ Skip: /api/webhooks/*, /_next/*, /public/*
  │   ├─ auth() — NextAuth JWT token verification
  │   ├─ Role guard → redirect /admin/* if not ADMIN
  │   └─ Auth guard → redirect /(protected)/* if unauthenticated
  │
  2. Rate Limiter (@upstash/ratelimit — sliding window)
  │
  3. Zod Validation (parse body / query params)
  │
  4. withAuth() wrapper — validate session exists in Route Handler
  │
  5. withRole('ADMIN') wrapper — check role in session
```

**Rate Limits — Wave 1:**
| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /api/auth/register` | 5 req | 10 min / IP |
| `POST /api/auth/[...nextauth]` | 10 req | 10 min / IP |
| `POST /api/auth/forgot-password` | 3 req | 15 min / IP |
| `POST /api/auth/reset-password` | 5 req | 15 min / IP |
| `GET /api/users` | 60 req | 1 min / session |

---

### 🌐 Environment Variables

```env
# Turso Database
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your_token

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_32_byte_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Resend (Email)
RESEND_API_KEY=re_your_api_key

# Upstash Rate Limiting
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# Inngest
INNGEST_EVENT_KEY=your_event_key
INNGEST_SIGNING_KEY=your_signing_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

### 📁 File Delivery Checklist

| File | Type | Slice |
|------|------|-------|
| `lib/db/schema/users.ts` | Schema | 1.1 |
| `lib/db/schema/accounts.ts` | Schema | 1.2 |
| `lib/db/schema/audit.ts` | Schema | 1.4 |
| `lib/validations/auth.schema.ts` | Zod | 1.1 – 1.3 |
| `lib/services/auth.service.ts` | Service | 1.1 – 1.3 |
| `lib/services/user.service.ts` | Service | 1.4 |
| `lib/auth.ts` | NextAuth config | 1.2 |
| `lib/inngest/email.functions.ts` | Inngest job | 1.1, 1.3, 1.4 |
| `lib/middleware/withAuth.ts` | Middleware | All |
| `lib/middleware/withRole.ts` | Middleware | 1.4 |
| `lib/middleware/withRatelimit.ts` | Middleware | All |
| `middleware.ts` | Edge middleware | 1.2 |
| `app/api/auth/register/route.ts` | Route Handler | 1.1 |
| `app/api/auth/verify-email/route.ts` | Route Handler | 1.1 |
| `app/api/auth/[...nextauth]/route.ts` | Route Handler | 1.2 |
| `app/api/auth/forgot-password/route.ts` | Route Handler | 1.3 |
| `app/api/auth/reset-password/route.ts` | Route Handler | 1.3 |
| `app/api/users/route.ts` | Route Handler | 1.4 |
| `app/api/users/[id]/approve/route.ts` | Route Handler | 1.4 |
| `app/api/users/[id]/suspend/route.ts` | Route Handler | 1.4 |
| `app/api/users/[id]/reactivate/route.ts` | Route Handler | 1.4 |
| `__tests__/services/auth.service.test.ts` | Unit Test | 1.1 – 1.3 |
| `__tests__/services/user.service.test.ts` | Unit Test | 1.4 |
| `__tests__/integration/register.test.ts` | Integration | 1.1 |
| `__tests__/integration/login.test.ts` | Integration | 1.2 |
| `__tests__/integration/password-reset.test.ts` | Integration | 1.3 |
| `__tests__/integration/user-management.test.ts` | Integration | 1.4 |

---

### ✅ Wave 1 Definition of Done

- [ ] All 4 slice API endpoints return correct HTTP status codes and response envelopes
- [ ] All routes protected — unauthenticated requests redirect to `/login`
- [ ] RBAC enforced — Students/Teachers cannot access `/admin/*` routes
- [ ] Email verification flow works end-to-end in staging (Resend dev mode)
- [ ] Password reset flow works end-to-end in staging
- [ ] Google OAuth login creates a user account and establishes a session
- [ ] Admin can approve, suspend, reactivate, and soft-delete users
- [ ] Unit test coverage ≥ 80% for `auth.service.ts` and `user.service.ts`
- [ ] All integration tests pass against a seeded test database
- [ ] Drizzle migrations applied cleanly to Turso production database
- [ ] Rate limiting active on all `/api/auth/*` endpoints
- [ ] Audit log entries written for all admin state-change actions
- [ ] No plaintext passwords or raw tokens stored in the database
- [ ] Environment variables typed and validated via `@t3-oss/env-nextjs`
- [ ] CI/CD pipeline (GitHub Actions) passes lint + test + build on every PR
