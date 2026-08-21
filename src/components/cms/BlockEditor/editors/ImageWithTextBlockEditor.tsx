"use client";

import React from "react";
import { ImageWithTextBlock } from "@/types/cms.types";
import { useBlockEditor } from "../BlockEditorState";
import { Image as ImageIcon, Layout } from "lucide-react";

interface ImageWithTextBlockEditorProps {
  block: ImageWithTextBlock;
}

export function ImageWithTextBlockEditor({ block }: ImageWithTextBlockEditorProps) {
  const { updateBlock } = useBlockEditor();

  return (
    <div className="space-y-4">
      {/* Heading */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          Section Heading
        </label>
        <input
          type="text"
          value={block.heading}
          onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
          placeholder="e.g. World-Class Instructors"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Body Text */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          Body Text
        </label>
        <textarea
          rows={3}
          value={block.body}
          onChange={(e) => updateBlock(block.id, { body: e.target.value })}
          placeholder="Detailed description or paragraph explaining the feature..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
        />
      </div>

      {/* Image URL & Alt */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3 text-slate-400" />
            Image URL
          </label>
          <input
            type="url"
            value={block.imageUrl}
            onChange={(e) => updateBlock(block.id, { imageUrl: e.target.value })}
            placeholder="https://images.unsplash.com/..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Image Alt Text (Accessibility)
          </label>
          <input
            type="text"
            value={block.imageAlt}
            onChange={(e) => updateBlock(block.id, { imageAlt: e.target.value })}
            placeholder="e.g. Instructor teaching students"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Image Position Toggle */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Layout className="h-3 w-3 text-slate-400" />
          Image Alignment
        </label>
        <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => updateBlock(block.id, { imageLeft: true })}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              block.imageLeft
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Image on Left
          </button>
          <button
            type="button"
            onClick={() => updateBlock(block.id, { imageLeft: false })}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              !block.imageLeft
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Image on Right
          </button>
        </div>
      </div>
    </div>
  );
}
