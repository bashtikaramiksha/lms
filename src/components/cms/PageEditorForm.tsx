"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Globe,
  Lock,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  Link as LinkIcon,
  Navigation,
  Eye,
} from "lucide-react";
import { ContentBlock } from "@/types/cms.types";
import { useBlockEditor } from "./BlockEditor/BlockEditorState";
import { BlockEditorCanvas } from "./BlockEditor/BlockEditorCanvas";

interface PageEditorFormProps {
  initialData?: {
    id: string;
    title: string;
    slug: string;
    blocks: ContentBlock[];
    status: "DRAFT" | "PUBLISHED";
    inNav: boolean | null;
    navLabel: string | null;
    seoTitle: string | null;
    seoDesc: string | null;
    ogImageUrl: string | null;
  };
  isEditing?: boolean;
}

export function PageEditorForm({
  initialData,
  isEditing = false,
}: PageEditorFormProps) {
  const router = useRouter();
  const { blocks, setBlocks } = useBlockEditor();

  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugLocked, setSlugLocked] = useState(isEditing);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    initialData?.status || "DRAFT"
  );
  const [inNav, setInNav] = useState(initialData?.inNav || false);
  const [navLabel, setNavLabel] = useState(initialData?.navLabel || "");

  // SEO fields
  const [seoExpanded, setSeoExpanded] = useState(false);
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || "");
  const [seoDesc, setSeoDesc] = useState(initialData?.seoDesc || "");
  const [ogImageUrl, setOgImageUrl] = useState(initialData?.ogImageUrl || "");

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Initialize store blocks on mount
  useEffect(() => {
    if (initialData?.blocks) {
      setBlocks(initialData.blocks);
    } else {
      setBlocks([]);
    }
  }, [initialData, setBlocks]);

  // Auto-slugify title if not locked
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugLocked) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setSlug(generated);
    }
  };

  const handleSave = async (targetStatus?: "DRAFT" | "PUBLISHED") => {
    setErrorMsg("");
    setSaving(true);

    const effectiveStatus = targetStatus || status;

    if (!title.trim()) {
      setErrorMsg("Please provide a page title");
      setSaving(false);
      return;
    }

    if (!slug.trim()) {
      setErrorMsg("Please provide a valid URL slug");
      setSaving(false);
      return;
    }

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      blocks,
      status: effectiveStatus,
      inNav,
      navLabel: navLabel.trim() || null,
      seoTitle: seoTitle.trim() || null,
      seoDesc: seoDesc.trim() || null,
      ogImageUrl: ogImageUrl.trim() || null,
    };

    try {
      const url = isEditing
        ? `/api/cms/pages/${initialData?.id}`
        : "/api/cms/pages";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "SLUG_CONFLICT") {
          throw new Error("A page with this URL slug already exists. Please choose another.");
        }
        throw new Error(data.error?.message || "Failed to save static page");
      }

      router.push("/admin/cms");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cms"
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {isEditing ? `Edit: ${initialData?.title}` : "Create Static CMS Page"}
            </h1>
            <p className="text-xs text-slate-400">
              Build custom static content with reusable design blocks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {isEditing && status === "PUBLISHED" && (
            <Link
              href={`/${slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition-all"
            >
              <Eye className="h-3.5 w-3.5" /> Preview Public
            </Link>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("DRAFT")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("PUBLISHED")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>{status === "PUBLISHED" ? "Update & Publish" : "Publish Live"}</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-semibold text-rose-400">
          {errorMsg}
        </div>
      )}

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Main Details & Block Canvas */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Slug */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Page Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g. About Us, Terms of Service, FAQ"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Public URL Slug
                </label>
                <button
                  type="button"
                  onClick={() => setSlugLocked(!slugLocked)}
                  className="text-[11px] font-semibold text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {slugLocked ? <Lock className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                  {slugLocked ? "Unlock Slug" : "Auto Slug"}
                </button>
              </div>

              <div className="flex items-center rounded-xl bg-slate-950 border border-slate-800 overflow-hidden text-xs">
                <span className="px-3 text-slate-500 bg-slate-900/50 border-r border-slate-800 py-2.5">
                  /
                </span>
                <input
                  type="text"
                  disabled={slugLocked}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="about-us"
                  className="w-full bg-transparent px-3 py-2.5 text-slate-200 focus:outline-none disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Block Canvas */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white tracking-tight">
              Page Content Blocks
            </h3>
            <BlockEditorCanvas />
          </div>
        </div>

        {/* Right 1 Col: Nav Settings & SEO Panel */}
        <div className="space-y-6">
          {/* Navigation Bar Settings */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Navigation className="h-4 w-4 text-indigo-400" />
              <span>Navigation Menu</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-xs font-bold text-white block">
                  Show in Top Navbar
                </span>
                <span className="text-[11px] text-slate-500">
                  Adds link to platform header
                </span>
              </div>
              <input
                type="checkbox"
                checked={inNav}
                onChange={(e) => setInNav(e.target.checked)}
                className="h-4 w-4 rounded accent-indigo-600"
              />
            </div>

            {inNav && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Navbar Display Label
                </label>
                <input
                  type="text"
                  value={navLabel}
                  onChange={(e) => setNavLabel(e.target.value)}
                  placeholder={title || "e.g. About"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Collapsible SEO Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <button
              type="button"
              onClick={() => setSeoExpanded(!seoExpanded)}
              className="w-full flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-indigo-400" />
                <span>SEO & Social Preview</span>
              </div>
              {seoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {seoExpanded && (
              <div className="space-y-4 pt-2 border-t border-slate-800">
                {/* SEO Title */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      SEO Meta Title
                    </label>
                    <span
                      className={`text-[10px] ${
                        seoTitle.length > 60 ? "text-amber-400 font-bold" : "text-slate-500"
                      }`}
                    >
                      {seoTitle.length} / 60
                    </span>
                  </div>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title ? `${title} — LMS Platform` : "Page SEO Title"}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* SEO Description */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      Meta Description
                    </label>
                    <span
                      className={`text-[10px] ${
                        seoDesc.length > 160 ? "text-amber-400 font-bold" : "text-slate-500"
                      }`}
                    >
                      {seoDesc.length} / 160
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={seoDesc}
                    onChange={(e) => setSeoDesc(e.target.value)}
                    placeholder="Brief summary for search engine snippet..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* OG Image */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Open Graph Share Image URL
                  </label>
                  <input
                    type="url"
                    value={ogImageUrl}
                    onChange={(e) => setOgImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
