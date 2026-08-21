import type { MetadataRoute } from "next";
import { db } from "@/lib/db/client";
import { courses } from "@/lib/db/schema/courses";
import { blogPosts } from "@/lib/db/schema/blog";
import { pages } from "@/lib/db/schema/pages";
import { eq } from "drizzle-orm";

export const revalidate = 3600; // Regenerate every 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://lms-platform.com";

  // Fetch all published content in parallel
  const [publishedCourses, publishedPosts, publishedPages] = await Promise.all([
    db
      .select({ slug: courses.slug, updatedAt: courses.updatedAt })
      .from(courses)
      .where(eq(courses.status, "PUBLISHED")),
    db
      .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
      .from(blogPosts)
      .where(eq(blogPosts.status, "PUBLISHED")),
    db
      .select({ slug: pages.slug, updatedAt: pages.updatedAt })
      .from(pages)
      .where(eq(pages.status, "PUBLISHED")),
  ]);

  const now = new Date();

  // 1. Static Root Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/courses`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // 2. Published Course Routes
  const courseRoutes: MetadataRoute.Sitemap = publishedCourses.map((c) => ({
    url: `${BASE_URL}/courses/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 3. Published Blog Post Routes
  const blogRoutes: MetadataRoute.Sitemap = publishedPosts.map((p) => ({
    url: `${BASE_URL}/blog/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  // 4. Published Static CMS Page Routes
  const pageRoutes: MetadataRoute.Sitemap = publishedPages.map((p) => ({
    url: `${BASE_URL}/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...courseRoutes, ...blogRoutes, ...pageRoutes];
}
