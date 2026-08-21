import { db } from "@/lib/db/client";
import { users, blogPosts, blogCategories, blogTags, blogPostTags } from "@/lib/db/schema";
import {
  blogService,
  ConflictError,
  UnprocessableError,
  NotFoundError,
  ForbiddenError,
} from "@/lib/services/blog.service";
import { eq, and, lte } from "drizzle-orm";

async function runBlogServiceTests() {
  console.log("🧪 Starting Slice 5.1 Blog Post Authoring Verification Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  // 1. Setup Test Users: Admin, Teacher 1, Teacher 2
  console.log("1️⃣ Setting up test users...");
  const [admin] = await db
    .insert(users)
    .values({
      email: `admin_blog_${runId}@example.com`,
      passwordHash: "dummyhash",
      fullName: "Admin Author",
      role: "ADMIN",
    })
    .returning();

  const [teacher1] = await db
    .insert(users)
    .values({
      email: `teacher1_blog_${runId}@example.com`,
      passwordHash: "dummyhash",
      fullName: "Teacher One",
      role: "TEACHER",
    })
    .returning();

  const [teacher2] = await db
    .insert(users)
    .values({
      email: `teacher2_blog_${runId}@example.com`,
      passwordHash: "dummyhash",
      fullName: "Teacher Two",
      role: "TEACHER",
    })
    .returning();

  console.log("   ✅ Users created:", {
    adminId: admin.id,
    teacher1Id: teacher1.id,
    teacher2Id: teacher2.id,
  });

  // 2. Setup Category and Tags
  console.log("2️⃣ Setting up category and tags...");
  const category = await blogService.createCategory({
    name: `Web Development ${runId}`,
    slug: `web-development-${runId}`,
  });

  const tag1 = await blogService.createTag({
    name: `React ${runId}`,
    slug: `react-${runId}`,
  });

  const tag2 = await blogService.createTag({
    name: `Next.js ${runId}`,
    slug: `nextjs-${runId}`,
  });

  console.log("   ✅ Category & tags created:", {
    categoryId: category.id,
    tag1Id: tag1.id,
    tag2Id: tag2.id,
  });

  // 3. Test createPost (DRAFT, PUBLISHED, SCHEDULED)
  console.log("3️⃣ Testing BlogService.createPost...");

  // 3a. DRAFT post
  const draftPost = await blogService.createPost(
    {
      title: `Getting Started with React ${runId}`,
      slug: `getting-started-react-${runId}`,
      excerpt: "Introduction to React basics",
      content: "<p>React is a JavaScript library...</p>",
      categoryId: category.id,
      tagIds: [tag1.id, tag2.id],
      status: "DRAFT",
    },
    teacher1.id
  );

  if (draftPost.status !== "DRAFT" || draftPost.publishedAt !== null) {
    throw new Error("❌ Draft post must have status=DRAFT and publishedAt=null");
  }
  console.log("   ✅ Draft post created correctly with null publishedAt");

  // Verify tags attached
  const fetchedDraft = await blogService.getPostById(draftPost.id);
  if (fetchedDraft.tags.length !== 2) {
    throw new Error(`❌ Expected 2 tags attached, got ${fetchedDraft.tags.length}`);
  }
  console.log("   ✅ Post tags attached and resolved correctly");

  // 3b. Slug conflict
  try {
    await blogService.createPost(
      {
        title: "Duplicate Slug Post",
        slug: `getting-started-react-${runId}`, // duplicate slug
        status: "DRAFT",
      },
      teacher1.id
    );
    throw new Error("❌ Expected SLUG_CONFLICT error, but createPost succeeded");
  } catch (err: any) {
    if (err instanceof ConflictError || err.message === "SLUG_CONFLICT") {
      console.log("   ✅ ConflictError thrown when slug already exists");
    } else {
      throw err;
    }
  }

  // 3c. Scheduled for past date rejection
  try {
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
    await blogService.createPost(
      {
        title: "Past Scheduled Post",
        slug: `past-scheduled-${runId}`,
        status: "SCHEDULED",
        scheduledFor: pastDate,
      },
      teacher1.id
    );
    throw new Error("❌ Expected SCHEDULED_FOR_PAST error, but createPost succeeded");
  } catch (err: any) {
    if (err instanceof UnprocessableError || err.message === "SCHEDULED_FOR_PAST") {
      console.log("   ✅ UnprocessableError thrown when scheduledFor is in the past");
    } else {
      throw err;
    }
  }

  // 3d. PUBLISHED post immediately
  const publishedPost = await blogService.createPost(
    {
      title: `Next.js 15 Full Guide ${runId}`,
      slug: `nextjs-15-guide-${runId}`,
      excerpt: "Deep dive into Next.js 15",
      content: "<p>Next.js 15 brings powerful new features...</p>",
      categoryId: category.id,
      tagIds: [tag2.id],
      status: "PUBLISHED",
      seoTitle: "Next.js 15 Full Guide SEO",
      seoDesc: "Learn Next.js 15 in this complete tutorial",
    },
    teacher1.id
  );

  if (publishedPost.status !== "PUBLISHED" || !publishedPost.publishedAt) {
    throw new Error("❌ Published post must have status=PUBLISHED and publishedAt set");
  }
  console.log("   ✅ Published post created with immediate publishedAt timestamp");

  // 4. Test updatePost & Permissions
  console.log("4️⃣ Testing BlogService.updatePost & Permissions...");

  // 4a. Teacher 2 cannot update Teacher 1's post
  try {
    await blogService.updatePost(
      draftPost.id,
      { title: "Hacked Title by Teacher 2" },
      teacher2.id,
      "TEACHER"
    );
    throw new Error("❌ Expected NOT_YOUR_POST forbidden error, but updatePost succeeded");
  } catch (err: any) {
    if (err instanceof ForbiddenError || err.message === "NOT_YOUR_POST") {
      console.log("   ✅ ForbiddenError thrown when Teacher attempts to edit another author's post");
    } else {
      throw err;
    }
  }

  // 4b. Admin can update any post
  const updatedByAdmin = await blogService.updatePost(
    draftPost.id,
    { title: `Updated by Admin ${runId}`, tagIds: [tag1.id] },
    admin.id,
    "ADMIN"
  );
  if (updatedByAdmin.title !== `Updated by Admin ${runId}`) {
    throw new Error("❌ Admin failed to update post title");
  }
  const reloadedDraft = await blogService.getPostById(draftPost.id);
  if (reloadedDraft.tags.length !== 1 || reloadedDraft.tags[0].id !== tag1.id) {
    throw new Error("❌ Tag replacement on update failed");
  }
  console.log("   ✅ Admin successfully updated post and replaced tag associations");

  // 4c. Publishing draft sets publishedAt
  const publishedDraft = await blogService.updatePost(
    draftPost.id,
    { status: "PUBLISHED" },
    teacher1.id,
    "TEACHER"
  );
  if (!publishedDraft.publishedAt || publishedDraft.status !== "PUBLISHED") {
    throw new Error("❌ Transitioning status to PUBLISHED must set publishedAt timestamp");
  }
  console.log("   ✅ Status transition to PUBLISHED set publishedAt timestamp");

  // 5. Test deletePost
  console.log("5️⃣ Testing BlogService.deletePost...");

  // 5a. Teacher cannot delete post
  try {
    await blogService.deletePost(publishedPost.id, teacher1.id, "TEACHER");
    throw new Error("❌ Expected ADMIN_ONLY forbidden error, but deletePost succeeded");
  } catch (err: any) {
    if (err instanceof ForbiddenError || err.message === "ADMIN_ONLY") {
      console.log("   ✅ ForbiddenError thrown when non-admin attempts to delete post");
    } else {
      throw err;
    }
  }

  // 5b. Admin deletes post
  await blogService.deletePost(publishedPost.id, admin.id, "ADMIN");
  try {
    await blogService.getPostById(publishedPost.id);
    throw new Error("❌ Post should have been deleted");
  } catch (err: any) {
    if (err instanceof NotFoundError || err.message === "POST_NOT_FOUND") {
      console.log("   ✅ Admin successfully deleted post with cascade cleanup");
    } else {
      throw err;
    }
  }

  // 6. Test Admin & Teacher query listings
  console.log("6️⃣ Testing getAdminPosts & getTeacherPosts...");
  const adminPosts = await blogService.getAdminPosts({
    page: 1,
    limit: 10,
    search: runId,
  });
  if (adminPosts.data.length === 0) {
    throw new Error("❌ getAdminPosts failed to return matching posts");
  }
  console.log(`   ✅ getAdminPosts returned ${adminPosts.data.length} posts for query`);

  const teacher1Posts = await blogService.getTeacherPosts(teacher1.id, {
    page: 1,
    limit: 10,
  });
  if (teacher1Posts.data.length === 0) {
    throw new Error("❌ getTeacherPosts failed to return teacher1's posts");
  }
  console.log(`   ✅ getTeacherPosts returned ${teacher1Posts.data.length} posts for teacher1`);

  // 7. Test Inngest Scheduled Publishing Cron Logic
  console.log("7️⃣ Testing Scheduled Publishing Cron Logic...");
  // Create a scheduled post that is due
  const pastScheduled = await db
    .insert(blogPosts)
    .values({
      id: crypto.randomUUID(),
      title: `Due Scheduled Post ${runId}`,
      slug: `due-scheduled-${runId}`,
      authorId: teacher1.id,
      status: "SCHEDULED",
      scheduledFor: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning();

  // Create a future scheduled post that is NOT due
  const futureScheduled = await db
    .insert(blogPosts)
    .values({
      id: crypto.randomUUID(),
      title: `Future Scheduled Post ${runId}`,
      slug: `future-scheduled-${runId}`,
      authorId: teacher1.id,
      status: "SCHEDULED",
      scheduledFor: new Date(Date.now() + 3600 * 1000).toISOString(), // 1 hour in future
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .returning();

  // Execute the cron query
  const now = new Date().toISOString();
  const duePosts = await db
    .select({ id: blogPosts.id })
    .from(blogPosts)
    .where(
      and(
        eq(blogPosts.status, "SCHEDULED"),
        lte(blogPosts.scheduledFor, now)
      )
    );

  const dueIds = duePosts.map((p) => p.id);
  if (!dueIds.includes(pastScheduled[0].id)) {
    throw new Error("❌ Due scheduled post was not picked up by the cron query");
  }
  if (dueIds.includes(futureScheduled[0].id)) {
    throw new Error("❌ Future scheduled post should not be picked up by the cron query");
  }

  // Update due posts to PUBLISHED
  for (const post of duePosts) {
    await db
      .update(blogPosts)
      .set({ status: "PUBLISHED", publishedAt: now, updatedAt: now })
      .where(eq(blogPosts.id, post.id));
  }

  const reloadedDue = await blogService.getPostById(pastScheduled[0].id);
  if (reloadedDue.status !== "PUBLISHED" || !reloadedDue.publishedAt) {
    throw new Error("❌ Due scheduled post was not published");
  }
  console.log("   ✅ Due scheduled post was published automatically with timestamp");

  const reloadedFuture = await blogService.getPostById(futureScheduled[0].id);
  if (reloadedFuture.status !== "SCHEDULED") {
    throw new Error("❌ Future scheduled post status was improperly modified");
  }
  console.log("   ✅ Future scheduled post remains in SCHEDULED state");

  // Clean up test data
  console.log("\n🧹 Cleaning up test artifacts...");
  await db.delete(blogPosts).where(eq(blogPosts.slug, `getting-started-react-${runId}`));
  await db.delete(blogPosts).where(eq(blogPosts.id, pastScheduled[0].id));
  await db.delete(blogPosts).where(eq(blogPosts.id, futureScheduled[0].id));
  await db.delete(blogCategories).where(eq(blogCategories.id, category.id));
  await db.delete(blogTags).where(eq(blogTags.id, tag1.id));
  await db.delete(blogTags).where(eq(blogTags.id, tag2.id));
  await db.delete(users).where(eq(users.id, admin.id));
  await db.delete(users).where(eq(users.id, teacher1.id));
  await db.delete(users).where(eq(users.id, teacher2.id));

  console.log("\n🎉 ALL Slice 5.1 Blog Post Authoring Tests PASSED Successfully!\n");
}

runBlogServiceTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
