"use client";

import React from "react";
import { Megaphone, Sparkles, CheckCircle2 } from "lucide-react";

interface AnnouncementSettingsTabProps {
  announcementText: string;
  setAnnouncementText: (val: string) => void;
  announcementActive: boolean;
  setAnnouncementActive: (val: boolean) => void;
}

export function AnnouncementSettingsTab({
  announcementText,
  setAnnouncementText,
  announcementActive,
  setAnnouncementActive,
}: AnnouncementSettingsTabProps) {
  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
        {/* Toggle Active */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Megaphone className="h-4 w-4 text-indigo-400" />
              Enable Announcement Banner
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Renders a high-visibility sticky banner at the very top of all public pages.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={announcementActive}
              onChange={(e) => setAnnouncementActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Banner Text */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Announcement Message
            </label>
            <span
              className={`text-[10px] ${
                announcementText.length > 200 ? "text-amber-400 font-bold" : "text-slate-500"
              }`}
            >
              {announcementText.length} / 200
            </span>
          </div>
          <input
            type="text"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="e.g. 🎉 Special Offer: 50% discount on all Masterclasses with coupon CODE50!"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Live Banner Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3 shadow-lg">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Live Banner Preview</span>
        </div>

        <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 p-1">
          {announcementActive ? (
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-md flex items-center justify-center gap-2 rounded-lg">
              <Megaphone className="h-3.5 w-3.5 text-white/90 flex-shrink-0" />
              <span className="truncate">
                {announcementText || "Announcement banner text goes here..."}
              </span>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 italic">
              Announcement banner is currently disabled. Toggle &ldquo;Enable Announcement Banner&rdquo; to preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
