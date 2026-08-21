"use client";

import React from "react";
import { CtaBannerBlock } from "@/types/cms.types";
import { useBlockEditor } from "../BlockEditorState";
import { Link as LinkIcon, Palette } from "lucide-react";

interface CtaBannerBlockEditorProps {
  block: CtaBannerBlock;
}

const THEME_OPTIONS = [
  { label: "Indigo Gradient", value: "indigo", bg: "bg-indigo-600" },
  { label: "Purple Gradient", value: "purple", bg: "bg-purple-600" },
  { label: "Emerald Gradient", value: "emerald", bg: "bg-emerald-600" },
  { label: "Blue Gradient", value: "blue", bg: "bg-blue-600" },
  { label: "Dark Slate", value: "slate", bg: "bg-slate-800" },
];

export function CtaBannerBlockEditor({ block }: CtaBannerBlockEditorProps) {
  const { updateBlock } = useBlockEditor();

  return (
    <div className="space-y-4">
      {/* Heading */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          Banner Heading
        </label>
        <input
          type="text"
          value={block.heading}
          onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
          placeholder="e.g. Ready to level up your team?"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Subheading */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          Subheading Description
        </label>
        <textarea
          rows={2}
          value={block.subheading}
          onChange={(e) => updateBlock(block.id, { subheading: e.target.value })}
          placeholder="e.g. Talk to our enterprise advisors today."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      {/* CTA Button Label & Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            CTA Button Label
          </label>
          <input
            type="text"
            value={block.ctaLabel}
            onChange={(e) => updateBlock(block.id, { ctaLabel: e.target.value })}
            placeholder="e.g. Get Started Today"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <LinkIcon className="h-3 w-3 text-slate-400" />
            CTA Button Link (Href)
          </label>
          <input
            type="text"
            value={block.ctaHref}
            onChange={(e) => updateBlock(block.id, { ctaHref: e.target.value })}
            placeholder="e.g. /register"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Theme Picker */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Palette className="h-3 w-3 text-slate-400" />
          Color Theme
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = (block.bgColor || "indigo") === theme.value;
            return (
              <button
                key={theme.value}
                type="button"
                onClick={() => updateBlock(block.id, { bgColor: theme.value })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  isSelected
                    ? "bg-slate-900 border-indigo-500 text-white shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className={`h-3 w-3 rounded-full ${theme.bg}`} />
                <span>{theme.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
