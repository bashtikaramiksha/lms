"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LessonDataResponseDto, ProgressResultDto } from "@/lib/services/progress.service";

async function fetchLessonData(courseId: string, lessonId: string): Promise<LessonDataResponseDto> {
  const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || "Failed to load lesson");
  }
  const json = await res.json();
  return json.data;
}

export function useLessonData(courseId: string, lessonId: string) {
  return useQuery({
    queryKey: ["lesson-data", courseId, lessonId],
    queryFn: () => fetchLessonData(courseId, lessonId),
    staleTime: 30 * 1000,
    enabled: Boolean(courseId && lessonId),
  });
}

export function useUpdateProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      lessonId,
      watchPercent,
    }: {
      courseId: string;
      lessonId: string;
      watchPercent: number;
    }): Promise<ProgressResultDto> => {
      const res = await fetch(`/api/lessons/${lessonId}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, watchPercent }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || "Failed to update watch progress");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (data, variables) => {
      if (data.justCompleted) {
        queryClient.invalidateQueries({ queryKey: ["lesson-data", variables.courseId] });
        queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
      }
    },
  });
}

export function useMarkLessonComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      lessonId,
    }: {
      courseId: string;
      lessonId: string;
    }): Promise<{ isCompleted: boolean; courseCompleted: boolean; justCompleted: boolean }> => {
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}/complete`, {
        method: "POST",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || "Failed to mark lesson complete");
      }

      const json = await res.json();
      return json.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lesson-data", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
    },
  });
}
