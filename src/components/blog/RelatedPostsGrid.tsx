import React from "react";
import Link from "next/link";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import { RelatedPostItem } from "@/lib/services/blog-public.service";

interface RelatedPostsGridProps {
  posts: RelatedPostItem[];
}

export function RelatedPostsGrid({ posts }: RelatedPostsGridProps) {
  if (!posts || posts.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h3 className="text-xl font-bold text-white tracking-tight">
          Related Articles
        </h3>
        <Link
          href="/blog"
          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
        >
          View all posts <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {posts.map((post) => {
          const date = post.publishedAt
            ? new Date(post.publishedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "";

          return (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-4 hover:bg-slate-900 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl shadow-md"
            >
              <div className="space-y-3">
                {/* Image */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950">
                  {post.featuredImage ? (
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-tr from-slate-900 to-indigo-950">
                      <BookOpen className="h-8 w-8 text-indigo-500/40" />
                    </div>
                  )}

                  {post.category && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-black/70 text-indigo-300 backdrop-blur-md border border-indigo-500/30">
                      {post.category.name}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                  {post.title}
                </h4>
              </div>

              {/* Date */}
              <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" />
                  {date}
                </span>
                <span className="text-indigo-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                  &rarr;
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
