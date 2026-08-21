import React from "react";
import { ContentBlock } from "@/types/cms.types";
import { HeroBlockRenderer } from "./HeroBlockRenderer";
import { RichTextBlockRenderer } from "./RichTextBlockRenderer";
import { ImageWithTextBlockRenderer } from "./ImageWithTextBlockRenderer";
import { FaqBlockRenderer } from "./FaqBlockRenderer";
import { CtaBannerBlockRenderer } from "./CtaBannerBlockRenderer";
import { DividerBlockRenderer } from "./DividerBlockRenderer";

interface BlockRendererProps {
  block: ContentBlock;
}

export function BlockRenderer({ block }: BlockRendererProps) {
  switch (block.type) {
    case "HERO":
      return <HeroBlockRenderer {...block} />;
    case "RICH_TEXT":
      return <RichTextBlockRenderer {...block} />;
    case "IMAGE_WITH_TEXT":
      return <ImageWithTextBlockRenderer {...block} />;
    case "FAQ":
      return <FaqBlockRenderer {...block} />;
    case "CTA_BANNER":
      return <CtaBannerBlockRenderer {...block} />;
    case "DIVIDER":
      return <DividerBlockRenderer {...block} />;
    default:
      return null;
  }
}
