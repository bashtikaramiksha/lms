"use client";

import React from "react";
import { BlockType } from "@/types/cms.types";
import { useBlockEditor } from "./BlockEditorState";
import {
  Sparkles,
  FileText,
  Image as ImageIcon,
  HelpCircle,
  Megaphone,
  Minus,
  Plus,
} from "lucide-react";

interface BlockOption {
  type: BlockType;
  label: string;
  description: string;
  icon: React.ElementType;
}

const BLOCK_OPTIONS: BlockOption[] = [
  {
    type: "HERO",
    label: "Hero Header",
    description: "Catchy hero section with title, subtitle & CTA",
    icon: Sparkles,
  },
  {
    type: "RICH_TEXT",
    label: "Rich Text",
    description: "Formatted article body, lists & headings",
    icon: FileText,
  },
  {
    type: "IMAGE_WITH_TEXT",
    label: "Image with Text",
    description: "Side-by-side media and narrative block",
    icon: ImageIcon,
  },
  {
    type: "FAQ",
    label: "FAQ Accordion",
    description: "Interactive collapsible question/answers",
    icon: HelpCircle,
  },
  {
    type: "CTA_BANNER",
    label: "CTA Banner",
    description: "High-contrast action banner with button",
    icon: Megaphone,
  },
  {
    type: "DIVIDER",
    label: "Divider",
    description: "Visual horizontal break between sections",
    icon: Minus,
  },
];

export function BlockToolbar() {
  const { addBlock } = useBlockEditor();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
        <Plus className="h-4 w-4 text-indigo-400" />
        <span>Add Content Block</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {BLOCK_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => addBlock(opt.type)}
              className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900 transition-all duration-200 group active:scale-95 shadow-sm"
            >
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2 transition-colors">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors">
                {opt.label}
              </span>
              <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
