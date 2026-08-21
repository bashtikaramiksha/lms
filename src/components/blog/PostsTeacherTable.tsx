"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Edit,
  Folder,
  FileText,
  Clock,
} from "lucide-react";
import { PostStatusBadge } from "./PostStatusBadge";

interface PostItem {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | "SCHEDULED" | string;
  featuredImage?: string | null;
  publishedAt?: string | null;
  scheduledFor?: string | null;
  createdAt?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  tags?: Array<{ id: string; name: string; slug: string }>;
}

interface PostsTeacherTableProps {
  initialPosts: PostItem[];
  total: number;
  currentPage: number;
  pageSize: number;
}

export function PostsTeacherTable({
  initialPosts,
  total,
  currentPage,
  pageSize,
}: PostsTeacherTableProps) {
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = posts.filter((post) => {
    if (statusFilter !== "ALL" && post.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchSlug = post.slug.toLowerCase().includes(q);
      if (!matchTitle && !matchSlug) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your posts by title or slug..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            {["ALL", "PUBLISHED", "DRAFT", "SCHEDULED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Create Button */}
          <Link
            href="/teacher/blog/new"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Post
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4">Post Title & Slug</th>
                <th className="p-4">Status</th>
                <th className="p-4">Category</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    <FileText className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    You have not created any posts matching these filters.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Title & Slug */}
                    <td className="p-4 max-w-sm">
                      <div className="flex items-center gap-3">
                        {post.featuredImage && (
                          <img
                            src={post.featuredImage}
                            alt=""
                            className="h-10 w-14 rounded-lg object-cover bg-slate-800 border border-slate-800 flex-shrink-0"
                          />
                        )}
                        <div className="truncate">
                          <Link
                            href={`/teacher/blog/${post.id}/edit`}
                            className="font-semibold text-white hover:text-indigo-400 transition-colors block truncate"
                          >
                            {post.title}
                          </Link>
                          <span className="text-[11px] text-slate-500 font-mono">
                            /blog/{post.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <PostStatusBadge status={post.status} />
                    </td>

                    {/* Category */}
                    <td className="p-4">
                      {post.category ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          <Folder className="h-3 w-3 text-indigo-400" />
                          {post.category.name}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-4 text-xs text-slate-400">
                      {post.status === "SCHEDULED" && post.scheduledFor ? (
                        <div className="flex items-center gap-1 text-amber-400">
                          <Clock className="h-3 w-3" />
                          <span>Due {new Date(post.scheduledFor).toLocaleDateString()}</span>
                        </div>
                      ) : post.publishedAt ? (
                        <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                      ) : (
                        <span>Draft ({post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""})</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <Link
                        href={`/teacher/blog/${post.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
