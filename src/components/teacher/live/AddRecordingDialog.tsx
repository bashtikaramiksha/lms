"use client";

import React, { useState } from "react";
import { X, PlaySquare, Loader2, Link2 } from "lucide-react";
import { LiveSessionResponseDto } from "@/lib/validations/live.schema";

interface AddRecordingDialogProps {
  session: LiveSessionResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedSession: LiveSessionResponseDto) => void;
}

export const AddRecordingDialog: React.FC<AddRecordingDialogProps> = ({
  session,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [recordingUrl, setRecordingUrl] = useState(session.recordingUrl || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!recordingUrl.trim()) {
      setError("Please provide a valid recording URL.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/live/sessions/${session.id}/recording`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recordingUrl: recordingUrl.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save recording URL");
      }

      onSuccess({ ...session, recordingUrl: recordingUrl.trim() });
      onClose();
    } catch (err: any) {
      console.error("Add recording error:", err);
      setError(err.message || "Failed to save recording URL");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl border border-border/60 bg-card/95 p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
              <PlaySquare className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Add Class Recording</h3>
              <p className="text-xs text-muted-foreground">Attach cloud recording link for students</p>
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
            <label className="text-xs font-bold uppercase text-muted-foreground">
              Recording Video URL (Zoom Cloud / YouTube / Vimeo / S3)
            </label>
            <div className="relative">
              <input
                type="url"
                placeholder="https://zoom.us/rec/play/..."
                value={recordingUrl}
                onChange={(e) => setRecordingUrl(e.target.value)}
                required
                className="w-full rounded-xl border border-border/60 bg-background/60 pl-9 pr-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <Link2 className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Enrolled students will see a "Watch Recording" button on their dashboard.
            </p>
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white transition disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Publish Recording
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
