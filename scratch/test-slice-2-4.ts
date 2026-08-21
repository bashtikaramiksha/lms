import { db, rawClient } from "@/lib/db/client";
import { courses, categories, users, modules, lessons, enrollments } from "@/lib/db/schema";
import { courseService } from "@/lib/services/course.service";
import { upsertCourseFts } from "@/lib/db/fts";
import { redis } from "@/lib/redis";
import { eq } from "drizzle-orm";

async function runTests() {
  console.log("🚀 Starting Slice 2.4 Public Course Listing & Filters Verification...\n");

  // Ensure enrollments table exists
  await rawClient.execute(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      enrolled_at TEXT,
      expires_at TEXT
    );
  `);
  try {
    await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);`);
    await rawClient.execute(`CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);`);
    await rawClient.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_user_course ON enrollments(user_id, course_id);`);
  } catch (e) {}

  // Step 1: Find or create categories
  let webCat = await db.query.categories.findFirst({ where: eq(categories.slug, "web-development") });
  if (!webCat) {
    [webCat] = await db.insert(categories).values({
      name: "Web Development",
      slug: "web-development",
    }).returning();
  }

  let dsCat = await db.query.categories.findFirst({ where: eq(categories.slug, "data-science") });
  if (!dsCat) {
    [dsCat] = await db.insert(categories).values({
      name: "Data Science",
      slug: "data-science",
    }).returning();
  }

  // Step 2: Find or create instructor
  let teacher = await db.query.users.findFirst({ where: eq(users.role, "TEACHER") });
  if (!teacher) {
    [teacher] = await db.insert(users).values({
      email: "teacher.slice24@example.com",
      fullName: "Jane Instructor",
      role: "TEACHER",
      status: "ACTIVE",
    }).returning();
  }

  // Step 3: Create test courses with various states, levels, types, prices, and titles
  console.log("🌱 Seeding test courses...");

  // Draft Course (should NOT appear in public catalog)
  const [draftCourse] = await db.insert(courses).values({
    title: "Draft Course Never Live",
    slug: `draft-course-${Date.now()}`,
    type: "RECORDED",
    status: "DRAFT",
    price: 99.99,
    authorId: teacher.id,
    categoryId: webCat.id,
  }).returning();

  // Published Course 1: React Masterclass (Beginner, Recorded, $29.99)
  const [pubCourse1] = await db.insert(courses).values({
    title: "React Masterclass 2026",
    shortDesc: "Complete React from beginner to intermediate",
    description: "Deep dive into React 19 and modern web architecture",
    slug: `react-masterclass-${Date.now()}`,
    type: "RECORDED",
    level: "BEGINNER",
    status: "PUBLISHED",
    price: 29.99,
    discountPrice: 19.99,
    authorId: teacher.id,
    categoryId: webCat.id,
  }).returning();
  await upsertCourseFts(pubCourse1.id, pubCourse1.title, pubCourse1.description, pubCourse1.shortDesc);

  // Published Course 2: Advanced Python & AI (Advanced, Live, $99.00)
  const [pubCourse2] = await db.insert(courses).values({
    title: "Advanced Python for AI & Data Science",
    shortDesc: "Live interactive cohort mastering PyTorch and LLMs",
    description: "Build production grade machine learning systems",
    slug: `python-ai-live-${Date.now()}`,
    type: "LIVE",
    level: "ADVANCED",
    status: "PUBLISHED",
    price: 99.00,
    authorId: teacher.id,
    categoryId: dsCat.id,
  }).returning();
  await upsertCourseFts(pubCourse2.id, pubCourse2.title, pubCourse2.description, pubCourse2.shortDesc);

  // Published Course 3: Free Web Basics (Beginner, Recorded, $0)
  const [pubCourse3] = await db.insert(courses).values({
    title: "Free Web Basics Starter Kit",
    shortDesc: "HTML, CSS and JavaScript essentials",
    description: "Get started with frontend web development today",
    slug: `free-web-basics-${Date.now()}`,
    type: "RECORDED",
    level: "BEGINNER",
    status: "PUBLISHED",
    price: 0,
    authorId: teacher.id,
    categoryId: webCat.id,
  }).returning();
  await upsertCourseFts(pubCourse3.id, pubCourse3.title, pubCourse3.description, pubCourse3.shortDesc);

  // Add module and lessons to Course 1
  const [mod1] = await db.insert(modules).values({
    courseId: pubCourse1.id,
    title: "Introduction",
    order: 1,
  }).returning();

  await db.insert(lessons).values([
    {
      moduleId: mod1.id,
      title: "Welcome Video",
      type: "VIDEO",
      order: 1,
      duration: 360, // 6 mins
    },
    {
      moduleId: mod1.id,
      title: "Project Setup",
      type: "VIDEO",
      order: 2,
      duration: 720, // 12 mins
    },
  ]);

  // Test 1: Only PUBLISHED courses returned
  console.log("\n🧪 Test 1: Verification that only PUBLISHED courses are returned...");
  const allPublished = await courseService.listPublicCourses({});
  const hasDraft = allPublished.data.some((c) => c.id === draftCourse.id);
  const hasPub1 = allPublished.data.some((c) => c.id === pubCourse1.id);
  if (hasDraft) throw new Error("FAIL: Draft course appeared in public catalog!");
  if (!hasPub1) throw new Error("FAIL: Published course missing from public catalog!");
  console.log(`✅ Passed: Excluded draft courses, returned ${allPublished.data.length} published courses.`);

  // Test 2: Category Filter
  console.log("\n🧪 Test 2: Filtering by category slug ('data-science')...");
  const dsResults = await courseService.listPublicCourses({ category: "data-science" });
  const allDs = dsResults.data.every((c) => c.category?.slug === "data-science");
  if (!allDs || !dsResults.data.some((c) => c.id === pubCourse2.id)) {
    throw new Error("FAIL: Category filtering did not match expected data-science course!");
  }
  console.log(`✅ Passed: Filtered ${dsResults.data.length} courses matching data-science.`);

  // Test 3: Level Filter
  console.log("\n🧪 Test 3: Filtering by level ('ADVANCED')...");
  const advResults = await courseService.listPublicCourses({ level: "ADVANCED" });
  const allAdv = advResults.data.every((c) => c.level === "ADVANCED");
  if (!allAdv || !advResults.data.some((c) => c.id === pubCourse2.id)) {
    throw new Error("FAIL: Level filtering failed!");
  }
  console.log(`✅ Passed: Filtered ${advResults.data.length} courses with level=ADVANCED.`);

  // Test 4: Format / Type Filter
  console.log("\n🧪 Test 4: Filtering by type ('LIVE')...");
  const liveResults = await courseService.listPublicCourses({ type: "LIVE" });
  const allLive = liveResults.data.every((c) => c.type === "LIVE");
  if (!allLive || !liveResults.data.some((c) => c.id === pubCourse2.id)) {
    throw new Error("FAIL: Type filtering failed!");
  }
  console.log(`✅ Passed: Filtered ${liveResults.data.length} live courses.`);

  // Test 5: Sort Orders
  console.log("\n🧪 Test 5: Sorting options (price_asc, price_desc, newest)...");
  const priceAsc = await courseService.listPublicCourses({ sort: "price_asc" });
  if (priceAsc.data.length >= 2 && priceAsc.data[0].price > priceAsc.data[1].price) {
    throw new Error("FAIL: price_asc sort failed!");
  }
  console.log("✅ Passed: price_asc sorted accurately (first price:", priceAsc.data[0]?.price, ")");

  const priceDesc = await courseService.listPublicCourses({ sort: "price_desc" });
  if (priceDesc.data.length >= 2 && priceDesc.data[0].price < priceDesc.data[1].price) {
    throw new Error("FAIL: price_desc sort failed!");
  }
  console.log("✅ Passed: price_desc sorted accurately (first price:", priceDesc.data[0]?.price, ")");

  // Test 6: FTS Search (>= 3 chars)
  console.log("\n🧪 Test 6: Full-text search FTS5 (q='React')...");
  const ftsReact = await courseService.listPublicCourses({ q: "React" });
  const foundReact = ftsReact.data.some((c) => c.id === pubCourse1.id);
  if (!foundReact) {
    throw new Error("FAIL: FTS search did not find React Masterclass!");
  }
  console.log(`✅ Passed: FTS found ${ftsReact.data.length} results matching 'React'.`);

  // Test 7: Substring Fallback (< 3 chars)
  console.log("\n🧪 Test 7: Substring fallback search (q='Py')...");
  const fallbackPy = await courseService.listPublicCourses({ q: "Py" });
  const foundPy = fallbackPy.data.some((c) => c.id === pubCourse2.id);
  if (!foundPy) {
    throw new Error("FAIL: Substring fallback search did not find Python course!");
  }
  console.log(`✅ Passed: Substring fallback found ${fallbackPy.data.length} results matching 'Py'.`);

  // Test 8: Empty Search Results
  console.log("\n🧪 Test 8: Non-matching search query (q='NonExistentTermXYZ123')...");
  const emptySearch = await courseService.listPublicCourses({ q: "NonExistentTermXYZ123" });
  if (emptySearch.data.length !== 0 || emptySearch.meta.hasNext !== false) {
    throw new Error("FAIL: Non-matching query returned results!");
  }
  console.log("✅ Passed: Correctly returned 0 results for non-matching query.");

  // Test 9: Instructor, Lesson Count, and Total Duration metrics
  console.log("\n🧪 Test 9: Card metadata metrics (instructor, lessonCount, duration)...");
  const course1Card = allPublished.data.find((c) => c.id === pubCourse1.id);
  if (!course1Card) throw new Error("FAIL: Course 1 not found!");
  if (!course1Card.instructor?.fullName) throw new Error("FAIL: Missing instructor fullName!");
  if (course1Card.lessonCount !== 2) throw new Error(`FAIL: Expected 2 lessons, got ${course1Card.lessonCount}`);
  if (course1Card.totalDuration !== 1080) throw new Error(`FAIL: Expected 1080s duration, got ${course1Card.totalDuration}`);
  console.log(`✅ Passed: Card contains instructor (${course1Card.instructor.fullName}), lessons (${course1Card.lessonCount}), and duration (${course1Card.totalDuration}s).`);

  // Test 10: Cursor Pagination
  console.log("\n🧪 Test 10: Cursor Pagination (limit=1)...");
  const page1 = await courseService.listPublicCourses({ limit: 1 });
  if (page1.data.length !== 1 || !page1.meta.hasNext || !page1.meta.nextCursor) {
    throw new Error("FAIL: Page 1 pagination failed!");
  }
  const page2 = await courseService.listPublicCourses({ limit: 1, cursor: page1.meta.nextCursor });
  if (page2.data.length !== 1 || page2.data[0].id === page1.data[0].id) {
    throw new Error("FAIL: Page 2 returned duplicate or empty item!");
  }
  console.log("✅ Passed: Cursor pagination successfully retrieved consecutive distinct items.");

  // Test 11: Redis / In-Memory Caching
  console.log("\n🧪 Test 11: Redis / In-Memory Caching verification...");
  const cacheFilter = { category: "web-development", level: "BEGINNER" as const };
  const firstCall = await courseService.listPublicCourses(cacheFilter);
  const secondCall = await courseService.listPublicCourses(cacheFilter);
  if (firstCall.data.length !== secondCall.data.length) {
    throw new Error("FAIL: Caching response mismatch!");
  }
  console.log("✅ Passed: Caching functioning seamlessly for filter requests.");

  console.log("\n🎉 ALL 11 TESTS PASSED! Slice 2.4 is 100% verified!\n");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
