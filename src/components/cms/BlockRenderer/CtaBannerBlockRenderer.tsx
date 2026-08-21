import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { CtaBannerBlock } from "@/types/cms.types";

export function CtaBannerBlockRenderer(block: CtaBannerBlock) {
  const getThemeClass = (color: string) => {
    switch (color) {
      case "purple":
        return "from-purple-900/60 via-purple-950/80 to-slate-950 border-purple-500/30 text-purple-400";
      case "emerald":
        return "from-emerald-900/60 via-emerald-950/80 to-slate-950 border-emerald-500/30 text-emerald-400";
      case "blue":
        return "from-blue-900/60 via-blue-950/80 to-slate-950 border-blue-500/30 text-blue-400";
      case "slate":
        return "from-slate-800 via-slate-900 to-slate-950 border-slate-700 text-slate-400";
      case "indigo":
      default:
        return "from-indigo-900/60 via-indigo-950/80 to-slate-950 border-indigo-500/30 text-indigo-400";
    }
  };

  const getButtonClass = (color: string) => {
    switch (color) {
      case "purple":
        return "bg-purple-600 hover:bg-purple-500 shadow-purple-600/30";
      case "emerald":
        return "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30";
      case "blue":
        return "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30";
      case "slate":
        return "bg-white text-slate-900 hover:bg-slate-100 shadow-white/20";
      case "indigo":
      default:
        return "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30";
    }
  };

  const themeClass = getThemeClass(block.bgColor || "indigo");
  const btnClass = getButtonClass(block.bgColor || "indigo");

  return (
    <section
      className={`my-12 rounded-3xl border bg-gradient-to-r ${themeClass} p-8 sm:p-14 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8 shadow-2xl backdrop-blur-2xl relative overflow-hidden`}
    >
      <div className="space-y-3 max-w-2xl">
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
          {block.heading}
        </h2>
        {block.subheading && (
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            {block.subheading}
          </p>
        )}
      </div>

      {block.ctaLabel && block.ctaHref && (
        <Link
          href={block.ctaHref}
          className={`flex-shrink-0 inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${btnClass}`}
        >
          <span>{block.ctaLabel}</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}
