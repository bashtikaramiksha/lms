import React from "react";
import { DividerBlock } from "@/types/cms.types";

export function DividerBlockRenderer(block: DividerBlock) {
  return <hr className="my-10 border-t border-slate-800" />;
}
