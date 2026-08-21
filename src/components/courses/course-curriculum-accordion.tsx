"use client";

import { useState } from "react";
import { CurriculumModuleDetail, CurriculumLessonDetail } from "@/lib/validations/course";
import { CoursePreviewPlayerModal } from "./course-preview-player-modal";
import {
  ChevronDown,
  ChevronUp,
  PlayCircle,
  FileText,
  HelpCircle,
  Radio,
  Lock,
  Clock,
  BookOpen,
} from "lucide-react";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getLessonIcon(type: string) {
  switch (type) {
    case "VIDEO":
      return <PlayCircle className="h-4 w-4 text-blue-400" />;
    case "ARTICLE":
      return <FileText className="h-4 w-4 text-amber-400" />;
    case "QUIZ":
      return <HelpCircle className="h-4 w-4 text-purple-400" />;
    case "LIVE_SESSION":
      return <Radio className="h-4 w-4 text-rose-400" />;
    default:
      return <PlayCircle className="h-4 w-4 text-blue-400" />;
  }
}

interface CourseCurriculumAccordionProps {
  modules: CurriculumModuleDetail[];
  isEnrolled: boolean;
}

export function CourseCurriculumAccordion({
  modules,
  isEnrolled,
}: CourseCurriculumAccordionProps) {
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>(() => {
    // Expand the first 2 modules by default
    const initial: Record<string, boolean> = {};
    modules.slice(0, 2).forEach((m) => {
      initial[m.id] = true;
    });
    return initial;
  });

  const [previewLesson, setPreviewLesson] = useState<{
    isOpen: boolean;
    title: string;
    videoUrl: string | null;
  }>({
    isOpen: false,
    title: "",
    videoUrl: null,
  });

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    modules.forEach((m) => {
      all[m.id] = true;
    });
    setExpandedModules(all);
  };

  const collapseAll = () => {
    setExpandedModules({});
  };

  const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
  const totalDuration = modules.reduce(
    (acc, m) => acc + m.lessons.reduce((lAcc, l) => lAcc + (l.duration || 0), 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground pb-2">
        <div className="flex items-center gap-3">
          <span>{modules.length} {modules.length === 1 ? "section" : "sections"}</span>
          <span>•</span>
          <span>{totalLessons} {totalLessons === 1 ? "lecture" : "lectures"}</span>
          <span>•</span>
          <span>{formatDuration(totalDuration)} total length</span>
        </div>

        <button
          onClick={Object.keys(expandedModules).length === modules.length ? collapseAll : expandAll}
          className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors self-start sm:self-auto"
        >
          {Object.keys(expandedModules).length === modules.length ? "Collapse all sections" : "Expand all sections"}
        </button>
      </div>

      {/* Accordion Modules */}
      <div className="space-y-3">
        {modules.map((mod, idx) => {
          const isExpanded = !!expandedModules[mod.id];
          const modDuration = mod.lessons.reduce((acc, l) => acc + (l.duration || 0), 0);

          return (
            <div
              key={mod.id}
              className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden transition-all duration-200"
            >
              {/* Module Header Button */}
              <button
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-muted-foreground">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  <h4 className="font-semibold text-sm sm:text-base text-foreground">
                    Section {idx + 1}: {mod.title}
                  </h4>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{mod.lessons.length} lectures</span>
                  {modDuration > 0 && (
                    <>
                      <span>•</span>
                      <span>{formatDuration(modDuration)}</span>
                    </>
                  )}
                </div>
              </button>

              {/* Lessons List */}
              {isExpanded && (
                <div className="border-t border-border/40 divide-y divide-border/30 bg-muted/10">
                  {mod.lessons.map((lesson) => {
                    const hasPreview = Boolean(lesson.isPreview && lesson.videoUrl);
                    const canPlay = hasPreview || (isEnrolled && Boolean(lesson.videoUrl));

                    return (
                      <div
                        key={lesson.id}
                        className="flex items-center justify-between px-4 sm:px-6 py-3 text-xs sm:text-sm hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-4">
                          <div className="shrink-0">{getLessonIcon(lesson.type)}</div>
                          <span className="text-foreground truncate font-medium">
                            {lesson.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {canPlay ? (
                            <button
                              onClick={() =>
                                setPreviewLesson({
                                  isOpen: true,
                                  title: lesson.title,
                                  videoUrl: lesson.videoUrl,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-all flex items-center gap-1 shadow-sm"
                            >
                              <PlayCircle className="h-3.5 w-3.5" />
                              <span>Preview</span>
                            </button>
                          ) : (
                            <div className="text-muted-foreground/60 p-1" title="Enroll to unlock this lecture">
                              <Lock className="h-3.5 w-3.5" />
                            </div>
                          )}

                          {lesson.duration ? (
                            <span className="text-xs text-muted-foreground w-12 text-right">
                              {formatDuration(lesson.duration)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Video Preview Modal */}
      <CoursePreviewPlayerModal
        isOpen={previewLesson.isOpen}
        onClose={() => setPreviewLesson((prev) => ({ ...prev, isOpen: false }))}
        title={previewLesson.title}
        videoUrl={previewLesson.videoUrl}
      />
    </div>
  );
}
