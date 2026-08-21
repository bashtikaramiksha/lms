"use client";

import React from "react";
import { FaqBlock, FaqItem } from "@/types/cms.types";
import { useBlockEditor } from "../BlockEditorState";
import { Plus, Trash2, HelpCircle } from "lucide-react";

interface FaqBlockEditorProps {
  block: FaqBlock;
}

export function FaqBlockEditor({ block }: FaqBlockEditorProps) {
  const { updateBlock } = useBlockEditor();

  const handleAddFaqItem = () => {
    const newItem: FaqItem = {
      id: `faq-${crypto.randomUUID().slice(0, 6)}`,
      question: "New Question?",
      answer: "Provide the detailed answer here.",
    };
    updateBlock(block.id, {
      items: [...(block.items || []), newItem],
    });
  };

  const handleUpdateItem = (index: number, patch: Partial<FaqItem>) => {
    const updatedItems = [...block.items];
    updatedItems[index] = { ...updatedItems[index], ...patch };
    updateBlock(block.id, { items: updatedItems });
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = block.items.filter((_, i) => i !== index);
    updateBlock(block.id, { items: updatedItems });
  };

  return (
    <div className="space-y-4">
      {/* Heading */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
          FAQ Section Title
        </label>
        <input
          type="text"
          value={block.heading || ""}
          onChange={(e) => updateBlock(block.id, { heading: e.target.value })}
          placeholder="e.g. Frequently Asked Questions"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* FAQ Items List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Questions & Answers ({block.items?.length || 0})
          </label>
          <button
            type="button"
            onClick={handleAddFaqItem}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5" /> Add Question
          </button>
        </div>

        {(!block.items || block.items.length === 0) && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-xs text-slate-500">
            No questions added yet. Click &ldquo;Add Question&rdquo; to create one.
          </div>
        )}

        {block.items?.map((item, index) => (
          <div
            key={item.id || index}
            className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3 relative group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-indigo-400">
                Question #{index + 1}
              </span>
              <button
                type="button"
                onClick={() => handleDeleteItem(index)}
                className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                title="Delete question"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div>
              <input
                type="text"
                value={item.question}
                onChange={(e) => handleUpdateItem(index, { question: e.target.value })}
                placeholder="Question text..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <textarea
                rows={2}
                value={item.answer}
                onChange={(e) => handleUpdateItem(index, { answer: e.target.value })}
                placeholder="Answer text..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
