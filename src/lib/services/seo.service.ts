import { db } from "@/lib/db/client";
import { courses } from "@/lib/db/schema/courses";
import { blogPosts } from "@/lib/db/schema/blog";
import { pages } from "@/lib/db/schema/pages";
import { eq, sql } from "drizzle-orm";

export class SeoService {
  /**
   * Generates schema.org Course JSON-LD structured data
   */
  generateCourseJsonLd(course: any, siteUrl: string) {
    const jsonLd: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": "Course",
      name: course.title,
      description: course.description || course.shortDesc || "",
      url: `${siteUrl}/courses/${course.slug}`,
      image: course.thumbnailUrl || undefined,
      provider: {
        "@type": "Organization",
        name: "LMS Platform",
        url: siteUrl,
      },
      instructor: {
        "@type": "Person",
        name: course.instructor?.fullName || "LMS Educator",
      },
      offers: {
        "@type": "Offer",
        price: course.discountPrice !== null && course.discountPrice !== undefined ? course.discountPrice : course.price,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
    };

    if (course.reviewCount && course.reviewCount > 0) {
      jsonLd.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Number(course.avgRating || 5),
        ratingCount: Number(course.reviewCount),
      };
    }

    return jsonLd;
  }

  /**
   * Generates schema.org BlogPosting JSON-LD structured data
   */
  generateBlogPostingJsonLd(post: any, siteUrl: string) {
    const headline = post.seo?.seoTitle || post.seoTitle || post.title;
    const description = post.seo?.seoDesc || post.seoDesc || post.excerpt || "";
    const image = post.seo?.ogImageUrl || post.ogImageUrl || post.featuredImage || undefined;

    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline,
      description,
      image,
      datePublished: post.publishedAt,
      dateModified: post.updatedAt || post.publishedAt,
      author: {
        "@type": "Person",
        name: post.author?.fullName || "LMS Educator",
        url: post.author?.id ? `${siteUrl}/instructors/${post.author.id}` : undefined,
      },
      publisher: {
        "@type": "Organization",
        name: "LMS Platform",
        logo: {
          "@type": "ImageObject",
          url: `${siteUrl}/brand/logo.png`,
        },
      },
      mainEntityOfPage: {
        "@type": "@id",
        "@id": `${siteUrl}/blog/${post.slug}`,
      },
    };
  }

  /**
   * Returns count of published content across courses, blog, and CMS pages
   */
  async getSitemapStats(): Promise<{ courses: number; blogPosts: number; pages: number }> {
    const [c, b, p] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(courses).where(eq(courses.status, "PUBLISHED")),
      db.select({ count: sql<number>`count(*)` }).from(blogPosts).where(eq(blogPosts.status, "PUBLISHED")),
      db.select({ count: sql<number>`count(*)` }).from(pages).where(eq(pages.status, "PUBLISHED")),
    ]);

    return {
      courses: Number(c[0]?.count || 0),
      blogPosts: Number(b[0]?.count || 0),
      pages: Number(p[0]?.count || 0),
    };
  }
}

export const seoService = new SeoService();
