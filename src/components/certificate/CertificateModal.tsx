"use client";

import React from "react";
import { Award, Download, ExternalLink, X, CheckCircle2, Sparkles, Loader2 } from "lucide-react";
import { useCertificate } from "@/hooks/useCertificate";

export interface CertificateModalProps {
  courseId: string;
  courseTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CertificateModal({
  courseId,
  courseTitle,
  isOpen,
  onClose,
}: CertificateModalProps) {
  const { data, isLoading, requestCertificate, isRequesting } = useCertificate(courseId);

  if (!isOpen) return null;

  const status = data?.status || "NOT_EARNED";
  const certificateUrl = data?.certificateUrl;

  const handleClaim = async () => {
    try {
      await requestCertificate();
    } catch (e) {
      console.warn("Failed to request certificate:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-8 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Certificate Badge Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-amber-500/20 via-yellow-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30 shadow-xl shadow-amber-500/10">
          <Award className="h-10 w-10" />
        </div>

        {/* Title & Course Info */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> 100% Course Completed
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Official Certificate of Completion
          </h2>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            You have satisfied all curriculum requirements for{" "}
            <strong className="text-foreground">{courseTitle}</strong>.
          </p>
        </div>

        {/* Action States */}
        <div className="space-y-3 pt-2">
          {status === "READY" && certificateUrl ? (
            <div className="space-y-3">
              <a
                href={certificateUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all active:scale-[0.98]"
              >
                <Download className="h-4 w-4" />
                <span>Download Official Certificate (PDF)</span>
              </a>

              <p className="text-[11px] text-center text-muted-foreground">
                Your certificate has also been emailed to you and saved to your Student Dashboard.
              </p>
            </div>
          ) : status === "PROCESSING" || isRequesting ? (
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <p className="text-xs font-semibold text-foreground">
                Generating your high-resolution certificate...
              </p>
              <p className="text-[11px] text-muted-foreground text-center">
                This usually takes a few seconds. The page will update automatically.
              </p>
            </div>
          ) : (
            <button
              onClick={handleClaim}
              disabled={isRequesting}
              className="flex items-center justify-center gap-2 w-full rounded-2xl bg-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <span>Generate My Certificate</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
