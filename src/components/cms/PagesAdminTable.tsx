"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  PlusCircle,
  FileText,
  Eye,
  Edit,
  Trash2,
  Navigation,
  Globe,
  Lock,
} from "lucide-react";

interface StaticPageItem {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  inNav: boolean | null;
  navLabel: string | null;
  updatedAt: string | null;
}

interface PagesAdminTableProps {
  initialPages: StaticPageItem[];
}

export function PagesAdminTable({ initialPages }: PagesAdminTableProps) {
  const router = useRouter();
  const [pages, setPages] = useState<StaticPageItem[]>(initialPages);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredPages = pages.filter((page) => {
    if (statusFilter !== "ALL" && page.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = page.title.toLowerCase().includes(q);
      const matchSlug = page.slug.toLowerCase().includes(q);
      if (!matchTitle && !matchSlug) return false;
    }
    return true;
  });

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete the page "${title}"?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/cms/pages/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete page");
      }
      setPages((prev) => prev.filter((p) => p.id !== id));
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Error deleting page");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages by title or slug..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          {["ALL", "PUBLISHED", "DRAFT"].map((st) => (
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
      </div>

      {/* Table Content */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Page Title & Slug</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Navbar</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No CMS pages found. Click &ldquo;Create New Page&rdquo; to add one.
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => {
                  const date = page.updatedAt
                    ? new Date(page.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={page.id}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Title & Slug */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-sm">
                          {page.title}
                        </div>
                        <div className="text-[11px] text-indigo-400 font-mono mt-0.5">
                          /{page.slug}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {page.status === "PUBLISHED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Globe className="h-3 w-3" /> Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            <Lock className="h-3 w-3" /> Draft
                          </span>
                        )}
                      </td>

                      {/* In Nav */}
                      <td className="px-6 py-4">
                        {page.inNav ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                            <Navigation className="h-3 w-3" />
                            {page.navLabel || "In Navbar"}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-500">Hidden</span>
                        )}
                      </td>

                      {/* Updated Date */}
                      <td className="px-6 py-4 text-slate-400">{date}</td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {page.status === "PUBLISHED" && (
                            <Link
                              href={`/${page.slug}`}
                              target="_blank"
                              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              title="View Public Page"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          )}

                          <Link
                            href={`/admin/cms/${page.id}/edit`}
                            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                            title="Edit Page"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Link>

                          <button
                            type="button"
                            disabled={deletingId === page.id}
                            onClick={() => handleDelete(page.id, page.title)}
                            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors"
                            title="Delete Page"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
