"use client";

import React, { useState } from "react";
import { FaqBlock } from "@/types/cms.types";
import { ChevronDown, HelpCircle } from "lucide-react";

export function FaqBlockRenderer(block: FaqBlock) {
  const [openMap, setOpenMap] = useState<Record<number, boolean>>({ 0: true });

  const toggleItem = (index: number) => {
    setOpenMap((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  if (!block.items || block.items.length === 0) return null;

  return (
    <section className="my-10 space-y-6">
      {block.heading && (
        <div className="text-center space-y-2 max-w-2xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            {block.heading}
          </h2>
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-3">
        {block.items.map((item, index) => {
          const isOpen = Boolean(openMap[index]);
          return (
            <div
              key={item.id || index}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden transition-all hover:border-slate-700 shadow-sm"
            >
              <button
                type="button"
                onClick={() => toggleItem(index)}
                className="w-full px-6 py-4.5 flex items-center justify-between text-left gap-4 transition-colors"
              >
                <span className="text-sm sm:text-base font-bold text-white leading-snug">
                  {item.question}
                </span>
                <div
                  className={`h-7 w-7 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180 bg-indigo-600/20 text-indigo-400" : ""
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800/60">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
