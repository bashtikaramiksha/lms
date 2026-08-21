"use client";

import React from "react";
import { Share2 } from "lucide-react";

interface SocialSettingsTabProps {
  twitter: string;
  setTwitter: (val: string) => void;
  linkedin: string;
  setLinkedin: (val: string) => void;
  youtube: string;
  setYoutube: (val: string) => void;
  instagram: string;
  setInstagram: (val: string) => void;
}

export function SocialSettingsTab({
  twitter,
  setTwitter,
  linkedin,
  setLinkedin,
  youtube,
  setYoutube,
  instagram,
  setInstagram,
}: SocialSettingsTabProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
        <Share2 className="h-4 w-4 text-indigo-400" />
        <span>Official Social Channels & Profiles</span>
      </div>

      {/* Twitter / X */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          X (Twitter) Profile URL
        </label>
        <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs">
          <span className="px-3 text-slate-500 bg-slate-900/50 border-r border-slate-800 py-2.5 font-mono">
            twitter.com/
          </span>
          <input
            type="text"
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="yourcompany or https://x.com/yourcompany"
            className="w-full bg-transparent px-3 py-2.5 text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* LinkedIn */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          LinkedIn Company / Page URL
        </label>
        <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs">
          <span className="px-3 text-slate-500 bg-slate-900/50 border-r border-slate-800 py-2.5 font-mono">
            linkedin.com/company/
          </span>
          <input
            type="text"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="yourcompany or https://linkedin.com/company/yourcompany"
            className="w-full bg-transparent px-3 py-2.5 text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* YouTube */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          YouTube Channel URL
        </label>
        <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs">
          <span className="px-3 text-slate-500 bg-slate-900/50 border-r border-slate-800 py-2.5 font-mono">
            youtube.com/@
          </span>
          <input
            type="text"
            value={youtube}
            onChange={(e) => setYoutube(e.target.value)}
            placeholder="yourchannel"
            className="w-full bg-transparent px-3 py-2.5 text-slate-200 focus:outline-none"
          />
        </div>
      </div>

      {/* Instagram */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          Instagram Profile URL
        </label>
        <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs">
          <span className="px-3 text-slate-500 bg-slate-900/50 border-r border-slate-800 py-2.5 font-mono">
            instagram.com/
          </span>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="yourhandle"
            className="w-full bg-transparent px-3 py-2.5 text-slate-200 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
