"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Globe, Sparkles, Image as ImageIcon, Link as LinkIcon } from "lucide-react";

interface SeoFieldsPanelProps {
  seoTitle: string;
  seoDesc: string;
  ogImageUrl: string;
  canonicalUrl: string;
  postTitle?: string;
  postExcerpt?: string;
  onChange: (field: string, value: string) => void;
}

export function SeoFieldsPanel({
  seoTitle,
  seoDesc,
  ogImageUrl,
  canonicalUrl,
  postTitle = "",
  postExcerpt = "",
  onChange,
}: SeoFieldsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handlePrefill = () => {
    if (!seoTitle && postTitle) {
      onChange("seoTitle", postTitle.slice(0, 60));
    }
    if (!seoDesc && postExcerpt) {
      onChange("seoDesc", postExcerpt.slice(0, 160));
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Globe className="h-4 w-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Search Engine Optimization (SEO)</h3>
            <p className="text-xs text-slate-400">Meta tags, Open Graph preview image, and canonical URL</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {seoTitle ? (
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              Customized
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-500">Default fallback</span>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="p-5 border-t border-slate-800 space-y-4 bg-slate-950/40">
          {(postTitle || postExcerpt) && (!seoTitle || !seoDesc) && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePrefill}
                className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
              >
                <Sparkles className="h-3 w-3" />
                Pre-fill from post title & excerpt
              </button>
            </div>
          )}

          {/* Meta Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Meta Title
              </label>
              <span
                className={`text-[11px] font-medium ${
                  seoTitle.length > 60 ? "text-rose-400" : "text-slate-500"
                }`}
              >
                {seoTitle.length} / 60
              </span>
            </div>
            <input
              type="text"
              maxLength={70}
              value={seoTitle}
              onChange={(e) => onChange("seoTitle", e.target.value)}
              placeholder={postTitle ? `${postTitle} — LMS Blog` : "Optimized SEO title for search engines"}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Meta Description */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Meta Description
              </label>
              <span
                className={`text-[11px] font-medium ${
                  seoDesc.length > 160 ? "text-rose-400" : "text-slate-500"
                }`}
              >
                {seoDesc.length} / 160
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={180}
              value={seoDesc}
              onChange={(e) => onChange("seoDesc", e.target.value)}
              placeholder={postExcerpt || "Brief summary displayed under search engine results"}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* OG Image URL & Canonical URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3 text-slate-400" />
                Open Graph (OG) Image URL
              </label>
              <input
                type="url"
                value={ogImageUrl}
                onChange={(e) => onChange("ogImageUrl", e.target.value)}
                placeholder="https://cdn.domain.com/og/preview.png"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="h-3 w-3 text-slate-400" />
                Canonical URL
              </label>
              <input
                type="url"
                value={canonicalUrl}
                onChange={(e) => onChange("canonicalUrl", e.target.value)}
                placeholder="https://yourdomain.com/blog/my-post"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* SERP Google Search Preview */}
          <div className="mt-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
              Google Search Result Preview
            </span>
            <div className="space-y-1">
              <span className="text-xs text-slate-400 block truncate">
                https://yourdomain.com &rsaquo; blog &rsaquo; post-slug
              </span>
              <p className="text-sm font-medium text-indigo-400 truncate hover:underline cursor-pointer">
                {seoTitle || postTitle || "Post Title Goes Here"}
              </p>
              <p className="text-xs text-slate-300 line-clamp-2">
                {seoDesc || postExcerpt || "Post excerpt and meta description will appear in search snippet results..."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
