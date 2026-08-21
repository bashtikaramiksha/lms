"use client";

import React from "react";
import { Video, Play, ExternalLink } from "lucide-react";
import { LiveSessionResponseDto } from "@/lib/validations/live.schema";

interface StartClassButtonProps {
  session: LiveSessionResponseDto;
}

export const StartClassButton: React.FC<StartClassButtonProps> = ({ session }) => {
  const isCancelled = session.status === "CANCELLED";
  const isEnded = session.status === "ENDED";
  const isLive = session.status === "LIVE";

  // Check if session start time is within 10 minutes from now (or in progress)
  const scheduledTime = new Date(session.scheduledAt).getTime();
  const now = Date.now();
  const diffMinutes = (scheduledTime - now) / (60 * 1000);

  const isTimeReady = diffMinutes <= 10; // Within 10 mins before start or past start
  const canStart = !isCancelled && !isEnded && (isLive || isTimeReady);

  const handleClick = () => {
    if (session.hostUrl) {
      window.open(session.hostUrl, "_blank");
    }
  };

  if (isEnded || isCancelled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!canStart || !session.hostUrl}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
        isLive
          ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 animate-pulse"
          : canStart
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-600/20"
          : "bg-muted/40 text-muted-foreground border border-border/50 cursor-not-allowed opacity-60"
      }`}
      title={
        canStart
          ? "Launch meeting as instructor host"
          : `Start Class button activates 10 minutes before scheduled start time`
      }
    >
      {isLive ? (
        <>
          <span className="h-2 w-2 rounded-full bg-white animate-ping" />
          Class is Live — Start Now <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
        </>
      ) : canStart ? (
        <>
          <Play className="h-3.5 w-3.5 fill-current" />
          Start Class <ExternalLink className="h-3.5 w-3.5 ml-0.5" />
        </>
      ) : (
        <>
          <Video className="h-3.5 w-3.5" />
          Starts in {Math.max(1, Math.round(diffMinutes))}m
        </>
      )}
    </button>
  );
};
