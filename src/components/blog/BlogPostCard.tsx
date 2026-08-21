import React from "react";
import Link from "next/link";
import { Calendar, Clock, ArrowRight, BookOpen, Folder } from "lucide-react";
import { PublicPostListItem } from "@/lib/services/blog-public.service";

interface BlogPostCardProps {
  post: PublicPostListItem;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const estimatedReadTime = Math.max(
    2,
    Math.ceil(((post.excerpt?.length || 100) + 300) / 250)
  );

  const authorInitial = post.author?.fullName
    ? post.author.fullName[0].toUpperCase()
    : "A";

  return (
    <article className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 hover:bg-slate-900 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-500/10 backdrop-blur-xl">
      <div>
        {/* Thumbnail & Badges */}
        <Link href={`/blog/${post.slug}`} className="block relative aspect-video w-full overflow-hidden rounded-t-2xl bg-slate-950">
          {post.featuredImage ? (
            <img
              src={post.featuredImage}
              alt={post.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950/40 to-slate-900">
              <BookOpen className="h-10 w-10 text-indigo-500/40" />
            </div>
          )}

          {/* Category Pill */}
          {post.category && (
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/70 text-indigo-300 backdrop-blur-md border border-indigo-500/30">
              {post.category.name}
            </span>
          )}

          {/* Read time pill */}
          <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold text-slate-300 backdrop-blur-md border border-slate-700">
            <Clock className="h-3 w-3 text-slate-400" />
            {estimatedReadTime} min read
          </span>
        </Link>

        {/* Card Content */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>{publishedDate}</span>
          </div>

          <h3 className="text-lg font-bold tracking-tight text-white line-clamp-2 group-hover:text-indigo-400 transition-colors leading-snug">
            <Link href={`/blog/${post.slug}`}>{post.title}</Link>
          </h3>

          {post.excerpt && (
            <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {post.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Author info & CTA */}
      <div className="p-5 pt-0 flex items-center justify-between border-t border-slate-800/80 mt-2">
        <div className="flex items-center gap-2.5 pt-3">
          {post.author?.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt=""
              className="h-7 w-7 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
              {authorInitial}
            </div>
          )}
          <span className="text-xs font-medium text-slate-300 truncate max-w-[120px]">
            {post.author?.fullName || "LMS Educator"}
          </span>
        </div>

        <Link
          href={`/blog/${post.slug}`}
          className="pt-3 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors"
        >
          <span>Read</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </article>
  );
}
