# API Contract
## Learning Management System (LMS) Platform

| Info | Value |
|------|-------|
| **Base URL** | `https://api.yourdomain.com/api/v1` |
| **Auth Scheme** | Bearer JWT (`Authorization: Bearer <access_token>`) |
| **Content Type** | `application/json` |
| **Version** | v1.0 |
| **Date** | August 20, 2026 |

---

## Conventions

### Standard Response Envelope

**Success**
```json
{
  "success": true,
  "data": { },
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "hasNext": true,
    "nextCursor": "eyJpZCI6..."
  }
}
```

**Error**
```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Human-readable message.",
    "field": "fieldName"
  }
}
```

### Role Guards

| Symbol | Role Required |
|--------|---------------|
| 🔓 | Public — no authentication |
| 🔐 | Any authenticated user |
| 🎓 | Student |
| 👨‍🏫 | Teacher |
| 👑 | Admin |
| 👨‍🏫👑 | Teacher OR Admin |

### Common Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Authenticated but insufficient role |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Input failed schema validation |
| `CONFLICT` | 409 | Duplicate resource (e.g., email, slug) |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Module 1 — Authentication

### `POST /auth/register`
🔓 Public

Register a new user account.

**Request Body**
```json
{
  "fullName": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePass@123",
  "role": "STUDENT"
}
```

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| `fullName` | string | ✅ | 2–100 chars |
| `email` | string | ✅ | Valid email, unique |
| `password` | string | ✅ | Min 8 chars, 1 uppercase, 1 number, 1 special char |
| `role` | `STUDENT \| TEACHER` | ✅ | Admin cannot be self-assigned |

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "message": "Registration successful. Please verify your email.",
    "userId": "uuid-xxxx"
  }
}
```

**Error Cases**
| Code | Scenario |
|------|----------|
| `CONFLICT` | Email already registered |
| `VALIDATION_ERROR` | Weak password, invalid email |

---

### `POST /auth/login`
🔓 Public

**Request Body**
```json
{
  "email": "jane@example.com",
  "password": "SecurePass@123",
  "rememberMe": false
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "expiresIn": 900,
    "user": {
      "id": "uuid-xxxx",
      "fullName": "Jane Doe",
      "email": "jane@example.com",
      "role": "STUDENT",
      "avatarUrl": "https://cdn.example.com/avatars/jane.jpg",
      "status": "ACTIVE"
    }
  }
}
```

> Refresh token is set as an `httpOnly` cookie (`refresh_token`).

**Error Cases**
| Code | Scenario |
|------|----------|
| `UNAUTHORIZED` | Wrong email or password |
| `FORBIDDEN` | Account suspended or rejected |
| `RATE_LIMITED` | 5+ failed attempts — 15-min lockout |

---

### `POST /auth/logout`
🔐 Authenticated

Invalidates the refresh token cookie.

**Response `200 OK`**
```json
{ "success": true, "data": { "message": "Logged out successfully." } }
```

---

### `POST /auth/refresh`
🔓 Public (uses httpOnly cookie)

Issues a new access token using the stored refresh token.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "expiresIn": 900
  }
}
```

---

### `GET /auth/verify-email`
🔓 Public

**Query Params**
| Param | Type | Required |
|-------|------|----------|
| `token` | string | ✅ |

**Response `200 OK`**
```json
{ "success": true, "data": { "message": "Email verified. You can now log in." } }
```

---

### `POST /auth/forgot-password`
🔓 Public

**Request Body**
```json
{ "email": "jane@example.com" }
```

**Response `200 OK`** (always, to prevent email enumeration)
```json
{ "success": true, "data": { "message": "If this email exists, a reset link has been sent." } }
```

---

### `POST /auth/reset-password`
🔓 Public

**Request Body**
```json
{
  "token": "reset-token-xxxx",
  "newPassword": "NewSecurePass@456"
}
```

**Response `200 OK`**
```json
{ "success": true, "data": { "message": "Password reset successfully." } }
```

