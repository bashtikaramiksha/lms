"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Loader2, Users } from "lucide-react";
import { LiveSessionResponseDto } from "@/lib/validations/live.schema";

interface CancelSessionDialogProps {
  session: LiveSessionResponseDto;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (cancelledSession: LiveSessionResponseDto) => void;
}

export const CancelSessionDialog: React.FC<CancelSessionDialogProps> = ({
  session,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCancel = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/live/sessions/${session.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to cancel live session");
      }

      onSuccess({ ...session, status: "CANCELLED" });
      onClose();
    } catch (err: any) {
      console.error("Cancel session error:", err);
      setError(err.message || "Failed to cancel session");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-rose-500/30 bg-card/95 p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border/40">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Cancel Live Session</h3>
              <p className="text-xs text-muted-foreground">Action cannot be undone</p>
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

        <div className="space-y-3 text-xs text-muted-foreground">
          <p>
            Are you sure you want to cancel{" "}
            <strong className="text-foreground">"{session.title}"</strong>?
          </p>

          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold">
              <Users className="h-3.5 w-3.5" />
              <span>{session.enrolledCount || 0} Enrolled Students</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Cancellation notifications will be delivered automatically to all enrolled students.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            Keep Session
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Yes, Cancel Session
          </button>
        </div>
      </div>
    </div>
  );
};
