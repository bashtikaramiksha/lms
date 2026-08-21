"use client";

import React from "react";
import { HeroBlock } from "@/types/cms.types";
import { useBlockEditor } from "../BlockEditorState";
import { Image as ImageIcon, Link as LinkIcon } from "lucide-react";

interface HeroBlockEditorProps {
  block: HeroBlock;
}

export function HeroBlockEditor({ block }: HeroBlockEditorProps) {
  const { updateBlock } = useBlockEditor();

  return (
    <div className="space-y-4">
      {/* Heading */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          Main Heading
        </label>
        <input
          type="text"
          value={block.heading}
          onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
          placeholder="e.g. About Our Platform"
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
          placeholder="e.g. Empowering students and teachers around the globe..."
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
            placeholder="e.g. Browse Courses"
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
            placeholder="e.g. /courses"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Background Image URL */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <ImageIcon className="h-3 w-3 text-slate-400" />
          Background / Banner Image URL (Optional)
        </label>
        <input
          type="url"
          value={block.bgImageUrl || ""}
          onChange={(e) => updateBlock(block.id, { bgImageUrl: e.target.value })}
          placeholder="https://images.unsplash.com/..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </div>
    </div>
  );
}
