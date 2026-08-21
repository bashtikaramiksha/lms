import { useQuery } from "@tanstack/react-query";
import {
  TeacherDashboardDto,
  TeacherRevenueDto,
  RevenuePeriod,
} from "@/lib/services/teacher-stats.service";

async function fetchTeacherStats(): Promise<TeacherDashboardDto> {
  const res = await fetch("/api/teacher/stats");
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || "Failed to fetch teacher statistics");
  }
  const json = await res.json();
  return json.data;
}

export function useTeacherStats() {
  return useQuery({
    queryKey: ["teacher-stats"],
    queryFn: fetchTeacherStats,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

async function fetchTeacherRevenue(
  period: RevenuePeriod,
  courseId?: string
): Promise<TeacherRevenueDto> {
  const params = new URLSearchParams();
  params.set("period", period);
  if (courseId) {
    params.set("courseId", courseId);
  }

  const res = await fetch(`/api/teacher/revenue?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || "Failed to fetch revenue analytics");
  }
  const json = await res.json();
  return json.data;
}

export function useTeacherRevenue(period: RevenuePeriod = "12m", courseId?: string) {
  return useQuery({
    queryKey: ["teacher-revenue", period, courseId],
    queryFn: () => fetchTeacherRevenue(period, courseId),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
