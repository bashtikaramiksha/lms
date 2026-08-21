import { z } from "zod";

export const createModuleSchema = z.object({
  title: z
    .string()
    .min(2, { message: "Module title must be at least 2 characters" })
    .max(120, { message: "Module title cannot exceed 120 characters" }),
});

export const updateModuleSchema = z.object({
  title: z
    .string()
    .min(2, { message: "Module title must be at least 2 characters" })
    .max(120, { message: "Module title cannot exceed 120 characters" }),
});

export const reorderSchema = z.object({
  orderedIds: z
    .array(z.string().min(1))
    .min(1, { message: "At least one ID is required for reordering" }),
});

export const createLessonSchema = z.object({
  title: z
    .string()
    .min(2, { message: "Lesson title must be at least 2 characters" })
    .max(120, { message: "Lesson title cannot exceed 120 characters" }),
  type: z.enum(["VIDEO", "ARTICLE", "QUIZ", "LIVE_SESSION"], {
    errorMap: () => ({ message: "Type must be VIDEO, ARTICLE, QUIZ, or LIVE_SESSION" }),
  }),
  isPreview: z.boolean().default(false).optional(),
});

export const updateLessonSchema = z.object({
  title: z
    .string()
    .min(2, { message: "Lesson title must be at least 2 characters" })
    .max(120, { message: "Lesson title cannot exceed 120 characters" })
    .optional(),
  content: z.string().optional().nullable(),
  videoUrl: z
    .string()
    .url({ message: "Invalid video URL" })
    .optional()
    .nullable()
    .or(z.literal("")),
  duration: z
    .number()
    .int()
    .positive({ message: "Duration must be a positive integer in seconds" })
    .optional()
    .nullable(),
  isPreview: z.boolean().optional(),
});

export const videoPresignSchema = z.object({
  lessonId: z.string().optional().nullable(),
  filename: z.string().min(1).max(255),
  mimeType: z.enum(["video/mp4", "video/webm"], {
    errorMap: () => ({ message: "Only MP4 and WebM video formats are supported" }),
  }),
  sizeBytes: z
    .number()
    .int()
    .max(2 * 1024 * 1024 * 1024, { message: "Video file cannot exceed 2GB" }),
});

export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type VideoPresignInput = z.infer<typeof videoPresignSchema>;
