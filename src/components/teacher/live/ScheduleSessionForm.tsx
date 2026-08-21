"use client";

import React, { useState } from "react";
import { PlatformPicker } from "./PlatformPicker";
import { SessionDateTimePicker } from "./SessionDateTimePicker";
import { DurationPicker } from "./DurationPicker";
import { SessionConfirmationCard } from "./SessionConfirmationCard";
import { LiveSessionResponseDto } from "@/lib/validations/live.schema";
import { Loader2, Sparkles, Layers, Video } from "lucide-react";

interface ScheduleSessionFormProps {
  courseId: string;
  courseTitle: string;
  modules?: Array<{
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string; type: string }>;
  }>;
}

export const ScheduleSessionForm: React.FC<ScheduleSessionFormProps> = ({
  courseId,
  courseTitle,
  modules = [],
}) => {
  const defaultFutureDate = new Date(Date.now() + 75 * 60 * 1000).toISOString();

  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState(defaultFutureDate);
  const [duration, setDuration] = useState(60);
  const [platform, setPlatform] = useState<"ZOOM" | "GOOGLE_MEET">("ZOOM");
  const [lessonId, setLessonId] = useState<string>("");
  const [isPlatformConnected, setIsPlatformConnected] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdSession, setCreatedSession] = useState<LiveSessionResponseDto | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage("Please enter a session title.");
      return;
    }

    if (!isPlatformConnected) {
      setErrorMessage(
        `Your ${platform === "ZOOM" ? "Zoom" : "Google Meet"} account is not connected. Please connect it in Teacher Settings first.`
      );
      return;
    }

    const scheduledTime = new Date(scheduledAt).getTime();
    if (scheduledTime < Date.now() + 55 * 60 * 1000) {
      setErrorMessage("Session must be scheduled at least 1 hour in the future.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/live/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId,
          lessonId: lessonId || undefined,
          title: title.trim(),
          scheduledAt,
          duration,
          platform,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to schedule live session");
      }

      setCreatedSession(json.data);
    } catch (err: any) {
      console.error("Session creation error:", err);
      setErrorMessage(err.message || "Failed to schedule live session");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle("");
    setScheduledAt(new Date(Date.now() + 75 * 60 * 1000).toISOString());
    setDuration(60);
    setCreatedSession(null);
  };

  if (createdSession) {
    return <SessionConfirmationCard session={createdSession} courseId={courseId} onReset={handleReset} />;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-8"
    >
      {/* Form Header */}
      <div className="space-y-1 pb-4 border-b border-border/40">
        <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <Video className="h-5 w-5 text-indigo-400" />
          Live Lecture Details
        </h3>
        <p className="text-xs text-muted-foreground">
          Course: <strong className="text-foreground">{courseTitle}</strong>
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 font-medium animate-in fade-in duration-200">
          {errorMessage}
        </div>
      )}

      {/* Session Title */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Live Session Topic / Title
        </label>
        <input
          type="text"
          placeholder="e.g. Masterclass: Distributed Systems Architecture & Live Q&A"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
          className="w-full rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner"
        />
      </div>

      {/* Platform Picker */}
      <PlatformPicker
        value={platform}
        onChange={setPlatform}
        onPlatformStatusChange={setIsPlatformConnected}
      />

      {/* Date & Time Picker */}
      <SessionDateTimePicker value={scheduledAt} onChange={setScheduledAt} />

      {/* Duration Picker */}
      <DurationPicker value={duration} onChange={setDuration} />

      {/* Optional: Curriculum Lesson Attachment */}
      {modules.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/40">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-indigo-400" />
            Attach to Curriculum Lesson (Optional)
          </label>
          <select
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">-- No specific lesson (standalone live lecture) --</option>
            {modules.map((m) => (
              <optgroup key={m.id} label={`Module: ${m.title}`}>
                {m.lessons.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} ({l.type})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      )}

      {/* Submit Button */}
      <div className="pt-4 border-t border-border/40 flex items-center justify-end">
        <button
          type="submit"
          disabled={submitting || !isPlatformConnected}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Provisioning Meeting...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Schedule Live Session
            </>
          )}
        </button>
      </div>
    </form>
  );
};
