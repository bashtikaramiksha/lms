"use client";

import { useEffect, useRef } from "react";
import { X, Play, Video } from "lucide-react";

interface CoursePreviewPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoUrl: string | null;
}

export function CoursePreviewPlayerModal({
  isOpen,
  onClose,
  title,
  videoUrl,
}: CoursePreviewPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl bg-card border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Play className="h-4 w-4 fill-current" />
            </div>
            <div>
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                Free Lesson Preview
              </span>
              <h3 className="text-sm sm:text-base font-bold text-foreground line-clamp-1">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Player */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center p-8">
              <Video className="h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No preview video is available for this lesson.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
