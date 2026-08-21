"use client";

import React from "react";
import Link from "next/link";
import { Users, DollarSign, Star, Edit, Video, TrendingUp } from "lucide-react";
import { TeacherCourseStatDto } from "@/lib/services/teacher-stats.service";

export interface CourseStatCardProps {
  course: TeacherCourseStatDto;
}

export function CourseStatCard({ course }: CourseStatCardProps) {
  const isPublished = course.status === "PUBLISHED";

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-primary/40 hover:shadow-xl">
      {/* Top Media & Status */}
      <div>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 border border-white/5">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-indigo-900/30 to-purple-900/30">
              <Video className="h-10 w-10 text-white/30" />
            </div>
          )}

          {/* Status Badge */}
          <span
            className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-md border ${
              isPublished
                ? "bg-emerald-500/80 text-white border-emerald-400/40"
                : "bg-amber-500/80 text-white border-amber-400/40"
            }`}
          >
            {course.status}
          </span>

          {/* Revenue Pill */}
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-emerald-400 backdrop-blur-md border border-white/10">
            <DollarSign className="h-3 w-3" />
            ₹{course.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}
          </span>
        </div>

        {/* Title & Ratings */}
        <div className="mt-4 space-y-1.5">
          <h3 className="text-base font-bold tracking-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {course.title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {course.rating > 0 ? (
              <div className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{course.rating.toFixed(1)}</span>
                <span className="text-muted-foreground font-normal">({course.reviewCount})</span>
              </div>
            ) : (
              <span>No reviews yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Metrics & Completion Bar */}
      <div className="mt-5 space-y-4 pt-4 border-t border-white/5">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-blue-400" /> Students
            </span>
            <p className="text-base font-bold mt-1 text-foreground">
              {course.enrolledStudents.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-white/[0.03] p-2.5 border border-white/5">
            <span className="text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-purple-400" /> Completion
            </span>
            <p className="text-base font-bold mt-1 text-foreground">
              {course.completionRate}%
            </p>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div>
          <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
            <span>Student Finish Rate</span>
            <span className="font-semibold text-foreground">{course.completionRate}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
              style={{ width: `${Math.max(3, course.completionRate)}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href={`/teacher/courses/${course.id}/edit`}
            className="flex items-center justify-center gap-1.5 w-full rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-foreground hover:bg-white/10 transition-all border border-white/10 active:scale-[0.98]"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Curriculum</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
