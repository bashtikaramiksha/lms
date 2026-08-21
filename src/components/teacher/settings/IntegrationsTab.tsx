"use client";

import React, { useState, useEffect } from "react";
import { PlatformConnectionCard } from "./PlatformConnectionCard";
import { Shield, Sparkles, RefreshCw, AlertTriangle, KeyRound } from "lucide-react";

interface IntegrationsData {
  zoom: {
    connected: boolean;
    email: string | null;
  };
  googleMeet: {
    connected: boolean;
    email: string | null;
  };
}

export const IntegrationsTab: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationsData>({
    zoom: { connected: false, email: null },
    googleMeet: { connected: false, email: null },
  });
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<"zoom" | "googleMeet" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch("/api/teacher/integrations");
      if (!res.ok) throw new Error("Failed to load integrations status");
      const json = await res.json();
      if (json.success && json.data) {
        setIntegrations(json.data);
      }
    } catch (err: any) {
      console.error("Failed to load integrations:", err);
      setErrorMessage("Could not load integrations status. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleConnect = (platform: "zoom" | "googleMeet") => {
    if (platform === "zoom") {
      window.location.href = "/api/auth/zoom";
    } else {
      window.location.href = "/api/auth/google-meet";
    }
  };

  const handleDisconnect = async (platform: "zoom" | "googleMeet") => {
    const confirmText = `Are you sure you want to disconnect ${
      platform === "zoom" ? "Zoom" : "Google Meet"
    }? Live sessions already scheduled will not be affected, but you won't be able to schedule new sessions until you reconnect.`;

    if (!window.confirm(confirmText)) return;

    try {
      setDisconnecting(platform);
      const endpoint =
        platform === "zoom" ? "/api/teacher/integrations/zoom" : "/api/teacher/integrations/google-meet";

      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect platform");

      // Update state locally
      setIntegrations((prev) => ({
        ...prev,
        [platform]: { connected: false, email: null },
      }));
    } catch (err: any) {
      console.error(`Error disconnecting ${platform}:`, err);
      alert(`Failed to disconnect: ${err.message || "Unknown error"}`);
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            Live Class Integrations
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your video conferencing platforms to automatically provision meetings and generate student join
            links when scheduling live classes.
          </p>
        </div>

        <button
          onClick={fetchIntegrations}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card/60 hover:bg-card text-xs font-semibold text-muted-foreground hover:text-foreground transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 gap-6">
        {/* Zoom */}
        <PlatformConnectionCard
          platform="zoom"
          title="Zoom Video Communications"
          description="Host interactive webinars and classroom sessions directly with Zoom SDK and native join links."
          connected={integrations.zoom.connected}
          email={integrations.zoom.email}
          isLoading={loading}
          isDisconnecting={disconnecting === "zoom"}
          onConnect={() => handleConnect("zoom")}
          onDisconnect={() => handleDisconnect("zoom")}
        />

        {/* Google Meet */}
        <PlatformConnectionCard
          platform="googleMeet"
          title="Google Meet & Calendar"
          description="Automatically sync scheduled live lectures as Google Calendar events with built-in Google Meet links."
          connected={integrations.googleMeet.connected}
          email={integrations.googleMeet.email}
          isLoading={loading}
          isDisconnecting={disconnecting === "googleMeet"}
          onConnect={() => handleConnect("googleMeet")}
          onDisconnect={() => handleDisconnect("googleMeet")}
        />
      </div>

      {/* Security & Architecture Info Box */}
      <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Shield className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-bold text-foreground">OAuth 2.0 Security & Token Storage Policy</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          When you connect your Zoom or Google account, authorization codes are exchanged over secure HTTPS channels
          using the PKCE standard. All refresh and access tokens are encrypted at rest using AES-256-GCM before being
          stored in the database. Access tokens are decrypted only on-demand during live session provisioning and are
          never transmitted to client browsers.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2 text-[11px] text-muted-foreground/80 border-t border-border/30">
          <div className="flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
            <span>Automatic Token Rotation & Refresh</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-indigo-400" />
            <span>Isolated Teacher Credential Scopes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
