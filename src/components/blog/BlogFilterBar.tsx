"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, X, Tag as TagIcon, Layers } from "lucide-react";

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

interface BlogFilterBarProps {
  categories: CategoryItem[];
  tags: TagItem[];
  activeCategory?: string;
  activeTag?: string;
  initialSearch?: string;
}

export function BlogFilterBar({
  categories,
  tags,
  activeCategory,
  activeTag,
  initialSearch = "",
}: BlogFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);

  // Debounced search sync
  useEffect(() => {
    const handler = setTimeout(() => {
      if (search !== initialSearch) {
        updateQuery({ search: search.trim() || undefined, page: undefined });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [search]);

  const updateQuery = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleCategoryClick = (categorySlug?: string) => {
    updateQuery({
      category: categorySlug === activeCategory ? undefined : categorySlug,
      page: undefined,
    });
  };

  const handleTagClick = (tagSlug?: string) => {
    updateQuery({
      tag: tagSlug === activeTag ? undefined : tagSlug,
      page: undefined,
    });
  };

  const clearFilters = () => {
    setSearch("");
    router.push(pathname, { scroll: false });
  };

  const hasActiveFilters = Boolean(activeCategory || activeTag || search);

  return (
    <div className="space-y-4">
      {/* Search and Category Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles by title or keyword..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-md transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Clear Filters Button if any applied */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1.5 self-start md:self-auto px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
          >
            <X className="h-3.5 w-3.5" /> Clear all filters
          </button>
        )}
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => handleCategoryClick(undefined)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            !activeCategory
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 border border-indigo-500"
              : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>All Articles</span>
        </button>

        {categories.map((cat) => {
          const isActive = activeCategory === cat.slug;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.slug)}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 border border-indigo-500"
                  : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
              }`}
            >
              <span>{cat.name}</span>
              {cat.postCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {cat.postCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tag Pills (if any exist) */}
      {tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <TagIcon className="h-3 w-3" /> Topics:
          </span>
          {tags.slice(0, 10).map((tag) => {
            const isTagActive = activeTag === tag.slug;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleTagClick(tag.slug)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all ${
                  isTagActive
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                #{tag.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
