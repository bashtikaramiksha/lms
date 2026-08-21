import { db } from "@/lib/db/client";
import { pages, Page } from "@/lib/db/schema/pages";
import { eq, and, desc, sql, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  CreatePageDto,
  UpdatePageDto,
  AdminPageQuery,
} from "@/lib/validations/cms.schema";
import { ContentBlock } from "@/types/cms.types";

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string = "SLUG_CONFLICT") {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string = "PAGE_NOT_FOUND") {
    super(message);
    this.name = "NotFoundError";
  }
}

export interface PublicPageDto {
  id: string;
  title: string;
  slug: string;
  blocks: ContentBlock[];
  status: "DRAFT" | "PUBLISHED";
  inNav: boolean | null;
  navLabel: string | null;
  seo: {
    seoTitle: string | null;
    seoDesc: string | null;
    ogImageUrl: string | null;
  };
  createdAt: string | null;
  updatedAt: string | null;
}

export class CmsService {
  /**
   * Create a new static CMS page
   */
  async createPage(dto: CreatePageDto) {
    const existing = await db.query.pages.findFirst({
      where: eq(pages.slug, dto.slug),
    });
    if (existing) {
      throw new ConflictError("SLUG_CONFLICT");
    }

    const now = new Date().toISOString();
    const pageId = crypto.randomUUID();

    const [page] = await db
      .insert(pages)
      .values({
        id: pageId,
        title: dto.title,
        slug: dto.slug,
        blocks: dto.blocks as any,
        status: dto.status || "DRAFT",
        inNav: dto.inNav || false,
        navLabel: dto.navLabel || null,
        seoTitle: dto.seoTitle || null,
        seoDesc: dto.seoDesc || null,
        ogImageUrl: dto.ogImageUrl || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return page;
  }

  /**
   * Update an existing static CMS page
   */
  async updatePage(pageId: string, dto: UpdatePageDto) {
    const page = await db.query.pages.findFirst({
      where: eq(pages.id, pageId),
    });
    if (!page) {
      throw new NotFoundError("PAGE_NOT_FOUND");
    }

    if (dto.slug && dto.slug !== page.slug) {
      const slugExisting = await db.query.pages.findFirst({
        where: eq(pages.slug, dto.slug),
      });
      if (slugExisting) {
        throw new ConflictError("SLUG_CONFLICT");
      }
    }

    const now = new Date().toISOString();
    const patch: Partial<typeof pages.$inferInsert> = {
      updatedAt: now,
    };

    if (dto.title !== undefined) patch.title = dto.title;
    if (dto.slug !== undefined) patch.slug = dto.slug;
    if (dto.blocks !== undefined) patch.blocks = dto.blocks as any;
    if (dto.status !== undefined) patch.status = dto.status;
    if (dto.inNav !== undefined) patch.inNav = dto.inNav;
    if (dto.navLabel !== undefined) patch.navLabel = dto.navLabel;
    if (dto.seoTitle !== undefined) patch.seoTitle = dto.seoTitle;
    if (dto.seoDesc !== undefined) patch.seoDesc = dto.seoDesc;
    if (dto.ogImageUrl !== undefined) patch.ogImageUrl = dto.ogImageUrl;

    const [updatedPage] = await db
      .update(pages)
      .set(patch)
      .where(eq(pages.id, pageId))
      .returning();

    // Trigger on-demand revalidation if published
    try {
      if (dto.status === "PUBLISHED" || page.status === "PUBLISHED") {
        revalidatePath(`/${updatedPage.slug}`);
      }
    } catch (e) {
      // revalidatePath might be called in non-request contexts like tests
    }

    return updatedPage;
  }

  /**
   * Delete a static CMS page
   */
  async deletePage(pageId: string) {
    const page = await db.query.pages.findFirst({
      where: eq(pages.id, pageId),
    });
    if (!page) {
      throw new NotFoundError("PAGE_NOT_FOUND");
    }

    await db.delete(pages).where(eq(pages.id, pageId));

    try {
      if (page.status === "PUBLISHED") {
        revalidatePath(`/${page.slug}`);
      }
    } catch (e) {
      // ignore
    }

    return { success: true };
  }

  /**
   * Get single page by ID with parsed blocks
   */
  async getPageById(pageId: string) {
    const page = await db.query.pages.findFirst({
      where: eq(pages.id, pageId),
    });
    if (!page) {
      throw new NotFoundError("PAGE_NOT_FOUND");
    }

    const parsedBlocks =
      typeof page.blocks === "string"
        ? JSON.parse(page.blocks)
        : Array.isArray(page.blocks)
        ? page.blocks
        : [];

    return {
      ...page,
      blocks: parsedBlocks as ContentBlock[],
    };
  }

  /**
   * Get public published page by slug
   */
  async getPublicPage(slug: string): Promise<PublicPageDto | null> {
    const page = await db.query.pages.findFirst({
      where: and(eq(pages.slug, slug), eq(pages.status, "PUBLISHED")),
    });

    if (!page) {
      return null;
    }

    const parsedBlocks =
      typeof page.blocks === "string"
        ? JSON.parse(page.blocks)
        : Array.isArray(page.blocks)
        ? page.blocks
        : [];

    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      blocks: parsedBlocks as ContentBlock[],
      status: page.status as "DRAFT" | "PUBLISHED",
      inNav: page.inNav,
      navLabel: page.navLabel,
      seo: {
        seoTitle: page.seoTitle,
        seoDesc: page.seoDesc,
        ogImageUrl: page.ogImageUrl,
      },
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  }

  /**
   * Admin list static pages (paginated, filtered, search)
   */
  async getAdminPages(query: AdminPageQuery = { page: 1, limit: 20 }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;

    const conditions: any[] = [];

    if (query.status && query.status !== "ALL") {
      conditions.push(eq(pages.status, query.status));
    }

    if (query.search && query.search.trim() !== "") {
      const term = `%${query.search.trim()}%`;
      const searchCond = or(
        like(pages.title, term),
        like(pages.slug, term),
        like(pages.navLabel, term)
      );
      if (searchCond) {
        conditions.push(searchCond);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(pages)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const items = await db.query.pages.findMany({
      where: whereClause,
      orderBy: [desc(pages.updatedAt)],
      limit,
      offset,
    });

    const parsedItems = items.map((p) => ({
      ...p,
      blocks:
        typeof p.blocks === "string"
          ? JSON.parse(p.blocks)
          : Array.isArray(p.blocks)
          ? p.blocks
          : [],
    }));

    return {
      data: parsedItems,
      meta: {
        total,
        page,
        limit,
        hasNext: offset + items.length < total,
      },
    };
  }

  /**
   * Get all published page slugs for generateStaticParams
   */
  async getPublishedPageSlugs(): Promise<string[]> {
    const published = await db
      .select({ slug: pages.slug })
      .from(pages)
      .where(eq(pages.status, "PUBLISHED"));

    return published.map((p) => p.slug);
  }
}

export const cmsService = new CmsService();
