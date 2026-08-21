"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  DollarSign,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  FileText,
  Layers,
  Sparkles,
  Globe,
  Send,
  Check,
  X,
  AlertTriangle,
  Archive,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import CurriculumBuilder from "@/components/curriculum/curriculum-builder";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ChecklistItem {
  name: string;
  label: string;
  passed: boolean;
  message?: string;
}

interface PublishChecklistData {
  ready: boolean;
  failures: string[];
  checks: ChecklistItem[];
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id as string;

  const [activeTab, setActiveTab] = useState<"details" | "curriculum" | "seo" | "publish">("details");
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    shortDesc: "",
    description: "",
    categoryId: "",
    level: "BEGINNER" as "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
    language: "English",
    type: "RECORDED" as "RECORDED" | "LIVE",
    isFree: false,
    price: 49.99,
    discountPrice: "" as string | number,
    accessDuration: "" as string | number,
    thumbnailUrl: "",
    previewUrl: "",
    status: "DRAFT",
    seoTitle: "",
    seoDesc: "",
    ogImageUrl: "",
    slug: "",
  });

  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);

  // Publish Checklist state
  const [checklist, setChecklist] = useState<PublishChecklistData | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Load Course & Categories
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fetch Categories
        const catRes = await fetch("/api/categories");
        const catJson = await catRes.json();
        if (catJson.success) {
          setCategories(catJson.data);
        }

        // Fetch Course
        if (courseId) {
          const courseRes = await fetch(`/api/courses/${courseId}`);
          const courseJson = await courseRes.json();
          if (courseJson.success && courseJson.data) {
            const c = courseJson.data;
            setFormData({
              title: c.title || "",
              shortDesc: c.shortDesc || "",
              description: c.description || "",
              categoryId: c.categoryId || "",
              level: c.level || "BEGINNER",
              language: c.language || "English",
              type: c.type || "RECORDED",
              isFree: c.price === 0,
              price: c.price ?? 49.99,
              discountPrice: c.discountPrice ?? "",
              accessDuration: c.accessDuration ?? "",
              thumbnailUrl: c.thumbnailUrl || "",
              previewUrl: c.previewUrl || "",
              status: c.status || "DRAFT",
              seoTitle: c.seoTitle || "",
              seoDesc: c.seoDesc || "",
              ogImageUrl: c.ogImageUrl || "",
              slug: c.slug || "",
            });
            if (c.thumbnailUrl) {
              setThumbnailPreview(c.thumbnailUrl);
            }
          }
        }
      } catch (err) {
        console.error("Error loading course:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [courseId]);

  // Load publish checklist when switching to publish tab
  const fetchChecklist = async () => {
    if (!courseId) return;
    try {
      setLoadingChecklist(true);
      const res = await fetch(`/api/courses/${courseId}/publish-checklist`);
      const data = await res.json();
      if (data.success) {
        setChecklist(data.data);
      }
    } catch (err) {
      console.error("Failed to load checklist:", err);
    } finally {
      setLoadingChecklist(false);
    }
  };

  useEffect(() => {
    if (activeTab === "publish") {
      fetchChecklist();
    }
  }, [activeTab, courseId]);

  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({ ...prev, thumbnail: "Supported formats: JPEG, PNG, WebP" }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, thumbnail: "File exceeds 5MB limit" }));
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setThumbnailPreview(localUrl);

    try {
      setUploadingThumbnail(true);
      const presignRes = await fetch("/api/uploads/course-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error(presignData.error?.message);

      const { uploadUrl, publicUrl, isDevLocal } = presignData.data;

      const uploadRes = await fetch(uploadUrl, {
        method: isDevLocal ? "POST" : "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Upload failed");

      setFormData((prev) => ({ ...prev, thumbnailUrl: publicUrl }));
      setThumbnailPreview(publicUrl);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, thumbnail: err.message || "Failed to upload thumbnail" }));
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!formData.title.trim() || formData.title.trim().length < 10) {
      setErrors({ title: "Title must be at least 10 characters" });
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError(null);
      setSavedSuccess(null);

      const payload = {
        title: formData.title.trim(),
        shortDesc: formData.shortDesc.trim() || undefined,
        description: formData.description || undefined,
        type: formData.type,
        level: formData.level,
        language: formData.language,
        price: formData.isFree ? 0 : Number(formData.price),
        discountPrice:
          !formData.isFree && formData.discountPrice !== ""
            ? Number(formData.discountPrice)
            : null,
        accessDuration:
          formData.accessDuration !== ""
            ? Number(formData.accessDuration)
            : null,
        categoryId: formData.categoryId || null,
        thumbnailUrl: formData.thumbnailUrl || null,
        previewUrl: formData.previewUrl || null,
      };

      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update course");
      }

      setSavedSuccess("Course details saved!");
      setTimeout(() => setSavedSuccess(null), 3000);
    } catch (err: any) {
      setServerError(err.message || "Error updating course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSeo = async () => {
    try {
      setIsSubmitting(true);
      setServerError(null);
      setSavedSuccess(null);
      setErrors({});

      const payload = {
        seoTitle: formData.seoTitle.trim() || null,
        seoDesc: formData.seoDesc.trim() || null,
        ogImageUrl: formData.ogImageUrl.trim() || null,
      };

      const res = await fetch(`/api/courses/${courseId}/seo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update SEO settings");
      }

      setSavedSuccess("SEO metadata saved!");
      setTimeout(() => setSavedSuccess(null), 3000);
    } catch (err: any) {
      setServerError(err.message || "Error saving SEO");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitForReview = async () => {
    try {
      setActionLoading(true);
      setServerError(null);

      const res = await fetch(`/api/courses/${courseId}/submit`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg =
          data.error?.details && Array.isArray(data.error.details)
            ? `${data.error.message}\n• ${data.error.details.join("\n• ")}`
            : data.error?.message || "Failed to submit course for review";
        throw new Error(errorMsg);
      }

      setFormData((prev) => ({ ...prev, status: "PENDING_REVIEW" }));
      setSavedSuccess("Course successfully submitted for review!");
      await fetchChecklist();
    } catch (err: any) {
      setServerError(err.message || "Failed to submit course");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishCourse = async () => {
    try {
      setActionLoading(true);
      setServerError(null);

      const res = await fetch(`/api/courses/${courseId}/publish`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to publish course");
      }

      setFormData((prev) => ({ ...prev, status: "PUBLISHED" }));
      setSavedSuccess("Course is now LIVE and published!");
      await fetchChecklist();
    } catch (err: any) {
      setServerError(err.message || "Failed to publish course");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveCourse = async () => {
    try {
      setActionLoading(true);
      setServerError(null);

      const res = await fetch(`/api/courses/${courseId}/archive`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to archive course");
      }

      setFormData((prev) => ({ ...prev, status: "ARCHIVED" }));
      setSavedSuccess("Course has been archived.");
      await fetchChecklist();
    } catch (err: any) {
      setServerError(err.message || "Failed to archive course");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "PENDING_REVIEW":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "ARCHIVED":
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/teacher/dashboard"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Course Studio
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${getStatusBadge(
                    formData.status
                  )}`}
                >
                  {formData.status.replace("_", " ")}
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight truncate max-w-md">
                {formData.title || "Course Draft"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-semibold hidden sm:flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> {savedSuccess}
              </span>
            )}
            {activeTab === "details" && (
              <button
                onClick={handleUpdateCourse}
                disabled={isSubmitting || uploadingThumbnail || formData.status === "PUBLISHED"}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs sm:text-sm inline-flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Save Details
                  </>
                )}
              </button>
            )}
            {activeTab === "seo" && (
              <button
                onClick={handleSaveSeo}
                disabled={isSubmitting || formData.status === "PUBLISHED" || formData.status === "ARCHIVED"}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs sm:text-sm inline-flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving SEO...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Save SEO
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {serverError && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm font-medium whitespace-pre-line">{serverError}</div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/40 pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab("details")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "details"
                ? "bg-primary text-primary-foreground shadow-md shadow-blue-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <FileText className="h-4 w-4" /> Course Details
          </button>
          <button
            onClick={() => setActiveTab("curriculum")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "curriculum"
                ? "bg-primary text-primary-foreground shadow-md shadow-blue-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Layers className="h-4 w-4" /> Curriculum Builder
          </button>
          <button
            onClick={() => setActiveTab("seo")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "seo"
                ? "bg-primary text-primary-foreground shadow-md shadow-blue-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Globe className="h-4 w-4" /> SEO & Social
          </button>
          <button
            onClick={() => setActiveTab("publish")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 shrink-0 ${
              activeTab === "publish"
                ? "bg-primary text-primary-foreground shadow-md shadow-blue-500/20"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <Send className="h-4 w-4" /> Publishing & Review
          </button>
        </div>

        {/* Tab 1: Course Details */}
        {activeTab === "details" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 rounded-2xl space-y-5 border border-border/50">
                <h2 className="text-base font-bold flex items-center gap-2 border-b border-border/40 pb-3">
                  <FileText className="h-4 w-4 text-primary" /> Basic Information
                </h2>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Course Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    maxLength={120}
                    disabled={formData.status === "PUBLISHED"}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  />
                  {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Subtitle / Short Description</label>
                  <input
                    type="text"
                    value={formData.shortDesc}
                    onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                    maxLength={200}
                    disabled={formData.status === "PUBLISHED"}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Category</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      disabled={formData.status === "PUBLISHED"}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Difficulty Level</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                      disabled={formData.status === "PUBLISHED"}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm cursor-pointer"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">Detailed Description</label>
                  <textarea
                    rows={6}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={formData.status === "PUBLISHED"}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm resize-y"
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="glass-card p-6 rounded-2xl space-y-5 border border-border/50">
                <h2 className="text-base font-bold flex items-center gap-2 border-b border-border/40 pb-3">
                  <DollarSign className="h-4 w-4 text-primary" /> Pricing & Format
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Price ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      disabled={formData.status === "PUBLISHED"}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold mb-1.5">Discount Price ($ USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Optional"
                      value={formData.discountPrice}
                      disabled={formData.status === "PUBLISHED"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountPrice: e.target.value === "" ? "" : parseFloat(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar / Media */}
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl space-y-4 border border-border/50">
                <h2 className="text-base font-bold flex items-center gap-2 border-b border-border/40 pb-3">
                  <ImageIcon className="h-4 w-4 text-primary" /> Course Thumbnail
                </h2>

                <div className="aspect-video rounded-xl bg-slate-900 overflow-hidden border border-border/60 flex items-center justify-center relative">
                  {thumbnailPreview ? (
                    <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-muted-foreground p-4">
                      <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-40" />
                      <span className="text-xs">No thumbnail</span>
                    </div>
                  )}
                </div>

                {formData.status !== "PUBLISHED" && (
                  <div>
                    <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase">
                      Change Thumbnail
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleThumbnailChange}
                      disabled={uploadingThumbnail}
                      className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                    {uploadingThumbnail && (
                      <p className="text-xs text-primary mt-1.5 animate-pulse">Uploading new thumbnail...</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Curriculum Builder */}
        {activeTab === "curriculum" && (
          <div className="animate-in fade-in">
            <CurriculumBuilder courseId={courseId} courseTitle={formData.title} />
          </div>
        )}

        {/* Tab 3: SEO & Social Settings */}
        {activeTab === "seo" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-card p-6 rounded-2xl space-y-5 border border-border/50">
                <div className="border-b border-border/40 pb-3">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" /> Search Engine Optimization (SEO)
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Control how your course appears on search engines like Google, Bing, and social shares.
                  </p>
                </div>

                {/* SEO Title */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold">SEO Title</label>
                    <span
                      className={`text-xs ${
                        formData.seoTitle.length >= 10 && formData.seoTitle.length <= 70
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formData.seoTitle.length} / 70 chars (min 10)
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder={formData.title ? `${formData.title} | LMS Platform` : "e.g. Master Next.js 15 & React — Complete Guide"}
                    value={formData.seoTitle}
                    onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                    maxLength={70}
                    disabled={formData.status === "PUBLISHED" || formData.status === "ARCHIVED"}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 50–60 characters. Leave blank to default to course title.
                  </p>
                </div>

                {/* SEO Description */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-semibold">SEO Meta Description</label>
                    <span
                      className={`text-xs ${
                        formData.seoDesc.length >= 50 && formData.seoDesc.length <= 160
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formData.seoDesc.length} / 160 chars (min 50)
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Concise, compelling overview explaining what students will master in this course..."
                    value={formData.seoDesc}
                    onChange={(e) => setFormData({ ...formData, seoDesc: e.target.value })}
                    maxLength={160}
                    disabled={formData.status === "PUBLISHED" || formData.status === "ARCHIVED"}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm resize-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 120–160 characters for optimal click-through rates on search engines.
                  </p>
                </div>

                {/* OG Image URL */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Open Graph (Social Share) Image URL</label>
                  <input
                    type="url"
                    placeholder="https://cdn.example.com/og-banner.jpg"
                    value={formData.ogImageUrl}
                    onChange={(e) => setFormData({ ...formData, ogImageUrl: e.target.value })}
                    disabled={formData.status === "PUBLISHED" || formData.status === "ARCHIVED"}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/30 focus:border-primary text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Dimensions: 1200x630px recommended. Defaults to course thumbnail if empty.
                  </p>
                </div>
              </div>
            </div>

            {/* Live Search Preview Card */}
            <div className="space-y-6">
              <div className="glass-card p-6 rounded-2xl space-y-4 border border-border/50">
                <h3 className="text-sm font-bold flex items-center gap-2 border-b border-border/40 pb-3">
                  <Sparkles className="h-4 w-4 text-primary" /> Google SERP Preview
                </h3>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <span className="text-slate-300">lmsplatform.com</span>
                    <span>›</span>
                    <span className="text-slate-400">courses</span>
                    <span>›</span>
                    <span className="text-slate-400">{formData.slug || "course-slug"}</span>
                  </div>
                  <h4 className="text-sm font-semibold text-blue-400 hover:underline cursor-pointer truncate">
                    {formData.seoTitle || formData.title || "Course Title | LMS Platform"}
                  </h4>
                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {formData.seoDesc ||
                      formData.shortDesc ||
                      formData.description?.slice(0, 150) ||
                      "Explore this comprehensive course. Learn practical skills with hands-on projects and expert instruction."}
                  </p>
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Social Card Preview
                  </h4>
                  <div className="rounded-xl overflow-hidden border border-border/60 bg-slate-950">
                    <div className="aspect-video w-full bg-slate-900 overflow-hidden relative">
                      {formData.ogImageUrl || thumbnailPreview ? (
                        <img
                          src={formData.ogImageUrl || thumbnailPreview || ""}
                          alt="OG Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8 opacity-30" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-slate-900/60 border-t border-border/40">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {formData.seoTitle || formData.title || "Course Title"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">lmsplatform.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Publishing & Review */}
        {activeTab === "publish" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Status Hero Card */}
            <div className="glass-card p-6 rounded-2xl border border-border/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current Lifecycle Status
                </span>
                <div className="flex items-center gap-3 mt-1">
                  <h2 className="text-xl font-bold">{formData.status.replace("_", " ")}</h2>
                  <span
                    className={`text-xs px-3 py-1 rounded-full border font-semibold ${getStatusBadge(
                      formData.status
                    )}`}
                  >
                    {formData.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {formData.status === "DRAFT" &&
                    "Your course is in draft mode. Complete all requirements on the checklist below before submitting for review."}
                  {formData.status === "PENDING_REVIEW" &&
                    "Your course has been submitted for review! An administrator will evaluate your curriculum and publish it live."}
                  {formData.status === "PUBLISHED" &&
                    "Your course is live and publicly available in the course catalog."}
                  {formData.status === "ARCHIVED" &&
                    "This course is archived and hidden from public search. Existing students retain access."}
                </p>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {formData.status === "DRAFT" && (
                  <button
                    onClick={handleSubmitForReview}
                    disabled={actionLoading || (checklist ? !checklist.ready : false)}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Submit for Review
                      </>
                    )}
                  </button>
                )}

                {formData.status === "PENDING_REVIEW" && (
                  <button
                    onClick={handlePublishCourse}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-500 text-sm inline-flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Publishing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Approve & Publish (Admin)
                      </>
                    )}
                  </button>
                )}

                {formData.status === "PUBLISHED" && (
                  <button
                    onClick={handleArchiveCourse}
                    disabled={actionLoading}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 text-sm inline-flex items-center justify-center gap-2 border border-slate-700 transition-all disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Archiving...
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" /> Archive Course
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* 8-Point Publish Readiness Checklist */}
            <div className="glass-card p-6 rounded-2xl border border-border/50 space-y-6">
              <div className="flex items-center justify-between border-b border-border/40 pb-4">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" /> Publish Readiness Checklist
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    All 8 quality and completeness criteria must pass before review submission or publishing.
                  </p>
                </div>
                {checklist && (
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                      checklist.ready
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {checklist.ready ? "100% Ready to Publish" : `${checklist.failures.length} Issue(s) Pending`}
                  </span>
                )}
              </div>

              {loadingChecklist ? (
                <div className="py-12 flex items-center justify-center text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" /> Checking requirements...
                </div>
              ) : checklist ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {checklist.checks.map((check) => (
                    <div
                      key={check.name}
                      className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all ${
                        check.passed
                          ? "bg-emerald-950/20 border-emerald-500/20"
                          : "bg-destructive/10 border-destructive/20"
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-full mt-0.5 shrink-0 ${
                          check.passed
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {check.passed ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            check.passed ? "text-emerald-300" : "text-destructive"
                          }`}
                        >
                          {check.label}
                        </p>
                        {check.message && (
                          <p className="text-xs text-muted-foreground mt-0.5">{check.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Unable to evaluate readiness checklist.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
