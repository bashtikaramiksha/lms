"use client";

import React from "react";
import { Award } from "lucide-react";
import { CompletedCourseDto } from "@/lib/services/dashboard.service";
import { CompletedCourseCard } from "./CompletedCourseCard";

export interface CompletedCoursesSectionProps {
  completed: CompletedCourseDto[];
}

export function CompletedCoursesSection({ completed }: CompletedCoursesSectionProps) {
  if (!completed || completed.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Award className="h-4 w-4" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Completed Courses</h2>
        <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20">
          {completed.length} earned
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {completed.map((item) => (
          <CompletedCourseCard key={item.enrollmentId} item={item} />
        ))}
      </div>
    </section>
  );
}
