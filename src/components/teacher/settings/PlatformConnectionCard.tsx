"use client";

import React from "react";
import { CheckCircle2, XCircle, Loader2, Video, Calendar, ShieldCheck, Unlink } from "lucide-react";

export interface PlatformConnectionCardProps {
  platform: "zoom" | "googleMeet";
  title: string;
  description: string;
  connected: boolean;
  email: string | null;
  isLoading?: boolean;
  isDisconnecting?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const PlatformConnectionCard: React.FC<PlatformConnectionCardProps> = ({
  platform,
  title,
  description,
  connected,
  email,
  isLoading = false,
  isDisconnecting = false,
  onConnect,
  onDisconnect,
}) => {
  const isZoom = platform === "zoom";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/80 to-card/40 backdrop-blur-xl p-6 shadow-xl transition-all duration-300 hover:border-border hover:shadow-2xl">
      {/* Background Accent Glow */}
      <div
        className={`absolute -right-16 -top-16 h-36 w-36 rounded-full blur-3xl transition-opacity ${
          isZoom
            ? connected
              ? "bg-blue-500/15"
              : "bg-blue-500/5"
            : connected
            ? "bg-emerald-500/15"
            : "bg-emerald-500/5"
        }`}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-border/40">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md ${
              isZoom
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-blue-500/10"
                : "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-500/10"
            }`}
          >
            {isZoom ? <Video className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  connected
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-muted/60 text-muted-foreground border border-border/60"
                }`}
              >
                {connected ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </>
                ) : (
                  <>
                    <XCircle className="h-3 w-3" />
                    Not Connected
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          {connected ? (
            <button
              onClick={onDisconnect}
              disabled={isDisconnecting || isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-all disabled:opacity-50"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                <>
                  <Unlink className="h-3.5 w-3.5" />
                  Disconnect
                </>
              )}
            </button>
          ) : (
            <button
              onClick={onConnect}
              disabled={isLoading}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                isZoom
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20"
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-500/20"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect {title}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Account Details & Security Note */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          {connected ? (
            <span>
              Linked Account: <strong className="text-foreground">{email || "Active Session"}</strong>
            </span>
          ) : (
            <span className="text-muted-foreground/80">
              OAuth 2.0 PKCE connection required before scheduling sessions.
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
          <span>AES-256-GCM Encrypted Storage</span>
        </div>
      </div>
    </div>
  );
};
