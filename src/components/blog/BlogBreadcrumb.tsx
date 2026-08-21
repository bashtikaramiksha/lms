import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

interface BlogBreadcrumbProps {
  category?: { name: string; slug: string } | null;
  postTitle?: string;
}

export function BlogBreadcrumb({ category, postTitle }: BlogBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-xs text-slate-400">
      <Link
        href="/"
        className="flex items-center gap-1 hover:text-white transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span>Home</span>
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />

      <Link
        href="/blog"
        className="hover:text-white transition-colors font-medium"
      >
        Blog
      </Link>

      {category && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
          <Link
            href={`/blog?category=${category.slug}`}
            className="hover:text-white transition-colors text-slate-300 font-medium"
          >
            {category.name}
          </Link>
        </>
      )}

      {postTitle && (
        <>
          <ChevronRight className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
          <span className="text-slate-400 truncate max-w-xs">{postTitle}</span>
        </>
      )}
    </nav>
  );
}
