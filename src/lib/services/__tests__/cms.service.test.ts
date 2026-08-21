import { db } from "@/lib/db/client";
import { pages } from "@/lib/db/schema/pages";
import { cmsService, ConflictError, NotFoundError } from "@/lib/services/cms.service";
import { eq } from "drizzle-orm";
import { ContentBlock } from "@/types/cms.types";

async function runCmsServiceTests() {
  console.log("🧪 Starting Slice 5.3 CMS Page Builder Service & Block Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  const sampleBlocks: ContentBlock[] = [
    {
      id: "blk-1",
      type: "HERO",
      heading: `About Our Platform ${runId}`,
      subheading: "Empowering developers worldwide with cutting-edge tools.",
      ctaLabel: "Get Started",
      ctaHref: "/register",
      bgImageUrl: "https://images.unsplash.com/sample.jpg",
    },
    {
      id: "blk-2",
      type: "RICH_TEXT",
      content: "<p>Our mission is to build the highest quality courses.</p>",
    },
    {
      id: "blk-3",
      type: "FAQ",
      heading: "Questions & Answers",
      items: [
        {
          id: "faq-1",
          question: "Is this platform free?",
          answer: "We offer both free introductory content and premium masterclasses.",
        },
      ],
    },
    {
      id: "blk-4",
      type: "CTA_BANNER",
      heading: "Join our Community",
      subheading: "Start learning today",
      ctaLabel: "Sign Up Now",
      ctaHref: "/register",
      bgColor: "indigo",
    },
  ];

  // 1. Test createPage
  console.log("1️⃣ Testing CmsService.createPage...");
  const createdPage = await cmsService.createPage({
    title: `About Us ${runId}`,
    slug: `about-us-${runId}`,
    blocks: sampleBlocks,
    status: "PUBLISHED",
    inNav: true,
    navLabel: "About",
    seoTitle: `About Us — Platform ${runId}`,
    seoDesc: "Learn more about our educational mission and team.",
  });

  if (!createdPage || createdPage.slug !== `about-us-${runId}`) {
    throw new Error("❌ createPage failed to return created page record");
  }
  console.log("   ✅ Page successfully created with JSON blocks");

  // 1b. Test slug conflict on creation
  console.log("2️⃣ Testing slug uniqueness conflict handling...");
  let conflictCaught = false;
  try {
    await cmsService.createPage({
      title: "Duplicate Slug Page",
      slug: `about-us-${runId}`, // Duplicate slug
      blocks: [],
      status: "DRAFT",
    });
  } catch (err: any) {
    if (err instanceof ConflictError || err.message === "SLUG_CONFLICT") {
      conflictCaught = true;
    }
  }

  if (!conflictCaught) {
    throw new Error("❌ createPage failed to throw ConflictError on duplicate slug!");
  }
  console.log("   ✅ Duplicate slug conflict correctly rejected (409 Conflict)");

  // 2. Create a Draft page
  console.log("3️⃣ Creating a DRAFT static page...");
  const draftPage = await cmsService.createPage({
    title: `Terms of Service (Draft) ${runId}`,
    slug: `terms-draft-${runId}`,
    blocks: sampleBlocks,
    status: "DRAFT",
  });
  console.log("   ✅ DRAFT page created");

  // 3. Test getPublicPage
  console.log("4️⃣ Testing CmsService.getPublicPage...");

  // 3a. Published page retrieval
  const publicPage = await cmsService.getPublicPage(`about-us-${runId}`);
  if (!publicPage) {
    throw new Error("❌ getPublicPage failed to return published page");
  }
  if (publicPage.title !== `About Us ${runId}`) {
    throw new Error("❌ Page title mismatch in public response");
  }
  if (!Array.isArray(publicPage.blocks) || publicPage.blocks.length !== 4) {
    throw new Error(`❌ Expected 4 blocks in parsed array, got ${publicPage.blocks.length}`);
  }
  if (publicPage.blocks[0].type !== "HERO" || publicPage.blocks[2].type !== "FAQ") {
    throw new Error("❌ Block types were not correctly preserved or parsed");
  }
  if (publicPage.seo.seoTitle !== `About Us — Platform ${runId}`) {
    throw new Error("❌ SEO metadata mismatch");
  }
  console.log("   ✅ Public page returned with correctly parsed block components & SEO");

  // 3b. Draft page access (must return null)
  const draftAccess = await cmsService.getPublicPage(`terms-draft-${runId}`);
  if (draftAccess !== null) {
    throw new Error("❌ getPublicPage returned DRAFT page! Public access must only return PUBLISHED pages.");
  }
  console.log("   ✅ DRAFT page correctly blocked from public access (returns null / 404)");

  // 3c. Non-existent slug
  const missingAccess = await cmsService.getPublicPage("completely-non-existent-slug-12345");
  if (missingAccess !== null) {
    throw new Error("❌ getPublicPage returned non-null for non-existent slug");
  }
  console.log("   ✅ Non-existent slug returns null (404)");

  // 4. Test updatePage
  console.log("5️⃣ Testing CmsService.updatePage...");
  const updated = await cmsService.updatePage(createdPage.id, {
    title: `About Our Story ${runId}`,
    navLabel: "Our Story",
  });

  if (updated.title !== `About Our Story ${runId}` || updated.navLabel !== "Our Story") {
    throw new Error("❌ updatePage failed to update fields");
  }
  console.log("   ✅ updatePage successfully updated title and navLabel");

  // 5. Test getAdminPages
  console.log("6️⃣ Testing CmsService.getAdminPages...");
  const adminList = await cmsService.getAdminPages({ search: runId });
  if (adminList.data.length !== 2) {
    throw new Error(`❌ Expected 2 pages in admin list, got ${adminList.data.length}`);
  }
  console.log("   ✅ getAdminPages returned paginated and filtered list");

  // 6. Test getPublishedPageSlugs
  console.log("7️⃣ Testing CmsService.getPublishedPageSlugs...");
  const publishedSlugs = await cmsService.getPublishedPageSlugs();
  if (!publishedSlugs.includes(`about-us-${runId}`)) {
    throw new Error("❌ getPublishedPageSlugs missing published page slug");
  }
  if (publishedSlugs.includes(`terms-draft-${runId}`)) {
    throw new Error("❌ getPublishedPageSlugs included draft page slug!");
  }
  console.log("   ✅ getPublishedPageSlugs correctly returns only published slugs");

  // 7. Test deletePage
  console.log("8️⃣ Testing CmsService.deletePage...");
  await cmsService.deletePage(draftPage.id);

  let deleteNotFound = false;
  try {
    await cmsService.getPageById(draftPage.id);
  } catch (err: any) {
    if (err instanceof NotFoundError || err.message === "PAGE_NOT_FOUND") {
      deleteNotFound = true;
    }
  }

  if (!deleteNotFound) {
    throw new Error("❌ Page was not deleted!");
  }
  console.log("   ✅ Page deletion verified");

  // Cleanup
  console.log("\n🧹 Cleaning up test records...");
  await db.delete(pages).where(eq(pages.id, createdPage.id));

  console.log("\n🎉 ALL Slice 5.3 CMS Page Builder Tests PASSED Successfully!\n");
}

runCmsServiceTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
