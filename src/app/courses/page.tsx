import { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { courseService } from "@/lib/services/course.service";
import { CourseCatalog } from "@/components/courses/course-catalog";
import { CourseGridSkeleton } from "@/components/courses/course-grid-skeleton";
import { CartBadge } from "@/components/cart/cart-badge";
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Award,
  Video,
  Users,
} from "lucide-react";

export const revalidate = 60; // ISR revalidation every 60 seconds

export const metadata: Metadata = {
  title: "Explore Courses & Programs — LMS Platform",
  description:
    "Browse our comprehensive catalog of verified recorded video courses and live interactive masterclasses taught by top industry instructors.",
  openGraph: {
    title: "Explore Courses & Programs — LMS Platform",
    description:
      "Browse our comprehensive catalog of verified recorded video courses and live interactive masterclasses.",
  },
};

interface CoursesPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    level?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
    type?: "RECORDED" | "LIVE";
    sort?: "newest" | "price_asc" | "price_desc" | "popular";
  }>;
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const resolvedParams = await searchParams;

  const [categories, initialData] = await Promise.all([
    courseService.getCategories(),
    courseService.listPublicCourses({
      q: resolvedParams.q,
      category: resolvedParams.category,
      level: resolvedParams.level,
      type: resolvedParams.type,
      sort: resolvedParams.sort || "newest",
      limit: 12,
    }),
  ]);

  const initialFilters = {
    q: resolvedParams.q || "",
    category: resolvedParams.category || "",
    level: resolvedParams.level || "",
    type: resolvedParams.type || "",
    sort: resolvedParams.sort || "newest",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              LMS Platform
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/courses"
              className="text-sm font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/10 transition-colors"
            >
              Browse Courses
            </Link>
            <CartBadge />
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-1.5"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative border-b border-border/40 bg-gradient-to-b from-primary/5 via-background to-background py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Discover Knowledge & Accelerate Your Career</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Explore Courses & Programs
          </h1>

          <p className="max-w-2xl mx-auto text-muted-foreground text-sm sm:text-base leading-relaxed">
            Learn from verified industry leaders with project-based curriculum, interactive live sessions, and full community support.
          </p>

          {/* Quick value badges */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground font-medium">
            <div className="flex items-center gap-1.5">
              <Award className="h-4 w-4 text-emerald-400" />
              <span>Verified Certificates</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Video className="h-4 w-4 text-blue-400" />
              <span>HD Video & Projects</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-purple-400" />
              <span>Lifetime Course Access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Suspense fallback={<CourseGridSkeleton count={6} />}>
          <CourseCatalog
            categories={categories}
            initialData={initialData}
            initialFilters={initialFilters}
          />
        </Suspense>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-4 sm:px-6 lg:px-8 bg-card/20 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 LMS Platform Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/courses" className="hover:text-foreground transition-colors">
              Courses
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
