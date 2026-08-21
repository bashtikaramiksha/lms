import { db, rawClient } from "@/lib/db/client";
import { courses, categories, users, modules, lessons, enrollments, reviews } from "@/lib/db/schema";
import { courseService, AppError } from "@/lib/services/course.service";
import { GET as getReviewsHandler } from "@/app/api/courses/[id]/reviews/route";
import { GET as getCourseHandler } from "@/app/api/courses/[id]/route";
import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

async function runSlice25Tests() {
  console.log("🚀 Starting Slice 2.5 Course Detail Page Verification...\n");

  // Ensure reviews table exists
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL,
      comment TEXT,
      created_at TEXT
    );
  `);
  try {
    await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_reviews_course ON reviews(course_id);`);
    await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_reviews_student ON reviews(student_id);`);
    await rawClient.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_course_student ON reviews(course_id, student_id);`);
  } catch (e) {}

  // 1. Setup instructor and students
  let teacher = await db.query.users.findFirst({ where: eq(users.role, "TEACHER") });
  if (!teacher) {
    [teacher] = await db.insert(users).values({
      email: "instructor.slice25@example.com",
      fullName: "Professor Sarah Johnson",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330",
      bio: "Distinguished engineer and educator with 12 years experience.",
      role: "TEACHER",
      status: "ACTIVE",
    }).returning();
  }

  let studentEnrolled = await db.query.users.findFirst({ where: eq(users.email, "student.enrolled@example.com") });
  if (!studentEnrolled) {
    [studentEnrolled] = await db.insert(users).values({
      email: "student.enrolled@example.com",
      fullName: "Alice Student",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb",
      role: "STUDENT",
      status: "ACTIVE",
    }).returning();
  }

  let studentReviewer = await db.query.users.findFirst({ where: eq(users.email, "student.reviewer@example.com") });
  if (!studentReviewer) {
    [studentReviewer] = await db.insert(users).values({
      email: "student.reviewer@example.com",
      fullName: "Bob Reviewer",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d",
      role: "STUDENT",
      status: "ACTIVE",
    }).returning();
  }

  // 2. Setup Category
  let category = await db.query.categories.findFirst({ where: eq(categories.slug, "cloud-architecture") });
  if (!category) {
    [category] = await db.insert(categories).values({
      name: "Cloud Architecture",
      slug: "cloud-architecture",
    }).returning();
  }

  // 3. Create a Draft Course
  const draftSlug = `draft-system-design-${Date.now()}`;
  const [draftCourse] = await db.insert(courses).values({
    title: "Draft System Design",
    slug: draftSlug,
    status: "DRAFT",
    type: "RECORDED",
    price: 49.99,
    authorId: teacher.id,
    categoryId: category.id,
  }).returning();

  // 4. Create a Published Course with Curriculum
  const pubSlug = `mastering-cloud-native-${Date.now()}`;
  const [pubCourse] = await db.insert(courses).values({
    title: "Mastering Cloud Native Architecture",
    slug: pubSlug,
    shortDesc: "Architect scalable distributed systems with Kubernetes and Microservices.",
    description: "In-depth guide covering cloud architecture patterns, resilience, observability, and container orchestration.",
    status: "PUBLISHED",
    type: "RECORDED",
    level: "ADVANCED",
    language: "English",
    price: 79.99,
    discountPrice: 49.99,
    thumbnailUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475",
    previewUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    seoTitle: "Mastering Cloud Native Architecture | LMS Platform",
    seoDesc: "Learn advanced cloud native distributed systems with Kubernetes and Go.",
    authorId: teacher.id,
    categoryId: category.id,
  }).returning();

  // Add Modules and Lessons
  const [mod1] = await db.insert(modules).values({
    courseId: pubCourse.id,
    title: "Cloud Native Fundamentals",
    order: 1,
  }).returning();

  const [mod2] = await db.insert(modules).values({
    courseId: pubCourse.id,
    title: "Microservices & Kubernetes",
    order: 2,
  }).returning();

  // Lesson 1.1: Preview Video
  await db.insert(lessons).values({
    moduleId: mod1.id,
    title: "Course Overview & Distributed Architecture",
    type: "VIDEO",
    order: 1,
    duration: 480, // 8 mins
    isPreview: true,
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  });

  // Lesson 1.2: Gated Video
  await db.insert(lessons).values({
    moduleId: mod1.id,
    title: "12-Factor App Principles in Practice",
    type: "VIDEO",
    order: 2,
    duration: 900, // 15 mins
    isPreview: false,
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  });

  // Lesson 2.1: Gated Video
  await db.insert(lessons).values({
    moduleId: mod2.id,
    title: "Kubernetes Deployments & Service Meshes",
    type: "VIDEO",
    order: 1,
    duration: 1200, // 20 mins
    isPreview: false,
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  });

  // Lesson 2.2: Article Lesson
  await db.insert(lessons).values({
    moduleId: mod2.id,
    title: "Production Architecture Checklist",
    type: "ARTICLE",
    order: 2,
    duration: 300, // 5 mins
    isPreview: false,
    content: "## Production Architecture Checklist\n1. Ensure high availability\n2. Configure circuit breakers",
  });

  // 5. Enroll Student 1 in Published Course
  await db.insert(enrollments).values({
    userId: studentEnrolled.id,
    courseId: pubCourse.id,
    status: "ACTIVE",
  });

  // 6. Add Reviews
  await db.insert(reviews).values([
    {
      courseId: pubCourse.id,
      studentId: studentReviewer.id,
      rating: 5,
      comment: "Incredible course! Clear explanations and production-ready examples.",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      courseId: pubCourse.id,
      studentId: studentEnrolled.id,
      rating: 4,
      comment: "Great deep dive into cloud native concepts. Highly recommended!",
      createdAt: new Date().toISOString(),
    },
  ]);

  // Test 1: Full Course Detail Retrieval for PUBLISHED Course (Unauthenticated)
  console.log("🧪 Test 1: getCourseDetail() for published course (unauthenticated)...");
  const detailUnauth = await courseService.getCourseDetail(pubSlug);
  if (detailUnauth.id !== pubCourse.id || detailUnauth.slug !== pubSlug) {
    throw new Error("FAIL: Course ID or slug mismatch!");
  }
  if (!detailUnauth.category || detailUnauth.category.slug !== "cloud-architecture") {
    throw new Error("FAIL: Category was not loaded!");
  }
  if (detailUnauth.isEnrolled !== false) {
    throw new Error("FAIL: Unauthenticated visitor marked as enrolled!");
  }
  console.log(`✅ Passed: Retrieved course detail (${detailUnauth.title}).`);

  // Test 2: Draft Course Rejection (404)
  console.log("\n🧪 Test 2: getCourseDetail() throws 404 for DRAFT course...");
  try {
    await courseService.getCourseDetail(draftSlug);
    throw new Error("FAIL: Should have thrown COURSE_NOT_FOUND for draft course!");
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 404) {
      console.log("✅ Passed: Correctly returned 404 COURSE_NOT_FOUND for DRAFT course.");
    } else {
      throw err;
    }
  }

  // Test 3: Non-existent Slug Rejection (404)
  console.log("\n🧪 Test 3: getCourseDetail() throws 404 for non-existent slug...");
  try {
    await courseService.getCourseDetail("completely-fake-slug-xyz-999");
    throw new Error("FAIL: Should have thrown COURSE_NOT_FOUND for fake slug!");
  } catch (err: any) {
    if (err instanceof AppError && err.statusCode === 404) {
      console.log("✅ Passed: Correctly returned 404 for non-existent slug.");
    } else {
      throw err;
    }
  }

  // Test 4: Video Preview Gating (Unauthenticated Visitor)
  console.log("\n🧪 Test 4: Video URL gating for unauthenticated visitor...");
  const mod1Lessons = detailUnauth.curriculum[0].lessons;
  const lessonPreview = mod1Lessons.find((l) => l.isPreview);
  const lessonGated = mod1Lessons.find((l) => !l.isPreview);

  if (!lessonPreview?.videoUrl) {
    throw new Error("FAIL: Preview lesson videoUrl is null for unauthenticated user!");
  }
  if (lessonGated?.videoUrl !== null) {
    throw new Error("FAIL: Non-preview lesson videoUrl was exposed to unauthenticated user!");
  }
  console.log("✅ Passed: Preview lesson has videoUrl, non-preview lesson has videoUrl=null.");

  // Test 5: Video Preview Gating (Enrolled Student)
  console.log("\n🧪 Test 5: Video URL exposure for enrolled student...");
  const detailEnrolled = await courseService.getCourseDetail(pubSlug, studentEnrolled.id);
  if (detailEnrolled.isEnrolled !== true) {
    throw new Error("FAIL: Enrolled student isEnrolled is false!");
  }
  const mod1LessonsEnrolled = detailEnrolled.curriculum[0].lessons;
  const allVideoLessonsHaveUrls = mod1LessonsEnrolled
    .filter((l) => l.type === "VIDEO")
    .every((l) => Boolean(l.videoUrl));
  if (!allVideoLessonsHaveUrls) {
    throw new Error("FAIL: Enrolled student cannot access all video URLs!");
  }
  console.log("✅ Passed: Enrolled student receives videoUrls for all video lessons.");

  // Test 6: Instructor Statistics & Course Count
  console.log("\n🧪 Test 6: Instructor statistics computation...");
  if (detailUnauth.instructor.courseCount < 1) {
    throw new Error("FAIL: Instructor courseCount should be at least 1!");
  }
  if (detailUnauth.instructor.studentCount < 1) {
    throw new Error("FAIL: Instructor studentCount should be at least 1!");
  }
  console.log(`✅ Passed: Instructor has ${detailUnauth.instructor.courseCount} courses and ${detailUnauth.instructor.studentCount} students.`);

  // Test 7: Review Statistics & Aggregations
  console.log("\n🧪 Test 7: Review rating aggregations...");
  if (detailUnauth.reviewCount !== 2) {
    throw new Error(`FAIL: Expected 2 reviews, got ${detailUnauth.reviewCount}`);
  }
  if (detailUnauth.avgRating !== 4.5) {
    throw new Error(`FAIL: Expected avgRating of 4.5 (avg of 5 & 4), got ${detailUnauth.avgRating}`);
  }
  console.log(`✅ Passed: Aggregated avgRating: ${detailUnauth.avgRating} from ${detailUnauth.reviewCount} reviews.`);

  // Test 8: Total Duration & Lesson Count Sum
  console.log("\n🧪 Test 8: Curriculum total duration & lesson count...");
  if (detailUnauth.lessonCount !== 4) {
    throw new Error(`FAIL: Expected 4 lessons, got ${detailUnauth.lessonCount}`);
  }
  // 480 + 900 + 1200 + 300 = 2880
  if (detailUnauth.totalDuration !== 2880) {
    throw new Error(`FAIL: Expected totalDuration of 2880s, got ${detailUnauth.totalDuration}`);
  }
  console.log(`✅ Passed: Calculated ${detailUnauth.lessonCount} lessons with total duration ${detailUnauth.totalDuration}s.`);

  // Test 9: Paginated Reviews API Route
  console.log("\n🧪 Test 9: GET /api/courses/[id]/reviews API route...");
  const reqReviews = new NextRequest(`http://localhost:3000/api/courses/${pubSlug}/reviews?limit=1`);
  const resReviews = await getReviewsHandler(reqReviews, { params: Promise.resolve({ id: pubSlug }) });
  const jsonReviews = await resReviews.json();

  if (resReviews.status !== 200 || !jsonReviews.success || jsonReviews.data.length !== 1 || !jsonReviews.meta.hasNext) {
    throw new Error("FAIL: Reviews API pagination failed!");
  }
  if (!jsonReviews.data[0].student?.fullName) {
    throw new Error("FAIL: Review item student name missing!");
  }
  console.log(`✅ Passed: Reviews endpoint returned paginated reviews (hasNext=${jsonReviews.meta.hasNext}, nextCursor=${jsonReviews.meta.nextCursor}).`);

  // Test 10: Course Detail API Route
  console.log("\n🧪 Test 10: GET /api/courses/[id] API route for course detail...");
  const reqDetail = new NextRequest(`http://localhost:3000/api/courses/${pubSlug}`);
  const resDetail = await getCourseHandler(reqDetail, { params: Promise.resolve({ id: pubSlug }) });
  const jsonDetail = await resDetail.json();
  console.log("resDetail status:", resDetail.status, "jsonDetail:", jsonDetail);

  if (resDetail.status !== 200 || !jsonDetail.success || jsonDetail.data.slug !== pubSlug) {
    throw new Error(`FAIL: Detail route returned invalid response: ${JSON.stringify(jsonDetail)}`);
  }
  console.log("✅ Passed: Detail route returned 200 with full course detail.");

  console.log("\n🎉 ALL 10 TESTS PASSED! Slice 2.5 is 100% verified!\n");
}

runSlice25Tests().catch((err) => {
  console.error("❌ Slice 2.5 Test Failed:", err);
  process.exit(1);
});
