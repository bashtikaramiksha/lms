import React from "react";
import { Clock, CheckCircle2, FileEdit } from "lucide-react";

interface PostStatusBadgeProps {
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED" | string;
  className?: string;
}

export function PostStatusBadge({ status, className = "" }: PostStatusBadgeProps) {
  switch (status) {
    case "PUBLISHED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${className}`}
        >
          <CheckCircle2 className="h-3 w-3" />
          Published
        </span>
      );
    case "SCHEDULED":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 ${className}`}
        >
          <Clock className="h-3 w-3" />
          Scheduled
        </span>
      );
    case "DRAFT":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-700/50 text-slate-300 border border-slate-600/30 ${className}`}
        >
          <FileEdit className="h-3 w-3" />
          Draft
        </span>
      );
  }
}