**Error Cases**
| Code | Scenario |
|------|----------|
| `NOT_FOUND` | Token not found |
| `GONE` | Token expired (>1 hour) |

---

### `GET /auth/oauth/google`
🔓 Public

Redirects to Google OAuth consent screen. On callback, creates or logs in user.

---

## Module 2 — Users

### `GET /users/me`
🔐 Authenticated

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Jane Doe",
    "email": "jane@example.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "avatarUrl": "https://cdn...",
    "bio": "Passionate learner.",
    "emailVerified": true,
    "createdAt": "2026-08-20T00:00:00Z"
  }
}
```

---

### `PATCH /users/me`
🔐 Authenticated

Update own profile.

**Request Body** (all fields optional)
```json
{
  "fullName": "Jane Smith",
  "bio": "Updated bio.",
  "avatarUrl": "https://cdn.example.com/new-avatar.jpg",
  "phoneNumber": "+91-9876543210",
  "websiteUrl": "https://jane.dev",
  "socialLinks": {
    "linkedin": "https://linkedin.com/in/jane",
    "twitter": "https://twitter.com/jane"
  }
}
```

**Response `200 OK`**
```json
{ "success": true, "data": { "message": "Profile updated.", "user": { } } }
```

---

### `PATCH /users/me/password`
🔐 Authenticated

**Request Body**
```json
{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456"
}
```

---

### `GET /users/:id`
🔓 Public

Fetch public teacher profile.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "John Teacher",
    "bio": "Expert in Python and ML.",
    "avatarUrl": "https://cdn...",
    "professionalTitle": "Senior Data Scientist",
    "courses": [ ],
    "totalStudents": 3420,
    "avgRating": 4.7
  }
}
```

---

### `GET /users` 👑 Admin
List all users with pagination and filters.

**Query Params**
| Param | Type | Default |
|-------|------|---------|
| `role` | `ADMIN\|TEACHER\|STUDENT` | — |
| `status` | `ACTIVE\|SUSPENDED\|PENDING_APPROVAL` | — |
| `search` | string | — |
| `page` | number | 1 |
| `limit` | number | 20 |

**Response `200 OK`**
```json
{
  "success": true,
  "data": [ { "id": "uuid", "fullName": "...", "email": "...", "role": "STUDENT", "status": "ACTIVE", "createdAt": "..." } ],
  "meta": { "total": 500, "page": 1, "limit": 20, "hasNext": true }
}
```

---

### `PATCH /users/:id` 👑 Admin

Update any user's details, role, or status.

**Request Body**
```json
{
  "status": "ACTIVE",
  "role": "ADMIN"
}
```

---

### `POST /users/:id/approve` 👑 Admin

Approve a pending teacher account.

**Response `200 OK`**
```json
{ "success": true, "data": { "message": "Teacher approved. Notification email sent." } }
```

---

### `POST /users/:id/suspend` 👑 Admin

**Request Body**
```json
{ "reason": "Violation of community guidelines." }
```

---

### `DELETE /users/:id` 👑 Admin

Soft-deletes the user (data retained for audit).

---

## Module 3 — Categories

### `GET /categories`
🔓 Public

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Web Development", "slug": "web-development", "description": "...", "courseCount": 42 }
  ]
}
```

---

### `POST /categories` 👑 Admin

**Request Body**
```json
{
  "name": "Data Science",
  "description": "Machine learning, AI, and analytics.",
  "iconUrl": "https://cdn..."
}
```

---

### `PATCH /categories/:id` 👑 Admin
### `DELETE /categories/:id` 👑 Admin

---

## Module 4 — Courses

### `GET /courses`
🔓 Public — Course listing with filtering.

**Query Params**
| Param | Type | Example |
|-------|------|---------|
| `search` | string | `python` |
| `category` | string (slug) | `web-development` |
| `type` | `RECORDED\|LIVE` | `LIVE` |
| `level` | `BEGINNER\|INTERMEDIATE\|ADVANCED` | `BEGINNER` |
| `minPrice` | number | `0` |
| `maxPrice` | number | `5000` |
| `minRating` | number | `4` |
| `language` | string | `English` |
| `sortBy` | `newest\|popular\|price_asc\|price_desc\|rating` | `popular` |
| `page` | number | `1` |
| `limit` | number | `20` |

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Complete Python Bootcamp",
      "slug": "complete-python-bootcamp",
      "shortDesc": "Go from zero to Python expert.",
      "thumbnailUrl": "https://cdn...",
      "type": "RECORDED",
      "level": "BEGINNER",
      "price": 1999,
      "discountPrice": 999,
      "language": "English",
      "avgRating": 4.8,
      "reviewCount": 312,
      "enrollmentCount": 5400,
      "isFeatured": true,
      "author": {
        "id": "uuid",
        "fullName": "John Teacher",
        "avatarUrl": "https://cdn..."
      },
      "category": { "id": "uuid", "name": "Programming", "slug": "programming" }
    }
  ],
  "meta": { "total": 120, "page": 1, "limit": 20, "hasNext": true }
}
```

