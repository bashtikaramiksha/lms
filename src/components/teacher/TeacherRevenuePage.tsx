"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  DollarSign,
  Receipt,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import { useTeacherRevenue, useTeacherStats } from "@/hooks/useTeacherStats";
import { RevenuePeriod } from "@/lib/services/teacher-stats.service";
import { RevenuePeriodSelector } from "./RevenuePeriodSelector";
import { RevenueLineChart } from "./RevenueLineChart";
import { RevenueByCourseTable } from "./RevenueByCourseTable";
import { RecentOrdersTable } from "./RecentOrdersTable";

export function TeacherRevenuePage() {
  const [period, setPeriod] = useState<RevenuePeriod>("12m");
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);

  const { data: statsData } = useTeacherStats();
  const { data: revenueData, isLoading, isError, error, refetch } = useTeacherRevenue(
    period,
    selectedCourseId
  );

  const teacherCourses = (statsData?.courses || []).map((c) => ({
    id: c.id,
    title: c.title,
  }));

  if (isLoading) {
    return <TeacherRevenueSkeleton />;
  }

  if (isError || !revenueData) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-8 text-center max-w-lg mx-auto my-12">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
        <h3 className="text-lg font-bold text-destructive">Failed to Load Revenue Analytics</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          {(error as Error)?.message || "Failed to load revenue performance data."}
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

  const { totalRevenue, periodRevenue, periodOrders, chart, byCourse, recentOrders } =
    revenueData;

  return (
    <div className="space-y-8">
      {/* Header & Back Action */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all border border-white/10"
            title="Back to Studio Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Revenue Analytics
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Financial breakdown, sales trends, and transaction history.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <RevenuePeriodSelector
        period={period}
        onPeriodChange={setPeriod}
        courses={teacherCourses}
        selectedCourseId={selectedCourseId}
        onCourseChange={setSelectedCourseId}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Period Revenue
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight text-emerald-400">
            ₹{periodRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">In selected timeframe</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Period Orders
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight">
            {periodOrders.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Completed purchases</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Lifetime Total
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold mt-3 tracking-tight">
            ₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">All-time course earnings</p>
        </div>
      </div>

      {/* Chart Section */}
      <RevenueLineChart data={chart} />

      {/* Course Breakdown Table & Recent Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-6 space-y-6">
          <RevenueByCourseTable courses={byCourse} />
        </div>
        <div className="lg:col-span-6 space-y-6">
          <RecentOrdersTable orders={recentOrders} />
        </div>
      </div>
    </div>
  );
}

function TeacherRevenueSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-10 w-64 rounded-xl bg-white/5" />
      <div className="h-16 w-full rounded-2xl bg-white/5" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white/5 border border-white/5" />
        ))}
      </div>
      <div className="h-[300px] rounded-2xl bg-white/5" />
    </div>
  );
}
