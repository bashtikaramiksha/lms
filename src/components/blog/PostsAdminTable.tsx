"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  User,
  Folder,
  CheckCircle2,
  FileText,
  Clock,
  MoreHorizontal,
  Loader2,
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
  author?: {
    id: string;
    fullName: string | null;
    email: string | null;
    avatarUrl?: string | null;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  tags?: Array<{ id: string; name: string; slug: string }>;
}

interface PostsAdminTableProps {
  initialPosts: PostItem[];
  total: number;
  currentPage: number;
  pageSize: number;
  categories: Array<{ id: string; name: string }>;
}

export function PostsAdminTable({
  initialPosts,
  total,
  currentPage,
  pageSize,
  categories,
}: PostsAdminTableProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<PostItem[]>(initialPosts);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const filteredPosts = posts.filter((post) => {
    if (statusFilter !== "ALL" && post.status !== statusFilter) return false;
    if (categoryFilter !== "ALL" && post.category?.id !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = post.title.toLowerCase().includes(q);
      const matchSlug = post.slug.toLowerCase().includes(q);
      const matchAuthor = post.author?.fullName?.toLowerCase().includes(q);
      if (!matchTitle && !matchSlug && !matchAuthor) return false;
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPosts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPosts.map((p) => p.id));
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this blog post? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(postId);
    try {
      const res = await fetch(`/api/blog/posts/${postId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
        setSelectedIds((prev) => prev.filter((id) => id !== postId));
      } else {
        alert("Failed to delete blog post");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting blog post");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleBulkStatus = async (newStatus: "DRAFT" | "PUBLISHED" | "SCHEDULED") => {
    if (selectedIds.length === 0 || isBulkUpdating) return;

    setIsBulkUpdating(true);
    try {
      const res = await fetch("/api/admin/blog/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postIds: selectedIds, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            selectedIds.includes(p.id) ? { ...p, status: newStatus } : p
          )
        );
        setSelectedIds([]);
      } else {
        alert(data.error?.message || "Failed to update posts");
      }
    } catch (err) {
      console.error(err);
      alert("Error updating posts");
    } finally {
      setIsBulkUpdating(false);
    }
  };

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
            placeholder="Search by title, slug, or author..."
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

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Create Button */}
          <Link
            href="/admin/blog/new"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Post
          </Link>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl px-4 py-2.5 flex items-center justify-between animate-in fade-in">
          <div className="text-xs text-indigo-300 font-medium flex items-center gap-2">
            <span className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-400">
              {selectedIds.length}
            </span>
            <span>posts selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatus("PUBLISHED")}
              disabled={isBulkUpdating}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-colors"
            >
              Publish Selected
            </button>
            <button
              onClick={() => handleBulkStatus("DRAFT")}
              disabled={isBulkUpdating}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            >
              Draft Selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredPosts.length > 0 &&
                      selectedIds.length === filteredPosts.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="p-4">Post Title & Slug</th>
                <th className="p-4">Status</th>
                <th className="p-4">Category</th>
                <th className="p-4">Author</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <FileText className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                    No blog posts found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => {
                  const isSelected = selectedIds.includes(post.id);
                  return (
                    <tr
                      key={post.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? "bg-indigo-950/20" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(post.id)}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

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
                              href={`/admin/blog/${post.id}/edit`}
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

                      {/* Author */}
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                            {post.author?.fullName ? post.author.fullName[0] : "A"}
                          </div>
                          <span className="text-xs text-slate-300 truncate max-w-[120px]">
                            {post.author?.fullName || "Admin"}
                          </span>
                        </div>
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
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/admin/blog/${post.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="Edit Post"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            disabled={isDeleting === post.id}
                            onClick={() => handleDelete(post.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Post"
                          >
                            {isDeleting === post.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
