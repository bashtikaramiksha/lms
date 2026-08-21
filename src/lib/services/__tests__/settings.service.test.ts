import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema/settings";
import { pages } from "@/lib/db/schema/pages";
import { settingsService } from "@/lib/services/settings.service";
import { cmsService } from "@/lib/services/cms.service";
import { eq } from "drizzle-orm";

async function runSettingsServiceTests() {
  console.log("🧪 Starting Slice 5.4 Global Site Settings Service Tests...\n");

  const runId = Math.random().toString(36).substring(7);

  // 1. Test getAll defaults and deserialization
  console.log("1️⃣ Testing SettingsService.getAll...");
  const initialSettings = await settingsService.getAll();

  if (!initialSettings.siteName || typeof initialSettings.siteName !== "string") {
    throw new Error("❌ siteName missing from initial settings");
  }
  if (!initialSettings.announcement || typeof initialSettings.announcement.active !== "boolean") {
    throw new Error("❌ announcement structure missing or invalid");
  }
  if (!initialSettings.social || typeof initialSettings.social !== "object") {
    throw new Error("❌ social structure missing or invalid");
  }
  console.log(`   ✅ Default settings retrieved successfully (siteName: "${initialSettings.siteName}")`);

  // 2. Test update settings
  console.log("2️⃣ Testing SettingsService.update with branding, SEO, social & announcement...");
  const updatePayload = {
    siteName: `LMS Cloud Platform ${runId}`,
    logoUrl: `https://cdn.example.com/logo_${runId}.png`,
    faviconUrl: `https://cdn.example.com/favicon_${runId}.ico`,
    footerText: `© 2026 LMS Cloud Platform ${runId}. All rights reserved.`,
    seoDefaultTitle: `LMS Cloud Platform — Cloud Architecture ${runId}`,
    seoDefaultDesc: "Master high-scale cloud distributed systems with expert educators.",
    seoOgImage: `https://cdn.example.com/og_${runId}.jpg`,
    social: {
      twitter: `https://twitter.com/lms_${runId}`,
      linkedin: `https://linkedin.com/company/lms_${runId}`,
      youtube: `https://youtube.com/@lms_${runId}`,
      instagram: `https://instagram.com/lms_${runId}`,
    },
    announcement: {
      text: `🎉 Exclusive Launch: 50% discount on all courses with code LAUNCH_${runId}!`,
      active: true,
    },
  };

  const updatedKeys = await settingsService.update(updatePayload);

  if (!updatedKeys.includes("site_name") || !updatedKeys.includes("announcement_text")) {
    throw new Error("❌ update failed to return updated keys array");
  }
  console.log(`   ✅ Successfully updated ${updatedKeys.length} settings keys`);

  // 3. Verify updated settings retrieval
  console.log("3️⃣ Verifying retrieved settings match updated values...");
  const updatedSettings = await settingsService.getAll();

  if (updatedSettings.siteName !== `LMS Cloud Platform ${runId}`) {
    throw new Error("❌ siteName was not updated");
  }
  if (updatedSettings.logoUrl !== `https://cdn.example.com/logo_${runId}.png`) {
    throw new Error("❌ logoUrl was not updated");
  }
  if (updatedSettings.social.twitter !== `https://twitter.com/lms_${runId}`) {
    throw new Error("❌ social twitter link was not updated");
  }
  if (updatedSettings.social.youtube !== `https://youtube.com/@lms_${runId}`) {
    throw new Error("❌ social youtube link was not updated");
  }
  if (!updatedSettings.announcement.active) {
    throw new Error("❌ announcement.active flag was not updated to true");
  }
  if (
    updatedSettings.announcement.text !==
    `🎉 Exclusive Launch: 50% discount on all courses with code LAUNCH_${runId}!`
  ) {
    throw new Error("❌ announcement.text was not updated");
  }
  console.log("   ✅ All updated settings fields verified with exact values");

  // 4. Test dynamic navPages resolution from CMS pages
  console.log("4️⃣ Testing dynamic navPages resolution from published inNav pages...");

  // Create a published page with inNav = true
  const navPage1 = await cmsService.createPage({
    title: `About Us ${runId}`,
    slug: `about-nav-${runId}`,
    blocks: [],
    status: "PUBLISHED",
    inNav: true,
    navLabel: `About Us ${runId}`,
  });

  // Create a draft page with inNav = true (should NOT be returned)
  const navDraftPage = await cmsService.createPage({
    title: `Hidden Draft ${runId}`,
    slug: `hidden-draft-${runId}`,
    blocks: [],
    status: "DRAFT",
    inNav: true,
    navLabel: `Hidden Draft ${runId}`,
  });

  const settingsWithNav = await settingsService.getAll();
  const navSlugs = settingsWithNav.navPages.map((n) => n.slug);

  if (!navSlugs.includes(navPage1.slug)) {
    throw new Error("❌ navPages failed to include published inNav page");
  }
  if (navSlugs.includes(navDraftPage.slug)) {
    throw new Error("❌ navPages included draft page! Only published pages allowed in nav.");
  }
  console.log("   ✅ navPages correctly computed and restricted to published inNav pages");

  // Cleanup
  console.log("\n🧹 Cleaning up test records...");
  await db.delete(pages).where(eq(pages.id, navPage1.id));
  await db.delete(pages).where(eq(pages.id, navDraftPage.id));

  console.log("\n🎉 ALL Slice 5.4 Global Site Settings Tests PASSED Successfully!\n");
}

runSettingsServiceTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Test suite failed:", err);
    process.exit(1);
  });
