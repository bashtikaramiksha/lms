"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Video,
  FileText,
  HelpCircle,
  Radio,
  Eye,
  Clock,
  UploadCloud,
  Check,
  X,
  ArrowUp,
  ArrowDown,
  Loader2,
  AlertCircle,
  PlayCircle,
  Sparkles,
  Layers,
  CheckCircle2,
} from "lucide-react";

export type LessonType = "VIDEO" | "ARTICLE" | "QUIZ" | "LIVE_SESSION";

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  type: LessonType;
  order: number;
  videoUrl?: string | null;
  duration?: number | null;
  content?: string | null;
  isPreview?: boolean | null;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface CurriculumBuilderProps {
  courseId: string;
  courseTitle?: string;
  isReadOnly?: boolean;
}

export default function CurriculumBuilder({
  courseId,
  courseTitle,
  isReadOnly = false,
}: CurriculumBuilderProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Module creation/edit states
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [submittingModule, setSubmittingModule] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");

  // Collapsed modules state (Set of module IDs that are open)
  const [expandedModuleIds, setExpandedModuleIds] = useState<Set<string>>(new Set());

  // Lesson creation/edit states
  const [addingLessonModuleId, setAddingLessonModuleId] = useState<string | null>(null);
  const [newLessonData, setNewLessonData] = useState({
    title: "",
    type: "VIDEO" as LessonType,
    isPreview: false,
  });
  const [submittingLesson, setSubmittingLesson] = useState(false);

  // Active Lesson Editor Modal / Drawer state
  const [activeEditingLesson, setActiveEditingLesson] = useState<Lesson | null>(null);
  const [lessonFormData, setLessonFormData] = useState({
    title: "",
    type: "VIDEO" as LessonType,
    isPreview: false,
    videoUrl: "",
    duration: 0,
    content: "",
  });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [savingLessonDetails, setSavingLessonDetails] = useState(false);

  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Show Toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // Fetch Curriculum
  const fetchCurriculum = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/courses/${courseId}/curriculum`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load curriculum");
      }
      setModules(json.data || []);
      // Auto-expand all modules initially
      const allIds = new Set<string>((json.data || []).map((m: Module) => m.id));
      setExpandedModuleIds(allIds);
    } catch (err: any) {
      setError(err.message || "Failed to fetch course curriculum");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCurriculum();
    }
  }, [courseId]);

  // Total preview lessons count
  const totalPreviewLessons = modules.reduce(
    (acc, m) => acc + (m.lessons?.filter((l) => l.isPreview)?.length || 0),
    0
  );

  const totalLessonsCount = modules.reduce(
    (acc, m) => acc + (m.lessons?.length || 0),
    0
  );

  const totalDurationSeconds = modules.reduce(
    (acc, m) =>
      acc +
      (m.lessons?.reduce((lAcc, l) => lAcc + (l.duration || 0), 0) || 0),
    0
  );

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0 mins";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hours}h ${remMins}m`;
    }
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} mins`;
  };

  const toggleModuleExpand = (modId: string) => {
    setExpandedModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) {
        next.delete(modId);
      } else {
        next.add(modId);
      }
      return next;
    });
  };

  // Add Module
  const handleAddModule = async () => {
    if (!newModuleTitle.trim() || newModuleTitle.trim().length < 2) return;
    try {
      setSubmittingModule(true);
      const res = await fetch(`/api/courses/${courseId}/modules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newModuleTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to add module");
      }

      setModules((prev) => [...prev, { ...data.data, lessons: [] }]);
      setExpandedModuleIds((prev) => new Set(prev).add(data.data.id));
      setNewModuleTitle("");
      setIsAddingModule(false);
      showToast("Module added successfully");
    } catch (err: any) {
      setError(err.message || "Failed to create module");
    } finally {
      setSubmittingModule(false);
    }
  };

  // Rename Module
  const handleSaveModuleRename = async (moduleId: string) => {
    if (!editingModuleTitle.trim() || editingModuleTitle.trim().length < 2) return;
    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editingModuleTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update module");
      }

      setModules((prev) =>
        prev.map((m) => (m.id === moduleId ? { ...m, title: editingModuleTitle.trim() } : m))
      );
      setEditingModuleId(null);
      setEditingModuleTitle("");
      showToast("Module renamed");
    } catch (err: any) {
      setError(err.message || "Failed to rename module");
    }
  };

  // Delete Module
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module and all of its lessons?")) {
      return;
    }
    try {
      const res = await fetch(`/api/modules/${moduleId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to delete module");
      }

      setModules((prev) => prev.filter((m) => m.id !== moduleId));
      showToast("Module deleted");
    } catch (err: any) {
      setError(err.message || "Failed to delete module");
    }
  };

  // Move Module Up/Down
  const handleMoveModule = async (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    const newModules = [...modules];
    const [moved] = newModules.splice(index, 1);
    newModules.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setModules(newModules);

    try {
      const orderedIds = newModules.map((m) => m.id);
      const res = await fetch(`/api/courses/${courseId}/modules/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to reorder modules");
      }
      showToast("Module order updated");
    } catch (err: any) {
      setError(err.message || "Failed to update module order");
      fetchCurriculum(); // rollback
    }
  };

  // Add Lesson
  const handleAddLesson = async (moduleId: string) => {
    if (!newLessonData.title.trim() || newLessonData.title.trim().length < 2) return;
    try {
      setSubmittingLesson(true);
      const res = await fetch(`/api/modules/${moduleId}/lessons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newLessonData.title.trim(),
          type: newLessonData.type,
          isPreview: newLessonData.isPreview,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to add lesson");
      }

      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: [...(m.lessons || []), data.data] }
            : m
        )
      );

      setAddingLessonModuleId(null);
      setNewLessonData({ title: "", type: "VIDEO", isPreview: false });
      showToast("Lesson added successfully");

      // Open the editor for the newly created lesson
      openLessonEditor(data.data);
    } catch (err: any) {
      setError(err.message || "Failed to add lesson");
    } finally {
      setSubmittingLesson(false);
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async (lessonId: string, moduleId: string) => {
    if (!confirm("Are you sure you want to delete this lesson?")) return;
    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || "Failed to delete lesson");
      }

      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: m.lessons.filter((l) => l.id !== lessonId) }
            : m
        )
      );
      if (activeEditingLesson?.id === lessonId) {
        setActiveEditingLesson(null);
      }
      showToast("Lesson deleted");
    } catch (err: any) {
      setError(err.message || "Failed to delete lesson");
    }
  };

  // Move Lesson Up/Down
  const handleMoveLesson = async (
    moduleId: string,
    index: number,
    direction: "up" | "down"
  ) => {
    const mod = modules.find((m) => m.id === moduleId);
    if (!mod) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mod.lessons.length) return;

    const newLessons = [...mod.lessons];
    const [moved] = newLessons.splice(index, 1);
    newLessons.splice(targetIndex, 0, moved);

    // Optimistic UI update
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, lessons: newLessons } : m))
    );

    try {
      const orderedIds = newLessons.map((l) => l.id);
      const res = await fetch(`/api/modules/${moduleId}/lessons/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Failed to reorder lessons");
      }
      showToast("Lesson order updated");
    } catch (err: any) {
      setError(err.message || "Failed to update lesson order");
      fetchCurriculum(); // rollback
    }
  };

  // Open Lesson Editor Drawer
  const openLessonEditor = (lesson: Lesson) => {
    setActiveEditingLesson(lesson);
    setLessonFormData({
      title: lesson.title || "",
      type: lesson.type || "VIDEO",
      isPreview: !!lesson.isPreview,
      videoUrl: lesson.videoUrl || "",
      duration: lesson.duration || 0,
      content: lesson.content || "",
    });
    setError(null);
  };

  // Handle Video Upload
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeEditingLesson) return;

    const allowedTypes = ["video/mp4", "video/webm"];
    if (!allowedTypes.includes(file.type)) {
      setError("Only MP4 and WebM video formats are supported");
      return;
    }

    if (file.size > 2 * 1024 * 1024 * 1024) {
      setError("Video file exceeds 2GB maximum limit");
      return;
    }

    // Try extracting duration via temporary HTML5 video element
    try {
      const videoEl = document.createElement("video");
      videoEl.preload = "metadata";
      videoEl.onloadedmetadata = () => {
        window.URL.revokeObjectURL(videoEl.src);
        const durationSec = Math.round(videoEl.duration);
        if (durationSec && !isNaN(durationSec)) {
          setLessonFormData((prev) => ({ ...prev, duration: durationSec }));
        }
      };
      videoEl.src = URL.createObjectURL(file);
    } catch (e) {
      // ignore
    }

    try {
      setUploadingVideo(true);
      setUploadProgress(10);
      setError(null);

      const presignRes = await fetch("/api/uploads/lesson-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: activeEditingLesson.id,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignData.success) throw new Error(presignData.error?.message);

      const { uploadUrl, publicUrl, isDevLocal } = presignData.data;

      setUploadProgress(35);

      // Perform direct upload
      const uploadRes = await fetch(uploadUrl, {
        method: isDevLocal ? "POST" : "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Video upload failed");

      setUploadProgress(100);
      setLessonFormData((prev) => ({ ...prev, videoUrl: publicUrl }));
      showToast("Video uploaded successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to upload video");
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
      if (videoFileInputRef.current) {
        videoFileInputRef.current.value = "";
      }
    }
  };

  // Save Lesson Details
  const handleSaveLessonDetails = async () => {
    if (!activeEditingLesson) return;
    if (!lessonFormData.title.trim() || lessonFormData.title.trim().length < 2) {
      setError("Lesson title must be at least 2 characters");
      return;
    }

    try {
      setSavingLessonDetails(true);
      setError(null);

      const payload: Record<string, any> = {
        title: lessonFormData.title.trim(),
        isPreview: lessonFormData.isPreview,
        content: lessonFormData.content || null,
        videoUrl: lessonFormData.videoUrl || null,
        duration: lessonFormData.duration ? Number(lessonFormData.duration) : null,
      };

      const res = await fetch(`/api/lessons/${activeEditingLesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update lesson details");
      }

      // Update in local state
      setModules((prev) =>
        prev.map((m) =>
          m.id === activeEditingLesson.moduleId
            ? {
                ...m,
                lessons: m.lessons.map((l) =>
                  l.id === activeEditingLesson.id ? { ...l, ...data.data } : l
                ),
              }
            : m
        )
      );

      setActiveEditingLesson(null);
      showToast("Lesson updated successfully");
    } catch (err: any) {
      setError(err.message || "Failed to save lesson");
    } finally {
      setSavingLessonDetails(false);
    }
  };

  const getLessonIcon = (type: LessonType) => {
    switch (type) {
      case "VIDEO":
        return <Video className="h-4 w-4 text-blue-400" />;
      case "ARTICLE":
        return <FileText className="h-4 w-4 text-emerald-400" />;
      case "QUIZ":
        return <HelpCircle className="h-4 w-4 text-amber-400" />;
      case "LIVE_SESSION":
        return <Radio className="h-4 w-4 text-purple-400" />;
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading course curriculum...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl border border-border shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Curriculum Summary Bar */}
      <div className="glass-card p-6 rounded-2xl border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-border/40">
            <Layers className="h-4 w-4 text-primary" />
            <span className="font-semibold">{modules.length} Modules</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-border/40">
            <PlayCircle className="h-4 w-4 text-blue-400" />
            <span className="font-semibold">{totalLessonsCount} Lessons</span>
          </div>
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-border/40">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="font-semibold">{formatDuration(totalDurationSeconds)} Total Duration</span>
          </div>
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold ${
              totalPreviewLessons >= 3
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>
              {totalPreviewLessons} / 3 Free Previews Used
            </span>
          </div>
        </div>

        {!isReadOnly && (
          <button
            onClick={() => setIsAddingModule(true)}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs inline-flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" /> Add Module
          </button>
        )}
      </div>

      {/* Add Module Inline Form */}
      {isAddingModule && (
        <div className="glass-card p-5 rounded-2xl border border-primary/40 bg-primary/5 space-y-3 animate-in fade-in">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Create New Module
          </h3>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="e.g. Module 1: Introduction & Fundamentals"
              value={newModuleTitle}
              onChange={(e) => setNewModuleTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddModule()}
              autoFocus
              className="flex-1 px-4 py-2 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
            <button
              onClick={handleAddModule}
              disabled={submittingModule || newModuleTitle.trim().length < 2}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs inline-flex items-center gap-1 disabled:opacity-50"
            >
              {submittingModule ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Create
            </button>
            <button
              onClick={() => {
                setIsAddingModule(false);
                setNewModuleTitle("");
              }}
              className="p-2 rounded-xl border border-border hover:bg-white/5 text-muted-foreground text-xs"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modules List */}
      {modules.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-border/70 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-bold text-base">Your Curriculum is Empty</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Start structuring your course by adding modules, then upload video lessons, articles, quizzes, and live cohorts.
            </p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => setIsAddingModule(true)}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs inline-flex items-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <Plus className="h-3.5 w-3.5" /> Create First Module
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, modIdx) => {
            const isExpanded = expandedModuleIds.has(mod.id);
            const isEditing = editingModuleId === mod.id;
            const moduleDuration = (mod.lessons || []).reduce((acc, l) => acc + (l.duration || 0), 0);

            return (
              <div
                key={mod.id}
                className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md overflow-hidden transition-all hover:border-border"
              >
                {/* Module Header Bar */}
                <div className="p-4 sm:px-5 flex items-center justify-between gap-3 bg-white/[0.02] border-b border-border/30">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {!isReadOnly && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveModule(modIdx, "up")}
                          disabled={modIdx === 0}
                          className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:hover:bg-transparent"
                          title="Move module up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleMoveModule(modIdx, "down")}
                          disabled={modIdx === modules.length - 1}
                          className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:hover:bg-transparent"
                          title="Move module down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    <span className="text-xs font-mono font-bold text-muted-foreground bg-white/5 px-2 py-0.5 rounded">
                      #{modIdx + 1}
                    </span>

                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1 max-w-md">
                        <input
                          type="text"
                          value={editingModuleTitle}
                          onChange={(e) => setEditingModuleTitle(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveModuleRename(mod.id)}
                          autoFocus
                          className="w-full px-3 py-1 text-sm rounded-lg border border-primary bg-background focus:outline-none"
                        />
                        <button
                          onClick={() => handleSaveModuleRename(mod.id)}
                          className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingModuleId(null);
                            setEditingModuleTitle("");
                          }}
                          className="p-1.5 rounded-lg border border-border hover:bg-white/5 text-muted-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 truncate">
                        <h4 className="font-bold text-sm sm:text-base text-foreground truncate">
                          {mod.title}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          ({mod.lessons?.length || 0} lessons • {formatDuration(moduleDuration)})
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isReadOnly && !isEditing && (
                      <>
                        <button
                          onClick={() => {
                            setEditingModuleId(mod.id);
                            setEditingModuleTitle(mod.title);
                          }}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all text-xs"
                          title="Rename module"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(mod.id)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all text-xs"
                          title="Delete module"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => toggleModuleExpand(mod.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Module Body / Lessons List */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 space-y-3">
                    {mod.lessons?.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-border/60 text-center bg-white/[0.01]">
                        <p className="text-xs text-muted-foreground">
                          No lessons in this module yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mod.lessons.map((lesson, lessonIdx) => (
                          <div
                            key={lesson.id}
                            className="group p-3 sm:px-4 rounded-xl border border-border/50 bg-background/50 hover:bg-background/90 hover:border-primary/40 flex items-center justify-between gap-3 transition-all"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {!isReadOnly && (
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    onClick={() => handleMoveLesson(mod.id, lessonIdx, "up")}
                                    disabled={lessonIdx === 0}
                                    className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                  >
                                    <ArrowUp className="h-2.5 w-2.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveLesson(mod.id, lessonIdx, "down")}
                                    disabled={lessonIdx === mod.lessons.length - 1}
                                    className="p-0.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-20"
                                  >
                                    <ArrowDown className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              )}

                              <div className="h-8 w-8 rounded-lg bg-white/5 border border-border/40 flex items-center justify-center shrink-0">
                                {getLessonIcon(lesson.type)}
                              </div>

                              <div className="flex items-center gap-2 truncate">
                                <span className="font-semibold text-xs sm:text-sm truncate">
                                  {lesson.title}
                                </span>

                                {lesson.isPreview && (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Free Preview
                                  </span>
                                )}

                                {lesson.type === "VIDEO" && lesson.duration ? (
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                                    <Clock className="h-3 w-3" /> {formatDuration(lesson.duration)}
                                  </span>
                                ) : null}

                                {lesson.type === "VIDEO" && !lesson.videoUrl && (
                                  <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                                    No video uploaded
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isReadOnly && (
                                <>
                                  <button
                                    onClick={() => openLessonEditor(lesson)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-border text-xs font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
                                  >
                                    <Edit2 className="h-3 w-3" /> Edit Lesson
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLesson(lesson.id, mod.id)}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                                    title="Delete lesson"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Lesson inline form / toggle */}
                    {!isReadOnly && (
                      <div>
                        {addingLessonModuleId === mod.id ? (
                          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3 animate-in fade-in">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-primary">
                              New Lesson
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <input
                                  type="text"
                                  placeholder="Lesson Title (e.g. Setting Up Next.js 15)"
                                  value={newLessonData.title}
                                  onChange={(e) =>
                                    setNewLessonData({ ...newLessonData, title: e.target.value })
                                  }
                                  autoFocus
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background"
                                />
                              </div>
                              <div>
                                <select
                                  value={newLessonData.type}
                                  onChange={(e) =>
                                    setNewLessonData({
                                      ...newLessonData,
                                      type: e.target.value as LessonType,
                                    })
                                  }
                                  className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-background cursor-pointer"
                                >
                                  <option value="VIDEO">Video Lesson</option>
                                  <option value="ARTICLE">Article / Text</option>
                                  <option value="QUIZ">Quiz / Assessment</option>
                                  <option value="LIVE_SESSION">Live Cohort Session</option>
                                </select>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                                <input
                                  type="checkbox"
                                  checked={newLessonData.isPreview}
                                  disabled={totalPreviewLessons >= 3 && !newLessonData.isPreview}
                                  onChange={(e) =>
                                    setNewLessonData({
                                      ...newLessonData,
                                      isPreview: e.target.checked,
                                    })
                                  }
                                  className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                                />
                                <span>Free Preview Lesson</span>
                                {totalPreviewLessons >= 3 && !newLessonData.isPreview && (
                                  <span className="text-[11px] text-amber-400">
                                    (Max 3 preview limit reached)
                                  </span>
                                )}
                              </label>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setAddingLessonModuleId(null)}
                                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-white/5"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleAddLesson(mod.id)}
                                  disabled={submittingLesson || newLessonData.title.trim().length < 2}
                                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {submittingLesson ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Plus className="h-3 w-3" />
                                  )}
                                  Add Lesson
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setAddingLessonModuleId(mod.id);
                              setNewLessonData({ title: "", type: "VIDEO", isPreview: false });
                            }}
                            className="w-full py-2.5 rounded-xl border border-dashed border-border/70 hover:border-primary/50 bg-white/[0.01] hover:bg-primary/[0.03] text-xs font-semibold text-muted-foreground hover:text-primary transition-all flex items-center justify-center gap-2"
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Lesson to {mod.title}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Lesson Details Drawer / Modal */}
      {activeEditingLesson && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card bg-card border border-border/80 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/40 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  {getLessonIcon(lessonFormData.type)}
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    Editing Lesson
                  </span>
                  <h3 className="font-bold text-base truncate max-w-md">
                    {lessonFormData.title || "Untitled Lesson"}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setActiveEditingLesson(null)}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold mb-1.5">Lesson Title</label>
                <input
                  type="text"
                  value={lessonFormData.title}
                  onChange={(e) =>
                    setLessonFormData({ ...lessonFormData, title: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1.5">Lesson Type</label>
                  <select
                    value={lessonFormData.type}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm opacity-80 cursor-not-allowed"
                  >
                    <option value="VIDEO">Video Lesson</option>
                    <option value="ARTICLE">Article / Text</option>
                    <option value="QUIZ">Quiz / Assessment</option>
                    <option value="LIVE_SESSION">Live Cohort Session</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5">
                    Free Preview
                  </label>
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={lessonFormData.isPreview}
                        disabled={
                          totalPreviewLessons >= 3 &&
                          !activeEditingLesson.isPreview &&
                          !lessonFormData.isPreview
                        }
                        onChange={(e) =>
                          setLessonFormData({
                            ...lessonFormData,
                            isPreview: e.target.checked,
                          })
                        }
                        className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      />
                      <span>Make this lesson a free preview</span>
                    </label>
                    {totalPreviewLessons >= 3 && !activeEditingLesson.isPreview && (
                      <p className="text-[11px] text-amber-400 mt-1">
                        Course already has 3 free preview lessons.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* VIDEO TYPE SPECIFIC FIELDS */}
              {lessonFormData.type === "VIDEO" && (
                <div className="space-y-4 pt-2 border-t border-border/40">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2">
                    <Video className="h-4 w-4" /> Video Media
                  </h4>

                  {/* Video Player Preview */}
                  {lessonFormData.videoUrl && (
                    <div className="aspect-video rounded-xl bg-black overflow-hidden border border-border/60 relative">
                      <video
                        src={lessonFormData.videoUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}

                  {/* Video Upload Dropzone */}
                  <div className="p-5 rounded-xl border border-dashed border-border/80 bg-white/[0.02] text-center space-y-3">
                    <UploadCloud className="h-8 w-8 text-muted-foreground mx-auto" />
                    <div>
                      <p className="text-xs font-bold">
                        Upload Video File (MP4, WebM up to 2GB)
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Direct-to-cloud upload with automatic duration detection.
                      </p>
                    </div>

                    <input
                      ref={videoFileInputRef}
                      type="file"
                      accept="video/mp4,video/webm"
                      onChange={handleVideoFileChange}
                      disabled={uploadingVideo}
                      className="hidden"
                      id="video-file-upload-input"
                    />

                    <label
                      htmlFor="video-file-upload-input"
                      className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs inline-flex items-center gap-2 cursor-pointer shadow-md shadow-blue-500/20"
                    >
                      {uploadingVideo ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading Video...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-3.5 w-3.5" /> Choose Video File
                        </>
                      )}
                    </label>

                    {uploadingVideo && (
                      <div className="w-full bg-border/50 rounded-full h-2 overflow-hidden mt-3">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Duration & Manual URL */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5">
                        Duration (seconds)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={lessonFormData.duration || ""}
                        onChange={(e) =>
                          setLessonFormData({
                            ...lessonFormData,
                            duration: parseInt(e.target.value) || 0,
                          })
                        }
                        placeholder="e.g. 360"
                        className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Formatted: {formatDuration(lessonFormData.duration || 0)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1.5">
                        Video Public URL
                      </label>
                      <input
                        type="text"
                        value={lessonFormData.videoUrl || ""}
                        onChange={(e) =>
                          setLessonFormData({ ...lessonFormData, videoUrl: e.target.value })
                        }
                        placeholder="https://..."
                        className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ARTICLE TYPE SPECIFIC FIELDS */}
              {lessonFormData.type === "ARTICLE" && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Article Content (Markdown / HTML)
                  </h4>
                  <textarea
                    rows={8}
                    value={lessonFormData.content}
                    onChange={(e) =>
                      setLessonFormData({ ...lessonFormData, content: e.target.value })
                    }
                    placeholder="# Lesson Title&#10;&#10;Write comprehensive lecture notes, code snippets, or reference material here..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm font-mono resize-y"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Word count: {lessonFormData.content ? lessonFormData.content.split(/\s+/).filter(Boolean).length : 0} words
                  </p>
                </div>
              )}

              {/* QUIZ / LIVE_SESSION SPECIFIC FIELDS */}
              {(lessonFormData.type === "QUIZ" || lessonFormData.type === "LIVE_SESSION") && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                    Session & Instructions
                  </h4>
                  <textarea
                    rows={6}
                    value={lessonFormData.content}
                    onChange={(e) =>
                      setLessonFormData({ ...lessonFormData, content: e.target.value })
                    }
                    placeholder="Instructions, meeting links, or quiz details..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm resize-y"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/40 bg-white/[0.02] flex items-center justify-end gap-3">
              <button
                onClick={() => setActiveEditingLesson(null)}
                className="px-4 py-2 rounded-xl border border-border hover:bg-white/5 text-xs font-semibold text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLessonDetails}
                disabled={savingLessonDetails || uploadingVideo}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-xs inline-flex items-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
              >
                {savingLessonDetails ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Lesson...
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
