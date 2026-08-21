"use client";

import React, { useState, useEffect } from "react";
import {
  StudentUpcomingSessionDto,
  StudentPastSessionDto,
} from "@/lib/validations/live.schema";
import { UpcomingSessionCard } from "./UpcomingSessionCard";
import { PastSessionCard } from "./PastSessionCard";
import {
  Video,
  Radio,
  Calendar,
  PlaySquare,
  RefreshCw,
  Search,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export const LiveSessionsDashboardPage: React.FC = () => {
  const [upcomingSessions, setUpcomingSessions] = useState<StudentUpcomingSessionDto[]>([]);
  const [pastSessions, setPastSessions] = useState<StudentPastSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [upRes, pastRes] = await Promise.all([
        fetch("/api/live/sessions/upcoming"),
        fetch("/api/live/sessions/past"),
      ]);

      if (upRes.ok) {
        const upJson = await upRes.json();
        if (upJson.success && upJson.data) {
          setUpcomingSessions(upJson.data);
        }
      }

      if (pastRes.ok) {
        const pastJson = await pastRes.json();
        if (pastJson.success && pastJson.data) {
          setPastSessions(pastJson.data);
        }
      }
    } catch (err) {
      console.error("Failed to load student live sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredUpcoming = upcomingSessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPast = pastSessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.course.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const liveNowCount = upcomingSessions.filter((s) => s.status === "LIVE").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-card/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              <Video className="h-3.5 w-3.5" />
              <span>Live Class Portal & Cloud Replays</span>
            </div>
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
              Live Classes & Workshops
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Join real-time interactive lectures hosted by your instructors, participate in live Q&A discussions,
              and review full recordings at any time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 bg-card/60 hover:bg-card text-xs font-bold text-foreground transition"
            >
              <BookOpen className="h-4 w-4 text-indigo-400" /> My Enrolled Courses
            </Link>
          </div>
        </div>

        {/* Decorative Glow */}
        <div className="absolute right-0 top-0 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-md">
          <span className="text-[11px] font-bold text-blue-400 uppercase flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Upcoming Lectures
          </span>
          <p className="text-2xl font-extrabold text-blue-400 mt-1">{upcomingSessions.length}</p>
        </div>

        <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-md">
          <span className="text-[11px] font-bold text-rose-400 uppercase flex items-center gap-1.5">
            <Radio className="h-3 w-3 animate-pulse" /> Live Broadcasts Now
          </span>
          <p className="text-2xl font-extrabold text-rose-400 mt-1">{liveNowCount}</p>
        </div>

        <div className="p-4 rounded-2xl border border-purple-500/30 bg-purple-500/5 backdrop-blur-md">
          <span className="text-[11px] font-bold text-purple-400 uppercase flex items-center gap-1.5">
            <PlaySquare className="h-3 w-3" /> Replays Available
          </span>
          <p className="text-2xl font-extrabold text-purple-400 mt-1">{pastSessions.length}</p>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
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
              Upcoming Live ({upcomingSessions.length})
            </button>

            <button
              onClick={() => setActiveTab("past")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "past"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card/80"
              }`}
            >
              <PlaySquare className="h-3.5 w-3.5" />
              Past Recordings ({pastSessions.length})
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Search lectures or courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-card/60 pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 rounded-xl border border-border/60 bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition disabled:opacity-50"
              title="Refresh schedule"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content Display */}
        {loading ? (
          <div className="text-center py-16 space-y-3">
            <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Checking live session schedule...</p>
          </div>
        ) : activeTab === "upcoming" ? (
          filteredUpcoming.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredUpcoming.map((session) => (
                <UpcomingSessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-border/60 bg-card/30 p-12 text-center space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mx-auto">
                <Video className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">No Upcoming Live Classes</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  {searchQuery
                    ? "No sessions match your search query."
                    : "You do not have any upcoming live classes scheduled in your enrolled courses."}
                </p>
              </div>
              <Link
                href="/courses"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition"
              >
                Browse Live Courses <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )
        ) : filteredPast.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredPast.map((session) => (
              <PastSessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-border/60 bg-card/30 p-12 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mx-auto">
              <PlaySquare className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">No Recordings Published Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                {searchQuery
                  ? "No recordings match your search query."
                  : "Lecture recordings will automatically appear here once your instructors publish them."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
