"use client";

import React, { useState, Suspense } from "react";
import { IntegrationsTab } from "./IntegrationsTab";
import { OAuthRedirectHandler } from "./OAuthRedirectHandler";
import { Sliders, Video, User, Bell } from "lucide-react";

type SettingsTab = "integrations" | "profile" | "preferences";

export const TeacherSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("integrations");

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-card/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            <Sliders className="h-3.5 w-3.5" />
            <span>Instructor Studio Configuration</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
            Settings & Integrations
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Manage your external live video integrations, conferencing credentials, and instructor defaults for all
            course deliveries.
          </p>
        </div>

        {/* Top-Right Decorative Glow */}
        <div className="absolute right-0 top-0 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* OAuth Toast Notifications from redirect query parameters */}
      <Suspense fallback={null}>
        <OAuthRedirectHandler />
      </Suspense>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-px">
        <button
          onClick={() => setActiveTab("integrations")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === "integrations"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Video className="h-4 w-4" />
          Live Integrations (Zoom & Meet)
        </button>

        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === "profile"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-4 w-4" />
          Instructor Profile
        </button>

        <button
          onClick={() => setActiveTab("preferences")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
            activeTab === "preferences"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bell className="h-4 w-4" />
          Classroom Preferences
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "integrations" && <IntegrationsTab />}

      {activeTab === "profile" && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <User className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Teacher Profile Details</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Your instructor biography, avatar, and social handles are synchronized automatically with your main user
            account.
          </p>
        </div>
      )}

      {activeTab === "preferences" && (
        <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Classroom Reminders & Lead Times</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Automated email reminders (24h and 1h pre-session) are handled globally via Inngest workflows for all
            enrolled students.
          </p>
        </div>
      )}
    </div>
  );
};
