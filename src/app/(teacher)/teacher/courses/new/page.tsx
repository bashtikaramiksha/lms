"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  Sparkles,
  Video,
  Radio,
  DollarSign,
  Clock,
  Globe,
  BarChart,
  UploadCloud,
  Image as ImageIcon,
  PlayCircle,
  AlertCircle,
  Loader2,
  Layers,
  FileText,
  Tag,
  ShieldCheck,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function NewCourseWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Form State
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
    accessDuration: "" as string | number, // empty = lifetime
    thumbnailUrl: "",
    previewUrl: "",
  });

  // Media Upload State
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Errors & Feedback
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories");
        const json = await res.json();
        if (json.success && json.data) {
          setCategories(json.data);
          if (json.data.length > 0 && !formData.categoryId) {
            setFormData((prev) => ({ ...prev, categoryId: json.data[0].id }));
          }
        }
      } catch (err) {
        console.error("Failed to load categories", err);
      } finally {
        setLoadingCategories(false);
      }
    }
    fetchCategories();
  }, []);

  // Validation per step
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.title.trim() || formData.title.trim().length < 10) {
        newErrors.title = "Course title must be at least 10 characters";
      } else if (formData.title.length > 120) {
        newErrors.title = "Course title cannot exceed 120 characters";
      }

      if (formData.shortDesc && formData.shortDesc.length > 200) {
        newErrors.shortDesc = "Subtitle cannot exceed 200 characters";
      }

      if (!formData.categoryId) {
        newErrors.categoryId = "Please select a category";
      }
    }

    if (currentStep === 2) {
      if (!formData.isFree) {
        const numPrice = Number(formData.price);
        if (isNaN(numPrice) || numPrice < 0) {
          newErrors.price = "Price must be a valid number (>= $0)";
        }

        if (formData.discountPrice !== "") {
          const numDiscount = Number(formData.discountPrice);
          if (isNaN(numDiscount) || numDiscount <= 0) {
            newErrors.discountPrice = "Discount price must be greater than $0";
          } else if (numDiscount >= numPrice) {
            newErrors.discountPrice = "Discount price must be less than the regular price";
          }
        }
      }

      if (formData.accessDuration !== "") {
        const numDuration = Number(formData.accessDuration);
        if (isNaN(numDuration) || numDuration <= 0 || !Number.isInteger(numDuration)) {
          newErrors.accessDuration = "Duration must be a positive number of days";
        }
      }
    }

    if (currentStep === 3) {
      if (formData.previewUrl) {
        try {
          new URL(formData.previewUrl);
        } catch {
          newErrors.previewUrl = "Please enter a valid URL (e.g., https://...)";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((prev) => (prev < 3 ? ((prev + 1) as 2 | 3) : prev));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2) : prev));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Thumbnail File Upload Handler
  const handleThumbnailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side file validation
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        thumbnail: "Supported formats: JPEG, PNG, or WebP only.",
      }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({
        ...prev,
        thumbnail: "File size exceeds maximum allowed limit of 5 MB.",
      }));
      return;
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.thumbnail;
      return next;
    });

    // Preview
    const localUrl = URL.createObjectURL(file);
    setThumbnailPreview(localUrl);

    try {
      setUploadingThumbnail(true);
      setUploadProgress(20);

      // Request presigned URL
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
      if (!presignData.success) {
        throw new Error(presignData.error?.message || "Failed to prepare upload");
      }

      setUploadProgress(50);

      const { uploadUrl, publicUrl, isDevLocal } = presignData.data;

      // Upload binary to S3 or local dev handler
      const uploadRes = await fetch(uploadUrl, {
        method: isDevLocal ? "POST" : "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Failed to upload image file to storage");
      }

      setUploadProgress(100);
      setFormData((prev) => ({ ...prev, thumbnailUrl: publicUrl }));
      setThumbnailPreview(publicUrl);
    } catch (err: any) {
      console.error("Thumbnail upload failed:", err);
      setErrors((prev) => ({
        ...prev,
        thumbnail: err.message || "Failed to upload thumbnail image",
      }));
    } finally {
      setUploadingThumbnail(false);
    }
  };

  // Submit Draft
  const handleSaveDraft = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    try {
      setIsSubmitting(true);
      setServerError(null);

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
            : undefined,
        accessDuration:
          formData.accessDuration !== ""
            ? Number(formData.accessDuration)
            : undefined,
        categoryId: formData.categoryId || undefined,
        thumbnailUrl: formData.thumbnailUrl || undefined,
        previewUrl: formData.previewUrl || undefined,
      };

      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create course draft");
      }

      // Success: redirect to teacher dashboard
      startTransition(() => {
        router.push("/teacher/dashboard?created=true");
      });
    } catch (err: any) {
      console.error("Submit course error:", err);
      setServerError(err.message || "An unexpected error occurred while saving your course.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryName =
    categories.find((c) => c.id === formData.categoryId)?.name || "Select Category";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/teacher/dashboard"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Course Studio
              </span>
              <h1 className="text-lg font-bold tracking-tight">Create New Course</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={isSubmitting || uploadingThumbnail}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-sm inline-flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving Draft...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Save as Draft
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Wizard Step Navigation */}
      <div className="border-b border-border/30 bg-muted/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Step 1 Pill */}
            <button
              onClick={() => step > 1 && setStep(1)}
              className={`flex items-center gap-3 text-left transition-all ${
                step === 1
                  ? "text-primary font-bold"
                  : step > 1
                  ? "text-foreground font-medium cursor-pointer"
                  : "text-muted-foreground opacity-60"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                  step === 1
                    ? "bg-primary text-primary-foreground shadow-lg shadow-blue-500/25"
                    : step > 1
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Step 1
                </p>
                <p className="text-sm">Basic Info</p>
              </div>
            </button>

            <div className={`flex-1 h-0.5 mx-4 transition-all ${step > 1 ? "bg-emerald-500/40" : "bg-border/60"}`} />

            {/* Step 2 Pill */}
            <button
              onClick={() => step > 2 && setStep(2)}
              className={`flex items-center gap-3 text-left transition-all ${
                step === 2
                  ? "text-primary font-bold"
                  : step > 2
                  ? "text-foreground font-medium cursor-pointer"
                  : "text-muted-foreground opacity-60"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                  step === 2
                    ? "bg-primary text-primary-foreground shadow-lg shadow-blue-500/25"
                    : step > 2
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                {step > 2 ? <CheckCircle2 className="h-4 w-4" /> : "2"}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Step 2
                </p>
                <p className="text-sm">Format & Pricing</p>
              </div>
            </button>

            <div className={`flex-1 h-0.5 mx-4 transition-all ${step > 2 ? "bg-emerald-500/40" : "bg-border/60"}`} />

            {/* Step 3 Pill */}
            <button
              className={`flex items-center gap-3 text-left transition-all ${
                step === 3
                  ? "text-primary font-bold"
                  : "text-muted-foreground opacity-60"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-all ${
                  step === 3
                    ? "bg-primary text-primary-foreground shadow-lg shadow-blue-500/25"
                    : "bg-muted text-muted-foreground border border-border"
                }`}
              >
                3
              </div>
              <div className="hidden sm:block">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Step 3
                </p>
                <p className="text-sm">Media & Review</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Wizard Form Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Server Error Alert */}
        {serverError && (
          <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm">Error saving course</h4>
              <p className="text-xs mt-0.5">{serverError}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-6 border border-border/50">
              <div className="border-b border-border/40 pb-4">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Step 1 — Basic Information
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Provide the core details of your course to help learners discover and understand your curriculum.
                </p>
              </div>

              {/* Course Title */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Course Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Master Advanced TypeScript and Clean Architecture"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={120}
                  className={`w-full px-4 py-3 rounded-xl border bg-background/50 focus:outline-none focus:ring-2 transition-all ${
                    errors.title
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-border focus:ring-primary/30 focus:border-primary"
                  }`}
                />
                <div className="flex justify-between items-center mt-1.5 text-xs text-muted-foreground">
                  <span>{errors.title ? <span className="text-destructive font-medium">{errors.title}</span> : "Minimum 10 characters"}</span>
                  <span>{formData.title.length}/120</span>
                </div>
              </div>

              {/* Subtitle / Short Description */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Short Description / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="A concise summary highlighting what students will achieve (e.g., Build production-ready scalable web apps)"
                  value={formData.shortDesc}
                  onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                  maxLength={200}
                  className={`w-full px-4 py-3 rounded-xl border bg-background/50 focus:outline-none focus:ring-2 transition-all ${
                    errors.shortDesc
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-border focus:ring-primary/30 focus:border-primary"
                  }`}
                />
                <div className="flex justify-between items-center mt-1.5 text-xs text-muted-foreground">
                  <span>{errors.shortDesc ? <span className="text-destructive font-medium">{errors.shortDesc}</span> : "Displayed on course cards"}</span>
                  <span>{formData.shortDesc.length}/200</span>
                </div>
              </div>

              {/* Category & Level Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Category Dropdown */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Category <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      disabled={loadingCategories}
                      className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
                    >
                      {loadingCategories ? (
                        <option>Loading categories...</option>
                      ) : (
                        categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))
                      )}
                    </select>
                    <Tag className="absolute right-4 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {errors.categoryId && (
                    <p className="text-xs text-destructive mt-1 font-medium">{errors.categoryId}</p>
                  )}
                </div>

                {/* Difficulty Level */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5">
                    Difficulty Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setFormData({ ...formData, level: lvl })}
                        className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all ${
                          formData.level === lvl
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border/60 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                        }`}
                      >
                        {lvl.charAt(0) + lvl.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Language Selector */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Primary Language
                </label>
                <div className="relative">
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all appearance-none cursor-pointer"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish (Español)</option>
                    <option value="French">French (Français)</option>
                    <option value="German">German (Deutsch)</option>
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="Portuguese">Portuguese (Português)</option>
                    <option value="Japanese">Japanese (日本語)</option>
                  </select>
                  <Globe className="absolute right-4 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>

              {/* Course Full Description */}
              <div>
                <label className="block text-sm font-semibold mb-1.5">
                  Full Course Description
                </label>
                <textarea
                  rows={5}
                  placeholder="Provide an overview of the course goals, prerequisites, what learners will build, and syllabus structure..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-sm resize-y"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Type & Pricing */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="glass-card p-6 sm:p-8 rounded-2xl space-y-8 border border-border/50">
              <div className="border-b border-border/40 pb-4">
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" /> Step 2 — Format & Pricing
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose how your course is delivered (self-paced recorded vs live cohorts) and set your pricing strategy.
                </p>
              </div>

              {/* Course Type Selector */}
              <div>
                <label className="block text-sm font-semibold mb-3">
                  Course Delivery Format <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Recorded Course Card */}
                  <div
                    onClick={() => setFormData({ ...formData, type: "RECORDED" })}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      formData.type === "RECORDED"
                        ? "border-primary bg-primary/10 shadow-lg shadow-blue-500/10"
                        : "border-border/60 bg-white/5 hover:border-border hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
                        <Video className="h-5 w-5" />
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.type === "RECORDED"
                            ? "border-primary bg-primary"
                            : "border-border"
                        }`}
                      >
                        {formData.type === "RECORDED" && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-base">Recorded / On-Demand</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Pre-recorded video modules, articles, and quizzes. Students learn at their own pace with instant access.
                    </p>
                  </div>

                  {/* Live Cohort Card */}
                  <div
                    onClick={() => setFormData({ ...formData, type: "LIVE" })}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                      formData.type === "LIVE"
                        ? "border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10"
                        : "border-border/60 bg-white/5 hover:border-border hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                        <Radio className="h-5 w-5" />
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.type === "LIVE"
                            ? "border-purple-500 bg-purple-500"
                            : "border-border"
                        }`}
                      >
                        {formData.type === "LIVE" && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </div>
                    <h3 className="font-bold text-base">Live Interactive Cohort</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      Scheduled live video workshops, group discussions, assignments, and direct teacher mentoring.
                    </p>
                  </div>
                </div>
              </div>

              {/* Free vs Paid Toggle */}
              <div className="pt-2 border-t border-border/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold">Pricing Model</h3>
                    <p className="text-xs text-muted-foreground">
                      Offer this course for free or charge a one-time enrollment fee.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isFree: true, price: 0, discountPrice: "" })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        formData.isFree
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Free Course
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isFree: false, price: formData.price === 0 ? 49.99 : formData.price })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        !formData.isFree
                          ? "bg-primary text-primary-foreground shadow"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Paid Course
                    </button>
                  </div>
                </div>

                {/* Price & Discount Fields (when not free) */}
                {!formData.isFree && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-2xl bg-muted/20 border border-border/60 animate-in fade-in duration-200">
                    {/* Regular Price */}
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">
                        Standard Price (USD) <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-muted-foreground font-bold text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="49.99"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                          className={`w-full pl-8 pr-4 py-2.5 rounded-xl border bg-background/80 focus:outline-none focus:ring-2 transition-all ${
                            errors.price
                              ? "border-destructive focus:ring-destructive/30"
                              : "border-border focus:ring-primary/30 focus:border-primary"
                          }`}
                        />
                      </div>
                      {errors.price && (
                        <p className="text-xs text-destructive mt-1 font-medium">{errors.price}</p>
                      )}
                    </div>

                    {/* Discount Price */}
                    <div>
                      <label className="block text-sm font-semibold mb-1.5">
                        Promotional Discount Price (USD)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-muted-foreground font-bold text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Optional (e.g. 29.99)"
                          value={formData.discountPrice}
                          onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value === "" ? "" : parseFloat(e.target.value) })}
                          className={`w-full pl-8 pr-4 py-2.5 rounded-xl border bg-background/80 focus:outline-none focus:ring-2 transition-all ${
                            errors.discountPrice
                              ? "border-destructive focus:ring-destructive/30"
                              : "border-border focus:ring-primary/30 focus:border-primary"
                          }`}
                        />
                      </div>
                      {errors.discountPrice ? (
                        <p className="text-xs text-destructive mt-1 font-medium">{errors.discountPrice}</p>
                      ) : (
                        formData.discountPrice !== "" && Number(formData.discountPrice) < Number(formData.price) && (
                          <p className="text-xs text-emerald-400 mt-1 font-medium">
                            {Math.round((1 - Number(formData.discountPrice) / Number(formData.price)) * 100)}% discount badge will be displayed
                          </p>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Access Duration */}
              <div className="pt-2 border-t border-border/30">
                <label className="block text-sm font-semibold mb-1.5">
                  Course Access Duration
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Lifetime Access", value: "" },
                    { label: "30 Days", value: "30" },
                    { label: "90 Days (Quarter)", value: "90" },
                    { label: "365 Days (1 Year)", value: "365" },
                  ].map((dur) => (
                    <button
                      key={dur.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, accessDuration: dur.value })}
                      className={`py-3 px-3 rounded-xl text-xs font-semibold border transition-all flex flex-col items-center gap-1 ${
                        formData.accessDuration.toString() === dur.value
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "border-border/60 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      <span>{dur.label}</span>
                    </button>
                  ))}
                </div>
                {errors.accessDuration && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.accessDuration}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Media & Real-time Review */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Media Inputs */}
              <div className="lg:col-span-7 space-y-6">
                <div className="glass-card p-6 rounded-2xl space-y-6 border border-border/50">
                  <div className="border-b border-border/40 pb-4">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" /> Step 3 — Media Assets
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload a course thumbnail and add a preview promotional video.
                    </p>
                  </div>

                  {/* Thumbnail Upload Zone */}
                  <div>
                    <label className="block text-sm font-semibold mb-2">
                      Course Thumbnail Image
                    </label>
                    <div className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-2xl p-6 text-center transition-all bg-background/30 hover:bg-primary/5 relative">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleThumbnailChange}
                        disabled={uploadingThumbnail}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                          {uploadingThumbnail ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <UploadCloud className="h-6 w-6" />
                          )}
                        </div>
                        <p className="text-sm font-semibold">
                          {uploadingThumbnail ? "Uploading image..." : "Drag and drop or browse thumbnail"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports JPEG, PNG, or WebP (Max 5 MB · 16:9 ratio recommended)
                        </p>
                      </div>
                    </div>

                    {uploadingThumbnail && (
                      <div className="mt-3">
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {errors.thumbnail && (
                      <p className="text-xs text-destructive mt-1.5 font-medium">{errors.thumbnail}</p>
                    )}
                  </div>

                  {/* Preview Video URL */}
                  <div>
                    <label className="block text-sm font-semibold mb-1.5">
                      Preview / Promo Video URL (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=... or direct MP4 URL"
                        value={formData.previewUrl}
                        onChange={(e) => setFormData({ ...formData, previewUrl: e.target.value })}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border bg-background/50 focus:outline-none focus:ring-2 transition-all ${
                          errors.previewUrl
                            ? "border-destructive focus:ring-destructive/30"
                            : "border-border focus:ring-primary/30 focus:border-primary"
                        }`}
                      />
                      <PlayCircle className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    {errors.previewUrl ? (
                      <p className="text-xs text-destructive mt-1 font-medium">{errors.previewUrl}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">
                        Optional promotional trailer accessible to all visitors before purchase.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Course Card Mockup */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-24">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Live Catalog Preview
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-medium border border-amber-500/20">
                      Draft Preview
                    </span>
                  </div>

                  {/* Course Card Preview */}
                  <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xl hover:shadow-2xl transition-all">
                    {/* Thumbnail Image Container */}
                    <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                      {thumbnailPreview ? (
                        <img
                          src={thumbnailPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                          <ImageIcon className="h-10 w-10 mb-2 opacity-40" />
                          <span className="text-xs">No thumbnail uploaded</span>
                        </div>
                      )}

                      {/* Type Badge */}
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-background/80 backdrop-blur-md border border-white/10 text-foreground">
                        {formData.type}
                      </span>

                      {/* Category Badge */}
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-primary/90 text-primary-foreground backdrop-blur-md">
                        {selectedCategoryName}
                      </span>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{formData.level.toLowerCase()}</span>
                        <span>•</span>
                        <span>{formData.language}</span>
                        <span>•</span>
                        <span>
                          {formData.accessDuration ? `${formData.accessDuration} Days Access` : "Lifetime Access"}
                        </span>
                      </div>

                      <h3 className="font-bold text-base line-clamp-2 leading-snug">
                        {formData.title || "Your Course Title Will Appear Here"}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {formData.shortDesc ||
                          formData.description ||
                          "A short subtitle explaining the key takeaways and skills gained from this course."}
                      </p>

                      {/* Pricing Tag */}
                      <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                        <div>
                          {formData.isFree ? (
                            <span className="text-base font-extrabold text-emerald-400">Free</span>
                          ) : (
                            <div className="flex items-baseline gap-2">
                              {formData.discountPrice !== "" && Number(formData.discountPrice) < Number(formData.price) ? (
                                <>
                                  <span className="text-lg font-extrabold text-foreground">
                                    ${Number(formData.discountPrice).toFixed(2)}
                                  </span>
                                  <span className="text-xs text-muted-foreground line-through">
                                    ${Number(formData.price).toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-lg font-extrabold text-foreground">
                                  ${Number(formData.price).toFixed(2)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <span className="text-xs text-primary font-semibold">
                          View Details →
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review Checklist */}
                  <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border/40 space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Readiness Checklist
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`h-3.5 w-3.5 ${
                            formData.title.length >= 10 ? "text-emerald-400" : "text-muted-foreground/40"
                          }`}
                        />
                        <span>Title (min 10 characters)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`h-3.5 w-3.5 ${
                            formData.categoryId ? "text-emerald-400" : "text-muted-foreground/40"
                          }`}
                        />
                        <span>Category chosen</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={`h-3.5 w-3.5 ${
                            thumbnailPreview ? "text-emerald-400" : "text-muted-foreground/40"
                          }`}
                        />
                        <span>Thumbnail uploaded</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation Controls */}
        <div className="mt-8 pt-6 border-t border-border/40 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-5 py-2.5 rounded-xl border border-border bg-white/5 hover:bg-white/10 text-foreground font-semibold text-sm inline-flex items-center gap-2 transition-all"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <Link
                href="/teacher/dashboard"
                className="px-5 py-2.5 rounded-xl border border-border bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground font-semibold text-sm inline-flex items-center gap-2 transition-all"
              >
                Cancel
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-sm inline-flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all"
              >
                Continue to Step {step + 1} <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting || uploadingThumbnail}
                className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold hover:opacity-95 text-sm inline-flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving Course Draft...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" /> Create Course Draft
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
