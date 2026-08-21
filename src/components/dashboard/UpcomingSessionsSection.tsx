"use client";

import React from "react";
import { Radio } from "lucide-react";
import { UpcomingLiveSessionDto } from "@/lib/services/dashboard.service";
import { LiveSessionTile } from "./LiveSessionTile";

export interface UpcomingSessionsSectionProps {
  sessions: UpcomingLiveSessionDto[];
}

export function UpcomingSessionsSection({ sessions }: UpcomingSessionsSectionProps) {
  if (!sessions || sessions.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <Radio className="h-4 w-4" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Upcoming Live Sessions</h2>
        <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
          {sessions.length} scheduled
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.map((session) => (
          <LiveSessionTile key={session.sessionId} session={session} />
        ))}
      </div>
    </section>
  );
}
