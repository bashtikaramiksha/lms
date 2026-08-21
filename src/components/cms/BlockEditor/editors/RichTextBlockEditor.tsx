"use client";

import React from "react";
import { RichTextBlock } from "@/types/cms.types";
import { useBlockEditor } from "../BlockEditorState";
import { TipTapEditor } from "@/components/blog/TipTapEditor";

interface RichTextBlockEditorProps {
  block: RichTextBlock;
}

export function RichTextBlockEditor({ block }: RichTextBlockEditorProps) {
  const { updateBlock } = useBlockEditor();

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
        Rich Text Content
      </label>
      <TipTapEditor
        content={block.content}
        onChange={(html) => updateBlock(block.id, { content: html })}
        placeholder="Type static article text, formatting, bullet points..."
      />
    </div>
  );
}
