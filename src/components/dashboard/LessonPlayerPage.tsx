"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Award,
  CheckCircle,
  FileText,
  HelpCircle,
  Radio,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  PartyPopper,
} from "lucide-react";
import { useLessonData, useUpdateProgress, useMarkLessonComplete } from "@/hooks/useLessonPlayer";
import { VideoPlayer } from "./VideoPlayer";
import { CurriculumSidebar } from "./CurriculumSidebar";
import { LessonNav } from "./LessonNav";
import { CertificateModal } from "@/components/certificate/CertificateModal";

export interface LessonPlayerPageProps {
  courseId: string;
  lessonId: string;
}

export function LessonPlayerPage({ courseId, lessonId }: LessonPlayerPageProps) {
  const { data, isLoading, isError, error, refetch } = useLessonData(courseId, lessonId);
  const updateProgress = useUpdateProgress();
  const markComplete = useMarkLessonComplete();

  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [showCelebration, setShowCelebration] = useState<{
    type: "LESSON" | "COURSE";
    message: string;
  } | null>(null);

  if (isLoading) {
    return <LessonPlayerSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-8 text-center max-w-lg">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="text-lg font-bold text-destructive">Failed to Load Lesson</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            {(error as Error)?.message || "You may not be enrolled or this lesson does not exist."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/15"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 inline-flex items-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { course, lesson, progress, curriculum, navigation, courseProgressPercent } = data;

  const handleProgressUpdate = async (watchPercent: number) => {
    try {
      const result = await updateProgress.mutateAsync({
        courseId,
        lessonId,
        watchPercent,
      });

      if (result.courseCompleted) {
        setShowCelebration({
          type: "COURSE",
          message: "🎉 Congratulations! You have completed all lessons in this course!",
        });
      } else if (result.justCompleted) {
        setShowCelebration({
          type: "LESSON",
          message: "✨ Lesson completed! Keep up the great momentum!",
        });
      }
    } catch (e) {
      console.warn("Failed to sync progress:", e);
    }
  };

  const handleMarkComplete = async () => {
    try {
      const result = await markComplete.mutateAsync({
        courseId,
        lessonId,
      });

      if (result.courseCompleted) {
        setShowCelebration({
          type: "COURSE",
          message: "🎉 Congratulations! You have completed all lessons in this course!",
        });
      } else if (result.justCompleted) {
        setShowCelebration({
          type: "LESSON",
          message: "✨ Lesson marked as complete!",
        });
      }
    } catch (e) {
      console.warn("Failed to mark lesson complete:", e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all border border-white/10"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <Link
              href={`/courses/${course.slug}`}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>{course.title}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground line-clamp-1">
              {lesson.title}
            </h1>
          </div>
        </div>

        {/* Course Completion Counter Pill */}
        <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold border border-white/10">
          <span className="text-muted-foreground">Course Progress:</span>
          <span className="text-primary font-bold">{courseProgressPercent}%</span>
        </div>
      </div>

      {/* Course 100% Complete Certificate Banner */}
      {courseProgressPercent === 100 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-orange-500/10 p-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">You have completed this entire course!</p>
              <p className="text-[11px] text-muted-foreground">Your verified certificate of completion is ready to claim.</p>
            </div>
          </div>

          <button
            onClick={() => setIsCertModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-amber-400 hover:to-amber-500 transition-all active:scale-[0.98]"
          >
            <Award className="h-3.5 w-3.5" />
            <span>Get My Certificate</span>
          </button>
        </div>
      )}

      {/* Celebration Notification Toast */}
      {showCelebration && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/20 via-indigo-500/20 to-purple-500/20 p-4 backdrop-blur-xl shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/30">
              {showCelebration.type === "COURSE" ? (
                <PartyPopper className="h-5 w-5" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{showCelebration.message}</p>
              {showCelebration.type === "COURSE" && (
                <button
                  onClick={() => {
                    setShowCelebration(null);
                    setIsCertModalOpen(true);
                  }}
                  className="text-xs font-semibold text-primary underline mt-0.5 inline-block text-left"
                >
                  Click here to claim your certificate now →
                </button>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowCelebration(null)}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Certificate Modal Dialog */}
      <CertificateModal
        courseId={courseId}
        courseTitle={course.title}
        isOpen={isCertModalOpen}
        onClose={() => setIsCertModalOpen(false)}
      />

      {/* Main Grid: Player Area + Curriculum Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 8 Cols: Video Player / Article + Nav */}
        <div className="lg:col-span-8 space-y-6">
          {/* Content Viewer */}
          {lesson.type === "VIDEO" && lesson.videoUrl ? (
            <VideoPlayer
              videoUrl={lesson.videoUrl}
              title={lesson.title}
              initialWatchPercent={progress.watchPercent}
              onProgressUpdate={handleProgressUpdate}
              onVideoEnded={() => handleProgressUpdate(100)}
            />
          ) : lesson.type === "ARTICLE" ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl space-y-6">
              <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                <FileText className="h-4 w-4" />
                <span>Reading Lesson</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{lesson.title}</h2>
              <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed">
                {lesson.content ? (
                  <div dangerouslySetInnerHTML={{ __html: lesson.content }} />
                ) : (
                  <p>This article lesson provides comprehensive reference material for the module.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center backdrop-blur-xl space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
                {lesson.type === "QUIZ" ? (
                  <HelpCircle className="h-6 w-6" />
                ) : (
                  <Radio className="h-6 w-6" />
                )}
              </div>
              <h2 className="text-xl font-bold">{lesson.title}</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {lesson.type === "QUIZ"
                  ? "Interactive Quiz assessment for this module."
                  : "Live interactive workshop session."}
              </p>
            </div>
          )}

          {/* Bottom Navigation */}
          <LessonNav
            courseId={courseId}
            navigation={navigation}
            isCompleted={progress.isCompleted}
            onMarkComplete={handleMarkComplete}
            isMarkingComplete={markComplete.isPending}
          />
        </div>

        {/* Right 4 Cols: Curriculum Sidebar */}
        <div className="lg:col-span-4 lg:sticky lg:top-20">
          <div className="h-[calc(100vh-140px)]">
            <CurriculumSidebar
              courseId={courseId}
              currentLessonId={lessonId}
              curriculum={curriculum}
              progressPercent={courseProgressPercent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LessonPlayerSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 w-full rounded-2xl bg-white/5" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="aspect-video w-full rounded-2xl bg-white/5" />
          <div className="h-16 w-full rounded-2xl bg-white/5" />
        </div>
        <div className="lg:col-span-4">
          <div className="h-[600px] w-full rounded-2xl bg-white/5" />
        </div>
      </div>
    </div>
  );
}
