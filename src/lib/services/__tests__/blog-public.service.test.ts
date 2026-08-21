import { db } from "@/lib/db/client";
import { users, blogPosts, blogCategories, blogTags, blogPostTags } from "@/lib/db/schema";
import { blogPublicService } from "@/lib/services/blog-public.service";
import { blogService } from "@/lib/services/blog.service";
import { eq } from "drizzle-orm";

async function runBlogPublicServiceTests() {
  console.log("🧪 Starting Slice 5.2 Public Blog Listing & Post Detail Verification Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  // 1. Setup Test Author
  console.log("1️⃣ Setting up author and categories...");
  const [author] = await db
    .insert(users)
    .values({
      email: `author_pub_${runId}@example.com`,
      passwordHash: "dummyhash",
      fullName: "Jane Doe",
      role: "TEACHER",
    })
    .returning();

  const categoryA = await blogService.createCategory({
    name: `Category A ${runId}`,
    slug: `category-a-${runId}`,
  });

  const categoryB = await blogService.createCategory({
    name: `Category B ${runId}`,
    slug: `category-b-${runId}`,
  });

  const tagReact = await blogService.createTag({
    name: `React ${runId}`,
    slug: `react-${runId}`,
  });

  const tagTypeScript = await blogService.createTag({
    name: `TypeScript ${runId}`,
    slug: `typescript-${runId}`,
  });

  console.log("   ✅ Author, categories, and tags created");

  // 2. Create posts with various statuses (PUBLISHED, DRAFT, SCHEDULED)
  console.log("2️⃣ Creating posts with mixed statuses...");

  // Post 1: Published in Category A with Tag React
  const post1 = await blogService.createPost(
    {
      title: `React Fundamentals ${runId}`,
      slug: `react-fundamentals-${runId}`,
      excerpt: "Learn the basics of React",
      content: "<p>React is a UI library...</p>",
      categoryId: categoryA.id,
      tagIds: [tagReact.id],
      status: "PUBLISHED",
      seoTitle: `React Fundamentals Guide ${runId}`,
      seoDesc: "Complete guide to React fundamentals",
    },
    author.id
  );

  // Post 2: Published in Category A with Tag TypeScript
  const post2 = await blogService.createPost(
    {
      title: `Advanced React Hooks ${runId}`,
      slug: `advanced-react-hooks-${runId}`,
      excerpt: "Deep dive into custom hooks",
      content: "<p>Custom hooks allow code reuse...</p>",
      categoryId: categoryA.id,
      tagIds: [tagReact.id, tagTypeScript.id],
      status: "PUBLISHED",
    },
    author.id
  );

  // Post 3: Published in Category B with Tag TypeScript
  const post3 = await blogService.createPost(
    {
      title: `TypeScript Generics ${runId}`,
      slug: `typescript-generics-${runId}`,
      excerpt: "Mastering TypeScript generics",
      content: "<p>Generics provide flexible types...</p>",
      categoryId: categoryB.id,
      tagIds: [tagTypeScript.id],
      status: "PUBLISHED",
    },
    author.id
  );

  // Post 4: DRAFT in Category A (should NOT be publicly returned)
  const draftPost = await blogService.createPost(
    {
      title: `Unpublished Draft ${runId}`,
      slug: `unpublished-draft-${runId}`,
      excerpt: "Secret draft post",
      content: "<p>Secret draft content</p>",
      categoryId: categoryA.id,
      status: "DRAFT",
    },
    author.id
  );

  // Post 5: SCHEDULED in Category A (should NOT be publicly returned)
  const scheduledPost = await blogService.createPost(
    {
      title: `Scheduled Future Post ${runId}`,
      slug: `scheduled-future-${runId}`,
      excerpt: "Coming soon post",
      categoryId: categoryA.id,
      status: "SCHEDULED",
      scheduledFor: new Date(Date.now() + 86400 * 1000).toISOString(),
    },
    author.id
  );

  console.log("   ✅ 3 Published, 1 Draft, 1 Scheduled posts created");

  // 3. Test getPosts filtering
  console.log("3️⃣ Testing BlogPublicService.getPosts...");

  // 3a. Only published posts returned
  const allPubResult = await blogPublicService.getPosts({
    search: runId,
  });

  const returnedSlugs = allPubResult.data.map((p) => p.slug);
  if (
    !returnedSlugs.includes(post1.slug) ||
    !returnedSlugs.includes(post2.slug) ||
    !returnedSlugs.includes(post3.slug)
  ) {
    throw new Error("❌ getPosts failed to return all published posts");
  }
  if (returnedSlugs.includes(draftPost.slug)) {
    throw new Error("❌ getPosts returned DRAFT post! Only PUBLISHED posts allowed.");
  }
  if (returnedSlugs.includes(scheduledPost.slug)) {
    throw new Error("❌ getPosts returned SCHEDULED post! Only PUBLISHED posts allowed.");
  }
  console.log("   ✅ Only PUBLISHED posts are returned (never DRAFT or SCHEDULED)");

  // 3b. Category filter
  const catAResult = await blogPublicService.getPosts({
    category: `category-a-${runId}`,
    search: runId,
  });
  if (catAResult.data.length !== 2) {
    throw new Error(`❌ Expected 2 posts in Category A, got ${catAResult.data.length}`);
  }
  const catASlugs = catAResult.data.map((p) => p.slug);
  if (!catASlugs.includes(post1.slug) || !catASlugs.includes(post2.slug)) {
    throw new Error("❌ Category A filter returned incorrect posts");
  }
  console.log("   ✅ Category filter correctly restricts returned posts");

  // 3c. Tag filter
  const tagResult = await blogPublicService.getPosts({
    tag: `typescript-${runId}`,
    search: runId,
  });
  const tagSlugs = tagResult.data.map((p) => p.slug);
  if (!tagSlugs.includes(post2.slug) || !tagSlugs.includes(post3.slug)) {
    throw new Error("❌ Tag filter failed to find TypeScript posts");
  }
  if (tagSlugs.includes(post1.slug)) {
    throw new Error("❌ Tag filter included post without TypeScript tag");
  }
  console.log("   ✅ Tag filter correctly restricts returned posts");

  // 3d. Title search
  const searchResult = await blogPublicService.getPosts({
    search: `Hooks ${runId}`,
  });
  if (searchResult.data.length !== 1 || searchResult.data[0].slug !== post2.slug) {
    throw new Error("❌ Title search failed to return matching post");
  }
  console.log("   ✅ Title search correctly matches query");

  // 3e. Pagination
  const pageResult = await blogPublicService.getPosts({
    limit: 1,
    page: 1,
    search: runId,
  });
  if (pageResult.data.length !== 1 || !pageResult.meta.hasNext) {
    throw new Error("❌ Pagination meta total / hasNext calculation failed");
  }
  console.log("   ✅ Pagination metadata computed correctly");

  // 4. Test getPostBySlug
  console.log("4️⃣ Testing BlogPublicService.getPostBySlug...");

  // 4a. Non-existent slug returns null
  const nonExistent = await blogPublicService.getPostBySlug("random-non-existent-slug-xyz");
  if (nonExistent !== null) {
    throw new Error("❌ Non-existent slug must return null");
  }
  console.log("   ✅ Non-existent slug returns null (404)");

  // 4b. Draft slug returns null
  const draftBySlug = await blogPublicService.getPostBySlug(draftPost.slug);
  if (draftBySlug !== null) {
    throw new Error("❌ DRAFT post must return null when requested by slug");
  }
  console.log("   ✅ DRAFT post slug returns null (404)");

  // 4c. Scheduled slug returns null
  const scheduledBySlug = await blogPublicService.getPostBySlug(scheduledPost.slug);
  if (scheduledBySlug !== null) {
    throw new Error("❌ SCHEDULED post must return null when requested by slug");
  }
  console.log("   ✅ SCHEDULED post slug returns null (404)");

  // 4d. Full post retrieval with author, category, tags, and related posts
  const post1Detail = await blogPublicService.getPostBySlug(post1.slug);
  if (!post1Detail) {
    throw new Error("❌ Failed to fetch published post by slug");
  }
  if (post1Detail.title !== `React Fundamentals ${runId}`) {
    throw new Error("❌ Post title mismatch");
  }
  if (!post1Detail.author?.fullName || post1Detail.author.fullName !== "Jane Doe") {
    throw new Error("❌ Author information missing in post detail");
  }
  if (!post1Detail.category || post1Detail.category.id !== categoryA.id) {
    throw new Error("❌ Category information missing in post detail");
  }
  if (post1Detail.tags.length !== 1 || post1Detail.tags[0].id !== tagReact.id) {
    throw new Error("❌ Tags missing or incorrect in post detail");
  }
  if (!post1Detail.relatedPosts.some((r) => r.id === post2.id)) {
    throw new Error("❌ Related posts must include post2 from the same category");
  }
  if (post1Detail.relatedPosts.some((r) => r.id === post1.id)) {
    throw new Error("❌ Related posts must NOT include the current post");
  }
  console.log("   ✅ Full post detail returns author, category, tags, and related posts");

  // 5. Test getPublishedSlugs
  console.log("5️⃣ Testing BlogPublicService.getPublishedSlugs...");
  const slugs = await blogPublicService.getPublishedSlugs();
  if (!slugs.includes(post1.slug) || !slugs.includes(post2.slug) || !slugs.includes(post3.slug)) {
    throw new Error("❌ getPublishedSlugs failed to return published slugs");
  }
  if (slugs.includes(draftPost.slug) || slugs.includes(scheduledPost.slug)) {
    throw new Error("❌ getPublishedSlugs returned draft or scheduled slug");
  }
  console.log("   ✅ getPublishedSlugs correctly returns only published slugs");

  // 6. Test getCategories
  console.log("6️⃣ Testing BlogPublicService.getCategories...");
  const cats = await blogPublicService.getCategories();
  const catAObj = cats.find((c) => c.id === categoryA.id);
  if (!catAObj || catAObj.postCount !== 2) {
    throw new Error(`❌ Expected Category A to have postCount=2, got ${catAObj?.postCount}`);
  }
  console.log("   ✅ getCategories computes published post counts accurately");

  // Cleanup
  console.log("\n🧹 Cleaning up test artifacts...");
  await db.delete(blogPosts).where(eq(blogPosts.id, post1.id));
  await db.delete(blogPosts).where(eq(blogPosts.id, post2.id));
  await db.delete(blogPosts).where(eq(blogPosts.id, post3.id));
  await db.delete(blogPosts).where(eq(blogPosts.id, draftPost.id));
  await db.delete(blogPosts).where(eq(blogPosts.id, scheduledPost.id));
  await db.delete(blogCategories).where(eq(blogCategories.id, categoryA.id));
  await db.delete(blogCategories).where(eq(blogCategories.id, categoryB.id));
  await db.delete(blogTags).where(eq(blogTags.id, tagReact.id));
  await db.delete(blogTags).where(eq(blogTags.id, tagTypeScript.id));
  await db.delete(users).where(eq(users.id, author.id));

  console.log("\n🎉 ALL Slice 5.2 Public Blog Listing & Detail Tests PASSED Successfully!\n");
}

runBlogPublicServiceTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
