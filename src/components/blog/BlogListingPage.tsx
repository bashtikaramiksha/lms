"use client";

import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  PenTool,
  Search,
} from "lucide-react";
import { PublicPostListItem } from "@/lib/services/blog-public.service";
import { BlogPostCard } from "./BlogPostCard";
import { BlogFilterBar } from "./BlogFilterBar";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

interface BlogListingPageProps {
  posts: PublicPostListItem[];
  categories: CategoryItem[];
  tags: TagItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
  activeCategory?: string;
  activeTag?: string;
  searchQuery?: string;
}

export function BlogListingPage({
  posts,
  categories,
  tags,
  meta,
  activeCategory,
  activeTag,
  searchQuery = "",
}: BlogListingPageProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(meta.total / meta.limit) || 1;

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-12">
      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-8 sm:p-12 backdrop-blur-2xl shadow-2xl">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-bold text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Knowledge Hub & Engineering Journal</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Insights, Tutorials & Ideas from Industry Experts.
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl">
            Explore deep dives into modern web development, system architecture, curriculum updates, and professional career advice authored by our top educators.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 font-medium">
              <BookOpen className="h-4 w-4 text-indigo-400" />
              <span>{meta.total} Published Articles</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5 font-medium">
              <span>{categories.length} Categories</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <BlogFilterBar
        categories={categories}
        tags={tags}
        activeCategory={activeCategory}
        activeTag={activeTag}
        initialSearch={searchQuery}
      />

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 p-16 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-bold text-white">No Articles Found</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            We couldn&apos;t find any published articles matching your criteria. Try adjusting your search term or exploring another category.
          </p>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/20"
          >
            Reset Filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post) => (
            <BlogPostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 pt-6">
          <button
            type="button"
            disabled={meta.page <= 1}
            onClick={() => goToPage(meta.page - 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <span className="text-xs font-medium text-slate-400">
            Page <strong className="text-white">{meta.page}</strong> of{" "}
            <strong className="text-white">{totalPages}</strong>
          </span>

          <button
            type="button"
            disabled={!meta.hasNext}
            onClick={() => goToPage(meta.page + 1)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bottom CTA for Teachers */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-purple-950/30 via-indigo-950/30 to-slate-950 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <h3 className="text-xl font-bold text-white">Are you an Instructor?</h3>
          <p className="text-xs text-slate-400 max-w-lg">
            Share tutorials, write deep-dive guides, and engage with thousands of eager students directly from the Teacher Studio.
          </p>
        </div>
        <Link
          href="/teacher/blog/new"
          className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]"
        >
          <PenTool className="h-4 w-4" />
          Write an Article
        </Link>
      </div>
    </div>
  );
}
