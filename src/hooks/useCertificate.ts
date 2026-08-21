"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CertificateStatusDto } from "@/lib/services/certificate.service";

async function fetchCertificateStatus(courseId: string): Promise<CertificateStatusDto> {
  const res = await fetch(`/api/courses/${courseId}/certificate`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || "Failed to fetch certificate status");
  }
  const json = await res.json();
  return json.data;
}

export function useCertificate(courseId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["course-certificate", courseId],
    queryFn: () => fetchCertificateStatus(courseId),
    enabled: Boolean(courseId),
    refetchInterval: (query) => {
      // Poll every 4 seconds if in PROCESSING status
      if (query.state.data?.status === "PROCESSING") {
        return 4000;
      }
      return false;
    },
  });

  const requestMutation = useMutation({
    mutationFn: async (): Promise<CertificateStatusDto> => {
      const res = await fetch(`/api/courses/${courseId}/certificate`, {
        method: "POST",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || "Failed to generate certificate");
      }
      const json = await res.json();
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-certificate", courseId] });
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
    },
  });

  return {
    ...query,
    requestCertificate: requestMutation.mutateAsync,
    isRequesting: requestMutation.isPending,
  };
}