---

### `POST /courses` 👨‍🏫👑

Create a new course (starts as `DRAFT`).

**Request Body**
```json
{
  "title": "Complete Python Bootcamp",
  "slug": "complete-python-bootcamp",
  "description": "<p>Full description HTML...</p>",
  "shortDesc": "Go from zero to hero in Python.",
  "categoryId": "uuid",
  "tags": ["python", "programming", "beginner"],
  "language": "English",
  "level": "BEGINNER",
  "type": "RECORDED",
  "price": 1999,
  "discountPrice": 999,
  "accessDuration": null,
  "thumbnailUrl": "https://cdn...",
  "previewUrl": "https://cdn...",
  "seoTitle": "Complete Python Bootcamp 2026",
  "seoDescription": "Master Python from scratch.",
  "ogImageUrl": "https://cdn..."
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "slug": "complete-python-bootcamp",
    "status": "DRAFT",
    "createdAt": "2026-08-20T00:00:00Z"
  }
}
```

---

### `GET /courses/:slug`
🔓 Public — Full course detail.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Complete Python Bootcamp",
    "slug": "complete-python-bootcamp",
    "description": "<p>...</p>",
    "shortDesc": "...",
    "thumbnailUrl": "https://cdn...",
    "previewUrl": "https://cdn...",
    "type": "RECORDED",
    "status": "PUBLISHED",
    "level": "BEGINNER",
    "language": "English",
    "price": 1999,
    "discountPrice": 999,
    "accessDuration": null,
    "isFeatured": true,
    "avgRating": 4.8,
    "reviewCount": 312,
    "enrollmentCount": 5400,
    "totalLessons": 82,
    "totalDuration": 36000,
    "author": { "id": "uuid", "fullName": "John Teacher", "bio": "...", "avatarUrl": "..." },
    "category": { "id": "uuid", "name": "Programming" },
    "tags": ["python", "programming"],
    "modules": [
      {
        "id": "uuid",
        "title": "Module 1: Getting Started",
        "order": 1,
        "lessons": [
          {
            "id": "uuid",
            "title": "Introduction to Python",
            "type": "VIDEO",
            "order": 1,
            "duration": 420,
            "isPreview": true
          }
        ]
      }
    ],
    "isEnrolled": false,
    "seoTitle": "...",
    "seoDescription": "...",
    "ogImageUrl": "...",
    "updatedAt": "2026-08-20T00:00:00Z"
  }
}
```

---

### `PATCH /courses/:id` 👨‍🏫👑

Update course details (owner or admin only).

**Request Body** — any subset of course fields.

---

### `DELETE /courses/:id` 👑 Admin

Soft-delete. Enrolled students retain access.

---

### `POST /courses/:id/publish` 👨‍🏫👑

Submit/publish course.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "status": "PENDING_REVIEW",
    "message": "Course submitted for admin review."
  }
}
```

> If admin review is disabled, status becomes `PUBLISHED` immediately.

---

### `POST /courses/:id/approve` 👑 Admin
### `POST /courses/:id/reject` 👑 Admin

**Request Body (reject)**
```json
{ "reason": "Course content is incomplete in Module 3." }
```

