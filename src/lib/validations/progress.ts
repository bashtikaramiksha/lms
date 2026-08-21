import { z } from "zod";

export const updateProgressSchema = z.object({
  watchPercent: z.number().min(0).max(100),
  courseId: z.string().min(1),
});

export type UpdateProgressInput = z.infer<typeof updateProgressSchema>;
