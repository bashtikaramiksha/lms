"use client";

import React from "react";
import { useBlockEditor } from "./BlockEditorState";
import { BlockToolbar } from "./BlockToolbar";
import { HeroBlockEditor } from "./editors/HeroBlockEditor";
import { RichTextBlockEditor } from "./editors/RichTextBlockEditor";
import { ImageWithTextBlockEditor } from "./editors/ImageWithTextBlockEditor";
import { FaqBlockEditor } from "./editors/FaqBlockEditor";
import { CtaBannerBlockEditor } from "./editors/CtaBannerBlockEditor";
import { DividerBlockEditor } from "./editors/DividerBlockEditor";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Layers,
  Sparkles,
  FileText,
  Image as ImageIcon,
  HelpCircle,
  Megaphone,
  Minus,
} from "lucide-react";
import { ContentBlock } from "@/types/cms.types";

export function BlockEditorCanvas() {
  const { blocks, removeBlock, moveBlock } = useBlockEditor();

  const renderBlockEditor = (block: ContentBlock) => {
    switch (block.type) {
      case "HERO":
        return <HeroBlockEditor block={block} />;
      case "RICH_TEXT":
        return <RichTextBlockEditor block={block} />;
      case "IMAGE_WITH_TEXT":
        return <ImageWithTextBlockEditor block={block} />;
      case "FAQ":
        return <FaqBlockEditor block={block} />;
      case "CTA_BANNER":
        return <CtaBannerBlockEditor block={block} />;
      case "DIVIDER":
        return <DividerBlockEditor block={block} />;
      default:
        return null;
    }
  };

  const getBlockIcon = (type: string) => {
    switch (type) {
      case "HERO":
        return Sparkles;
      case "RICH_TEXT":
        return FileText;
      case "IMAGE_WITH_TEXT":
        return ImageIcon;
      case "FAQ":
        return HelpCircle;
      case "CTA_BANNER":
        return Megaphone;
      case "DIVIDER":
        return Minus;
      default:
        return Layers;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Add Block Toolbar */}
      <BlockToolbar />

      {/* Blocks Canvas List */}
      <div className="space-y-4">
        {blocks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <Layers className="h-5 w-5" />
            </div>
            <h4 className="text-sm font-bold text-white">Canvas is Empty</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Add blocks using the palette above to build your static page layout.
            </p>
          </div>
        ) : (
          blocks.map((block, index) => {
            const Icon = getBlockIcon(block.type);
            const isFirst = index === 0;
            const isLast = index === blocks.length - 1;

            return (
              <div
                key={block.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md transition-all hover:border-slate-700"
              >
                {/* Block Header / Action Bar */}
                <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                      #{index + 1}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Icon className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{block.type.replace("_", " ")}</span>
                    </div>
                  </div>

                  {/* Reorder and Delete Controls */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={isFirst}
                      onClick={() => moveBlock(index, index - 1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                      title="Move Block Up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isLast}
                      onClick={() => moveBlock(index, index + 1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none transition-colors"
                      title="Move Block Down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                      title="Delete Block"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Block Editor Content */}
                <div className="p-5">{renderBlockEditor(block)}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