---

### `POST /courses/:id/feature` 👑 Admin

Toggle `isFeatured` flag.

---

## Module 5 — Modules & Lessons

### `POST /courses/:courseId/modules` 👨‍🏫👑

**Request Body**
```json
{ "title": "Module 1: Getting Started", "order": 1 }
```

**Response `201 Created`**
```json
{ "success": true, "data": { "id": "uuid", "title": "Module 1: Getting Started", "order": 1 } }
```

---

### `PATCH /modules/:id` 👨‍🏫👑
### `DELETE /modules/:id` 👨‍🏫👑

---

### `POST /modules/:moduleId/lessons` 👨‍🏫👑

**Request Body**
```json
{
  "title": "Introduction to Python",
  "type": "VIDEO",
  "order": 1,
  "videoUrl": "https://cdn.example.com/lesson1.mp4",
  "duration": 420,
  "isPreview": true
}
```

For `ARTICLE` type:
```json
{
  "title": "Python Syntax Guide",
  "type": "ARTICLE",
  "order": 2,
  "content": "<p>Article HTML content...</p>",
  "isPreview": false
}
```

For `LIVE_SESSION` type:
```json
{
  "title": "Live Q&A Session 1",
  "type": "LIVE_SESSION",
  "order": 3
}
```

**Response `201 Created`**
```json
{ "success": true, "data": { "id": "uuid", "title": "...", "type": "VIDEO", "order": 1 } }
```

---

### `PATCH /lessons/:id` 👨‍🏫👑
### `DELETE /lessons/:id` 👨‍🏫👑

---

### `POST /lessons/:id/attachments` 👨‍🏫👑

**Request Body**
```json
{
  "label": "Python Cheat Sheet",
  "fileUrl": "https://cdn.example.com/cheatsheet.pdf",
  "fileType": "pdf"
}
```

---

### `DELETE /lessons/:lessonId/attachments/:attachmentId` 👨‍🏫👑

---

### `PATCH /lessons/:id/progress` 🎓 Student

Update video watch progress (called every ~10 seconds).

**Request Body**
```json
{
  "watchPercent": 45.5,
  "enrollmentId": "uuid"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "watchPercent": 45.5,
    "isCompleted": false
  }
}
```

---

### `POST /lessons/:id/complete` 🎓 Student

Manually mark a lesson as complete (for Articles/Quizzes).

**Request Body**
```json
{ "enrollmentId": "uuid" }
```

---

## Module 6 — Live Sessions

### `POST /live/sessions` 👨‍🏫👑

Create a live session linked to a lesson and course.

**Request Body**
```json
{
  "lessonId": "uuid",
  "courseId": "uuid",
  "title": "Live Q&A — Week 1",
  "scheduledAt": "2026-09-15T10:00:00Z",
  "duration": 60,
  "platform": "ZOOM",
  "description": "Open Q&A for Module 1 topics."
}
```

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Live Q&A — Week 1",
    "scheduledAt": "2026-09-15T10:00:00Z",
    "duration": 60,
    "platform": "ZOOM",
    "joinUrl": "https://zoom.us/j/123456",
    "hostUrl": "https://zoom.us/s/123456?zak=...",
    "status": "SCHEDULED"
  }
}
```

---

### `GET /live/sessions` 👨‍🏫

List all sessions for the authenticated teacher.

**Query Params**
| Param | Type |
|-------|------|
| `status` | `SCHEDULED\|LIVE\|ENDED\|CANCELLED` |
| `courseId` | uuid |

---

### `GET /live/sessions/:id`
🔐 Authenticated

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Live Q&A — Week 1",
    "scheduledAt": "2026-09-15T10:00:00Z",
    "duration": 60,
    "platform": "ZOOM",
    "status": "SCHEDULED",
    "course": { "id": "uuid", "title": "Complete Python Bootcamp" },
    "teacher": { "id": "uuid", "fullName": "John Teacher" }
  }
}
```

---

### `GET /live/sessions/:id/join` 🎓 Student

