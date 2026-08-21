"use client";

import React, { useState, useEffect } from "react";
import { Video, Calendar, Clock, ExternalLink, Lock } from "lucide-react";
import { UpcomingLiveSessionDto } from "@/lib/services/dashboard.service";

export interface LiveSessionTileProps {
  session: UpcomingLiveSessionDto;
}

export function LiveSessionTile({ session }: LiveSessionTileProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isLiveOrStarting, setIsLiveOrStarting] = useState<boolean>(false);

  useEffect(() => {
    function calculateTime() {
      const scheduledMs = new Date(session.scheduledAt).getTime();
      const nowMs = Date.now();
      const diffMs = scheduledMs - nowMs;

      if (diffMs <= 0) {
        setIsLiveOrStarting(true);
        setTimeLeft("LIVE NOW");
      } else if (diffMs <= 15 * 60 * 1000) {
        setIsLiveOrStarting(true);
        const mins = Math.ceil(diffMs / (60 * 1000));
        setTimeLeft(`Starts in ${mins}m`);
      } else if (diffMs < 24 * 60 * 60 * 1000) {
        const hours = Math.floor(diffMs / (60 * 60 * 1000));
        const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
        setTimeLeft(`In ${hours}h ${mins}m`);
      } else {
        const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        setTimeLeft(`In ${days} day${days > 1 ? "s" : ""}`);
      }
    }

    calculateTime();
    const timer = setInterval(calculateTime, 30_000);
    return () => clearInterval(timer);
  }, [session.scheduledAt]);

  const dateFormatted = new Date(session.scheduledAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const timeFormatted = new Date(session.scheduledAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const isZoom = session.platform === "ZOOM";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-5 backdrop-blur-xl transition-all duration-300 hover:border-white/20">
      <div>
        <div className="flex items-center justify-between gap-2">
          {/* Platform Badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isZoom
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            <Video className="h-3 w-3" />
            {isZoom ? "Zoom Live" : "Google Meet"}
          </span>

          {/* Countdown / Live Indicator */}
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              isLiveOrStarting
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                : "bg-white/5 text-muted-foreground border-white/10"
            }`}
          >
            {timeLeft || "Upcoming"}
          </span>
        </div>

        {/* Course & Session Info */}
        <div className="mt-3 space-y-1">
          <p className="text-xs font-medium text-primary line-clamp-1">{session.courseTitle}</p>
          <h4 className="text-sm font-bold tracking-tight text-foreground line-clamp-2">
            {session.title}
          </h4>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>{dateFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {timeFormatted} ({session.duration}m)
            </span>
          </div>
        </div>

        {session.joinUrl ? (
          <a
            href={session.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-[0.98]"
          >
            <Video className="h-4 w-4" />
            <span>Join Live Room</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 w-full rounded-xl bg-white/5 px-4 py-2.5 text-xs font-medium text-muted-foreground border border-white/5 cursor-not-allowed">
            <Lock className="h-3.5 w-3.5" />
            <span>Link unlocks 15m prior</span>
          </div>
        )}
      </div>
    </div>
  );
}
