export type BlockType =
  | "HERO"
  | "RICH_TEXT"
  | "IMAGE_WITH_TEXT"
  | "FAQ"
  | "CTA_BANNER"
  | "DIVIDER";

export interface BaseBlock {
  id: string;
  type: BlockType;
}

export interface HeroBlock extends BaseBlock {
  type: "HERO";
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  bgImageUrl: string;
}

export interface RichTextBlock extends BaseBlock {
  type: "RICH_TEXT";
  content: string; // TipTap HTML
}

export interface ImageWithTextBlock extends BaseBlock {
  type: "IMAGE_WITH_TEXT";
  imageUrl: string;
  imageAlt: string;
  heading: string;
  body: string;
  imageLeft: boolean;
}

export interface FaqItem {
  id?: string;
  question: string;
  answer: string;
}

export interface FaqBlock extends BaseBlock {
  type: "FAQ";
  heading?: string;
  items: FaqItem[];
}

export interface CtaBannerBlock extends BaseBlock {
  type: "CTA_BANNER";
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
  bgColor: string;
}

export interface DividerBlock extends BaseBlock {
  type: "DIVIDER";
}

export type ContentBlock =
  | HeroBlock
  | RichTextBlock
  | ImageWithTextBlock
  | FaqBlock
  | CtaBannerBlock
  | DividerBlock;

export type BlocksArray = ContentBlock[];
