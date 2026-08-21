"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Save,
  Send,
  Calendar,
  AlertCircle,
  ArrowLeft,
  Image as ImageIcon,
  FolderPlus,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { TipTapEditor } from "./TipTapEditor";
import { SeoFieldsPanel } from "./SeoFieldsPanel";
import { SchedulingPanel } from "./SchedulingPanel";
import { TagSelector, TagOption } from "./TagSelector";

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

export interface PostFormData {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage: string;
  categoryId: string;
  tagIds: string[];
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED";
  scheduledFor: string;
  seoTitle: string;
  seoDesc: string;
  ogImageUrl: string;
  canonicalUrl: string;
}

interface PostEditorFormProps {
  initialData?: Partial<PostFormData>;
  categories: CategoryOption[];
  availableTags?: TagOption[];
  baseRoute: "/admin/blog" | "/teacher/blog";
  isEdit?: boolean;
}

export function PostEditorForm({
  initialData = {},
  categories: initialCategories,
  availableTags = [],
  baseRoute,
  isEdit = false,
}: PostEditorFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<PostFormData>({
    id: initialData.id || "",
    title: initialData.title || "",
    slug: initialData.slug || "",
    excerpt: initialData.excerpt || "",
    content: initialData.content || "",
    featuredImage: initialData.featuredImage || "",
    categoryId: initialData.categoryId || "",
    tagIds: initialData.tagIds || [],
    status: initialData.status || "DRAFT",
    scheduledFor: initialData.scheduledFor || "",
    seoTitle: initialData.seoTitle || "",
    seoDesc: initialData.seoDesc || "",
    ogImageUrl: initialData.ogImageUrl || "",
    canonicalUrl: initialData.canonicalUrl || "",
  });

  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(!!initialData.slug);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New category modal state
  const [isNewCatModalOpen, setIsNewCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [isCreatingCat, setIsCreatingCat] = useState(false);

  // Auto-generate slug when title changes unless slug was manually edited
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title: newTitle,
      slug: isSlugManuallyEdited ? prev.slug : generateSlug(newTitle),
    }));
  };

  const handleRegenerateSlug = () => {
    const autoSlug = generateSlug(formData.title);
    setFormData((prev) => ({ ...prev, slug: autoSlug }));
    setIsSlugManuallyEdited(false);
  };

  const handleFieldChange = (field: keyof PostFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || isCreatingCat) return;

    setIsCreatingCat(true);
    const slug = generateSlug(newCatName);

    try {
      const res = await fetch("/api/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCatName.trim(), slug }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setCategories((prev) => [...prev, data.data]);
        setFormData((prev) => ({ ...prev, categoryId: data.data.id }));
        setNewCatName("");
        setIsNewCatModalOpen(false);
      } else {
        alert(data.error?.message || "Failed to create category");
      }
    } catch (err: any) {
      alert(err.message || "Failed to create category");
    } finally {
      setIsCreatingCat(false);
    }
  };

  const handleSubmit = async (overrideStatus?: "DRAFT" | "PUBLISHED" | "SCHEDULED") => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const submitStatus = overrideStatus || formData.status;

    if (!formData.title.trim()) {
      setErrorMsg("Please enter a title for the blog post.");
      return;
    }

    if (!formData.slug.trim()) {
      setErrorMsg("Please enter or generate a slug.");
      return;
    }

    if (submitStatus === "SCHEDULED") {
      if (!formData.scheduledFor) {
        setErrorMsg("Please select a future date and time for scheduled publishing.");
        return;
      }
      if (new Date(formData.scheduledFor).getTime() <= Date.now()) {
        setErrorMsg("Scheduled date must be set in the future.");
        return;
      }
    }

    setIsSubmitting(true);

    const payload = {
      ...formData,
      status: submitStatus,
      scheduledFor: submitStatus === "SCHEDULED" ? new Date(formData.scheduledFor).toISOString() : null,
      categoryId: formData.categoryId || null,
      featuredImage: formData.featuredImage || null,
      ogImageUrl: formData.ogImageUrl || null,
      canonicalUrl: formData.canonicalUrl || null,
    };

    try {
      const url = isEdit ? `/api/blog/posts/${formData.id}` : "/api/blog/posts";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();

      if (!res.ok || !resData.success) {
        throw new Error(resData.error?.message || "Failed to save blog post");
      }

      setSuccessMsg(
        submitStatus === "PUBLISHED"
          ? "Post published successfully!"
          : submitStatus === "SCHEDULED"
          ? "Post scheduled for publication!"
          : "Draft saved successfully!"
      );

      setTimeout(() => {
        router.push(baseRoute);
        router.refresh();
      }, 1000);
    } catch (err: any) {
      console.error("Save error:", err);
      setErrorMsg(err.message || "Failed to save post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={baseRoute}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {isEdit ? "Edit Blog Post" : "Create New Blog Post"}
            </h1>
            <p className="text-xs text-slate-400">
              {isEdit
                ? "Update content, SEO fields, or publishing schedule"
                : "Draft a new article, optimize for search engines, and publish or schedule"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit("DRAFT")}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white transition-all flex items-center gap-2"
          >
            <Save className="h-3.5 w-3.5 text-slate-400" />
            Save Draft
          </button>

          {formData.status === "SCHEDULED" ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit("SCHEDULED")}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Calendar className="h-3.5 w-3.5" />
              )}
              Schedule Post
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit("PUBLISHED")}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Publish Now
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2 Cols) - Main Article Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Title */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Post Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={handleTitleChange}
              placeholder="e.g. 10 Essential JavaScript Concepts Every Developer Must Know"
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3.5 text-base font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Slug input with auto-generate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                URL Slug <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={handleRegenerateSlug}
                className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Auto-generate
              </button>
            </div>
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2">
              <span className="text-xs text-slate-500 select-none">/blog/</span>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => {
                  setIsSlugManuallyEdited(true);
                  handleFieldChange("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="10-essential-javascript-concepts"
                className="flex-1 bg-transparent text-xs text-slate-200 outline-none px-1"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Excerpt / Summary
              </label>
              <span className="text-[11px] text-slate-500">{formData.excerpt.length} / 500</span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={formData.excerpt}
              onChange={(e) => handleFieldChange("excerpt", e.target.value)}
              placeholder="A short, catchy summary that appears on blog cards and search listings..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* TipTap Rich Editor */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Article Body Content
            </label>
            <TipTapEditor
              content={formData.content}
              onChange={(html) => handleFieldChange("content", html)}
            />
          </div>

          {/* SEO Collapsible Panel */}
          <SeoFieldsPanel
            seoTitle={formData.seoTitle}
            seoDesc={formData.seoDesc}
            ogImageUrl={formData.ogImageUrl}
            canonicalUrl={formData.canonicalUrl}
            postTitle={formData.title}
            postExcerpt={formData.excerpt}
            onChange={(field, value) => handleFieldChange(field as any, value)}
          />
        </div>

        {/* Right Column (1 Col) - Sidebar Settings */}
        <div className="space-y-6">
          {/* Scheduling & Status */}
          <SchedulingPanel
            status={formData.status}
            scheduledFor={formData.scheduledFor}
            onChangeStatus={(st) => handleFieldChange("status", st)}
            onChangeScheduledFor={(dt) => handleFieldChange("scheduledFor", dt)}
          />

          {/* Category Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Category
              </label>
              <button
                type="button"
                onClick={() => setIsNewCatModalOpen(true)}
                className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <FolderPlus className="h-3 w-3" /> New
              </button>
            </div>

            <select
              value={formData.categoryId}
              onChange={(e) => handleFieldChange("categoryId", e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select a category (Optional)</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <TagSelector
              selectedTagIds={formData.tagIds}
              onChange={(tagIds) => handleFieldChange("tagIds", tagIds)}
              availableTags={availableTags}
            />
          </div>

          {/* Featured Image */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Featured Image
            </label>
            <div className="relative">
              <input
                type="url"
                value={formData.featuredImage}
                onChange={(e) => handleFieldChange("featuredImage", e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {formData.featuredImage ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
                <img
                  src={formData.featuredImage}
                  alt="Featured preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-xs text-white font-medium">Image Preview</span>
                </div>
              </div>
            ) : (
              <div className="aspect-video rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs gap-1.5 bg-slate-950/40">
                <ImageIcon className="h-6 w-6 text-slate-600" />
                <span>Provide an image URL above</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Category Modal */}
      {isNewCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create New Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Web Development"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCatModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCat || !newCatName.trim()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg transition-colors"
                >
                  {isCreatingCat ? "Creating..." : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
