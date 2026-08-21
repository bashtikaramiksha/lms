"use client";

import React from "react";
import Link from "next/link";
import { Award, Download, CheckCircle, ExternalLink, BookOpen } from "lucide-react";
import { CompletedCourseDto } from "@/lib/services/dashboard.service";

export interface CompletedCourseCardProps {
  item: CompletedCourseDto;
}

export function CompletedCourseCard({ item }: CompletedCourseCardProps) {
  const { course, completedAt, certificateUrl } = item;

  const dateFormatted = completedAt
    ? new Date(completedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Completed";

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-amber-500/30">
      <div>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-900 border border-white/5">
          {course.thumbnailUrl ? (
            <img
              src={course.thumbnailUrl}
              alt={course.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-amber-900/30 via-orange-900/20 to-yellow-900/30">
              <BookOpen className="h-10 w-10 text-amber-400/40" />
            </div>
          )}

          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-xs font-bold text-white shadow-md backdrop-blur-md">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>100% Done</span>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <p className="text-xs text-muted-foreground">Finished on {dateFormatted}</p>
          <h3 className="text-base font-semibold tracking-tight text-foreground line-clamp-1 group-hover:text-amber-400 transition-colors">
            {course.title}
          </h3>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/5 space-y-2.5">
        {certificateUrl ? (
          <a
            href={certificateUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500 active:scale-[0.98]"
          >
            <Award className="h-4 w-4" />
            <span>Download Certificate</span>
            <Download className="h-3.5 w-3.5" />
          </a>
        ) : (
          <Link
            href={`/courses/${course.slug}`}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-white/15 transition-all"
          >
            <Award className="h-4 w-4 text-amber-400" />
            <span>View Certificate Status</span>
          </Link>
        )}

        <Link
          href={`/courses/${course.slug}`}
          className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Review Course Material</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
