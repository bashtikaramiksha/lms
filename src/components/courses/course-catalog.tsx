"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Category } from "@/lib/db/schema";
import { CourseCard as CourseCardType, PaginatedResult } from "@/lib/validations/course";
import { CourseCard } from "./course-card";
import { CourseFilters, FilterState } from "./course-filters";
import { CourseGridSkeleton } from "./course-grid-skeleton";
import { BookOpen, SearchX, RotateCcw, Loader2, ChevronDown } from "lucide-react";

interface CourseCatalogProps {
  categories: Category[];
  initialData: PaginatedResult<CourseCardType>;
  initialFilters: FilterState;
}

export function CourseCatalog({
  categories,
  initialData,
  initialFilters,
}: CourseCatalogProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [courses, setCourses] = useState<CourseCardType[]>(initialData.data);
  const [meta, setMeta] = useState(initialData.meta);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch courses via API when filters change
  const fetchCourses = useCallback(
    async (updatedFilters: FilterState) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (updatedFilters.q) params.set("q", updatedFilters.q);
        if (updatedFilters.category) params.set("category", updatedFilters.category);
        if (updatedFilters.level) params.set("level", updatedFilters.level);
        if (updatedFilters.type) params.set("type", updatedFilters.type);
        if (updatedFilters.sort && updatedFilters.sort !== "newest")
          params.set("sort", updatedFilters.sort);
        params.set("limit", "12");

        const res = await fetch(`/api/courses?${params.toString()}`);
        const json = await res.json();

        if (json.success) {
          setCourses(json.data);
          setMeta(json.meta);
        }
      } catch (err) {
        console.error("Failed to load courses:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleFilterChange = (newPartialFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newPartialFilters };
    setFilters(updated);

    // Update URL shallowly for shareable URLs
    startTransition(() => {
      const params = new URLSearchParams();
      if (updated.q) params.set("q", updated.q);
      if (updated.category) params.set("category", updated.category);
      if (updated.level) params.set("level", updated.level);
      if (updated.type) params.set("type", updated.type);
      if (updated.sort && updated.sort !== "newest") params.set("sort", updated.sort);
      const query = params.toString();
      router.push(query ? `/courses?${query}` : "/courses", { scroll: false });
    });

    fetchCourses(updated);
  };

  const handleReset = () => {
    const resetState: FilterState = {
      q: "",
      category: "",
      level: "",
      type: "",
      sort: "newest",
    };
    setFilters(resetState);
    startTransition(() => {
      router.push("/courses", { scroll: false });
    });
    fetchCourses(resetState);
  };

  // Load more using cursor pagination
  const handleLoadMore = async () => {
    if (!meta.nextCursor || loadingMore) return;
    setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.category) params.set("category", filters.category);
      if (filters.level) params.set("level", filters.level);
      if (filters.type) params.set("type", filters.type);
      if (filters.sort) params.set("sort", filters.sort);
      params.set("cursor", meta.nextCursor);
      params.set("limit", "12");

      const res = await fetch(`/api/courses?${params.toString()}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        setCourses((prev) => [...prev, ...json.data]);
        setMeta(json.meta);
      }
    } catch (err) {
      console.error("Failed to load more courses:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Filters Bar */}
      <CourseFilters
        categories={categories}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleReset}
      />

      {/* Course Grid / Loading / Empty State */}
      {loading ? (
        <CourseGridSkeleton count={6} />
      ) : courses.length > 0 ? (
        <div className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {/* Load More Button */}
          {meta.hasNext && (
            <div className="flex justify-center pt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-3 rounded-xl border border-border/80 bg-card hover:bg-muted font-semibold text-sm transition-all shadow-md flex items-center gap-2 hover:border-primary/50 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Loading more courses...</span>
                  </>
                ) : (
                  <>
                    <span>Load More Courses</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-3xl border border-dashed border-border/70 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto space-y-4 bg-card/20 backdrop-blur-sm">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <SearchX className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground">No courses found</h3>
            <p className="text-sm text-muted-foreground">
              We couldn't find any courses matching your criteria. Try adjusting your filters or search terms.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-md"
          >
            <RotateCcw className="h-4 w-4" /> Reset all filters
          </button>
        </div>
      )}
    </div>
  );
}
