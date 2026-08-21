"use client";

import React, { useState } from "react";
import { X, Clock, Calendar, Loader2, Edit3, AlertCircle } from "lucide-react";
import { LiveSessionResponseDto } from "@/lib/validations/live.schema";

interface EditSessionDialogProps {
  session: LiveSessionResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedSession: LiveSessionResponseDto) => void;
}

export const EditSessionDialog: React.FC<EditSessionDialogProps> = ({
  session,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState(session.title);
  const [duration, setDuration] = useState(session.duration);

  // Check if original start time is within 2 hours
  const isWithinTwoHours = new Date(session.scheduledAt).getTime() - 2 * 60 * 60 * 1000 <= Date.now();

  const formatForInput = (isoDate: string) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  };

  const [scheduledAtLocal, setScheduledAtLocal] = useState(formatForInput(session.scheduledAt));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const updatePayload: Record<string, any> = {
      title: title.trim(),
      duration: Number(duration),
    };

    if (scheduledAtLocal) {
      const newDateIso = new Date(scheduledAtLocal).toISOString();
      if (newDateIso !== session.scheduledAt) {
        if (isWithinTwoHours) {
          setError("Cannot reschedule a session within 2 hours of its original start time.");
          return;
        }
        updatePayload.scheduledAt = newDateIso;
      }
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/live/sessions/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update session");
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      console.error("Edit session error:", err);
      setError(err.message || "Failed to update session");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/95 p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400">
              <Edit3 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Edit Live Session</h3>
              <p className="text-xs text-muted-foreground">Modify lecture topic, duration, or time</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground">Lecture Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground flex items-center justify-between">
              <span>Scheduled Date & Time</span>
              {isWithinTwoHours && (
                <span className="text-[10px] text-amber-400 font-normal">Locked (&lt;2h to start)</span>
              )}
            </label>
            <input
              type="datetime-local"
              value={scheduledAtLocal}
              disabled={isWithinTwoHours}
              onChange={(e) => setScheduledAtLocal(e.target.value)}
              className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            />
            {isWithinTwoHours && (
              <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-amber-400" />
                Rescheduling is locked within 2 hours of session start.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-muted-foreground">Duration (Minutes)</label>
            <input
              type="number"
              min={15}
              max={480}
              step={15}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              required
              className="w-full rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
