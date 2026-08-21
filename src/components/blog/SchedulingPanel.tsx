"use client";

import React from "react";
import { Clock, Calendar, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";

interface SchedulingPanelProps {
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  scheduledFor: string;
  onChangeStatus: (status: "DRAFT" | "PUBLISHED" | "SCHEDULED") => void;
  onChangeScheduledFor: (dateString: string) => void;
}

export function SchedulingPanel({
  status,
  scheduledFor,
  onChangeStatus,
  onChangeScheduledFor,
}: SchedulingPanelProps) {
  const isPastDate =
    status === "SCHEDULED" &&
    scheduledFor &&
    new Date(scheduledFor).getTime() <= Date.now();

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Publishing Status
        </label>
        <span className="text-xs text-slate-400">Control post visibility</span>
      </div>

      {/* Status Radio Pills */}
      <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => onChangeStatus("DRAFT")}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            status === "DRAFT"
              ? "bg-slate-800 text-white shadow-md border border-slate-700"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Draft
        </button>
        <button
          type="button"
          onClick={() => onChangeStatus("PUBLISHED")}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            status === "PUBLISHED"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-slate-400 hover:text-emerald-400"
          }`}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Publish Now
        </button>
        <button
          type="button"
          onClick={() => {
            onChangeStatus("SCHEDULED");
            if (!scheduledFor) {
              // Default to 1 day in future
              const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
              onChangeScheduledFor(tomorrow.toISOString().slice(0, 16));
            }
          }}
          className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
            status === "SCHEDULED"
              ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
              : "text-slate-400 hover:text-amber-400"
          }`}
        >
          <Clock className="h-3.5 w-3.5" />
          Schedule
        </button>
      </div>

      {/* Future DateTime Picker when Scheduled */}
      {status === "SCHEDULED" && (
        <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-amber-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Schedule Release Date & Time
            </label>
            <span className="text-[11px] text-slate-500">Local Time</span>
          </div>

          <div className="relative">
            <input
              type="datetime-local"
              min={minDateTime}
              value={scheduledFor ? scheduledFor.slice(0, 16) : ""}
              onChange={(e) => onChangeScheduledFor(e.target.value)}
              className={`w-full bg-slate-950 border ${
                isPastDate ? "border-rose-500/80 ring-1 ring-rose-500" : "border-slate-800 focus:border-amber-500"
              } rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 transition-all`}
            />
          </div>

          {isPastDate && (
            <p className="text-xs text-rose-400 flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              Scheduled date must be set in the future.
            </p>
          )}

          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <span>
              This post will automatically go live within 15 minutes of the scheduled time via the automated publishing cron.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
