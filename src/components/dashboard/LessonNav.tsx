"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CheckCircle2, Check } from "lucide-react";
import { LessonNavigationDto } from "@/lib/services/progress.service";

export interface LessonNavProps {
  courseId: string;
  navigation: LessonNavigationDto;
  isCompleted: boolean;
  onMarkComplete?: () => void;
  isMarkingComplete?: boolean;
}

export function LessonNav({
  courseId,
  navigation,
  isCompleted,
  onMarkComplete,
  isMarkingComplete = false,
}: LessonNavProps) {
  const { prevLesson, nextLesson } = navigation;

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
      {/* Previous Lesson Button */}
      {prevLesson ? (
        <Link
          href={`/dashboard/my-courses/${courseId}/lessons/${prevLesson.id}`}
          className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-white/10 transition-all active:scale-[0.98] border border-white/10"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous:</span>
          <span className="max-w-[140px] truncate">{prevLesson.title}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] px-4 py-2.5 text-xs font-medium text-muted-foreground border border-white/5 opacity-50 cursor-not-allowed">
          <ChevronLeft className="h-4 w-4" />
          <span>Previous</span>
        </div>
      )}

      {/* Center Action: Mark as Completed */}
      <div>
        {isCompleted ? (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20 shadow-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>Lesson Completed</span>
          </div>
        ) : (
          <button
            onClick={onMarkComplete}
            disabled={isMarkingComplete}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{isMarkingComplete ? "Saving..." : "Mark as Complete"}</span>
          </button>
        )}
      </div>

      {/* Next Lesson Button */}
      {nextLesson ? (
        <Link
          href={`/dashboard/my-courses/${courseId}/lessons/${nextLesson.id}`}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
        >
          <span className="hidden sm:inline">Next:</span>
          <span className="max-w-[140px] truncate">{nextLesson.title}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] px-4 py-2.5 text-xs font-medium text-muted-foreground border border-white/5 opacity-50 cursor-not-allowed">
          <span>End of Course</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
