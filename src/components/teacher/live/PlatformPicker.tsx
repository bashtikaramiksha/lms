"use client";

import React, { useEffect, useState } from "react";
import { Video, Calendar, CheckCircle2, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";

interface PlatformPickerProps {
  value: "ZOOM" | "GOOGLE_MEET";
  onChange: (val: "ZOOM" | "GOOGLE_MEET") => void;
  onPlatformStatusChange?: (isConnected: boolean) => void;
}

export const PlatformPicker: React.FC<PlatformPickerProps> = ({
  value,
  onChange,
  onPlatformStatusChange,
}) => {
  const [integrations, setIntegrations] = useState<{
    zoom: { connected: boolean; email: string | null };
    googleMeet: { connected: boolean; email: string | null };
  }>({
    zoom: { connected: false, email: null },
    googleMeet: { connected: false, email: null },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadIntegrations() {
      try {
        const res = await fetch("/api/teacher/integrations");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setIntegrations(json.data);
            const selectedConnected =
              value === "ZOOM" ? json.data.zoom.connected : json.data.googleMeet.connected;
            onPlatformStatusChange?.(selectedConnected);
          }
        }
      } catch (err) {
        console.error("Failed to check integrations status:", err);
      } finally {
        setLoading(false);
      }
    }
    loadIntegrations();
  }, [value, onPlatformStatusChange]);

  const handleSelect = (platform: "ZOOM" | "GOOGLE_MEET") => {
    onChange(platform);
    const isConnected = platform === "ZOOM" ? integrations.zoom.connected : integrations.googleMeet.connected;
    onPlatformStatusChange?.(isConnected);
  };

  const isSelectedConnected =
    value === "ZOOM" ? integrations.zoom.connected : integrations.googleMeet.connected;

  return (
    <div className="space-y-4">
      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Live Streaming Platform
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Zoom Option */}
        <button
          type="button"
          onClick={() => handleSelect("ZOOM")}
          className={`relative p-5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-4 ${
            value === "ZOOM"
              ? "border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500"
              : "border-border/60 bg-card/40 hover:bg-card/70 hover:border-border"
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Zoom Video</h4>
                <p className="text-xs text-muted-foreground">Direct Zoom Meeting SDK</p>
              </div>
            </div>
            {integrations.zoom.connected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/40 border border-border px-2 py-0.5 rounded-full">
                Not Connected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground/80">
            Generates a high-capacity Zoom meeting with teacher host keys and student join links.
          </p>
        </button>

        {/* Google Meet Option */}
        <button
          type="button"
          onClick={() => handleSelect("GOOGLE_MEET")}
          className={`relative p-5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-4 ${
            value === "GOOGLE_MEET"
              ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500"
              : "border-border/60 bg-card/40 hover:bg-card/70 hover:border-border"
          }`}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Google Meet</h4>
                <p className="text-xs text-muted-foreground">Google Calendar & Meet Link</p>
              </div>
            </div>
            {integrations.googleMeet.connected ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/40 border border-border px-2 py-0.5 rounded-full">
                Not Connected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground/80">
            Creates a Google Calendar event with a built-in Google Meet conference room.
          </p>
        </button>
      </div>

      {!loading && !isSelectedConnected && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>
              You haven't connected your <strong>{value === "ZOOM" ? "Zoom" : "Google"}</strong> account yet. You must
              link your account before scheduling.
            </span>
          </div>
          <Link
            href="/teacher/settings"
            target="_blank"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold whitespace-nowrap transition"
          >
            Connect in Settings <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
};
