import React from "react";
import { ImageWithTextBlock } from "@/types/cms.types";
import { BookOpen } from "lucide-react";

export function ImageWithTextBlockRenderer(block: ImageWithTextBlock) {
  const imageElement = (
    <div className="relative aspect-video sm:aspect-square md:aspect-video w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-xl">
      {block.imageUrl ? (
        <img
          src={block.imageUrl}
          alt={block.imageAlt || block.heading}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-slate-900 to-indigo-950/40">
          <BookOpen className="h-12 w-12 text-indigo-500/40" />
        </div>
      )}
    </div>
  );

  const textElement = (
    <div className="flex flex-col justify-center space-y-4">
      <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
        {block.heading}
      </h2>
      <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line font-normal">
        {block.body}
      </p>
    </div>
  );

  return (
    <section className="my-10 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-center">
      {block.imageLeft ? (
        <>
          {imageElement}
          {textElement}
        </>
      ) : (
        <>
          <div className="order-2 md:order-1">{textElement}</div>
          <div className="order-1 md:order-2">{imageElement}</div>
        </>
      )}
    </section>
  );
}
