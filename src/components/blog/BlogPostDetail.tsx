"use client";

import React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  ArrowLeft,
  Sparkles,
  Tag as TagIcon,
  Folder,
} from "lucide-react";
import { PublicPostDetail } from "@/lib/services/blog-public.service";
import { BlogBreadcrumb } from "./BlogBreadcrumb";
import { RichContentRenderer } from "./RichContentRenderer";
import { AuthorBioCard } from "./AuthorBioCard";
import { SocialShareBar } from "./SocialShareBar";
import { RelatedPostsGrid } from "./RelatedPostsGrid";

interface BlogPostDetailProps {
  post: PublicPostDetail;
  siteUrl?: string;
}

export function BlogPostDetail({
  post,
  siteUrl = "",
}: BlogPostDetailProps) {
  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const estimatedReadTime = Math.max(
    2,
    Math.ceil(((post.content?.length || 500) + 200) / 800)
  );

  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const authorInitial = post.author?.fullName
    ? post.author.fullName[0].toUpperCase()
    : "A";

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Top Breadcrumb & Back Link */}
      <div className="flex items-center justify-between">
        <BlogBreadcrumb category={post.category} postTitle={post.title} />
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Blog
        </Link>
      </div>

      {/* Article Header */}
      <header className="space-y-6">
        {/* Category Pill */}
        {post.category && (
          <Link
            href={`/blog?category=${post.category.slug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all"
          >
            <Folder className="h-3 w-3" />
            {post.category.name}
          </Link>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          {post.title}
        </h1>

        {/* Excerpt if present */}
        {post.excerpt && (
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-normal">
            {post.excerpt}
          </p>
        )}

        {/* Metadata Bar (Author, Date, Read Time) */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            {post.author?.avatarUrl ? (
              <img
                src={post.author.avatarUrl}
                alt=""
                className="h-9 w-9 rounded-full object-cover border border-slate-700 shadow-md"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white uppercase shadow-md shadow-indigo-500/20">
                {authorInitial}
              </div>
            )}
            <div>
              <p className="font-bold text-white text-sm">
                {post.author?.fullName || "LMS Educator"}
              </p>
              <p className="text-[11px] text-slate-500">Instructor & Author</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-500" />
              <span>{publishedDate}</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>{estimatedReadTime} min read</span>
            </div>
          </div>
        </div>
      </header>

      {/* Featured Banner Image */}
      {post.featuredImage && (
        <div className="relative aspect-video w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {/* Main Rich Content */}
      <main className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-xl">
        <RichContentRenderer html={post.content || "<p>No content provided.</p>"} />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
              <TagIcon className="h-3.5 w-3.5" /> Tags:
            </span>
            {post.tags.map((tag) => (
              <Link
                key={tag.id}
                href={`/blog?tag=${tag.slug}`}
                className="text-xs font-medium text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 px-3 py-1 rounded-xl border border-slate-800 transition-colors"
              >
                #{tag.name}
              </Link>
            ))}
          </div>
        )}

        {/* Social Share Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <SocialShareBar url={postUrl} title={post.title} />
        </div>
      </main>

      {/* Author Bio Card */}
      <AuthorBioCard author={post.author} />

      {/* Related Posts */}
      {post.relatedPosts && post.relatedPosts.length > 0 && (
        <div className="pt-6">
          <RelatedPostsGrid posts={post.relatedPosts} />
        </div>
      )}
    </div>
  );
}
