# Functional Design Document (FDD)
## Learning Management System (LMS) Platform

---

| Document Info | Details |
|---------------|---------|
| **Document Title** | Functional Design Document — LMS Platform |
| **Prepared By** | [Functional Analyst / Tech Lead] |
| **Reviewed By** | [Product Manager, Dev Lead] |
| **Approved By** | [Approver Name] |
| **Issue Date** | August 20, 2026 |
| **Version** | v1.0 |
| **Status** | Draft |

---

## Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| v0.1 | August 15, 2026 | [Author] | Initial skeleton |
| v1.0 | August 20, 2026 | [Author] | Full functional design complete |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [System Overview](#2-system-overview)
3. [Module 1 — Authentication & User Management](#3-module-1--authentication--user-management)
4. [Module 2 — Course Management](#4-module-2--course-management)
5. [Module 3 — Live Class Management](#5-module-3--live-class-management)
6. [Module 4 — E-Commerce & Payments](#6-module-4--e-commerce--payments)
7. [Module 5 — Student Learning Portal](#7-module-5--student-learning-portal)
8. [Module 6 — Teacher Dashboard](#8-module-6--teacher-dashboard)
9. [Module 7 — Admin Panel](#9-module-7--admin-panel)
10. [Module 8 — Blog](#10-module-8--blog)
11. [Module 9 — CMS & Site Settings](#11-module-9--cms--site-settings)
12. [Module 10 — SEO Engine](#12-module-10--seo-engine)
13. [Module 11 — Notifications & Emails](#13-module-11--notifications--emails)
14. [Module 12 — Search & Discovery](#14-module-12--search--discovery)
15. [Global UI Behaviors](#15-global-ui-behaviors)
16. [Error Handling & Edge Cases](#16-error-handling--edge-cases)
17. [Data Validation Rules](#17-data-validation-rules)

---

## 1. Introduction

### 1.1 Purpose

This Functional Design Document (FDD) provides a **detailed description of every functional feature** of the LMS platform. It bridges the gap between the high-level business requirements (BRD) and the technical implementation (SRS/TDD). Developers, QA engineers, and UI/UX designers should use this document as the primary reference for building and testing the system.

### 1.2 Scope

This document covers all functional modules of the LMS platform v1.0, including:
- User authentication and role management
- Course creation, management, and delivery (recorded + live)
- E-commerce and payment processing
- Student learning experience
- Teacher and admin dashboards
- Blog and CMS
- SEO infrastructure
- Notifications and email system

### 1.3 Definitions

| Term | Meaning |
|------|---------|
| **Actor** | A user with a specific role: Admin, Teacher, or Student |
| **Session** | A scheduled live class event |
| **Enrollment** | A student's purchased access to a course |
| **Module** | A chapter/section within a course |
| **Lesson** | A single unit of content (video, text, quiz, live session) |
| **Slug** | A URL-friendly version of a title (e.g., `intro-to-python`) |

---

## 2. System Overview

### 2.1 Application Portals

The platform is divided into four distinct portals sharing one backend:

| Portal | URL Pattern | Accessible By |
|--------|-------------|---------------|
| Public Website | `/` | All visitors (no login required) |
| Student Portal | `/dashboard/*` | Logged-in Students |
| Teacher Portal | `/teacher/*` | Logged-in Teachers |
| Admin Panel | `/admin/*` | Logged-in Admins |

### 2.2 Role Hierarchy

```
Admin
  └── Can manage everything (users, courses, blog, CMS, payments, settings)

Teacher
  └── Can manage own courses, live sessions, blog posts, and view own revenue

Student
  └── Can browse, purchase, and consume courses (recorded + live)
```

### 2.3 High-Level Data Flow

```
User Action (Browser)
    ↓
Next.js Frontend (SSR / Client)
    ↓
API Layer (REST / tRPC)
    ↓
Business Logic Layer
    ↓
Database (PostgreSQL via Prisma ORM)
    ↓
External Services (Zoom, Google Meet, Stripe, Razorpay, S3, Email)
```

---

## 3. Module 1 — Authentication & User Management

### 3.1 User Registration

**Screen:** `/register`

#### 3.1.1 Functional Description
New users can register on the platform by providing their name, email, password, and desired role. Only two roles are selectable at registration: **Student** and **Teacher**. Admin accounts are created only by existing Admins.

#### 3.1.2 UI Elements

| Element | Type | Description |
|---------|------|-------------|
| Full Name | Text Input | User's full name |
| Email Address | Email Input | Used as unique identifier |
| Password | Password Input | Minimum 8 chars |
| Confirm Password | Password Input | Must match Password |
| Role | Radio Button / Dropdown | Options: Student, Teacher |
| Register Button | Submit Button | Triggers registration |
| Google Sign-Up | OAuth Button | Alternate registration via Google |
| Login Link | Hyperlink | Navigates to `/login` |

#### 3.1.3 Behavior

1. User fills the form and clicks **Register**
2. System validates all fields (see Section 17)
3. If email already exists → show error: *"An account with this email already exists."*
4. If role = **Teacher** → account is created with status `PENDING_APPROVAL`
5. If role = **Student** → account is created with status `ACTIVE` immediately
6. System sends a **verification email** to the registered address
7. User must verify email before logging in
8. After verification → redirect to login page with success message

#### 3.1.4 Teacher Registration Note
- Teacher accounts with `PENDING_APPROVAL` status can log in but see a banner: *"Your teacher account is under review. You'll be notified once approved."*
- Teacher cannot publish courses until approved by Admin

---

### 3.2 User Login

**Screen:** `/login`

#### 3.2.1 UI Elements

| Element | Type | Description |
|---------|------|-------------|
| Email Address | Email Input | Registered email |
| Password | Password Input | Account password |
| Remember Me | Checkbox | Extends session to 30 days |
| Login Button | Submit Button | Authenticates user |
| Forgot Password | Hyperlink | Navigates to `/forgot-password` |
| Google Login | OAuth Button | Login via Google |

#### 3.2.2 Behavior

1. User submits credentials
2. System validates email + password against database
3. On success → generate JWT access token (15 min) + refresh token (7 days)
4. Store refresh token in httpOnly cookie
5. Redirect based on role:
   - Admin → `/admin/dashboard`
   - Teacher → `/teacher/dashboard`
   - Student → `/dashboard`
6. On failure (wrong password) → show: *"Invalid email or password."* (max 5 attempts before 15-min lockout)
7. Google Login → OAuth 2.0 flow → if new user, create account as Student by default → redirect to dashboard

---

### 3.3 Forgot Password

**Screen:** `/forgot-password`

#### 3.3.1 Behavior

1. User enters email address and clicks **Send Reset Link**
2. System checks if email exists in database
3. If found → generate a unique password reset token (expires in 1 hour) → send reset email
4. If not found → still show: *"If this email exists, a reset link has been sent."* (prevents email enumeration)
5. User clicks link in email → navigates to `/reset-password?token=xxxx`
6. User enters new password + confirm password
7. System validates token (not expired, not used)
8. On success → update password → invalidate all existing sessions → redirect to login

---

### 3.4 User Profile Management

**Screen:** `/dashboard/profile` (Student), `/teacher/profile`, `/admin/profile`

#### 3.4.1 Editable Fields (All Roles)

| Field | Type | Notes |
|-------|------|-------|
| Full Name | Text | Required |
| Profile Photo | Image Upload | Max 2MB, JPG/PNG/WEBP |
| Bio | Textarea | Max 500 chars |
| Phone Number | Text | Optional |
| Website URL | URL Input | Optional |
| Social Links | Text Inputs | LinkedIn, Twitter, YouTube |
| Password Change | Section | Old password + new password |

#### 3.4.2 Teacher-Specific Fields

| Field | Type | Notes |
|-------|------|-------|
| Expertise / Subjects | Tag Input | Used for course discoverability |
| Bank/Payment Details | Secure Form | For teacher payouts |
| Professional Title | Text | e.g., "Senior Data Scientist" |

---

### 3.5 Admin: User Management

**Screen:** `/admin/users`

#### 3.5.1 Functional Description
Admin can view, filter, and manage all platform users across all roles.

#### 3.5.2 User List View

| Column | Description |
|--------|-------------|
| Name | Full name with avatar |
| Email | Registered email |
| Role | Badge: Admin / Teacher / Student |
| Status | Active / Suspended / Pending Approval |
| Joined | Registration date |
| Actions | View, Edit, Suspend, Delete |

#### 3.5.3 Admin Actions on Users

| Action | Behavior |
|--------|----------|
| **View** | Open user detail page with full profile and activity |
| **Approve Teacher** | Changes status from `PENDING_APPROVAL` → `ACTIVE`; sends email notification |
| **Reject Teacher** | Changes status to `REJECTED`; sends email notification with reason |
| **Suspend User** | Sets status to `SUSPENDED`; user cannot log in; sees suspension message |
| **Delete User** | Soft delete; user data retained for audit; cannot log in |
| **Promote to Admin** | Grants Admin role to any user |

---

## 4. Module 2 — Course Management

### 4.1 Course Creation Wizard

**Screen:** `/teacher/courses/create` | `/admin/courses/create`

#### 4.1.1 Functional Description
Course creation is a **multi-step wizard** split into 5 steps. Progress is auto-saved as a Draft at each step.

---

#### Step 1: Basic Information

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Course Title | Text Input | Yes | Max 100 chars; auto-generates slug |
| Course Slug | Text Input | Yes | URL-friendly; must be unique |
| Short Description | Textarea | Yes | Max 200 chars; shown in cards |
| Full Description | Rich Text | Yes | Supports formatting, images |
| Category | Dropdown | Yes | Pre-defined categories from Admin |
| Tags | Tag Input | No | Max 10 tags |
| Language | Dropdown | Yes | Default: English |
| Level | Dropdown | Yes | Beginner / Intermediate / Advanced |

---

#### Step 2: Course Type & Pricing

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Course Type | Radio Button | Yes | **Recorded** or **Live** |
| Pricing Type | Radio Button | Yes | Free or Paid |
| Price | Number Input | If Paid | Currency: INR/USD |
| Discount Price | Number Input | No | Must be less than original price |
| Access Duration | Dropdown | Yes | Lifetime / 30 days / 90 days / 180 days / 1 year |

> **If Course Type = Live:** Show additional fields:
> - Live Platform: Zoom / Google Meet (Radio)
> - Estimated Session Count (Number)
> - Session Duration (Minutes)

---

#### Step 3: Media

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Thumbnail Image | Image Upload | Yes | Min 750×422px, JPG/PNG, Max 5MB |
| Preview Video | Video Upload / URL | No | Short promo video, max 5 min |

---

#### Step 4: Curriculum Builder

- Teacher adds **Modules** (sections) to the course
- Each Module can contain multiple **Lessons**
- Lessons can be of type: **Video**, **Article**, **Quiz**, **Live Session**
- Drag-and-drop reordering of modules and lessons

**Per Lesson Fields:**

| Field | Lesson Type | Notes |
|-------|------------|-------|
| Lesson Title | All | Required |
| Lesson Type | All | Video / Article / Quiz / Live Session |
| Video File | Video | Upload to S3/Cloudinary; max 2GB |
| Video URL | Video | Alternative: paste external URL |
| Lesson Duration | Video | Auto-detected from upload |
| Article Content | Article | Rich text editor |
| Is Preview? | All | Toggle: free preview for non-enrolled users |
| Live Session Date/Time | Live Session | Date-time picker |
| Live Platform | Live Session | Zoom or Google Meet |
| Meeting Link | Live Session | Auto-generated via API or manually entered |
| Attachments | All | PDFs, docs, links (max 5 per lesson) |

---

#### Step 5: SEO & Publish

| Field | Type | Notes |
|-------|------|-------|
| SEO Title | Text | Default: Course Title; max 60 chars |
| SEO Description | Textarea | Max 160 chars |
| OG Image | Image Upload | Defaults to course thumbnail |
| Status | Radio | Draft / Published |

**On Submit (Publish):**
- If Teacher: course status = `PENDING_REVIEW` (if Admin review enabled) or `PUBLISHED`
- If Admin: course status = `PUBLISHED` immediately
- System generates course URL: `/courses/{slug}`
- Triggers notification to Admin (if review required)

---

### 4.2 Course Listing (Public)

**Screen:** `/courses`

#### 4.2.1 UI Elements

| Element | Type | Description |
|---------|------|-------------|
| Search Bar | Text Input | Full-text search across title, description |
| Category Filter | Multi-select Dropdown | Filter by one or more categories |
| Course Type Filter | Checkbox | Recorded / Live |
| Level Filter | Checkbox | Beginner / Intermediate / Advanced |
| Price Filter | Range Slider | Free / Paid / Price range |
| Sort By | Dropdown | Newest / Most Popular / Price (Low-High) / Rating |
| Course Cards | Grid Layout | 3 columns on desktop, 1 on mobile |

#### 4.2.2 Course Card Elements

| Element | Description |
|---------|-------------|
| Thumbnail | Course thumbnail image |
| Title | Course title (max 2 lines, ellipsis) |
| Instructor Name | Linked to instructor profile |
| Rating | Star rating + review count |
| Type Badge | "LIVE" or "RECORDED" badge |
| Price | Shows discount price if applicable |
| Enrollment Count | "X students enrolled" |

---

### 4.3 Course Detail Page

**Screen:** `/courses/{slug}`

#### 4.3.1 Page Sections (Top to Bottom)

**Hero Section:**
- Course title, short description, type badge, rating
- Instructor avatar + name + expertise
- Last updated date, language, level, total lessons
- Enrollment count

**Sidebar (Sticky on Desktop):**
- Thumbnail / preview video player
- Price (with discount shown)
- **Buy Now** button → goes to checkout
- **Add to Wishlist** icon
- What's included (video hours, articles, live sessions, downloads, access type)
- Share buttons (social)

**Tabs Section:**
- **Overview** — Full description, what you'll learn, prerequisites
- **Curriculum** — Expandable modules with lesson list (free preview lessons playable inline)
- **Instructor** — Bio, other courses, ratings
- **Reviews** — Star rating breakdown, individual reviews with pagination

---

### 4.4 Course Review & Rating

#### 4.4.1 Who Can Review
- Only students who are **enrolled** and have completed **at least 20%** of the course

#### 4.4.2 Review Fields

| Field | Type | Notes |
|-------|------|-------|
| Overall Rating | Star Selector | 1–5 stars, required |
| Review Title | Text | Max 80 chars, optional |
| Review Body | Textarea | Max 500 chars, optional |

#### 4.4.3 Behavior
- One review per student per course
- Existing review can be edited within 30 days
- Admin can delete inappropriate reviews
- Average rating is recalculated on each new review

---

## 5. Module 3 — Live Class Management

### 5.1 Scheduling a Live Session

**Screen:** Curriculum Builder Step 4 → Lesson Type = Live Session

#### 5.1.1 Input Fields

| Field | Type | Validation |
|-------|------|-----------|
| Session Title | Text | Required, max 100 chars |
| Date | Date Picker | Must be future date |
| Start Time | Time Picker | Required |
| Duration | Number (minutes) | Min 15, max 480 |
| Live Platform | Radio | Zoom or Google Meet |
| Description | Textarea | Optional, max 300 chars |

#### 5.1.2 Meeting Link Generation

**If Zoom selected:**
1. System calls Zoom API (`POST /v2/users/{userId}/meetings`)
2. Payload: topic, start_time, duration, timezone
3. Response: `join_url` (for students) + `start_url` (for host/teacher)
4. Both URLs stored in the `LiveSession` record
5. Teacher must have connected Zoom account in their profile settings

**If Google Meet selected:**
1. System calls Google Calendar API (`POST /calendar/v3/calendars/{calendarId}/events`)
2. Creates calendar event with `conferenceData.createRequest`
3. Response: `hangoutLink` (join URL for both teacher and students)
4. Stored in `LiveSession` record
5. Teacher must have connected Google account in profile settings

#### 5.1.3 Meeting Link Fallback
- If API fails → session saved without auto-generated link
- Teacher shown warning: *"Meeting link could not be generated automatically. Please paste your meeting link manually."*
- Teacher can manually enter the join URL

---

### 5.2 Student Live Session Experience

**Screen:** `/dashboard/live/{sessionId}`

#### 5.2.1 Pre-Session State (more than 15 min before start)

| Element | Description |
|---------|-------------|
| Session Title | Displayed prominently |
| Date & Time | Formatted with timezone |
| Instructor Name | With avatar |
| Add to Calendar | Exports .ics file for Google/Outlook calendar |
| Countdown Timer | Live countdown to session start |
| Join Button | Disabled (greyed out with tooltip: "Available 15 minutes before class") |

#### 5.2.2 Active Session State (within 15 min of start time)

| Element | Description |
|---------|-------------|
| Join Button | **Enabled** — bright colored CTA |
| Join Button Behavior | Opens meeting URL in a new browser tab |
| Platform Icon | Zoom or Google Meet logo shown |
| Session Status | "Live Now" badge with pulsing indicator |

#### 5.2.3 Post-Session State (session end time passed)

| Element | Description |
|---------|-------------|
| Status | "Session Ended" |
| Recording Link | If teacher adds post-session recording URL, shown here |
| Mark Complete | Button for student to manually mark session as attended |

---

### 5.3 Teacher Live Session Management

**Screen:** `/teacher/sessions`

#### 5.3.1 Session List View

| Column | Description |
|--------|-------------|
| Session Title | Name of the session |
| Course | Which course it belongs to |
| Date & Time | Scheduled time |
| Platform | Zoom / Google Meet badge |
| Enrolled | Number of enrolled students |
| Status | Upcoming / Live Now / Ended |
| Actions | Start Class / Edit / Cancel |

#### 5.3.2 "Start Class" Button
- Visible only to the teacher
- Opens the **host URL** (Zoom `start_url` or Google Meet link) in a new tab
- For Zoom: the `start_url` is time-limited; system refreshes it via API before opening

#### 5.3.3 Cancelling a Session
- Teacher selects Cancel → prompted for cancellation reason
- System sends email notification to all enrolled students
- Session status updated to `CANCELLED`
- Student dashboard shows cancellation notice on that lesson card

---

## 6. Module 4 — E-Commerce & Payments

### 6.1 Shopping Cart

**Screen:** `/cart`

#### 6.1.1 Cart Behavior
- Cart is persistent (saved in database for logged-in users, localStorage for guests)
- Guest cart is merged with user cart on login
- Duplicate course check: if already enrolled, clicking "Add to Cart" shows: *"You're already enrolled in this course."*

#### 6.1.2 Cart Item Elements

| Element | Description |
|---------|-------------|
| Course Thumbnail | Small image |
| Course Title | Linked to course detail page |
| Instructor Name | Text |
| Price | Discounted price if applicable (original crossed out) |
| Remove Button | Removes item from cart |

#### 6.1.3 Cart Summary

| Element | Description |
|---------|-------------|
| Subtotal | Sum of all course prices |
| Coupon Code Field | Text input + Apply button |
| Discount | Applied coupon discount (shows if valid) |
| **Total** | Final amount after discounts |
| Checkout Button | Proceeds to payment |

---

### 6.2 Coupon System

#### 6.2.1 Coupon Validation Rules
1. Code must exist in database and be `ACTIVE`
2. Coupon must not be expired (`expiresAt` > now)
3. Coupon must not have exceeded `maxUses`
4. Student must not have used this coupon before
5. One coupon per order

#### 6.2.2 Coupon Types

| Type | Behavior |
|------|---------|
| `PERCENT` | Deducts X% from subtotal (e.g., 20% off) |
| `FIXED` | Deducts fixed amount (e.g., ₹500 off) |

#### 6.2.3 Coupon Feedback Messages

| Scenario | Message |
|----------|---------|
| Valid coupon | ✅ "Coupon applied! You saved ₹X." |
| Invalid/not found | ❌ "This coupon code is invalid." |
| Expired | ❌ "This coupon has expired." |
| Already used | ❌ "You have already used this coupon." |
| Max uses reached | ❌ "This coupon is no longer available." |

---

### 6.3 Checkout

**Screen:** `/checkout`

#### 6.3.1 Checkout Page Elements

| Section | Content |
|---------|---------|
| Order Summary | List of courses, prices, discount, total |
| Billing Details | Name, email (pre-filled), country |
| Payment Method | Stripe Card Form / Razorpay Button |
| Terms Checkbox | Must agree to Terms & Privacy Policy |
| Place Order Button | Initiates payment |

#### 6.3.2 Stripe Payment Flow

```
1. Frontend creates Stripe Payment Intent via API
   → API: POST /api/payments/create-intent
   → Returns: client_secret

2. Frontend renders Stripe Elements (card input)

3. Student enters card details + clicks "Place Order"

4. Frontend calls: stripe.confirmCardPayment(client_secret)

5. Stripe processes payment:
   ├── Success → Stripe sends webhook to /api/webhooks/stripe
   │     ├── Create Order record (status: COMPLETED)
   │     ├── Create Enrollment records for each course
   │     ├── Send confirmation email with invoice
   │     └── Redirect student to /checkout/success
   └── Failure → Show error message → Allow retry
```

#### 6.3.3 Razorpay Payment Flow

```
1. API creates Razorpay Order: POST /api/payments/razorpay/create-order
   → Returns: razorpay_order_id, amount, currency

2. Frontend opens Razorpay checkout modal

3. Student completes payment in modal

4. Razorpay calls webhook: /api/webhooks/razorpay
   ├── Verify signature (HMAC SHA256)
   ├── Create Order record (status: COMPLETED)
   ├── Create Enrollment records
   ├── Send confirmation email
   └── Redirect to /checkout/success
```

---

### 6.4 Checkout Success Page

**Screen:** `/checkout/success`

| Element | Description |
|---------|-------------|
| Success Icon | Animated checkmark |
| Heading | "You're enrolled! 🎉" |
| Order ID | Reference number |
| Course List | Purchased courses with "Go to Course" links |
| Receipt Note | "Receipt sent to {email}" |
| Continue Learning Button | → `/dashboard` |

---

### 6.5 Invoice / Receipt

**Format:** PDF generated server-side + email attachment

**Invoice Contents:**
- Platform logo and name
- Invoice number (auto-incremented)
- Invoice date
- Student name and email
- Itemized course list with prices
- Coupon discount (if applied)
- Tax breakdown (if applicable)
- Total amount paid
- Payment method and transaction ID
- Terms / refund policy note

---

### 6.6 Refund Management (Admin)

**Screen:** `/admin/payments`

#### 6.6.1 Refund Flow

1. Admin searches for a transaction by Order ID or student email
2. Admin clicks **Refund** on an order
3. System displays: amount, student name, courses, and reason field
4. Admin selects refund type: Full / Partial
5. On confirm:
   - Stripe/Razorpay refund API is called
   - Order status updated to `REFUNDED`
   - Enrollment(s) revoked (course access removed)
   - Refund confirmation email sent to student

---

## 7. Module 5 — Student Learning Portal

### 7.1 Student Dashboard

**Screen:** `/dashboard`

#### 7.1.1 Dashboard Sections

| Section | Content |
|---------|---------|
| Welcome Banner | "Welcome back, {Name}!" + current streak |
| Continue Learning | Last accessed course with progress bar + Resume button |
| My Courses | Grid of enrolled courses with % completion |
| Upcoming Live Sessions | Calendar-style list of next 5 sessions |
| Recently Completed | Courses marked complete |

---

### 7.2 Course Player (Recorded)

**Screen:** `/dashboard/courses/{courseId}/lessons/{lessonId}`

#### 7.2.1 Layout

```
┌──────────────────────────────────────────────────────┐
│                  VIDEO PLAYER (Main Area)             │
│              (Title + Progress bar below)             │
├──────────────┬───────────────────────────────────────┤
│  CURRICULUM  │         LESSON CONTENT                │
│  SIDEBAR     │  (Tabs: Notes / Resources / Q&A)      │
│              │                                        │
│  ✓ Module 1  │                                        │
│    ✓ Lesson 1│                                        │
│    ► Lesson 2│                                        │
│    ○ Lesson 3│                                        │
└──────────────┴───────────────────────────────────────┘
```

#### 7.2.2 Video Player Features

| Feature | Behavior |
|---------|---------|
| Play / Pause | Standard video controls |
| Seek Bar | Click to jump to position |
| Volume Control | Mute + volume slider |
| Playback Speed | 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x |
| Quality | Auto / 360p / 720p / 1080p (if available) |
| Fullscreen | Toggle fullscreen mode |
| Captions | If subtitles uploaded by teacher |
| Picture-in-Picture | Browser PiP support |

#### 7.2.3 Progress Tracking

- System records video watch position every 10 seconds (debounced API call)
- Lesson marked **Complete** automatically when student watches ≥ 80% of video
- For Article lessons: **Mark as Complete** button shown at bottom
- For Quiz lessons: Marked complete on quiz submission
- Course overall progress = (completed lessons / total lessons) × 100%

#### 7.2.4 Curriculum Sidebar

| Icon | Meaning |
|------|---------|
| ✓ (green checkmark) | Lesson completed |
| ► (play icon) | Currently active lesson |
| ○ (empty circle) | Lesson not started |
| 🔒 (lock icon) | Lesson locked (free preview mode, not enrolled) |

---

### 7.3 My Courses Page

**Screen:** `/dashboard/courses`

| Element | Description |
|---------|-------------|
| Course Card | Thumbnail, title, instructor |
| Progress Bar | Visual % completion |
| Last Accessed | "Last watched 2 days ago" |
| Continue Button | Resumes from last lesson |
| Status Badge | In Progress / Completed / Not Started |
| Filter Tabs | All / In Progress / Completed |

---

### 7.4 Course Completion Certificate

**Trigger:** Student completes 100% of all lessons in a course

**Certificate Contents:**
- Platform logo
- "Certificate of Completion"
- Student full name (in large font)
- Course title
- Instructor name
- Completion date
- Unique certificate ID (for verification)
- Platform signature/seal

**Actions:**
- Download as PDF button
- Share on LinkedIn button (pre-filled LinkedIn share URL)
- Verify URL: `/verify/{certificateId}` — publicly accessible page confirming certificate authenticity

---

## 8. Module 6 — Teacher Dashboard

### 8.1 Teacher Dashboard Overview

**Screen:** `/teacher/dashboard`

#### 8.1.1 KPI Cards (Top Row)

| Card | Metric |
|------|--------|
| Total Revenue | Cumulative earnings (after platform commission) |
| This Month | Revenue for current calendar month |
| Total Students | Unique enrolled students across all courses |
| Total Courses | Count of published courses |
| Avg. Rating | Average star rating across all courses |

#### 8.1.2 Charts Section

| Chart | Type | Data |
|-------|------|------|
| Revenue Over Time | Line chart | Monthly/weekly revenue for last 12 months |
| Enrollments by Course | Bar chart | Top 5 courses by enrollment count |
| Student Growth | Area chart | New enrollments over time |

---

### 8.2 My Courses Management

**Screen:** `/teacher/courses`

#### 8.2.1 Course List Table

| Column | Description |
|--------|-------------|
| Course Title | With thumbnail |
| Type | Recorded / Live badge |
| Status | Draft / Pending Review / Published / Archived |
| Students | Enrolled count |
| Revenue | Total earnings from this course |
| Rating | Average star rating |
| Actions | Edit / Preview / Archive / Delete |

#### 8.2.2 Course Status Transitions

```
DRAFT ──→ PENDING_REVIEW ──→ PUBLISHED ──→ ARCHIVED
                 ↑                  │
         (Admin rejects)    (Teacher unpublishes)
                 └──────────────────┘
                      DRAFT
```

---

### 8.3 Teacher Revenue Dashboard

**Screen:** `/teacher/revenue`

#### 8.3.1 Sections

| Section | Description |
|---------|-------------|
| Summary Cards | Total earned, available for payout, paid out |
| Transaction Table | Date, course, student, gross amount, commission, net amount |
| Payout History | Previous payouts with date and amount |
| Request Payout Button | Available when balance ≥ minimum threshold |

#### 8.3.2 Revenue Calculation

```
Gross Sale Price  = ₹1,000
Platform Commission (e.g., 20%) = ₹200
Teacher Net Earnings = ₹800
```

---

## 9. Module 7 — Admin Panel

### 9.1 Admin Dashboard Overview

**Screen:** `/admin/dashboard`

#### 9.1.1 KPI Cards

| Card | Metric |
|------|--------|
| Total Users | All registered users |
| New Users (30 days) | Recent registrations |
| Total Revenue | Gross platform revenue |
| Platform Commission | Revenue kept by platform |
| Courses Published | All live courses |
| Active Enrollments | Current active course enrollments |

#### 9.1.2 Charts

| Chart | Description |
|-------|-------------|
| Revenue Trend | Monthly gross revenue line chart |
| User Growth | New registrations per month |
| Course Distribution | Pie chart: Live vs. Recorded |
| Top Courses | By enrollment or revenue |

---

### 9.2 Course Management (Admin)

**Screen:** `/admin/courses`

Admin can view ALL courses across all teachers.

| Action | Behavior |
|--------|---------|
| **Review & Approve** | Changes course status from `PENDING_REVIEW` → `PUBLISHED` |
| **Reject** | Returns course to `DRAFT` with rejection reason (emailed to teacher) |
| **Feature Course** | Marks course as "Featured" → appears on homepage |
| **Archive** | Removes course from public listing |
| **Delete** | Soft delete (enrolled students retain access) |
| **View Details** | Full course preview including curriculum |

---

### 9.3 Categories Management

**Screen:** `/admin/categories`

| Field | Notes |
|-------|-------|
| Category Name | Text, required, unique |
| Slug | Auto-generated from name |
| Description | Short description (optional) |
| Icon / Color | Visual identifier for the category |
| Parent Category | For nested subcategories (optional) |

---

### 9.4 Coupon Management

**Screen:** `/admin/coupons`

#### 9.4.1 Create Coupon Fields

| Field | Type | Notes |
|-------|------|-------|
| Coupon Code | Text | Auto-generate or manual, uppercase |
| Discount Type | Radio | Percent / Fixed Amount |
| Discount Value | Number | % or flat amount |
| Applicable Courses | Multi-select | All courses or specific courses |
| Min Order Value | Number | Optional minimum purchase |
| Max Uses | Number | Total across all users (0 = unlimited) |
| Max Uses Per User | Number | Default: 1 |
| Expiry Date | Date Picker | Optional |
| Status | Toggle | Active / Inactive |

---

### 9.5 Platform Settings

**Screen:** `/admin/settings`

| Setting Category | Fields |
|-----------------|--------|
| **General** | Site Name, Tagline, Site URL, Contact Email |
| **Branding** | Logo upload, Favicon upload, Primary color, Secondary color |
| **Commission** | Platform commission % (applies to all new sales) |
| **Teacher Approval** | Toggle: Require admin approval for new teachers |
| **Course Approval** | Toggle: Require admin approval before courses go live |
| **Payout Settings** | Minimum payout threshold, payout schedule |
| **Social Links** | Facebook, Twitter, Instagram, LinkedIn, YouTube |
| **Legal Pages** | Select CMS page for: Privacy Policy, Terms of Service, Refund Policy |

---

## 10. Module 8 — Blog

### 10.1 Blog Post Editor

**Screen:** `/admin/blog/create` | `/teacher/blog/create`

#### 10.1.1 Editor Layout

```
┌────────────────────────────────────────────────────┐
│  Post Title (Large Input)                          │
├────────────────────────────────────────────────────┤
│  Rich Text Editor (TipTap)                         │
│  ┌─ Toolbar: Bold, Italic, H1-H4, Lists,          │
│  │  Quote, Code, Image, Link, Embed, Table ────    │
│  └─ Content Area (WYSIWYG)                         │
├────────────────────────────────────────────────────┤
│  SIDEBAR                                           │
│  ├── Status: Draft / Published / Scheduled         │
│  ├── Publish Date (for scheduling)                 │
│  ├── Category (dropdown)                           │
│  ├── Tags (tag input)                              │
│  ├── Featured Image (upload)                       │
│  ├── Excerpt (textarea, max 200 chars)             │
│  └── SEO Section (collapsible)                     │
│       ├── SEO Title                                │
│       ├── SEO Description                          │
│       ├── Focus Keyword                            │
│       ├── OG Image                                 │
│       └── SERP Preview                             │
└────────────────────────────────────────────────────┘
```

---

### 10.2 Blog Listing Page (Public)

**Screen:** `/blog`

#### 10.2.1 Page Sections

| Section | Description |
|---------|-------------|
| Featured Post | Large hero card with the latest/pinned post |
| Category Tabs | Filter posts by category (horizontal scroll on mobile) |
| Post Grid | 3-column grid of post cards |
| Sidebar | Search, popular posts, category cloud, newsletter signup |
| Pagination | Load more button or numbered pagination |

#### 10.2.2 Blog Post Card Elements

| Element | Description |
|---------|-------------|
| Featured Image | Category-colored placeholder if no image |
| Category Badge | Colored label |
| Title | Max 2 lines |
| Excerpt | Max 3 lines |
| Author | Avatar + Name |
| Date | "August 20, 2026" |
| Read Time | Estimated reading time (calculated from word count) |

---

### 10.3 Blog Post Detail Page (Public)

**Screen:** `/blog/{slug}`

#### 10.3.1 Page Layout

```
HEADER: Breadcrumb > Blog > Category > Post Title
HERO: Featured image (full-width)
META: Author, Date, Category, Read Time, Share buttons

CONTENT: Rich text content (rendered from editor)
  ├── Table of Contents (auto-generated from headings)
  ├── Inline images with captions
  └── Embedded videos, code blocks

FOOTER:
  ├── Author Bio card
  ├── Tags cloud
  ├── Share buttons (Twitter, LinkedIn, Facebook, Copy Link)
  ├── Related Posts (3 cards, same category)
  └── Comment Section (if enabled)
```

---

## 11. Module 9 — CMS & Site Settings

### 11.1 Page Builder

**Screen:** `/admin/pages`

#### 11.1.1 Functional Description
Admin can create custom pages using a **block-based builder**. Each page is built by adding and reordering content blocks.

#### 11.1.2 Available Content Blocks

| Block Type | Description |
|------------|-------------|
| **Hero** | Title, subtitle, CTA button, background image |
| **Feature Grid** | Icon + title + description in a grid layout |
| **Text Block** | Rich text content |
| **Image + Text** | Side-by-side image and text |
| **FAQ Accordion** | Collapsible Q&A items |
| **Testimonials** | Quote slider/cards |
| **CTA Banner** | Call-to-action section with button |
| **Course Showcase** | Display selected courses in a grid |
| **Team Members** | Photo + name + role cards |
| **Stats Counter** | Animated number counters |
| **Embed** | Custom HTML/iframe embed |

#### 11.1.3 Page Settings (Sidebar)

| Setting | Description |
|---------|-------------|
| Page Title | Internal name |
| URL Slug | e.g., `/about`, `/faq` |
| Nav Menu | Include in main nav? (Yes/No) + nav label |
| SEO Title | Max 60 chars |
| SEO Description | Max 160 chars |
| OG Image | Social share image |
| Status | Draft / Published |

---

### 11.2 Navigation Menu Builder

**Screen:** `/admin/settings/navigation`

- Admin can add, remove, and reorder menu items
- Supports: Internal pages, external URLs, dropdown menus
- Separate configurations for: Header Nav, Footer Nav, Footer Column Links

---

### 11.3 Media Library

**Screen:** `/admin/media`

| Feature | Description |
|---------|-------------|
| Upload | Drag & drop or click to upload images/files |
| Supported Types | JPG, PNG, WEBP, GIF, PDF, MP4 |
| Search | Search by filename |
| Filter | By type (Image / Video / Document) |
| Copy URL | One-click copy of CDN URL |
| Delete | Remove from storage and database |
| Usage Info | Shows which pages/posts/courses use this file |

---

## 12. Module 10 — SEO Engine

### 12.1 Meta Tags System

Every public-facing page (course, blog, CMS page) outputs:

```html
<!-- Standard -->
<title>{seoTitle} | {siteName}</title>
<meta name="description" content="{seoDescription}" />
<link rel="canonical" href="{canonicalUrl}" />

<!-- Open Graph -->
<meta property="og:title" content="{seoTitle}" />
<meta property="og:description" content="{seoDescription}" />
<meta property="og:image" content="{ogImage}" />
<meta property="og:type" content="website|article|product" />
<meta property="og:url" content="{pageUrl}" />

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{seoTitle}" />
<meta name="twitter:description" content="{seoDescription}" />
<meta name="twitter:image" content="{ogImage}" />
```

---

### 12.2 JSON-LD Structured Data

#### 12.2.1 Course Page Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "{courseTitle}",
  "description": "{courseDescription}",
  "provider": {
    "@type": "Organization",
    "name": "{platformName}",
    "sameAs": "{platformUrl}"
  },
  "instructor": {
    "@type": "Person",
    "name": "{instructorName}"
  },
  "offers": {
    "@type": "Offer",
    "price": "{price}",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "{avgRating}",
    "reviewCount": "{reviewCount}"
  }
}
```

#### 12.2.2 Blog Post Schema (Article)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{postTitle}",
  "image": "{featuredImageUrl}",
  "author": {
    "@type": "Person",
    "name": "{authorName}"
  },
  "publisher": {
    "@type": "Organization",
    "name": "{platformName}",
    "logo": { "@type": "ImageObject", "url": "{logoUrl}" }
  },
  "datePublished": "{publishedAt}",
  "dateModified": "{updatedAt}"
}
```

---

### 12.3 Sitemap Generation

- Auto-generated at `/sitemap.xml`
- Regenerated on: new course published, new blog post published, new CMS page published
- Includes:
  - All published course URLs
  - All published blog post URLs
  - All published CMS page URLs
  - Static pages: `/`, `/courses`, `/blog`, `/instructors`
- Each entry includes: `<loc>`, `<lastmod>`, `<changefreq>`, `<priority>`

### 12.4 Robots.txt

- Served at `/robots.txt`
- Default content managed from `/admin/settings/seo`
- Default:
  ```
  User-agent: *
  Allow: /
  Disallow: /admin/
  Disallow: /api/
  Sitemap: https://yourdomain.com/sitemap.xml
  ```

---

## 13. Module 11 — Notifications & Emails

### 13.1 Email Notification Triggers

| Trigger Event | Recipient | Email Content |
|---------------|-----------|---------------|
| User Registration | New User | Welcome email + email verification link |
| Email Verified | New User | "Account activated" confirmation |
| Teacher Approved | Teacher | "Your account is approved, start creating!" |
| Teacher Rejected | Teacher | "Application not approved" + reason |
| Course Purchased | Student | Receipt + invoice PDF + course access links |
| Course Purchased | Teacher | "New enrollment in {Course Name}" |
| Live Session Reminder (24h before) | Enrolled Students | Session details + join link |
| Live Session Reminder (1h before) | Enrolled Students | Urgent reminder with join link |
| Live Session Cancelled | Enrolled Students | Cancellation notice + reason |
| Password Reset | User | Reset link (expires in 1 hour) |
| Course Approved | Teacher | "Your course is now live!" |
| Course Rejected | Teacher | "Course needs revision" + feedback |
| Refund Processed | Student | Refund confirmation + amount |
| Payout Processed | Teacher | Payout amount + bank details |
| Certificate Earned | Student | Congratulations + certificate download link |

### 13.2 In-App Notifications

- Bell icon in navbar with unread count badge
- Notification dropdown showing last 10 notifications
- Clicking a notification marks it as read and navigates to relevant page
- Notification types: Course purchase, live session reminder, teacher approval, review posted

---

## 14. Module 12 — Search & Discovery

### 14.1 Global Search

**Trigger:** Search bar in top navigation

#### 14.1.1 Search Scope
- Courses (title, description, tags)
- Blog posts (title, excerpt)
- Instructors (name, bio)

#### 14.1.2 Search Results Page

**Screen:** `/search?q={query}`

| Section | Content |
|---------|---------|
| Courses | Matching course cards (max 6, with "See all" link) |
| Blog Posts | Matching blog post cards (max 3) |
| Instructors | Matching instructor profiles (max 3) |
| No Results | "No results for '{query}'. Try different keywords." |

#### 14.1.3 Search Features
- Debounced (300ms) live search preview in dropdown
- Results ranked by relevance (PostgreSQL full-text search or Elasticsearch)
- Recent searches stored in localStorage (last 5)

---

### 14.2 Course Filters (Advanced)

**Behavior on `/courses` page:**

| Filter | Type | Logic |
|--------|------|-------|
| Category | Multi-select | OR logic (show courses matching any selected) |
| Level | Checkboxes | OR logic |
| Course Type | Checkboxes | Recorded / Live (OR) |
| Price | Range Slider | Min–Max filter |
| Free Only | Toggle | Shortcut: price = 0 |
| Rating | Dropdown | Minimum rating (e.g., 4+ stars) |
| Language | Dropdown | Filter by course language |

- Filters are reflected in URL params for shareability: `/courses?category=design&level=beginner`
- Applied filters shown as removable chips below the filter bar

---

## 15. Global UI Behaviors

### 15.1 Loading States
- All data-fetching operations show a **skeleton loader** (not a spinner) matching the expected content shape
- Buttons show a spinner and become disabled during form submission

### 15.2 Toast Notifications
- Success, error, warning, and info toasts appear in top-right corner
- Auto-dismiss after 4 seconds
- Can be manually dismissed

### 15.3 Modals / Dialogs
- Destructive actions (delete, cancel session, refund) require a **confirmation modal**
- Modal contains: action description, consequence warning, Cancel and Confirm buttons

### 15.4 Responsive Breakpoints

| Breakpoint | Min Width | Layout |
|------------|-----------|--------|
| Mobile | 0px | Single column, bottom nav |
| Tablet | 768px | Two-column layouts, collapsible sidebar |
| Desktop | 1024px | Full multi-column layouts |
| Wide | 1280px | Max-width container centered |

### 15.5 Empty States
- Every list/table that could be empty shows an illustrated empty state
- Example: "You haven't enrolled in any courses yet. Browse courses →"

---

## 16. Error Handling & Edge Cases

| Scenario | System Behavior |
|----------|----------------|
| Payment fails mid-checkout | Error message shown; order not created; student can retry |
| Zoom API unavailable | Warning shown to teacher; manual link entry enabled |
| Student tries to access course they're not enrolled in | Redirected to course detail page with "Buy Now" |
| Teacher tries to access another teacher's course editor | 403 Forbidden → redirected to their own dashboard |
| Admin deletes a course with active enrollments | Soft delete; enrolled students retain access; course hidden from catalog |
| Video upload fails | Error with specific reason + retry button |
| Duplicate email on registration | Inline error shown; no account created |
| Expired JWT token | Auto-refresh using refresh token; if refresh also expired → redirect to login |
| Student joins live session before window | Join button disabled with countdown timer shown |

---

## 17. Data Validation Rules

### 17.1 Global Validation

| Field | Validation |
|-------|-----------|
| Email | Must be valid email format (RFC 5322) |
| Password | Min 8 chars, at least 1 uppercase, 1 number, 1 special character |
| URL | Must start with `http://` or `https://` |
| Image Upload | Max size: 5MB; Allowed: JPG, PNG, WEBP |
| Video Upload | Max size: 2GB; Allowed: MP4, MOV, AVI |
| Slug | Lowercase, alphanumeric, hyphens only; no spaces; unique |

### 17.2 Course Validation

| Field | Rule |
|-------|------|
| Title | Required; 5–100 chars |
| Description | Required; min 50 chars |
| Price | Required if Paid; positive number; max 2 decimal places |
| Discount Price | Must be less than original price |
| Thumbnail | Required before publishing; min 750×422px |
| At least 1 module with 1 lesson | Required before publishing |

### 17.3 Live Session Validation

| Field | Rule |
|-------|------|
| Session Date | Must be at least 1 hour in the future |
| Duration | Min 15 minutes, max 480 minutes |
| Live Platform | Must be selected (Zoom or Google Meet) |
| Teacher account connected | Must have connected Zoom/Google account for auto-link generation |

### 17.4 Blog Post Validation

| Field | Rule |
|-------|------|
| Title | Required; 10–120 chars |
| Content | Required; min 200 chars |
| SEO Description | Required before publishing; max 160 chars |
| Featured Image | Recommended (warning shown if missing) |

---

*Document Classification: Confidential — Internal Use Only*
*[Your Organization Name] | v1.0 | August 20, 2026*