Get the student join URL (only active within 15 min of start time).

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "joinUrl": "https://zoom.us/j/123456",
    "platform": "ZOOM",
    "status": "SCHEDULED",
    "opensAt": "2026-09-15T09:45:00Z"
  }
}
```

**Error Cases**
| Code | Scenario |
|------|----------|
| `FORBIDDEN` | Student not enrolled in this course |
| `TOO_EARLY` | Session not yet within 15-minute window |
| `GONE` | Session already ended |

---

### `PATCH /live/sessions/:id` 👨‍🏫👑

Update session details or add recording URL post-session.

**Request Body**
```json
{
  "scheduledAt": "2026-09-16T10:00:00Z",
  "recordingUrl": "https://cdn.example.com/session-replay.mp4"
}
```

---

### `DELETE /live/sessions/:id` 👨‍🏫👑

Cancel a session. Sends email to all enrolled students.

**Request Body**
```json
{ "reason": "Teacher unavailable due to illness." }
```

---

## Module 7 — Enrollments

### `GET /courses/:id/enrollment`
🔐 Authenticated

Check if the current user is enrolled in a course.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "isEnrolled": true,
    "enrollment": {
      "id": "uuid",
      "enrolledAt": "2026-08-01T00:00:00Z",
      "expiresAt": null,
      "status": "ACTIVE",
      "progressPercent": 32.5
    }
  }
}
```

---

### `GET /enrollments/me` 🎓 Student

All enrolled courses for the authenticated student.

**Query Params**
| Param | Type |
|-------|------|
| `status` | `ACTIVE\|EXPIRED\|REVOKED` |
| `filter` | `all\|in-progress\|completed` |

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "course": {
        "id": "uuid",
        "title": "Complete Python Bootcamp",
        "thumbnailUrl": "https://cdn...",
        "totalLessons": 82
      },
      "progressPercent": 32.5,
      "lastAccessedAt": "2026-08-19T10:00:00Z",
      "enrolledAt": "2026-08-01T00:00:00Z",
      "expiresAt": null,
      "status": "ACTIVE"
    }
  ]
}
```

---

### `GET /enrollments/:enrollmentId/progress` 🔐

Full lesson-by-lesson progress for an enrollment.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "enrollmentId": "uuid",
    "overallPercent": 32.5,
    "completedLessons": 26,
    "totalLessons": 82,
    "lessons": [
      {
        "lessonId": "uuid",
        "watchPercent": 100,
        "isCompleted": true,
        "lastWatchedAt": "2026-08-19T10:00:00Z"
      }
    ]
  }
}
```

---

## Module 8 — Reviews

### `GET /courses/:id/reviews`
🔓 Public

