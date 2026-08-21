"use client";

import React from "react";
import { Lock, ArrowRight, Video } from "lucide-react";
import Link from "next/link";

interface EnrollToJoinBannerProps {
  courseId: string;
  courseTitle: string;
}

export const EnrollToJoinBanner: React.FC<EnrollToJoinBannerProps> = ({
  courseId,
  courseTitle,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-card/60 to-card/40 p-6 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
          <Lock className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-sm font-bold text-foreground">Live Sessions Included</h4>
          <p className="text-xs text-muted-foreground">
            Enroll in <strong className="text-foreground">"{courseTitle}"</strong> to get full access to live interactive workshops, Q&As, and lecture recordings.
          </p>
        </div>
      </div>

      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20 active:scale-95 whitespace-nowrap"
      >
        Enroll to Join <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
};
