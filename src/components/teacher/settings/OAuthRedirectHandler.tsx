"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

export const OAuthRedirectHandler: React.FC = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const zoom = searchParams.get("zoom");
    const google = searchParams.get("google");
    const error = searchParams.get("error");

    if (zoom === "connected") {
      setNotification({
        type: "success",
        message: "Zoom account connected successfully! You can now schedule Zoom live sessions.",
      });
      // Clean query params
      router.replace("/teacher/settings");
    } else if (google === "connected") {
      setNotification({
        type: "success",
        message: "Google Meet connected successfully! Google Calendar events will be created automatically.",
      });
      router.replace("/teacher/settings");
    } else if (error) {
      const errorMap: Record<string, string> = {
        zoom_denied: "Zoom connection request was cancelled or denied.",
        zoom_missing_code: "No authorization code returned from Zoom.",
        zoom_state_mismatch: "Security validation error: CSRF state mismatch during Zoom connection.",
        zoom_exchange_failed: "Failed to exchange authorization tokens with Zoom. Please try again.",
        google_denied: "Google Meet connection request was cancelled or denied.",
        google_missing_code: "No authorization code returned from Google.",
        google_state_mismatch: "Security validation error: CSRF state mismatch during Google connection.",
        google_exchange_failed: "Failed to exchange authorization tokens with Google. Please try again.",
      };

      setNotification({
        type: "error",
        message: errorMap[error] || `Connection failed: ${error}`,
      });
      router.replace("/teacher/settings");
    }
  }, [searchParams, router]);

  if (!notification) return null;

  return (
    <div
      className={`rounded-2xl p-4 border flex items-center justify-between gap-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300 ${
        notification.type === "success"
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
      }`}
    >
      <div className="flex items-center gap-3">
        {notification.type === "success" ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
        )}
        <span className="text-sm font-medium">{notification.message}</span>
      </div>
      <button
        onClick={() => setNotification(null)}
        className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
