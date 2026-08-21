import { db } from "@/lib/db/client";
import {
  blogPosts,
  blogCategories,
  blogTags,
  blogPostTags,
  users,
} from "@/lib/db/schema";
import { eq, and, desc, sql, like, or, ne, inArray } from "drizzle-orm";

export interface PublicBlogQuery {
  page?: number;
  limit?: number;
  category?: string; // category slug
  tag?: string; // tag slug
  search?: string;
}

export interface PublicPostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  author: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface RelatedPostItem {
  id: string;
  title: string;
  slug: string;
  featuredImage: string | null;
  publishedAt: string | null;
  category: {
    name: string;
    slug: string;
  } | null;
}

export interface PublicPostDetail {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  excerpt: string | null;
  featuredImage: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  author: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
    bio?: string | null;
  } | null;
  tags: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  seo: {
    seoTitle: string | null;
    seoDesc: string | null;
    ogImageUrl: string | null;
    canonicalUrl: string | null;
  };
  relatedPosts: RelatedPostItem[];
}

export class BlogPublicService {
  /**
   * Get public listing of published blog posts with filtering & pagination
   */
  async getPosts(query: PublicBlogQuery = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 12));
    const offset = (page - 1) * limit;

    let targetCategoryId: string | undefined = undefined;
    if (query.category) {
      const cat = await db.query.blogCategories.findFirst({
        where: eq(blogCategories.slug, query.category),
      });
      if (!cat) {
        // Category slug doesn't exist, return empty
        return {
          data: [],
          meta: { total: 0, page, limit, hasNext: false },
        };
      }
      targetCategoryId = cat.id;
    }

    let postIdsFromTag: string[] | undefined = undefined;
    if (query.tag) {
      const tagObj = await db.query.blogTags.findFirst({
        where: eq(blogTags.slug, query.tag),
      });
      if (!tagObj) {
        return {
          data: [],
          meta: { total: 0, page, limit, hasNext: false },
        };
      }
      const joins = await db
        .select({ postId: blogPostTags.postId })
        .from(blogPostTags)
        .where(eq(blogPostTags.tagId, tagObj.id));

      postIdsFromTag = joins.map((j) => j.postId);
      if (postIdsFromTag.length === 0) {
        return {
          data: [],
          meta: { total: 0, page, limit, hasNext: false },
        };
      }
    }

    const conditions: any[] = [eq(blogPosts.status, "PUBLISHED")];

    if (targetCategoryId) {
      conditions.push(eq(blogPosts.categoryId, targetCategoryId));
    }

    if (postIdsFromTag) {
      conditions.push(inArray(blogPosts.id, postIdsFromTag));
    }

    if (query.search && query.search.trim() !== "") {
      const term = `%${query.search.trim()}%`;
      const searchCond = or(
        like(blogPosts.title, term),
        like(blogPosts.excerpt, term),
        like(blogPosts.slug, term)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const posts = await db.query.blogPosts.findMany({
      where: whereClause,
      orderBy: [desc(blogPosts.publishedAt)],
      limit,
      offset,
      with: {
        category: true,
        author: {
          columns: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });

    const data: PublicPostListItem[] = posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      category: post.category
        ? {
            id: post.category.id,
            name: post.category.name,
            slug: post.category.slug,
          }
        : null,
      author: post.author,
      tags: post.tags.map((t) => t.tag),
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        hasNext: offset + posts.length < total,
      },
    };
  }

  /**
   * Get single published post by slug with author, tags, and related posts
   */
  async getPostBySlug(slug: string): Promise<PublicPostDetail | null> {
    const post = await db.query.blogPosts.findFirst({
      where: and(eq(blogPosts.slug, slug), eq(blogPosts.status, "PUBLISHED")),
      with: {
        category: true,
        author: {
          columns: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });

    if (!post) {
      return null;
    }

    // Query related posts from the same category
    let relatedPosts: RelatedPostItem[] = [];
    if (post.categoryId) {
      const related = await db.query.blogPosts.findMany({
        where: and(
          eq(blogPosts.status, "PUBLISHED"),
          eq(blogPosts.categoryId, post.categoryId),
          ne(blogPosts.id, post.id)
        ),
        orderBy: [desc(blogPosts.publishedAt)],
        limit: 3,
        with: {
          category: {
            columns: {
              name: true,
              slug: true,
            },
          },
        },
      });

      relatedPosts = related.map((r) => ({
        id: r.id,
        title: r.title,
        slug: r.slug,
        featuredImage: r.featuredImage,
        publishedAt: r.publishedAt,
        category: r.category,
      }));
    }

    // Fallback if not enough related posts from same category: get latest published posts
    if (relatedPosts.length < 3) {
      const remainingCount = 3 - relatedPosts.length;
      const excludeIds = [post.id, ...relatedPosts.map((r) => r.id)];
      const fallbackPosts = await db.query.blogPosts.findMany({
        where: and(
          eq(blogPosts.status, "PUBLISHED"),
          notInArraySafe(blogPosts.id, excludeIds)
        ),
        orderBy: [desc(blogPosts.publishedAt)],
        limit: remainingCount,
        with: {
          category: {
            columns: {
              name: true,
              slug: true,
            },
          },
        },
      });

      relatedPosts = [
        ...relatedPosts,
        ...fallbackPosts.map((r) => ({
          id: r.id,
          title: r.title,
          slug: r.slug,
          featuredImage: r.featuredImage,
          publishedAt: r.publishedAt,
          category: r.category,
        })),
      ];
    }

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      featuredImage: post.featuredImage,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      category: post.category
        ? {
            id: post.category.id,
            name: post.category.name,
            slug: post.category.slug,
          }
        : null,
      author: post.author,
      tags: post.tags.map((t) => t.tag),
      seo: {
        seoTitle: post.seoTitle,
        seoDesc: post.seoDesc,
        ogImageUrl: post.ogImageUrl,
        canonicalUrl: post.canonicalUrl,
      },
      relatedPosts,
    };
  }

  /**
   * Get top 50 published slugs for generateStaticParams
   */
  async getPublishedSlugs(): Promise<string[]> {
    const posts = await db
      .select({ slug: blogPosts.slug })
      .from(blogPosts)
      .where(eq(blogPosts.status, "PUBLISHED"))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(50);

    return posts.map((p) => p.slug);
  }

  /**
   * Get all categories with count of published posts
   */
  async getCategories() {
    const categories = await db.query.blogCategories.findMany({
      orderBy: [blogCategories.name],
      with: {
        posts: {
          where: eq(blogPosts.status, "PUBLISHED"),
          columns: {
            id: true,
          },
        },
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      postCount: cat.posts.length,
    }));
  }

  /**
   * Get all tags
   */
  async getTags() {
    return await db.query.blogTags.findMany({
      orderBy: [blogTags.name],
    });
  }
}

function notInArraySafe(column: any, values: string[]) {
  if (values.length === 0) return undefined;
  return sql`${column} NOT IN (${sql.join(
    values.map((v) => sql`${v}`),
    sql`, `
  )})`;
}

export const blogPublicService = new BlogPublicService();