**Query Params**
| Param | Default |
|-------|---------|
| `page` | 1 |
| `limit` | 10 |
| `sortBy` | `newest\|highest\|lowest` |

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "avgRating": 4.8,
    "totalReviews": 312,
    "ratingBreakdown": { "5": 250, "4": 40, "3": 15, "2": 5, "1": 2 },
    "reviews": [
      {
        "id": "uuid",
        "rating": 5,
        "comment": "Excellent course!",
        "createdAt": "2026-08-10T00:00:00Z",
        "student": { "fullName": "Jane Doe", "avatarUrl": "https://cdn..." }
      }
    ]
  },
  "meta": { "total": 312, "page": 1, "limit": 10, "hasNext": true }
}
```

---

### `POST /courses/:id/reviews` 🎓 Student

**Request Body**
```json
{
  "rating": 5,
  "comment": "This course completely changed my career!"
}
```

> **Rules:** Student must be enrolled + have completed ≥ 20% of the course. One review per student per course.

**Response `201 Created`**
```json
{ "success": true, "data": { "id": "uuid", "rating": 5, "comment": "..." } }
```

---

### `PATCH /courses/:courseId/reviews/:reviewId` 🎓 Student

Edit own review (within 30 days of creation).

---

### `DELETE /courses/:courseId/reviews/:reviewId` 👑 Admin

---

## Module 9 — Payments

### `POST /payments/create-intent` 🔐 Authenticated

Create a Stripe Payment Intent.

**Request Body**
```json
{
  "courseIds": ["uuid-1", "uuid-2"],
  "couponCode": "SAVE20"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxxx_secret_xxxx",
    "amount": 1599,
    "currency": "INR",
    "orderId": "uuid",
    "breakdown": {
      "subtotal": 1999,
      "discount": 400,
      "total": 1599
    }
  }
}
```

---

### `POST /payments/razorpay/create-order` 🔐 Authenticated

Create a Razorpay order.

**Request Body**
```json
{
  "courseIds": ["uuid-1", "uuid-2"],
  "couponCode": "SAVE20"
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "razorpayOrderId": "order_xxxx",
    "amount": 159900,
    "currency": "INR",
    "internalOrderId": "uuid",
    "breakdown": {
      "subtotal": 199900,
      "discount": 40000,
      "total": 159900
    }
  }
}
```

---

### `POST /webhooks/stripe` 🔓 Public (Stripe signature verified)

**Headers**
```
Stripe-Signature: t=xxxx,v1=xxxx
```

Handles: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

**Response `200 OK`**
```json
{ "received": true }
```

---

### `POST /webhooks/razorpay` 🔓 Public (HMAC SHA256 verified)

**Headers**
```
X-Razorpay-Signature: xxxx
```

Handles: `payment.captured`, `refund.created`

---

### `GET /payments/orders` 🎓 Student

Order history for the authenticated student.

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "totalAmount": 1599,
      "currency": "INR",
      "status": "COMPLETED",
      "paymentGateway": "STRIPE",
      "gatewayPaymentId": "pi_xxxx",
      "discountAmount": 400,
      "createdAt": "2026-08-01T00:00:00Z",
      "items": [
        { "courseId": "uuid", "courseTitle": "Complete Python Bootcamp", "price": 1999 }
      ]
    }
  ]
}
```

---

### `GET /payments/orders` 👑 Admin

All orders across all users (with filtering).

**Query Params:** `status`, `gateway`, `studentId`, `dateFrom`, `dateTo`, `page`, `limit`

---

### `POST /payments/orders/:id/refund` 👑 Admin

**Request Body**
```json
{
  "type": "FULL",
  "reason": "Student request within refund window."
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "refundId": "uuid",
    "gatewayRefundId": "re_xxxx",
    "amount": 1599,
    "status": "PROCESSED"
  }
}
```

---

### `GET /payments/payouts` 👨‍🏫

Teacher payout history.

---

### `POST /payments/payouts/request` 👨‍🏫

Request a payout.

**Request Body**
```json
{ "amount": 5000 }
```

> Minimum threshold applies (configured in platform settings).

---

## Module 10 — Coupons

### `GET /coupons` 👑 Admin

List all coupons.

### `POST /coupons` 👑 Admin

**Request Body**
```json
{
  "code": "SAVE20",
  "type": "PERCENT",
  "value": 20,
  "minOrderAmount": 500,
  "maxUses": 100,
  "maxUsesPerUser": 1,
  "expiresAt": "2026-12-31T23:59:59Z",
  "isActive": true
}
```

### `PATCH /coupons/:id` 👑 Admin
### `DELETE /coupons/:id` 👑 Admin

---

### `POST /coupons/validate` 🔐 Authenticated

Validate a coupon code against a cart.

**Request Body**
```json
{
  "code": "SAVE20",
  "courseIds": ["uuid-1", "uuid-2"],
  "subtotal": 1999
}
```

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "type": "PERCENT",
    "value": 20,
    "discountAmount": 400,
    "newTotal": 1599
  }
}
```

---

## Module 11 — Blog

### `GET /blog/posts`
🔓 Public

**Query Params**
| Param | Type |
|-------|------|
| `category` | string (slug) |
| `tag` | string (slug) |
| `search` | string |
| `status` | `PUBLISHED` (default, public) |
| `page` | number |
| `limit` | number |

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "10 Python Tips for Beginners",
      "slug": "10-python-tips-for-beginners",
      "excerpt": "Master these 10 tips to write better Python.",
      "featuredImage": "https://cdn...",
      "publishedAt": "2026-08-15T00:00:00Z",
      "readTime": 5,
      "author": { "fullName": "John Teacher", "avatarUrl": "..." },
      "category": { "name": "Programming", "slug": "programming" },
      "tags": ["python", "tips"]
    }
  ],
  "meta": { "total": 45, "page": 1, "limit": 10, "hasNext": true }
}
```

