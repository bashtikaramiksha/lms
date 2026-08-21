"use client";

import React, { useState, useEffect } from "react";
import { Video, Play, ExternalLink, Loader2, Lock } from "lucide-react";

interface JoinClassButtonProps {
  sessionId: string;
  scheduledAt: string;
  duration: number;
  status: "SCHEDULED" | "LIVE";
  canJoinInitial?: boolean;
}

export const JoinClassButton: React.FC<JoinClassButtonProps> = ({
  sessionId,
  scheduledAt,
  duration,
  status,
  canJoinInitial = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkWindowOpen = () => {
    const now = Date.now();
    const scheduledTime = new Date(scheduledAt).getTime();
    const windowOpen = scheduledTime - 15 * 60 * 1000;
    const windowClose = scheduledTime + (duration + 15) * 60 * 1000;
    return status === "LIVE" || (now >= windowOpen && now <= windowClose);
  };

  const [isOpen, setIsOpen] = useState(canJoinInitial || checkWindowOpen());

  // Auto-refresh state every 15 seconds to unlock without page reload
  useEffect(() => {
    const updateStatus = () => {
      setIsOpen(checkWindowOpen());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 15000);
    return () => clearInterval(interval);
  }, [scheduledAt, duration, status]);

  const handleJoin = async () => {
    setError(null);
    try {
      setLoading(true);
      const res = await fetch(`/api/live/sessions/${sessionId}/join`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to join live session");
      }

      if (json.data?.joinUrl) {
        window.open(json.data.joinUrl, "_blank");
      }
    } catch (err: any) {
      console.error("Join error:", err);
      setError(err.message || "Unable to join class");
    } finally {
      setLoading(false);
    }
  };

  const windowOpenTime = new Date(new Date(scheduledAt).getTime() - 15 * 60 * 1000).toLocaleTimeString(
    "en-US",
    { hour: "numeric", minute: "2-digit" }
  );

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={!isOpen || loading}
        onClick={handleJoin}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
          status === "LIVE"
            ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse"
            : isOpen
            ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/20"
            : "bg-muted/40 text-muted-foreground border border-border/50 cursor-not-allowed opacity-70"
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Connecting...
          </>
        ) : status === "LIVE" ? (
          <>
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            Join Live Class <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
          </>
        ) : isOpen ? (
          <>
            <Play className="h-3.5 w-3.5 fill-current" />
            Join Class <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
          </>
        ) : (
          <>
            <Lock className="h-3.5 w-3.5" />
            Opens at {windowOpenTime}
          </>
        )}
      </button>

      {error && <span className="text-[11px] text-rose-400 font-medium">{error}</span>}
    </div>
  );
};
