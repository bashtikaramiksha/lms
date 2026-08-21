"use client";

import { useState, useEffect } from "react";
import { Search, X, SlidersHorizontal, ArrowUpDown, Filter, Sparkles } from "lucide-react";
import { Category } from "@/lib/db/schema";

export interface FilterState {
  q: string;
  category: string;
  level: string;
  type: string;
  sort: string;
}

interface CourseFiltersProps {
  categories: Category[];
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  onReset: () => void;
  totalCount?: number;
}

export function CourseFilters({
  categories,
  filters,
  onFilterChange,
  onReset,
  totalCount,
}: CourseFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.q || "");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.q) {
        onFilterChange({ q: searchInput });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, filters.q, onFilterChange]);

  const activeFilterCount =
    (filters.category ? 1 : 0) +
    (filters.level ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.q ? 1 : 0) +
    (filters.sort !== "newest" ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Main Search and Quick Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id="course-search-input"
            type="text"
            placeholder="Search courses by title, topic, or keyword..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-muted-foreground/60 shadow-sm"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput("");
                onFilterChange({ q: "" });
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdowns / Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Level Filter */}
          <select
            id="course-level-filter"
            value={filters.level}
            onChange={(e) => onFilterChange({ level: e.target.value })}
            className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-foreground shadow-sm cursor-pointer"
          >
            <option value="">All Skill Levels</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>

          {/* Type / Format Filter */}
          <select
            id="course-type-filter"
            value={filters.type}
            onChange={(e) => onFilterChange({ type: e.target.value })}
            className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-foreground shadow-sm cursor-pointer"
          >
            <option value="">All Formats</option>
            <option value="RECORDED">Recorded Video</option>
            <option value="LIVE">Live Interactive</option>
          </select>

          {/* Sort Selector */}
          <div className="relative flex items-center">
            <select
              id="course-sort-selector"
              value={filters.sort}
              onChange={(e) => onFilterChange({ sort: e.target.value })}
              className="px-3.5 py-2.5 rounded-xl border border-border/60 bg-background/80 backdrop-blur-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all text-foreground shadow-sm cursor-pointer"
            >
              <option value="newest">Sort: Newest</option>
              <option value="popular">Sort: Most Popular</option>
              <option value="price_asc">Sort: Price (Low to High)</option>
              <option value="price_desc">Sort: Price (High to Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        <button
          onClick={() => onFilterChange({ category: "" })}
          className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
            !filters.category
              ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
              : "bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/40"
          }`}
        >
          All Categories
        </button>
        {categories.map((cat) => {
          const isActive = filters.category === cat.slug;
          return (
            <button
              key={cat.id}
              onClick={() => onFilterChange({ category: isActive ? "" : cat.slug })}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 border ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/40"
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Active Filter Chips Bar */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5 text-primary" /> Active filters:
          </span>

          {filters.q && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium">
              Search: "{filters.q}"
              <button
                onClick={() => {
                  setSearchInput("");
                  onFilterChange({ q: "" });
                }}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.category && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium">
              Category: {categories.find((c) => c.slug === filters.category)?.name || filters.category}
              <button
                onClick={() => onFilterChange({ category: "" })}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.level && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium">
              Level: {filters.level.charAt(0) + filters.level.slice(1).toLowerCase()}
              <button
                onClick={() => onFilterChange({ level: "" })}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.type && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium">
              Type: {filters.type === "RECORDED" ? "Recorded" : "Live"}
              <button
                onClick={() => onFilterChange({ type: "" })}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.sort !== "newest" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary font-medium">
              Sort: {filters.sort.replace("_", " ")}
              <button
                onClick={() => onFilterChange({ sort: "newest" })}
                className="hover:text-primary/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            onClick={() => {
              setSearchInput("");
              onReset();
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-2 transition-colors"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
