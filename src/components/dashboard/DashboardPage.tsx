"use client";

import React from "react";
import Link from "next/link";
import {
  BookOpen,
  GraduationCap,
  Clock,
  Award,
  PlayCircle,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useStudentDashboard } from "@/hooks/useDashboard";
import { ContinueLearningSection } from "./ContinueLearningSection";
import { UpcomingSessionsSection } from "./UpcomingSessionsSection";
import { CompletedCoursesSection } from "./CompletedCoursesSection";

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useStudentDashboard();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-8 text-center max-w-xl mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h3 className="text-lg font-bold text-destructive">Failed to Load Dashboard</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          {(error as Error)?.message || "Something went wrong while fetching your learning progress."}
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

  const { inProgress = [], upcomingLiveSessions = [], completed = [], stats } = data || {};
  const hasEnrollments = inProgress.length > 0 || completed.length > 0;

  return (
    <div className="space-y-10">
      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Enrolled Courses
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight">
            {stats?.enrolledCount ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Total active enrollments</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-indigo-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              In Progress
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight">
            {stats?.inProgressCount ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Actively learning</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-violet-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Hours Learned
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight">
            {stats?.hoursLearned ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Study time completed</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Certificates
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight">
            {stats?.completedCount ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Earned upon completion</p>
        </div>
      </div>

      {/* Main Sections */}
      {hasEnrollments ? (
        <div className="space-y-10">
          {/* Continue Learning */}
          <ContinueLearningSection inProgress={inProgress} />

          {/* Upcoming Live Sessions */}
          <UpcomingSessionsSection sessions={upcomingLiveSessions} />

          {/* Completed Courses */}
          <CompletedCoursesSection completed={completed} />
        </div>
      ) : (
        /* Empty State */
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent p-12 text-center backdrop-blur-2xl">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 text-primary border border-primary/20 shadow-lg shadow-primary/10">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h3 className="text-2xl font-bold tracking-tight">Your Learning Journey Starts Here</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
            You haven't enrolled in any courses yet. Explore our curated catalog of interactive courses, live workshops, and expert instructors.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98]"
            >
              <PlayCircle className="h-4 w-4" />
              <span>Explore Course Catalog</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/5 border border-white/5" />
        ))}
      </div>

      {/* Cards Skeleton */}
      <div className="space-y-4">
        <div className="h-6 w-48 rounded-lg bg-white/10" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 rounded-2xl bg-white/5 border border-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}
