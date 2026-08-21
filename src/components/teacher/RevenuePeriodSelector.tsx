"use client";

import React from "react";
import { Calendar, Filter } from "lucide-react";
import { RevenuePeriod } from "@/lib/services/teacher-stats.service";

export interface RevenuePeriodSelectorProps {
  period: RevenuePeriod;
  onPeriodChange: (period: RevenuePeriod) => void;
  courses?: Array<{ id: string; title: string }>;
  selectedCourseId?: string;
  onCourseChange?: (courseId?: string) => void;
}

export function RevenuePeriodSelector({
  period,
  onPeriodChange,
  courses = [],
  selectedCourseId,
  onCourseChange,
}: RevenuePeriodSelectorProps) {
  const periods: Array<{ id: RevenuePeriod; label: string }> = [
    { id: "7d", label: "Last 7 Days" },
    { id: "30d", label: "Last 30 Days" },
    { id: "90d", label: "Last 90 Days" },
    { id: "12m", label: "Last 12 Months" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl">
      {/* Period Toggles */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
        {periods.map((p) => {
          const isActive = period === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onPeriodChange(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Course Filter Dropdown */}
      {courses.length > 0 && onCourseChange && (
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={selectedCourseId || ""}
            onChange={(e) => onCourseChange(e.target.value || undefined)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="" className="bg-slate-900 text-white">
              All Courses
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                {c.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
