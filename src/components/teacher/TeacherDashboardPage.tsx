"use client";

import React from "react";
import Link from "next/link";
import {
  PlusCircle,
  Video,
  DollarSign,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useTeacherStats } from "@/hooks/useTeacherStats";
import { StatsSummaryBar } from "./StatsSummaryBar";
import { CourseStatCard } from "./CourseStatCard";
import { RecentEnrollmentsList } from "./RecentEnrollmentsList";

export function TeacherDashboardPage() {
  const { data, isLoading, isError, error, refetch } = useTeacherStats();

  if (isLoading) {
    return <TeacherDashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h3 className="text-lg font-bold text-destructive">Failed to Load Teacher Dashboard</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          {(error as Error)?.message || "Failed to fetch instructor statistics."}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 inline-flex items-center gap-2"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try Again
        </button>
      </div>
    );
  }

  const { summary, courses, recentEnrollments } = data;

  return (
    <div className="space-y-10">
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Instructor Studio</h1>
          <p className="text-muted-foreground mt-1">
            Monitor student completion rates, revenue performance, and manage your curriculum.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/teacher/revenue"
            className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-bold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all shadow-sm"
          >
            <DollarSign className="h-4 w-4" />
            <span>Revenue Analytics</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            href="/teacher/courses/new"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Course</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Summary Bar */}
      <StatsSummaryBar summary={summary} />

      {/* Main Grid: Courses Grid + Recent Enrollments Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8 Cols: Course Cards */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Your Courses</h2>
            <span className="text-xs text-muted-foreground">
              {courses.length} course{courses.length !== 1 ? "s" : ""}
            </span>
          </div>

          {courses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center backdrop-blur-xl space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
                <Video className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">No Courses Created Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Get started by launching our course builder wizard and publishing your first curriculum.
              </p>
              <Link
                href="/teacher/courses/new"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md"
              >
                <PlusCircle className="h-4 w-4" /> Launch Wizard
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map((course) => (
                <CourseStatCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>

        {/* Right 4 Cols: Recent Enrollments Stream */}
        <div className="lg:col-span-4 space-y-6">
          <RecentEnrollmentsList enrollments={recentEnrollments} />
        </div>
      </div>
    </div>
  );
}

function TeacherDashboardSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="h-10 w-64 rounded-xl bg-white/5" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/5 border border-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-white/5 border border-white/5" />
          ))}
        </div>
        <div className="lg:col-span-4">
          <div className="h-72 rounded-2xl bg-white/5 border border-white/5" />
        </div>
      </div>
    </div>
  );
}
