"use client";

import React, { useState } from "react";
import { Megaphone, X } from "lucide-react";

interface AnnouncementBannerProps {
  text: string;
  active?: boolean;
}

export function AnnouncementBanner({ text, active = true }: AnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (!active || !text || dismissed) return null;

  return (
    <div className="relative z-50 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 pr-6 sm:pr-0">
        <Megaphone className="h-3.5 w-3.5 text-white/90 flex-shrink-0 animate-bounce" />
        <span className="truncate">{text}</span>
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        title="Dismiss announcement"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
