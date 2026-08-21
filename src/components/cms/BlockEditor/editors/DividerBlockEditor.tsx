"use client";

import React from "react";
import { DividerBlock } from "@/types/cms.types";
import { Minus } from "lucide-react";

interface DividerBlockEditorProps {
  block: DividerBlock;
}

export function DividerBlockEditor({ block }: DividerBlockEditorProps) {
  return (
    <div className="py-2 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
      <Minus className="h-4 w-4" />
      <span>Horizontal Content Divider Line</span>
      <Minus className="h-4 w-4" />
    </div>
  );
}
