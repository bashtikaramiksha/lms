"use client";

import React from "react";
import { CourseRevenueBreakdownDto } from "@/lib/services/teacher-stats.service";
import { PieChart, BookOpen } from "lucide-react";

export interface RevenueByCourseTableProps {
  courses: CourseRevenueBreakdownDto[];
}

export function RevenueByCourseTable({ courses }: RevenueByCourseTableProps) {
  if (!courses || courses.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center backdrop-blur-xl">
        <p className="text-sm text-muted-foreground">No course revenue data in this period.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <PieChart className="h-4 w-4" />
          </div>
          <h3 className="text-base font-bold tracking-tight text-foreground">Revenue by Course</h3>
        </div>
      </div>

      <div className="space-y-4">
        {courses.map((course) => (
          <div key={course.courseId} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground truncate max-w-[240px]">
                {course.title}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-muted-foreground">{course.orders} orders</span>
                <span className="font-bold text-emerald-400">
                  ₹{course.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-[11px] font-semibold text-muted-foreground w-10 text-right">
                  {course.percentage}%
                </span>
              </div>
            </div>

            {/* Mini Progress Bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                style={{ width: `${Math.max(2, course.percentage)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
