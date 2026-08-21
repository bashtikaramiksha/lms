import { z } from "zod";

export const createPageSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title cannot exceed 200 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(200, "Slug cannot exceed 200 characters")
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase alphanumeric characters and hyphens"),
  blocks: z.array(z.any()).optional().default([]),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("DRAFT"),
  inNav: z.boolean().optional().default(false),
  navLabel: z.string().max(50, "Nav label cannot exceed 50 characters").optional().nullable(),
  seoTitle: z.string().max(60, "SEO title cannot exceed 60 characters").optional().nullable(),
  seoDesc: z.string().max(160, "SEO description cannot exceed 160 characters").optional().nullable(),
  ogImageUrl: z.string().url("Must be a valid URL").or(z.literal("")).optional().nullable(),
});

export const updatePageSchema = createPageSchema.partial();

export const adminPageQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  status: z.enum(["DRAFT", "PUBLISHED", "ALL"]).optional(),
  search: z.string().optional(),
});

export type CreatePageDto = z.input<typeof createPageSchema>;
export type UpdatePageDto = z.input<typeof updatePageSchema>;
export type AdminPageQuery = z.input<typeof adminPageQuerySchema>;