---

### `POST /blog/posts` 👨‍🏫👑

**Request Body**
```json
{
  "title": "10 Python Tips for Beginners",
  "content": "<p>HTML content from TipTap...</p>",
  "excerpt": "Master these 10 tips.",
  "featuredImage": "https://cdn...",
  "categoryId": "uuid",
  "tags": ["python", "tips"],
  "status": "DRAFT",
  "scheduledFor": null,
  "seoTitle": "10 Python Tips — LMS Blog",
  "seoDescription": "Learn 10 essential Python tips.",
  "ogImageUrl": "https://cdn...",
  "canonicalUrl": null
}
```

**Response `201 Created`**
```json
{ "success": true, "data": { "id": "uuid", "slug": "10-python-tips-for-beginners", "status": "DRAFT" } }
```

---

### `GET /blog/posts/:slug`
🔓 Public

Full blog post with content.

---

### `PATCH /blog/posts/:id` 👨‍🏫👑
### `DELETE /blog/posts/:id` 👨‍🏫👑

---

### `GET /blog/categories`
🔓 Public

### `POST /blog/categories` 👑 Admin
### `PATCH /blog/categories/:id` 👑 Admin
### `DELETE /blog/categories/:id` 👑 Admin

---

## Module 12 — CMS & Pages

### `GET /cms/pages`
🔓 Public — Returns all published pages.

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "title": "About Us", "slug": "about", "inNav": true, "navLabel": "About" }
  ]
}
```

---

### `GET /cms/pages/:slug`
🔓 Public

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "About Us",
    "slug": "about",
    "blocks": [
      { "type": "hero", "data": { "title": "About Our Platform", "subtitle": "...", "ctaText": "Get Started", "ctaUrl": "/courses" } },
      { "type": "text", "data": { "content": "<p>We are a learning platform...</p>" } }
    ],
    "seoTitle": "About Us | LMS Platform",
    "seoDescription": "Learn more about our mission.",
    "ogImageUrl": "https://cdn..."
  }
}
```

---

### `POST /cms/pages` 👑 Admin

**Request Body**
```json
{
  "title": "About Us",
  "slug": "about",
  "blocks": [ ],
  "status": "DRAFT",
  "inNav": true,
  "navLabel": "About",
  "seoTitle": "About Us | LMS",
  "seoDescription": "Learn about our platform.",
  "ogImageUrl": "https://cdn..."
}
```

---

### `PATCH /cms/pages/:id` 👑 Admin
### `DELETE /cms/pages/:id` 👑 Admin

---

### `GET /cms/settings`
🔓 Public — Returns public site settings (logo, nav, social links).

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "siteName": "LearnHub",
    "tagline": "Learn Anything. Anytime.",
    "logoUrl": "https://cdn.../logo.svg",
    "faviconUrl": "https://cdn.../favicon.ico",
    "primaryColor": "#6C3EF4",
    "socialLinks": {
      "twitter": "https://twitter.com/learnhub",
      "linkedin": "https://linkedin.com/company/learnhub"
    },
    "navItems": [
      { "label": "Courses", "url": "/courses" },
      { "label": "Blog", "url": "/blog" }
    ]
  }
}
```

---

### `PATCH /cms/settings` 👑 Admin

**Request Body** (partial update)
```json
{
  "siteName": "LearnHub Pro",
  "commissionPercent": 20,
  "requireTeacherApproval": true,
  "requireCourseApproval": false,
  "minPayoutThreshold": 500
}
```

---

## Module 13 — Media Library

### `POST /media/upload` 👑👨‍🏫

Upload a file to cloud storage (S3). Returns CDN URL.

**Request:** `multipart/form-data`
| Field | Type | Notes |
|-------|------|-------|
| `file` | File | JPG, PNG, WEBP, GIF, PDF, MP4 |
| `type` | `image\|video\|document` | For categorization |

**Response `201 Created`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fileUrl": "https://cdn.example.com/media/abc123.jpg",
    "fileName": "thumbnail.jpg",
    "mimeType": "image/jpeg",
    "fileSize": 204800
  }
}
```

