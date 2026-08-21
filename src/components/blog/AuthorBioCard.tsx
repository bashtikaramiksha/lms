import React from "react";
import Link from "next/link";
import { User, Sparkles } from "lucide-react";

interface AuthorBioCardProps {
  author?: {
    id: string;
    fullName: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
  } | null;
}

export function AuthorBioCard({ author }: AuthorBioCardProps) {
  if (!author) return null;

  const initial = author.fullName ? author.fullName[0].toUpperCase() : "A";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-lg">
      {/* Avatar */}
      {author.avatarUrl ? (
        <img
          src={author.avatarUrl}
          alt={author.fullName || "Author"}
          className="h-16 w-16 rounded-2xl object-cover border border-slate-700 shadow-md flex-shrink-0"
        />
      ) : (
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-xl font-bold text-white shadow-md shadow-indigo-500/20 flex-shrink-0">
          {initial}
        </div>
      )}

      {/* Bio Details */}
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="text-base font-bold text-white tracking-tight">
            {author.fullName || "LMS Educator"}
          </h4>
          <span className="text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Author & Instructor
          </span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
          {author.bio ||
            "Educator and software practitioner passionate about sharing real-world skills and guiding students toward building production-grade applications."}
        </p>
      </div>
    </div>
  );
}
