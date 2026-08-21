"use client";

import React from "react";
import DOMPurify from "isomorphic-dompurify";

interface RichContentRendererProps {
  html: string;
  className?: string;
}

export function RichContentRenderer({ html, className = "" }: RichContentRendererProps) {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "strong",
      "em",
      "s",
      "code",
      "pre",
      "blockquote",
      "mark",
      "hr",
      "br",
      "span",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "class", "style"],
  });

  return (
    <article
      className={`prose prose-lg prose-invert prose-indigo max-w-none text-slate-300 leading-relaxed font-normal ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
