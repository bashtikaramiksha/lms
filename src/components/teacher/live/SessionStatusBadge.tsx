"use client";

import React from "react";
import { Radio, Calendar, CheckCircle, Ban } from "lucide-react";

interface SessionStatusBadgeProps {
  status: "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED";
}

export const SessionStatusBadge: React.FC<SessionStatusBadgeProps> = ({ status }) => {
  switch (status) {
    case "LIVE":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-lg shadow-rose-500/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
          LIVE NOW
        </span>
      );

    case "SCHEDULED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 border border-blue-500/30 text-blue-400">
          <Calendar className="h-3 w-3" />
          Scheduled
        </span>
      );

    case "ENDED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
          <CheckCircle className="h-3 w-3" />
          Completed
        </span>
      );

    case "CANCELLED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/15 border border-zinc-500/30 text-zinc-400">
          <Ban className="h-3 w-3" />
          Cancelled
        </span>
      );

    default:
      return null;
  }
};
