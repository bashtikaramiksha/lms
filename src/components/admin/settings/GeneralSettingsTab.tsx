"use client";

import React from "react";
import { Globe, Image as ImageIcon, Sparkles, BookOpen } from "lucide-react";

interface GeneralSettingsTabProps {
  siteName: string;
  setSiteName: (val: string) => void;
  logoUrl: string;
  setLogoUrl: (val: string) => void;
  faviconUrl: string;
  setFaviconUrl: (val: string) => void;
  footerText: string;
  setFooterText: (val: string) => void;
}

export function GeneralSettingsTab({
  siteName,
  setSiteName,
  logoUrl,
  setLogoUrl,
  faviconUrl,
  setFaviconUrl,
  footerText,
  setFooterText,
}: GeneralSettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Site Name */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-indigo-400" />
            Platform / Site Name
          </label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="e.g. LMS Platform"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Displayed in the navbar, browser tab title, and system notifications.
          </p>
        </div>
      </div>

      {/* Logo & Favicon URLs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo URL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg flex flex-col justify-between">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-indigo-400" />
              Brand Logo URL (PNG/SVG)
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://cdn.example.com/logo.png"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              Logo Live Preview:
            </span>
            <div className="h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Site Logo"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <div className="h-7 w-7 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span>{siteName || "Default Icon"}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Favicon URL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg flex flex-col justify-between">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Favicon URL (.ico / .png)
            </label>
            <input
              type="url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder="https://cdn.example.com/favicon.ico"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-400 block mb-2">
              Browser Tab Preview:
            </span>
            <div className="h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center px-4 gap-2">
              <div className="h-4 w-4 rounded bg-indigo-600 flex items-center justify-center overflow-hidden">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[9px] font-bold text-white">L</span>
                )}
              </div>
              <span className="text-xs text-slate-300 truncate">
                {siteName} — Online Learning
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Text */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Footer Copyright & Disclaimer Text
          </label>
          <textarea
            rows={2}
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="© 2026 LMS Platform, Inc. All rights reserved."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