---

### `GET /media` 👑 Admin

List all uploaded media with filtering.

---

### `DELETE /media/:id` 👑 Admin

Delete from storage and database.

---

## Module 14 — Search

### `GET /search`
🔓 Public

**Query Params**
| Param | Required | Notes |
|-------|----------|-------|
| `q` | ✅ | Search query string |
| `type` | ❌ | `courses\|blog\|instructors\|all` (default: `all`) |
| `page` | ❌ | Default: 1 |
| `limit` | ❌ | Default: 20 |

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "courses": [
      { "id": "uuid", "title": "...", "slug": "...", "thumbnailUrl": "...", "price": 999, "avgRating": 4.7 }
    ],
    "blogPosts": [
      { "id": "uuid", "title": "...", "slug": "...", "excerpt": "..." }
    ],
    "instructors": [
      { "id": "uuid", "fullName": "...", "avatarUrl": "...", "totalCourses": 5 }
    ]
  },
  "meta": { "query": "python", "totalCourses": 14, "totalPosts": 3, "totalInstructors": 2 }
}
```

---

## Module 15 — Notifications

### `GET /notifications` 🔐

Get in-app notifications for the current user.

**Query Params:** `unreadOnly=true`, `page`, `limit`

**Response `200 OK`**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "COURSE_PURCHASE",
      "message": "Your enrollment in 'Complete Python Bootcamp' is confirmed.",
      "isRead": false,
      "createdAt": "2026-08-20T00:00:00Z",
      "actionUrl": "/dashboard/courses/uuid"
    }
  ],
  "meta": { "unreadCount": 3 }
}
```

---

### `PATCH /notifications/:id/read` 🔐

Mark a notification as read.

---

### `PATCH /notifications/read-all` 🔐

Mark all notifications as read.

---

## Module 16 — Certificates

### `GET /certificates/:enrollmentId` 🎓 Student

Fetch generated certificate for a completed course.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "certificateNumber": "LMS-2026-00123",
    "pdfUrl": "https://cdn.example.com/certs/LMS-2026-00123.pdf",
    "issuedAt": "2026-09-01T00:00:00Z",
    "course": { "title": "Complete Python Bootcamp" },
    "student": { "fullName": "Jane Doe" }
  }
}
```

---

### `GET /certificates/verify/:certificateNumber`
🔓 Public

Verify certificate authenticity.

**Response `200 OK`**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "certificateNumber": "LMS-2026-00123",
    "studentName": "Jane Doe",
    "courseName": "Complete Python Bootcamp",
    "issuedAt": "2026-09-01T00:00:00Z"
  }
}
```

---

## Appendix — HTTP Status Code Reference

| Status | Meaning | Used For |
|--------|---------|----------|
| `200` | OK | Successful GET / PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Malformed request |
| `401` | Unauthorized | Missing/invalid token |
| `403` | Forbidden | Insufficient role |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Duplicate resource |
| `410` | Gone | Expired token/link |
| `422` | Unprocessable Entity | Validation failure |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected error |

---

## Appendix — Rate Limiting

| Route Group | Limit |
|-------------|-------|
| `/auth/login` | 5 req / 15 min per IP |
| `/auth/*` | 20 req / min per IP |
| `/api/*` (authenticated) | 300 req / min per user |
| `/api/*` (public) | 100 req / min per IP |
| `/webhooks/*` | No rate limit (verified by signature) |

---

*Document Classification: Confidential — Internal Use Only*
*LMS Platform API Contract v1.0 | August 20, 2026*
