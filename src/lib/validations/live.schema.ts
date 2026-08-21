import { z } from "zod";

export const createLiveSessionSchema = z
  .object({
    courseId: z.string().min(1, "Course ID is required"),
    lessonId: z.string().optional().nullable(),
    title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title must not exceed 200 characters"),
    scheduledAt: z.string().datetime({ message: "scheduledAt must be a valid ISO 8601 datetime" }),
    duration: z
      .number()
      .int("Duration must be an integer")
      .min(15, "Duration must be at least 15 minutes")
      .max(480, "Duration cannot exceed 480 minutes (8 hours)"),
    platform: z.enum(["ZOOM", "GOOGLE_MEET"], {
      required_error: "Platform is required (ZOOM or GOOGLE_MEET)",
    }),
  })
  .refine(
    (data) => {
      const scheduledTime = new Date(data.scheduledAt).getTime();
      const minTime = Date.now() + 55 * 60 * 1000; // allow a small buffer around 1 hour
      return scheduledTime >= minTime;
    },
    {
      message: "Session must be scheduled at least 1 hour in the future",
      path: ["scheduledAt"],
    }
  );

export const updateLiveSessionSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title must not exceed 200 characters").optional(),
    scheduledAt: z.string().datetime({ message: "scheduledAt must be a valid ISO 8601 datetime" }).optional(),
    duration: z
      .number()
      .int("Duration must be an integer")
      .min(15, "Duration must be at least 15 minutes")
      .max(480, "Duration cannot exceed 480 minutes")
      .optional(),
    recordingUrl: z.string().url("Must be a valid recording URL").nullable().optional(),
  })
  .refine(
    (data) => {
      if (!data.scheduledAt) return true;
      const scheduledTime = new Date(data.scheduledAt).getTime();
      const minRescheduleLead = Date.now() + 115 * 60 * 1000; // buffer around 2 hours
      return scheduledTime >= minRescheduleLead;
    },
    {
      message: "Cannot reschedule to a time within 2 hours of now",
      path: ["scheduledAt"],
    }
  );

export const addRecordingSchema = z.object({
  recordingUrl: z.string().url("Must be a valid URL for the recording"),
});

export const listLiveSessionsQuerySchema = z.object({
  status: z.enum(["SCHEDULED", "LIVE", "ENDED", "CANCELLED"]).optional(),
  courseId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateLiveSessionInput = z.infer<typeof createLiveSessionSchema>;
export type UpdateLiveSessionInput = z.infer<typeof updateLiveSessionSchema>;
export type AddRecordingInput = z.infer<typeof addRecordingSchema>;
export type ListLiveSessionsQuery = z.infer<typeof listLiveSessionsQuerySchema>;

export interface CreateLiveSessionDto {
  courseId: string;
  lessonId?: string | null;
  title: string;
  scheduledAt: string;
  duration: number;
  platform: "ZOOM" | "GOOGLE_MEET";
}

export interface UpdateLiveSessionDto {
  title?: string;
  scheduledAt?: string;
  duration?: number;
  recordingUrl?: string | null;
}

export interface LiveSessionResponseDto {
  id: string;
  courseId: string;
  lessonId: string | null;
  teacherId: string;
  title: string;
  scheduledAt: string;
  duration: number;
  platform: "ZOOM" | "GOOGLE_MEET";
  joinUrl: string | null;
  hostUrl: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
  recordingUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  course?: {
    id: string;
    title: string;
    slug?: string;
  };
  enrolledCount?: number;
}

export interface StudentUpcomingSessionDto {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  platform: "ZOOM" | "GOOGLE_MEET";
  status: "SCHEDULED" | "LIVE";
  course: {
    id: string;
    title: string;
    slug: string;
  };
  canJoin: boolean;
  joinOpenAt: string; // ISO 8601 (scheduledAt - 15m)
}

export interface StudentPastSessionDto {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  platform: "ZOOM" | "GOOGLE_MEET";
  status: "ENDED" | "CANCELLED";
  recordingUrl: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
  };
}

export interface JoinUrlResponseDto {
  joinUrl: string;
  platform: "ZOOM" | "GOOGLE_MEET";
  expiresAt: string;
}
