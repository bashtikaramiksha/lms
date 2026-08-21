"use client";

import React, { useState, useEffect } from "react";
import { LiveSessionResponseDto } from "@/lib/validations/live.schema";
import { LiveSessionCard } from "./LiveSessionCard";
import {
  Video,
  Radio,
  Calendar,
  CheckCircle,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

export const LiveSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<LiveSessionResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [platformFilter, setPlatformFilter] = useState<"ALL" | "ZOOM" | "GOOGLE_MEET">("ALL");

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/live/sessions?limit=100");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSessions(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to load live sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSessionUpdated = (updated: LiveSessionResponseDto) => {
    setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  // Filter sessions by tab (upcoming: SCHEDULED, LIVE vs past: ENDED, CANCELLED)
  const filteredSessions = sessions.filter((s) => {
    const isUpcoming = s.status === "SCHEDULED" || s.status === "LIVE";
    const matchesTab = activeTab === "upcoming" ? isUpcoming : !isUpcoming;

    const matchesSearch =
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.course?.title && s.course.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPlatform = platformFilter === "ALL" || s.platform === platformFilter;

    return matchesTab && matchesSearch && matchesPlatform;
  });

  // Calculate quick stats
  const totalCount = sessions.length;
  const liveCount = sessions.filter((s) => s.status === "LIVE").length;
  const upcomingCount = sessions.filter((s) => s.status === "SCHEDULED").length;
  const completedCount = sessions.filter((s) => s.status === "ENDED").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-card/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              <Video className="h-3.5 w-3.5" />
              <span>Live Classes & Interactive Webinars</span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
              Live Session Management
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Monitor your scheduled lectures, start live broadcasts, manage student attendance, and publish cloud
              replays across all your courses.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/teacher/courses"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 transition active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" /> Schedule New Class
            </Link>
          </div>
        </div>

        {/* Decorative Glow */}
        <div className="absolute right-0 top-0 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md">
          <span className="text-[11px] font-bold text-muted-foreground uppercase">Total Lectures</span>
          <p className="text-2xl font-extrabold text-foreground mt-1">{totalCount}</p>
        </div>

        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-md">
          <span className="text-[11px] font-bold text-rose-400 uppercase flex items-center gap-1.5">
            <Radio className="h-3 w-3 animate-pulse" /> Live Now
          </span>
          <p className="text-2xl font-extrabold text-rose-400 mt-1">{liveCount}</p>
        </div>

        <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-md">
          <span className="text-[11px] font-bold text-blue-400 uppercase flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Upcoming
          </span>
          <p className="text-2xl font-extrabold text-blue-400 mt-1">{upcomingCount}</p>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 backdrop-blur-md">
          <span className="text-[11px] font-bold text-emerald-400 uppercase flex items-center gap-1.5">
            <CheckCircle className="h-3 w-3" /> Completed
          </span>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">{completedCount}</p>
        </div>
      </div>

      {/* Filter and Tab Navigation Row */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
          {/* Tab buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "upcoming"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/80"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              Upcoming & Live ({upcomingCount + liveCount})
            </button>

            <button
              onClick={() => setActiveTab("past")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "past"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/80"
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              Past & Completed ({completedCount})
            </button>
          </div>

          {/* Search & Platform Filter */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                placeholder="Search lectures or courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-card/60 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value as any)}
              className="rounded-xl border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Platforms</option>
              <option value="ZOOM">Zoom</option>
              <option value="GOOGLE_MEET">Google Meet</option>
            </select>

            <button
              onClick={fetchSessions}
              disabled={loading}
              className="p-2 rounded-xl border border-border/60 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition disabled:opacity-50"
              title="Refresh sessions"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Loading your live sessions...</p>
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSessions.map((session) => (
              <LiveSessionCard
                key={session.id}
                session={session}
                onSessionUpdated={handleSessionUpdated}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-border/60 bg-card/30 p-12 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">No Live Sessions Found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {searchQuery || platformFilter !== "ALL"
                  ? "Try clearing your search query or filters."
                  : activeTab === "upcoming"
                  ? "You don't have any upcoming live classes scheduled yet."
                  : "No completed or past live sessions recorded."}
              </p>
            </div>
            {activeTab === "upcoming" && (
              <Link
                href="/teacher/courses"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition"
              >
                <Plus className="h-3.5 w-3.5" /> Schedule from a Course
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
