"use client";

import React from "react";
import { Calendar, Clock, Video, BookOpen } from "lucide-react";
import { StudentUpcomingSessionDto } from "@/lib/validations/live.schema";
import { SessionCountdown } from "./SessionCountdown";
import { JoinClassButton } from "./JoinClassButton";

interface UpcomingSessionCardProps {
  session: StudentUpcomingSessionDto;
}

export const UpcomingSessionCard: React.FC<UpcomingSessionCardProps> = ({ session }) => {
  const isLive = session.status === "LIVE";
  const formattedDate = new Date(session.scheduledAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl ${
        isLive
          ? "border-rose-500/50 shadow-rose-500/10 ring-1 ring-rose-500/30"
          : "border-border/60 hover:border-border"
      }`}
    >
      {/* Top Tag Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2.5 flex-wrap">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/10">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              LIVE NOW
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-400">
              <Calendar className="h-3 w-3" />
              Scheduled
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              session.platform === "ZOOM"
                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
          >
            <Video className="h-3 w-3" />
            {session.platform === "ZOOM" ? "Zoom" : "Google Meet"}
          </span>

          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <BookOpen className="h-3 w-3 text-indigo-400" />
            <span className="font-semibold text-foreground/90 truncate max-w-[200px]">
              {session.course.title}
            </span>
          </span>
        </div>

        {/* Live Ticking Countdown */}
        <SessionCountdown scheduledAt={session.scheduledAt} status={session.status} />
      </div>

      {/* Session Title & Time Details */}
      <div className="py-4 space-y-2">
        <h3 className="text-lg font-bold text-foreground tracking-tight leading-snug">
          {session.title}
        </h3>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-indigo-400" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-400" />
            <span>{session.duration} Minutes</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-border/40 flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground">
          Access opens 15 minutes before broadcast.
        </span>

        <JoinClassButton
          sessionId={session.id}
          scheduledAt={session.scheduledAt}
          duration={session.duration}
          status={session.status}
          canJoinInitial={session.canJoin}
        />
      </div>
    </div>
  );
};
