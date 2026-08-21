"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Video,
  Users,
  Edit3,
  Ban,
  PlaySquare,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { LiveSessionResponseDto } from "@/lib/validations/live.schema";
import { SessionStatusBadge } from "./SessionStatusBadge";
import { StartClassButton } from "./StartClassButton";
import { EditSessionDialog } from "./EditSessionDialog";
import { AddRecordingDialog } from "./AddRecordingDialog";
import { CancelSessionDialog } from "./CancelSessionDialog";

interface LiveSessionCardProps {
  session: LiveSessionResponseDto;
  onSessionUpdated: (updatedSession: LiveSessionResponseDto) => void;
}

export const LiveSessionCard: React.FC<LiveSessionCardProps> = ({
  session,
  onSessionUpdated,
}) => {
  const [showEdit, setShowEdit] = useState(false);
  const [showRecording, setShowRecording] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const formattedDate = new Date(session.scheduledAt).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const isScheduled = session.status === "SCHEDULED";
  const isLive = session.status === "LIVE";
  const isEnded = session.status === "ENDED";
  const isCancelled = session.status === "CANCELLED";

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-3xl border bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 hover:shadow-2xl ${
          isLive
            ? "border-rose-500/50 shadow-rose-500/10 ring-1 ring-rose-500/30"
            : "border-border/60 hover:border-border"
        }`}
      >
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2.5 flex-wrap">
            <SessionStatusBadge status={session.status} />

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

            {session.course && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <BookOpen className="h-3 w-3 text-indigo-400" />
                <span className="font-semibold text-foreground/90 truncate max-w-[200px]">
                  {session.course.title}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-indigo-400" />
            <span>
              <strong className="text-foreground">{session.enrolledCount || 0}</strong> Enrolled
            </span>
          </div>
        </div>

        {/* Title and Date Row */}
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

        {/* Recording URL Banner if available */}
        {session.recordingUrl && (
          <div className="mb-4 p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-3 text-xs text-purple-300">
            <div className="flex items-center gap-2 truncate">
              <PlaySquare className="h-4 w-4 shrink-0 text-purple-400" />
              <span className="truncate">Recording published: {session.recordingUrl}</span>
            </div>
            <a
              href={session.recordingUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 font-bold whitespace-nowrap transition flex items-center gap-1"
            >
              Watch <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Action Controls Row */}
        <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Start Class Button */}
            <StartClassButton session={session} />

            {/* Add/Edit Recording Button for Ended Sessions */}
            {isEnded && (
              <button
                type="button"
                onClick={() => setShowRecording(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 transition"
              >
                <PlaySquare className="h-3.5 w-3.5" />
                {session.recordingUrl ? "Update Recording" : "Add Recording"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Edit / Reschedule */}
            {isScheduled && (
              <button
                type="button"
                onClick={() => setShowEdit(true)}
                className="p-2 rounded-xl border border-border/60 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground text-xs font-semibold transition flex items-center gap-1"
                title="Edit details or reschedule"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}

            {/* Cancel Button */}
            {(isScheduled || (!isEnded && !isCancelled && !isLive)) && (
              <button
                type="button"
                onClick={() => setShowCancel(true)}
                className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition flex items-center gap-1"
                title="Cancel this session"
              >
                <Ban className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cancel</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Dialog Modals */}
      <EditSessionDialog
        session={session}
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSuccess={onSessionUpdated}
      />

      <AddRecordingDialog
        session={session}
        isOpen={showRecording}
        onClose={() => setShowRecording(false)}
        onSuccess={onSessionUpdated}
      />

      <CancelSessionDialog
        session={session}
        isOpen={showCancel}
        onClose={() => setShowCancel(false)}
        onSuccess={onSessionUpdated}
      />
    </>
  );
};
