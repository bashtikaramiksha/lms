import { db } from "@/lib/db/client";
import { users, courses, blogPosts, blogCategories, pages } from "@/lib/db/schema";
import { seoService } from "@/lib/services/seo.service";
import { blogService } from "@/lib/services/blog.service";
import { cmsService } from "@/lib/services/cms.service";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { eq } from "drizzle-orm";

async function runSeoServiceTests() {
  console.log("🧪 Starting Slice 5.5 SEO Infrastructure Verification Tests...\n");

  const runId = Math.random().toString(36).substring(7);
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lms-platform.com";

  // 1. Setup Test Data (Teacher, Published Course, Published Post, Published Page, Drafts)
  console.log("1️⃣ Setting up test published & draft entities...");
  const [teacher] = await db
    .insert(users)
    .values({
      email: `teacher_seo_${runId}@example.com`,
      passwordHash: "dummyhash",
      fullName: "Alan Turing",
      role: "TEACHER",
    })
    .returning();

  // Published Course
  const [pubCourse] = await db
    .insert(courses)
    .values({
      id: `course-seo-${runId}`,
      title: `Distributed Cloud Systems ${runId}`,
      slug: `distributed-cloud-systems-${runId}`,
      type: "RECORDED",
      shortDesc: "Architecting cloud systems with high availability.",
      description: "Complete course description covering distributed consensus.",
      price: 4999,
      discountPrice: 2999,
      status: "PUBLISHED",
      authorId: teacher.id,
    })
    .returning();

  // Draft Course
  const [draftCourse] = await db
    .insert(courses)
    .values({
      id: `course-draft-${runId}`,
      title: `Secret Quantum Computing ${runId}`,
      slug: `secret-quantum-draft-${runId}`,
      type: "RECORDED",
      price: 9999,
      status: "DRAFT",
      authorId: teacher.id,
    })
    .returning();

  // Published Blog Post
  const category = await blogService.createCategory({
    name: `DevOps ${runId}`,
    slug: `devops-${runId}`,
  });

  const pubPost = await blogService.createPost(
    {
      title: `Microservices vs Monoliths ${runId}`,
      slug: `microservices-vs-monoliths-${runId}`,
      excerpt: "Comparing distributed microservices with modular monoliths.",
      content: "<p>Architecture considerations...</p>",
      categoryId: category.id,
      status: "PUBLISHED",
      seoTitle: `Microservices vs Monoliths Guide ${runId}`,
    },
    teacher.id
  );

  // Draft Blog Post
  const draftPost = await blogService.createPost(
    {
      title: `Unpublished Draft Article ${runId}`,
      slug: `unpublished-draft-article-${runId}`,
      excerpt: "Coming soon draft",
      categoryId: category.id,
      status: "DRAFT",
    },
    teacher.id
  );

  // Published CMS Static Page
  const pubPage = await cmsService.createPage({
    title: `Careers at LMS ${runId}`,
    slug: `careers-${runId}`,
    blocks: [],
    status: "PUBLISHED",
    seoTitle: `Join Our Engineering Team ${runId}`,
  });

  // Draft CMS Static Page
  const draftPage = await cmsService.createPage({
    title: `Internal Secret Memo ${runId}`,
    slug: `internal-secret-${runId}`,
    blocks: [],
    status: "DRAFT",
  });

  console.log("   ✅ Test data initialized (Published + Draft courses, posts, and static pages)");

  // 2. Test sitemap() generator
  console.log("2️⃣ Testing sitemap() generation...");
  const sitemapEntries = await sitemap();

  const urls = sitemapEntries.map((e) => e.url);

  // 2a. Check static root routes
  if (!urls.includes(`${BASE_URL}`)) {
    throw new Error("❌ sitemap missing root URL /");
  }
  if (!urls.includes(`${BASE_URL}/courses`)) {
    throw new Error("❌ sitemap missing /courses listing URL");
  }
  if (!urls.includes(`${BASE_URL}/blog`)) {
    throw new Error("❌ sitemap missing /blog listing URL");
  }

  // 2b. Check published dynamic routes
  if (!urls.includes(`${BASE_URL}/courses/${pubCourse.slug}`)) {
    throw new Error("❌ sitemap missing published course URL");
  }
  if (!urls.includes(`${BASE_URL}/blog/${pubPost.slug}`)) {
    throw new Error("❌ sitemap missing published blog post URL");
  }
  if (!urls.includes(`${BASE_URL}/${pubPage.slug}`)) {
    throw new Error("❌ sitemap missing published CMS page URL");
  }

  // 2c. Check draft exclusion
  if (urls.includes(`${BASE_URL}/courses/${draftCourse.slug}`)) {
    throw new Error("❌ sitemap included DRAFT course!");
  }
  if (urls.includes(`${BASE_URL}/blog/${draftPost.slug}`)) {
    throw new Error("❌ sitemap included DRAFT blog post!");
  }
  if (urls.includes(`${BASE_URL}/${draftPage.slug}`)) {
    throw new Error("❌ sitemap included DRAFT CMS page!");
  }

  // 2d. Check priorities
  const homeEntry = sitemapEntries.find((e) => e.url === `${BASE_URL}`);
  const coursesEntry = sitemapEntries.find((e) => e.url === `${BASE_URL}/courses`);
  const courseItemEntry = sitemapEntries.find((e) => e.url === `${BASE_URL}/courses/${pubCourse.slug}`);
  const blogItemEntry = sitemapEntries.find((e) => e.url === `${BASE_URL}/blog/${pubPost.slug}`);
  const pageItemEntry = sitemapEntries.find((e) => e.url === `${BASE_URL}/${pubPage.slug}`);

  if (homeEntry?.priority !== 1.0) throw new Error("❌ Home priority must be 1.0");
  if (coursesEntry?.priority !== 0.9) throw new Error("❌ Courses listing priority must be 0.9");
  if (courseItemEntry?.priority !== 0.8) throw new Error("❌ Course detail priority must be 0.8");
  if (blogItemEntry?.priority !== 0.7) throw new Error("❌ Blog post priority must be 0.7");
  if (pageItemEntry?.priority !== 0.6) throw new Error("❌ CMS page priority must be 0.6");

  console.log("   ✅ sitemap() correctly generates all published URLs, priorities, and excludes all drafts");

  // 3. Test robots() generator
  console.log("3️⃣ Testing robots() generation...");
  const robotsConfig = robots();

  if (robotsConfig.sitemap !== `${BASE_URL}/sitemap.xml`) {
    throw new Error("❌ robots.txt missing or incorrect sitemap URL reference");
  }

  const defaultRule = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
  if (!defaultRule || defaultRule.userAgent !== "*") {
    throw new Error("❌ robots.txt missing wildcard userAgent rule");
  }

  const disallowList = Array.isArray(defaultRule.disallow) ? defaultRule.disallow : [defaultRule.disallow];
  if (!disallowList.includes("/api/") || !disallowList.includes("/admin/")) {
    throw new Error("❌ robots.txt missing required disallow rules for /api/ and /admin/");
  }
  console.log("   ✅ robots() correctly sets crawl permissions and sitemap link");

  // 4. Test Course JSON-LD generator
  console.log("4️⃣ Testing Course JSON-LD schema generation...");
  const courseJsonLd = seoService.generateCourseJsonLd(
    {
      ...pubCourse,
      instructor: { fullName: "Alan Turing" },
      reviewCount: 15,
      avgRating: 4.8,
    },
    BASE_URL
  );

  if (courseJsonLd["@type"] !== "Course") {
    throw new Error("❌ Course JSON-LD @type must be 'Course'");
  }
  if (courseJsonLd.offers.price !== 2999) {
    throw new Error("❌ Course JSON-LD must prioritize discountPrice (2999) over price");
  }
  if (courseJsonLd.offers.priceCurrency !== "INR") {
    throw new Error("❌ Course JSON-LD priceCurrency must be INR");
  }
  if (!courseJsonLd.aggregateRating || courseJsonLd.aggregateRating.ratingCount !== 15) {
    throw new Error("❌ Course JSON-LD aggregateRating missing for reviewed course");
  }

  // Zero reviews course test
  const noReviewCourseJsonLd = seoService.generateCourseJsonLd(
    {
      ...pubCourse,
      reviewCount: 0,
      discountPrice: null,
      price: 5000,
      instructor: { fullName: "Alan Turing" },
    },
    BASE_URL
  );
  if (noReviewCourseJsonLd.aggregateRating !== undefined) {
    throw new Error("❌ Course JSON-LD must omit aggregateRating when reviewCount === 0");
  }
  if (noReviewCourseJsonLd.offers.price !== 5000) {
    throw new Error("❌ Course JSON-LD must fallback to regular price when discountPrice is null");
  }
  console.log("   ✅ Course JSON-LD schema correctly formatted and handles pricing & ratings");

  // 5. Test BlogPosting JSON-LD generator
  console.log("5️⃣ Testing BlogPosting JSON-LD schema generation...");
  const blogJsonLd = seoService.generateBlogPostingJsonLd(pubPost, BASE_URL);

  if (blogJsonLd["@type"] !== "BlogPosting") {
    throw new Error("❌ BlogPosting JSON-LD @type must be 'BlogPosting'");
  }
  if (blogJsonLd.headline !== `Microservices vs Monoliths Guide ${runId}`) {
    throw new Error("❌ BlogPosting JSON-LD headline must prioritize seoTitle");
  }
  if (!blogJsonLd.publisher?.logo?.url) {
    throw new Error("❌ BlogPosting JSON-LD publisher logo missing");
  }
  console.log("   ✅ BlogPosting JSON-LD schema correctly generated with seoTitle headline");

  // 6. Test getSitemapStats
  console.log("6️⃣ Testing SeoService.getSitemapStats...");
  const stats = await seoService.getSitemapStats();
  if (stats.courses < 1 || stats.blogPosts < 1 || stats.pages < 1) {
    throw new Error("❌ getSitemapStats returned invalid counts");
  }
  console.log(`   ✅ getSitemapStats returned counts (courses: ${stats.courses}, posts: ${stats.blogPosts}, pages: ${stats.pages})`);

  // Cleanup
  console.log("\n🧹 Cleaning up test artifacts...");
  await db.delete(courses).where(eq(courses.id, pubCourse.id));
  await db.delete(courses).where(eq(courses.id, draftCourse.id));
  await db.delete(blogPosts).where(eq(blogPosts.id, pubPost.id));
  await db.delete(blogPosts).where(eq(blogPosts.id, draftPost.id));
  await db.delete(blogCategories).where(eq(blogCategories.id, category.id));
  await db.delete(pages).where(eq(pages.id, pubPage.id));
  await db.delete(pages).where(eq(pages.id, draftPage.id));
  await db.delete(users).where(eq(users.id, teacher.id));

  console.log("\n🎉 ALL Slice 5.5 SEO Infrastructure Tests PASSED Successfully!\n");
}

runSeoServiceTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
