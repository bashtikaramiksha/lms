import { db } from "@/lib/db/client";
import { blogPosts, blogCategories, blogTags, blogPostTags, users } from "@/lib/db/schema";
import { eq, and, desc, sql, like, or, inArray } from "drizzle-orm";
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  CreateCategoryDto,
  CreateTagDto,
  AdminBlogQuery,
} from "@/lib/validations/blog.schema";

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string = "SLUG_CONFLICT") {
    super(message);
    this.name = "ConflictError";
  }
}

export class UnprocessableError extends Error {
  statusCode = 422;
  constructor(message: string = "SCHEDULED_FOR_PAST") {
    super(message);
    this.name = "UnprocessableError";
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string = "POST_NOT_FOUND") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string = "NOT_YOUR_POST") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class BlogService {
  /**
   * Create a new blog post
   */
  async createPost(dto: CreateBlogPostDto, authorId: string) {
    // 1. Check slug uniqueness
    const existing = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.slug, dto.slug),
    });
    if (existing) {
      throw new ConflictError("SLUG_CONFLICT");
    }

    // 2. Validate scheduledFor is future if scheduled
    if (dto.status === "SCHEDULED" && dto.scheduledFor) {
      const schedDate = new Date(dto.scheduledFor);
      if (isNaN(schedDate.getTime()) || schedDate.getTime() <= Date.now()) {
        throw new UnprocessableError("SCHEDULED_FOR_PAST");
      }
    }

    const now = new Date().toISOString();
    const postId = crypto.randomUUID();

    // 3. Insert post
    const [post] = await db
      .insert(blogPosts)
      .values({
        id: postId,
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt || null,
        content: dto.content || null,
        featuredImage: dto.featuredImage || null,
        categoryId: dto.categoryId || null,
        authorId,
        status: dto.status || "DRAFT",
        scheduledFor: dto.status === "SCHEDULED" ? dto.scheduledFor || null : null,
        seoTitle: dto.seoTitle || null,
        seoDesc: dto.seoDesc || null,
        ogImageUrl: dto.ogImageUrl || null,
        canonicalUrl: dto.canonicalUrl || null,
        publishedAt: dto.status === "PUBLISHED" ? now : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 4. Insert tag associations
    if (dto.tagIds && dto.tagIds.length > 0) {
      const tagRows = dto.tagIds.map((tagId) => ({
        postId: post.id,
        tagId,
      }));
      await db.insert(blogPostTags).values(tagRows);
    }

    return post;
  }

  /**
   * Update an existing blog post
   */
  async updatePost(postId: string, dto: UpdateBlogPostDto, requesterId: string, role: string) {
    const post = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.id, postId),
    });
    if (!post) {
      throw new NotFoundError("POST_NOT_FOUND");
    }

    // Teacher can only update their own posts, Admin can update any
    if (role !== "ADMIN" && post.authorId !== requesterId) {
      throw new ForbiddenError("NOT_YOUR_POST");
    }

    // Check slug conflict if slug was changed
    if (dto.slug && dto.slug !== post.slug) {
      const slugExisting = await db.query.blogPosts.findFirst({
        where: eq(blogPosts.slug, dto.slug),
      });
      if (slugExisting) {
        throw new ConflictError("SLUG_CONFLICT");
      }
    }

    // Validate scheduled date if changing to SCHEDULED
    if (dto.status === "SCHEDULED" && dto.scheduledFor) {
      const schedDate = new Date(dto.scheduledFor);
      if (isNaN(schedDate.getTime()) || schedDate.getTime() <= Date.now()) {
        throw new UnprocessableError("SCHEDULED_FOR_PAST");
      }
    }

    const now = new Date().toISOString();
    const patch: Partial<typeof blogPosts.$inferInsert> = {
      updatedAt: now,
    };

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.slug !== undefined) patch.slug = dto.slug;
    if (dto.excerpt !== undefined) patch.excerpt = dto.excerpt;
    if (dto.content !== undefined) patch.content = dto.content;
    if (dto.featuredImage !== undefined) patch.featuredImage = dto.featuredImage;
    if (dto.categoryId !== undefined) patch.categoryId = dto.categoryId;
    if (dto.seoTitle !== undefined) patch.seoTitle = dto.seoTitle;
    if (dto.seoDesc !== undefined) patch.seoDesc = dto.seoDesc;
    if (dto.ogImageUrl !== undefined) patch.ogImageUrl = dto.ogImageUrl;
    if (dto.canonicalUrl !== undefined) patch.canonicalUrl = dto.canonicalUrl;

    if (dto.status !== undefined) {
      patch.status = dto.status;
      if (dto.status === "PUBLISHED" && !post.publishedAt) {
        patch.publishedAt = now;
      }
      if (dto.status === "SCHEDULED") {
        patch.scheduledFor = dto.scheduledFor || null;
      } else {
        patch.scheduledFor = null;
      }
    }

    const [updatedPost] = await db
      .update(blogPosts)
      .set(patch)
      .where(eq(blogPosts.id, postId))
      .returning();

    // Replace tag associations if tagIds are provided
    if (dto.tagIds !== undefined) {
      await db.delete(blogPostTags).where(eq(blogPostTags.postId, postId));
      if (dto.tagIds.length > 0) {
        const tagRows = dto.tagIds.map((tagId) => ({
          postId,
          tagId,
        }));
        await db.insert(blogPostTags).values(tagRows);
      }
    }

    return updatedPost;
  }

  /**
   * Delete a blog post (Admin only)
   */
  async deletePost(postId: string, requesterId: string, role: string) {
    const post = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.id, postId),
    });
    if (!post) {
      throw new NotFoundError("POST_NOT_FOUND");
    }

    if (role !== "ADMIN") {
      throw new ForbiddenError("ADMIN_ONLY");
    }

    await db.delete(blogPosts).where(eq(blogPosts.id, postId));
    return { success: true };
  }

  /**
   * Get single blog post by ID with relations
   */
  async getPostById(postId: string) {
    const post = await db.query.blogPosts.findFirst({
      where: eq(blogPosts.id, postId),
      with: {
        category: true,
        author: {
          columns: {
            id: true,
            fullName: true,
            email: true,
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
      throw new NotFoundError("POST_NOT_FOUND");
    }

    return {
      ...post,
      tags: post.tags.map((t) => t.tag),
    };
  }

  /**
   * Admin list posts (paginated, filtered, search)
   */
  async getAdminPosts(query: AdminBlogQuery) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (query.status && query.status !== "ALL") {
      conditions.push(eq(blogPosts.status, query.status));
    }
    if (query.authorId) {
      conditions.push(eq(blogPosts.authorId, query.authorId));
    }
    if (query.categoryId) {
      conditions.push(eq(blogPosts.categoryId, query.categoryId));
    }
    if (query.search && query.search.trim() !== "") {
      const term = `%${query.search.trim()}%`;
      const searchCondition = or(
        like(blogPosts.title, term),
        like(blogPosts.slug, term),
        like(blogPosts.excerpt, term)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const items = await db.query.blogPosts.findMany({
      where: whereClause,
      orderBy: [desc(blogPosts.createdAt)],
      limit,
      offset,
      with: {
        category: true,
        author: {
          columns: {
            id: true,
            fullName: true,
            email: true,
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

    return {
      data: items.map((item) => ({
        ...item,
        tags: item.tags.map((t) => t.tag),
      })),
      meta: {
        total,
        page,
        limit,
        hasNext: offset + items.length < total,
      },
    };
  }

  /**
   * Teacher list posts (only their own posts)
   */
  async getTeacherPosts(
    teacherId: string,
    query: { page?: number; limit?: number; status?: string; search?: string }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [eq(blogPosts.authorId, teacherId)];

    if (query.status && query.status !== "ALL") {
      conditions.push(eq(blogPosts.status, query.status as any));
    }
    if (query.search && query.search.trim() !== "") {
      const term = `%${query.search.trim()}%`;
      const searchCondition = or(
        like(blogPosts.title, term),
        like(blogPosts.slug, term)
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(blogPosts)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const items = await db.query.blogPosts.findMany({
      where: whereClause,
      orderBy: [desc(blogPosts.createdAt)],
      limit,
      offset,
      with: {
        category: true,
        tags: {
          with: {
            tag: true,
          },
        },
      },
    });

    return {
      data: items.map((item) => ({
        ...item,
        tags: item.tags.map((t) => t.tag),
      })),
      meta: {
        total,
        page,
        limit,
        hasNext: offset + items.length < total,
      },
    };
  }

  /**
   * Categories
   */
  async getCategories() {
    const categories = await db.query.blogCategories.findMany({
      orderBy: [blogCategories.name],
      with: {
        posts: {
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
      createdAt: cat.createdAt,
      postCount: cat.posts.length,
    }));
  }

  async createCategory(dto: CreateCategoryDto) {
    const existing = await db.query.blogCategories.findFirst({
      where: eq(blogCategories.slug, dto.slug),
    });
    if (existing) {
      throw new ConflictError("CATEGORY_SLUG_CONFLICT");
    }

    const [category] = await db
      .insert(blogCategories)
      .values({
        id: crypto.randomUUID(),
        name: dto.name,
        slug: dto.slug,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return category;
  }

  /**
   * Tags
   */
  async getTags() {
    return await db.query.blogTags.findMany({
      orderBy: [blogTags.name],
    });
  }

  async createTag(dto: CreateTagDto) {
    const existing = await db.query.blogTags.findFirst({
      where: or(eq(blogTags.slug, dto.slug), eq(blogTags.name, dto.name)),
    });
    if (existing) {
      return existing;
    }

    const [tag] = await db
      .insert(blogTags)
      .values({
        id: crypto.randomUUID(),
        name: dto.name,
        slug: dto.slug,
      })
      .returning();

    return tag;
  }
}

export const blogService = new BlogService();
