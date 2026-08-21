import React from "react";
import { RichTextBlock } from "@/types/cms.types";
import { RichContentRenderer } from "@/components/blog/RichContentRenderer";

export function RichTextBlockRenderer(block: RichTextBlock) {
  return (
    <section className="my-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 p-6 sm:p-10 shadow-xl backdrop-blur-xl">
      <RichContentRenderer html={block.content || "<p></p>"} />
    </section>
  );
}
