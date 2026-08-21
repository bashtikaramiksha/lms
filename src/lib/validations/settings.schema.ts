import { z } from "zod";

export const updateSettingsSchema = z.object({
  siteName: z.string().min(1, "Site name is required").max(100).optional(),
  logoUrl: z.string().url("Must be a valid URL").or(z.literal("")).nullable().optional(),
  faviconUrl: z.string().url("Must be a valid URL").or(z.literal("")).nullable().optional(),
  seoDefaultTitle: z.string().max(60, "SEO title cannot exceed 60 characters").optional(),
  seoDefaultDesc: z.string().max(160, "SEO description cannot exceed 160 characters").optional(),
  seoOgImage: z.string().url("Must be a valid URL").or(z.literal("")).nullable().optional(),
  footerText: z.string().max(300, "Footer text cannot exceed 300 characters").optional(),
  social: z
    .object({
      twitter: z.string().url("Must be a valid URL").or(z.literal("")).nullable().optional(),
      linkedin: z.string().url("Must be a valid URL").or(z.literal("")).nullable().optional(),
      youtube: z.string().url("Must be a valid URL").or(z.literal("")).nullable().optional(),
      instagram: z.string().url("Must be a valid URL").or(z.literal("")).nullable().optional(),
    })
    .optional(),
  announcement: z
    .object({
      text: z.string().max(200, "Announcement text cannot exceed 200 characters").optional().default(""),
      active: z.boolean().optional().default(false),
    })
    .optional(),
});

export type UpdateSettingsDto = z.infer<typeof updateSettingsSchema>;
