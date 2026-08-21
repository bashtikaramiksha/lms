"use client";

import React from "react";
import { Calendar, Clock, Video, BookOpen, PlaySquare, ExternalLink } from "lucide-react";
import { StudentPastSessionDto } from "@/lib/validations/live.schema";

interface PastSessionCardProps {
  session: StudentPastSessionDto;
}

export const PastSessionCard: React.FC<PastSessionCardProps> = ({ session }) => {
  const formattedDate = new Date(session.scheduledAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-border">
      {/* Top Tag Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            Recorded Session
          </span>

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

        <span className="text-xs text-muted-foreground">{formattedDate}</span>
      </div>

      {/* Title */}
      <div className="py-4 space-y-2">
        <h3 className="text-lg font-bold text-foreground tracking-tight leading-snug">
          {session.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-indigo-400" />
          <span>{session.duration} Minutes (Full Recording)</span>
        </div>
      </div>

      {/* Footer / Watch CTA */}
      <div className="pt-4 border-t border-border/40 flex items-center justify-between gap-3">
        <span className="text-[11px] text-muted-foreground">
          Watch replay anytime at your own pace.
        </span>

        {session.recordingUrl ? (
          <a
            href={session.recordingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition active:scale-95 whitespace-nowrap"
          >
            <PlaySquare className="h-3.5 w-3.5 fill-current" />
            Watch Recording <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
          </a>
        ) : (
          <span className="text-xs text-muted-foreground italic">
            Recording processing...
          </span>
        )}
      </div>
    </div>
  );
};
