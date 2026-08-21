"use client";

import React from "react";
import { Search, Image as ImageIcon, Sparkles } from "lucide-react";

interface SeoSettingsTabProps {
  seoDefaultTitle: string;
  setSeoDefaultTitle: (val: string) => void;
  seoDefaultDesc: string;
  setSeoDefaultDesc: (val: string) => void;
  seoOgImage: string;
  setSeoOgImage: (val: string) => void;
  siteName: string;
}

export function SeoSettingsTab({
  seoDefaultTitle,
  setSeoDefaultTitle,
  seoDefaultDesc,
  setSeoDefaultDesc,
  seoOgImage,
  setSeoOgImage,
  siteName,
}: SeoSettingsTabProps) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
        {/* SEO Title */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Default SEO Title
            </label>
            <span
              className={`text-[10px] ${
                seoDefaultTitle.length > 60 ? "text-amber-400 font-bold" : "text-slate-500"
              }`}
            >
              {seoDefaultTitle.length} / 60
            </span>
          </div>
          <input
            type="text"
            value={seoDefaultTitle}
            onChange={(e) => setSeoDefaultTitle(e.target.value)}
            placeholder="e.g. LMS Platform — Master Modern Tech & Architecture"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* SEO Description */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Default Meta Description
            </label>
            <span
              className={`text-[10px] ${
                seoDefaultDesc.length > 160 ? "text-amber-400 font-bold" : "text-slate-500"
              }`}
            >
              {seoDefaultDesc.length} / 160
            </span>
          </div>
          <textarea
            rows={3}
            value={seoDefaultDesc}
            onChange={(e) => setSeoDefaultDesc(e.target.value)}
            placeholder="e.g. Explore comprehensive engineering courses, expert tutorials, and practical software design..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {/* Default OG Image */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
            Default Open Graph / Social Share Image URL
          </label>
          <input
            type="url"
            value={seoOgImage}
            onChange={(e) => setSeoOgImage(e.target.value)}
            placeholder="https://cdn.example.com/og-cover.png"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Google SERP Live Simulation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Search className="h-3.5 w-3.5 text-indigo-400" />
          <span>Google Search SERP Preview</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1 max-w-xl">
          <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
            <span>https://lms-platform.com</span>
            <span className="text-slate-600">›</span>
          </div>
          <h4 className="text-sm font-bold text-indigo-400 hover:underline cursor-pointer truncate">
            {seoDefaultTitle || `${siteName} — Online Learning`}
          </h4>
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {seoDefaultDesc ||
              "Explore high-quality courses, tutorials, and career roadmaps taught by industry leaders."}
          </p>
        </div>
      </div>
    </div>
  );
}
