"use client";

import React from "react";
import { Users, DollarSign, BookOpen, CheckCircle, Percent } from "lucide-react";

export interface StatsSummaryBarProps {
  summary: {
    totalStudents: number;
    totalRevenue: number;
    totalCourses: number;
    publishedCourses: number;
    avgCompletionRate: number;
  };
}

export function StatsSummaryBar({ summary }: StatsSummaryBarProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {/* Total Students */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Total Students
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <p className="text-3xl font-extrabold mt-3 tracking-tight">
          {summary.totalStudents.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Unique enrolled learners</p>
      </div>

      {/* Total Revenue */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Lifetime Revenue
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <p className="text-3xl font-extrabold mt-3 tracking-tight text-emerald-400">
          ₹{summary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">From course sales</p>
      </div>

      {/* Courses Published */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/30 hover:shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Courses Created
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <BookOpen className="h-4 w-4" />
          </div>
        </div>
        <p className="text-3xl font-extrabold mt-3 tracking-tight">
          {summary.publishedCourses} / {summary.totalCourses}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Published / Total courses</p>
      </div>

      {/* Avg Completion Rate */}
      <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Avg Completion
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Percent className="h-4 w-4" />
          </div>
        </div>
        <p className="text-3xl font-extrabold mt-3 tracking-tight">
          {summary.avgCompletionRate}%
        </p>
        <p className="text-xs text-muted-foreground mt-1">Student course finish rate</p>
      </div>
    </div>
  );
}
