"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Circle,
  PlayCircle,
  FileText,
  HelpCircle,
  Radio,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { CurriculumModuleDto } from "@/lib/services/progress.service";

export interface CurriculumSidebarProps {
  courseId: string;
  currentLessonId: string;
  curriculum: CurriculumModuleDto[];
  progressPercent: number;
}

export function CurriculumSidebar({
  courseId,
  currentLessonId,
  curriculum,
  progressPercent,
}: CurriculumSidebarProps) {
  // Keep all modules expanded by default
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  const toggleModule = (moduleId: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return <PlayCircle className="h-4 w-4 shrink-0" />;
      case "ARTICLE":
        return <FileText className="h-4 w-4 shrink-0" />;
      case "QUIZ":
        return <HelpCircle className="h-4 w-4 shrink-0" />;
      case "LIVE_SESSION":
        return <Radio className="h-4 w-4 shrink-0" />;
      default:
        return <PlayCircle className="h-4 w-4 shrink-0" />;
    }
  };

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return null;
    const mins = Math.ceil(seconds / 60);
    return `${mins}m`;
  };

  return (
    <aside className="flex flex-col h-full rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] backdrop-blur-xl shadow-xl overflow-hidden">
      {/* Top Header & Progress */}
      <div className="p-5 border-b border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold tracking-tight text-foreground">Course Curriculum</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            {progressPercent}% Complete
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10 p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-primary transition-all duration-500"
            style={{ width: `${Math.max(3, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Module Tree */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {curriculum.map((module, mIdx) => {
          const isCollapsed = collapsedModules[module.moduleId];
          const completedCount = module.lessons.filter((l) => l.isCompleted).length;
          const totalCount = module.lessons.length;

          return (
            <div
              key={module.moduleId}
              className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden"
            >
              {/* Module Header */}
              <button
                onClick={() => toggleModule(module.moduleId)}
                className="flex items-center justify-between w-full p-3.5 text-left hover:bg-white/[0.04] transition-colors"
              >
                <div className="min-w-0 pr-2">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Section {mIdx + 1}
                  </p>
                  <p className="text-xs font-semibold text-foreground truncate">
                    {module.moduleTitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                  <span className="text-[11px] font-medium">
                    {completedCount}/{totalCount}
                  </span>
                  {isCollapsed ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronUp className="h-3.5 w-3.5" />
                  )}
                </div>
              </button>

              {/* Module Lessons List */}
              {!isCollapsed && (
                <div className="p-1.5 pt-0 space-y-1">
                  {module.lessons.map((lesson) => {
                    const isActive = lesson.id === currentLessonId;

                    return (
                      <Link
                        key={lesson.id}
                        href={`/dashboard/my-courses/${courseId}/lessons/${lesson.id}`}
                        className={`flex items-center justify-between gap-3 p-2.5 rounded-lg text-xs transition-all ${
                          isActive
                            ? "bg-primary/20 text-primary font-semibold border border-primary/30 shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Completion Checkmark */}
                          {lesson.isCompleted ? (
                            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400 fill-emerald-400/20" />
                          ) : (
                            <Circle className="h-4 w-4 shrink-0 text-white/30" />
                          )}

                          <div className="flex items-center gap-2 min-w-0">
                            {getLessonIcon(lesson.type)}
                            <span className="truncate">{lesson.title}</span>
                          </div>
                        </div>

                        {/* Duration */}
                        {lesson.duration && (
                          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                            {formatDuration(lesson.duration)}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
