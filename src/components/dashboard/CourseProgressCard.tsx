"use client";

import React from "react";
import Link from "next/link";
import { PlayCircle, User, BookOpen, ChevronRight, ArrowUpRight } from "lucide-react";
import { InProgressCourseDto } from "@/lib/services/dashboard.service";

export interface CourseProgressCardProps {
  item: InProgressCourseDto;
}

export function CourseProgressCard({ item }: CourseProgressCardProps) {
  const { course, progressPercent, lastLesson } = item;

  const resumeHref = lastLesson?.id
    ? `/dashboard/my-courses/${course.id}/lessons/${lastLesson.id}`
    : `/courses/${course.slug}`;

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
      {/* Top Banner & Thumbnail */}
      <div>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 border border-white/5">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-blue-900/40 via-indigo-900/30 to-purple-900/40">
              <BookOpen className="h-10 w-10 text-white/30" />
            </div>
          )}

          {/* Progress Pill Tag */}
          <div className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-md border border-white/10">
            {progressPercent}% Complete
          </div>
        </div>

        {/* Course Info */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5 text-primary" />
            <span>{course.instructor?.fullName || "Instructor"}</span>
          </div>

          <h3 className="text-base font-semibold tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
            {course.title}
          </h3>

          {/* Last watched / Next up lesson */}
          {lastLesson && (
            <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] p-2 border border-white/5">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary">
                <PlayCircle className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  {item.lastWatchedAt ? "Resume Lesson" : "Up Next"}
                </p>
                <p className="text-xs font-medium text-foreground truncate">
                  {lastLesson.title}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar & CTA */}
      <div className="mt-5 space-y-3">
        {/* Animated Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Overall Progress</span>
            <span className="font-semibold text-foreground">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-primary transition-all duration-700 ease-out shadow-sm shadow-blue-500/50"
              style={{ width: `${Math.max(4, progressPercent)}%` }}
            />
          </div>
        </div>

        {/* Action Button */}
        <Link
          href={resumeHref}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <PlayCircle className="h-4 w-4" />
          <span>Resume Course</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
