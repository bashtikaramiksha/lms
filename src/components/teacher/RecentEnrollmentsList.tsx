"use client";

import React from "react";
import { UserCheck, BookOpen, Clock } from "lucide-react";
import { RecentEnrollmentDto } from "@/lib/services/teacher-stats.service";

export interface RecentEnrollmentsListProps {
  enrollments: RecentEnrollmentDto[];
}

export function RecentEnrollmentsList({ enrollments }: RecentEnrollmentsListProps) {
  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center backdrop-blur-xl">
        <p className="text-sm text-muted-foreground">No recent enrollments yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-xl space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <UserCheck className="h-4 w-4" />
        </div>
        <h3 className="text-base font-bold tracking-tight text-foreground">Recent Enrollments</h3>
      </div>

      <div className="divide-y divide-white/5">
        {enrollments.map((item) => {
          const dateStr = new Date(item.enrolledAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          return (
            <div key={item.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 font-bold text-white text-xs shadow-md shadow-blue-500/20">
                  {item.studentName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{item.studentName}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{item.courseTitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                <Clock className="h-3 w-3" />
                <span>{dateStr}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
