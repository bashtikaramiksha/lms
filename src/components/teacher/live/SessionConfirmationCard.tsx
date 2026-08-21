"use client";

import React, { useState } from "react";
import { CheckCircle2, Copy, Check, ExternalLink, Calendar, Clock, Video, ArrowRight } from "lucide-react";
import Link from "next/link";
import { LiveSessionResponseDto } from "@/lib/validations/live.schema";

interface SessionConfirmationCardProps {
  session: LiveSessionResponseDto;
  courseId: string;
  onReset: () => void;
}

export const SessionConfirmationCard: React.FC<SessionConfirmationCardProps> = ({
  session,
  courseId,
  onReset,
}) => {
  const [copiedHost, setCopiedHost] = useState(false);
  const [copiedJoin, setCopiedJoin] = useState(false);

  const formattedDate = new Date(session.scheduledAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const copyToClipboard = (text: string, type: "host" | "join") => {
    navigator.clipboard.writeText(text);
    if (type === "host") {
      setCopiedHost(true);
      setTimeout(() => setCopiedHost(false), 2000);
    } else {
      setCopiedJoin(true);
      setTimeout(() => setCopiedJoin(false), 2000);
    }
  };

  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-card/80 to-card/40 backdrop-blur-xl p-8 shadow-2xl space-y-8 animate-in fade-in zoom-in-95 duration-400">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Session Scheduled</span>
            <h2 className="text-xl font-extrabold text-foreground tracking-tight">{session.title}</h2>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
          <Video className="h-3.5 w-3.5" />
          {session.platform === "ZOOM" ? "Zoom Meeting" : "Google Meet"}
        </span>
      </div>

      {/* Date & Time Summary Box */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-2xl bg-card/60 border border-border/40">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground">Date & Time</span>
            <p className="text-sm font-bold text-foreground">{formattedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground">Planned Duration</span>
            <p className="text-sm font-bold text-foreground">{session.duration} Minutes</p>
          </div>
        </div>
      </div>

      {/* Meeting Access Links */}
      <div className="space-y-4">
        {/* Host Link */}
        {session.hostUrl && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-indigo-300 flex items-center justify-between">
              <span>Teacher Host Console URL (Private Start Link)</span>
              <span className="text-[11px] text-muted-foreground font-normal">Use this to launch as host</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={session.hostUrl}
                className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs text-foreground font-mono truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(session.hostUrl!, "host")}
                className="px-3 py-2.5 rounded-xl border border-border bg-card/60 hover:bg-card text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
              >
                {copiedHost ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedHost ? "Copied" : "Copy"}
              </button>
              <a
                href={session.hostUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
              >
                Start Meeting <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Student Join Link */}
        {session.joinUrl && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center justify-between">
              <span>Student Join URL</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Automatically visible to enrolled students
              </span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={session.joinUrl}
                className="flex-1 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs text-muted-foreground font-mono truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={() => copyToClipboard(session.joinUrl!, "join")}
                className="px-3 py-2.5 rounded-xl border border-border bg-card/60 hover:bg-card text-xs font-semibold text-muted-foreground hover:text-foreground transition flex items-center gap-1.5"
              >
                {copiedJoin ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedJoin ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/40">
        <button
          type="button"
          onClick={onReset}
          className="text-xs font-bold text-muted-foreground hover:text-foreground transition"
        >
          Schedule Another Session
        </button>

        <Link
          href={`/teacher/courses/${courseId}/edit`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition"
        >
          Return to Course Curriculum <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};
