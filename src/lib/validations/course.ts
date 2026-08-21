import { z } from "zod";

export const createCourseSchema = z.object({
  title: z
    .string()
    .min(10, { message: "Title must be at least 10 characters" })
    .max(120, { message: "Title cannot exceed 120 characters" }),
  shortDesc: z
    .string()
    .max(200, { message: "Short description cannot exceed 200 characters" })
    .optional()
    .or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(["RECORDED", "LIVE"], {
    errorMap: () => ({ message: "Type must be either RECORDED or LIVE" }),
  }),
  level: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
    .optional()
    .nullable(),
  language: z.string().default("English"),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .min(0, { message: "Price must be at least 0" }),
  discountPrice: z
    .number()
    .positive({ message: "Discount price must be greater than 0" })
    .optional()
    .nullable(),
  accessDuration: z
    .number()
    .int()
    .positive({ message: "Access duration must be a positive integer in days" })
    .optional()
    .nullable(),
  categoryId: z.string().optional().nullable(),
  thumbnailUrl: z.string().url({ message: "Invalid thumbnail URL" }).optional().nullable().or(z.literal("")),
  previewUrl: z.string().url({ message: "Invalid preview video URL" }).optional().nullable().or(z.literal("")),
});

export const updateCourseSchema = createCourseSchema.partial();

export const thumbnailPresignSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"], {
    errorMap: () => ({ message: "Only JPEG, PNG, and WebP images are supported" }),
  }),
  sizeBytes: z
    .number()
    .int()
    .max(5 * 1024 * 1024, { message: "File size cannot exceed 5MB" }),
});

export const seoSchema = z.object({
  seoTitle: z
    .string()
    .min(10, { message: "SEO title must be at least 10 characters" })
    .max(70, { message: "SEO title cannot exceed 70 characters" })
    .optional()
    .nullable()
    .or(z.literal("")),
  seoDesc: z
    .string()
    .min(50, { message: "SEO description must be at least 50 characters" })
    .max(160, { message: "SEO description cannot exceed 160 characters" })
    .optional()
    .nullable()
    .or(z.literal("")),
  ogImageUrl: z
    .string()
    .url({ message: "Invalid Open Graph image URL" })
    .optional()
    .nullable()
    .or(z.literal("")),
});

export const listCoursesSchema = z.object({
  q: z.string().max(100).optional(),
  category: z.string().optional(),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
  type: z.enum(["RECORDED", "LIVE"]).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "popular"]).default("newest").optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(48).default(12).optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ThumbnailPresignInput = z.infer<typeof thumbnailPresignSchema>;
export type SeoInput = z.infer<typeof seoSchema>;
export type ListCoursesQuery = z.input<typeof listCoursesSchema>;

export interface CourseCard {
  id: string;
  title: string;
  slug: string;
  shortDesc: string | null;
  thumbnailUrl: string | null;
  price: number;
  discountPrice: number | null;
  type: "RECORDED" | "LIVE";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  category: { name: string; slug: string } | null;
  instructor: { id: string; fullName: string | null; avatarUrl: string | null } | null;
  enrollmentCount: number;
  lessonCount: number;
  totalDuration: number;
  createdAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total?: number;
    hasNext: boolean;
    nextCursor?: string;
  };
}

export interface CurriculumLessonDetail {
  id: string;
  title: string;
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "LIVE_SESSION";
  order: number;
  duration: number | null;
  isPreview: boolean | null;
  videoUrl: string | null; // Available if isPreview or user is enrolled
  content?: string | null;
}

export interface CurriculumModuleDetail {
  id: string;
  title: string;
  order: number;
  lessons: CurriculumLessonDetail[];
}

export interface InstructorDetail {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  courseCount: number;
  studentCount: number;
}

export interface CourseDetail {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  shortDesc: string | null;
  thumbnailUrl: string | null;
  previewUrl: string | null;
  type: "RECORDED" | "LIVE";
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  language: string;
  price: number;
  discountPrice: number | null;
  accessDuration: number | null;
  status: string;
  isEnrolled: boolean;
  enrollmentCount: number;
  lessonCount: number;
  totalDuration: number;
  avgRating: number;
  reviewCount: number;
  seoTitle: string | null;
  seoDesc: string | null;
  ogImageUrl: string | null;
  category: { name: string; slug: string } | null;
  instructor: InstructorDetail;
  curriculum: CurriculumModuleDetail[];
  createdAt: string;
  updatedAt: string;
}

export interface CourseReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  student: {
    id: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export interface PaginatedReviews {
  data: CourseReviewItem[];
  meta: {
    total?: number;
    hasNext: boolean;
    nextCursor?: string;
  };
}
