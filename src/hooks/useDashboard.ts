import { useQuery } from "@tanstack/react-query";
import { StudentDashboardDto } from "@/lib/services/dashboard.service";

async function fetchStudentDashboard(): Promise<StudentDashboardDto> {
  const res = await fetch("/api/users/me/dashboard");
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || "Failed to fetch student dashboard");
  }
  const json = await res.json();
  return json.data;
}

export function useStudentDashboard() {
  return useQuery({
    queryKey: ["student-dashboard"],
    queryFn: fetchStudentDashboard,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
