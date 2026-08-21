import { create } from "zustand";
import {
  ContentBlock,
  BlockType,
  HeroBlock,
  RichTextBlock,
  ImageWithTextBlock,
  FaqBlock,
  CtaBannerBlock,
  DividerBlock,
} from "@/types/cms.types";

export function createDefaultBlock(type: BlockType): ContentBlock {
  const id = `blk-${crypto.randomUUID().slice(0, 8)}`;

  switch (type) {
    case "HERO":
      return {
        id,
        type: "HERO",
        heading: "Hero Headline Goes Here",
        subheading:
          "Provide a compelling description of your company, mission, or announcement.",
        ctaLabel: "Explore Courses",
        ctaHref: "/courses",
        bgImageUrl: "",
      } as HeroBlock;

    case "RICH_TEXT":
      return {
        id,
        type: "RICH_TEXT",
        content:
          "<h2>Our Story</h2><p>Welcome to our learning platform. We empower developers and educators worldwide with state-of-the-art tools and practical knowledge.</p>",
      } as RichTextBlock;

    case "IMAGE_WITH_TEXT":
      return {
        id,
        type: "IMAGE_WITH_TEXT",
        imageUrl: "",
        imageAlt: "Feature illustration",
        heading: "Engineered for Excellence",
        body: "Our curriculum is structured to take you from foundational basics to building production-grade distributed systems.",
        imageLeft: true,
      } as ImageWithTextBlock;

    case "FAQ":
      return {
        id,
        type: "FAQ",
        heading: "Frequently Asked Questions",
        items: [
          {
            id: `faq-${crypto.randomUUID().slice(0, 6)}`,
            question: "How do I access my enrolled courses?",
            answer:
              "You can access all your enrolled courses anytime by signing in and navigating to your Student Dashboard.",
          },
          {
            id: `faq-${crypto.randomUUID().slice(0, 6)}`,
            question: "Do I receive a certificate upon completion?",
            answer:
              "Yes, once you finish all required lessons and curriculum modules with >= 80% completion, a verified certificate is automatically generated for you.",
          },
        ],
      } as FaqBlock;

    case "CTA_BANNER":
      return {
        id,
        type: "CTA_BANNER",
        heading: "Ready to accelerate your engineering career?",
        subheading:
          "Join thousands of professionals already mastering high-demand skills.",
        ctaLabel: "Get Started Free",
        ctaHref: "/register",
        bgColor: "indigo",
      } as CtaBannerBlock;

    case "DIVIDER":
      return {
        id,
        type: "DIVIDER",
      } as DividerBlock;
  }
}

export interface BlockEditorStore {
  blocks: ContentBlock[];
  setBlocks: (blocks: ContentBlock[]) => void;
  addBlock: (type: BlockType) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, patch: Partial<ContentBlock>) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
}

export const useBlockEditor = create<BlockEditorStore>((set) => ({
  blocks: [],
  setBlocks: (blocks) => set({ blocks }),
  addBlock: (type) =>
    set((state) => ({
      blocks: [...state.blocks, createDefaultBlock(type)],
    })),
  removeBlock: (id) =>
    set((state) => ({
      blocks: state.blocks.filter((b) => b.id !== id),
    })),
  updateBlock: (id, patch) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as any) : b)),
    })),
  moveBlock: (from, to) =>
    set((state) => {
      const copy = [...state.blocks];
      if (to < 0 || to >= copy.length) return state;
      const [moved] = copy.splice(from, 1);
      copy.splice(to, 0, moved);
      return { blocks: copy };
    }),
}));
