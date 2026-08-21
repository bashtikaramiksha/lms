"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { InProgressCourseDto } from "@/lib/services/dashboard.service";
import { CourseProgressCard } from "./CourseProgressCard";

export interface ContinueLearningSectionProps {
  inProgress: InProgressCourseDto[];
}

export function ContinueLearningSection({ inProgress }: ContinueLearningSectionProps) {
  if (!inProgress || inProgress.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Continue Learning</h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary border border-primary/20">
            {inProgress.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {inProgress.map((item) => (
          <CourseProgressCard key={item.enrollmentId} item={item} />
        ))}
      </div>
    </section>
  );
}
