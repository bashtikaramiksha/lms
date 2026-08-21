"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Video, Calendar, Sparkles } from "lucide-react";
import { ScheduleSessionForm } from "./ScheduleSessionForm";

interface ScheduleSessionPageProps {
  course: {
    id: string;
    title: string;
    type: string;
  };
  modules?: Array<{
    id: string;
    title: string;
    lessons: Array<{ id: string; title: string; type: string }>;
  }>;
}

export const ScheduleSessionPage: React.FC<ScheduleSessionPageProps> = ({
  course,
  modules = [],
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Back link & Breadcrumbs */}
      <div>
        <Link
          href={`/teacher/courses/${course.id}/edit`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Curriculum Editor
        </Link>
      </div>

      {/* Page Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-card/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            <Video className="h-3.5 w-3.5" />
            <span>Course Live Classroom</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
            Schedule a Live Session
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create an interactive live lecture for <strong>{course.title}</strong>. Meeting rooms and calendar links
            will be generated automatically.
          </p>
        </div>

        {/* Decorative Glow */}
        <div className="absolute right-0 top-0 h-64 w-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Scheduling Form Component */}
      <ScheduleSessionForm
        courseId={course.id}
        courseTitle={course.title}
        modules={modules}
      />
    </div>
  );
};
