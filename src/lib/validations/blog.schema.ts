import { z } from "zod";

export const createBlogPostSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title cannot exceed 200 characters"),
    slug: z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(200, "Slug cannot exceed 200 characters")
      .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase alphanumeric characters and hyphens"),
    excerpt: z.string().max(500, "Excerpt cannot exceed 500 characters").optional().nullable(),
    content: z.string().optional().nullable(),
    featuredImage: z.string().url("Must be a valid URL").or(z.literal("")).optional().nullable(),
    categoryId: z.string().optional().nullable(),
    tagIds: z.array(z.string()).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).default("DRAFT"),
    scheduledFor: z.string().optional().nullable(),
    seoTitle: z.string().max(60, "SEO title cannot exceed 60 characters").optional().nullable(),
    seoDesc: z.string().max(160, "SEO description cannot exceed 160 characters").optional().nullable(),
    ogImageUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional().nullable(),
    canonicalUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.status === "SCHEDULED") {
        if (!data.scheduledFor) return false;
        const schedDate = new Date(data.scheduledFor);
        return !isNaN(schedDate.getTime()) && schedDate.getTime() > Date.now();
      }
      return true;
    },
    {
      message: "Scheduled date must be in the future when status is SCHEDULED",
      path: ["scheduledFor"],
    }
  );

export const updateBlogPostSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title cannot exceed 200 characters").optional(),
    slug: z
      .string()
      .min(3, "Slug must be at least 3 characters")
      .max(200, "Slug cannot exceed 200 characters")
      .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase alphanumeric characters and hyphens")
      .optional(),
    excerpt: z.string().max(500, "Excerpt cannot exceed 500 characters").optional().nullable(),
    content: z.string().optional().nullable(),
    featuredImage: z.string().url("Must be a valid URL").or(z.literal("")).optional().nullable(),
    categoryId: z.string().optional().nullable(),
    tagIds: z.array(z.string()).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED"]).optional(),
    scheduledFor: z.string().optional().nullable(),
    seoTitle: z.string().max(60, "SEO title cannot exceed 60 characters").optional().nullable(),
    seoDesc: z.string().max(160, "SEO description cannot exceed 160 characters").optional().nullable(),
    ogImageUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional().nullable(),
    canonicalUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.status === "SCHEDULED") {
        if (!data.scheduledFor) return false;
        const schedDate = new Date(data.scheduledFor);
        return !isNaN(schedDate.getTime()) && schedDate.getTime() > Date.now();
      }
      return true;
    },
    {
      message: "Scheduled date must be in the future when status is SCHEDULED",
      path: ["scheduledFor"],
    }
  );

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(100, "Slug cannot exceed 100 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase alphanumeric characters and hyphens"),
});

export const createTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name cannot exceed 50 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50, "Slug cannot exceed 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase alphanumeric characters and hyphens"),
});

export const adminBlogQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ALL"]).optional(),
  authorId: z.string().optional(),
  categoryId: z.string().optional(),
  search: z.string().optional(),
});

export type CreateBlogPostDto = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostDto = z.infer<typeof updateBlogPostSchema>;
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
export type CreateTagDto = z.infer<typeof createTagSchema>;
export type AdminBlogQuery = z.infer<typeof adminBlogQuerySchema>;
