import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { HeroBlock } from "@/types/cms.types";

export function HeroBlockRenderer(block: HeroBlock) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-16 my-8 backdrop-blur-2xl shadow-2xl">
      {/* Background image if provided */}
      {block.bgImageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-sm"
          style={{ backgroundImage: `url(${block.bgImageUrl})` }}
        />
      )}

      {/* Decorative gradient glow */}
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-3xl space-y-6">
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          {block.heading}
        </h1>

        {block.subheading && (
          <p className="text-base sm:text-xl text-slate-300 leading-relaxed font-normal">
            {block.subheading}
          </p>
        )}

        {block.ctaLabel && block.ctaHref && (
          <div className="pt-2">
            <Link
              href={block.ctaHref}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <span>{block.ctaLabel}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
