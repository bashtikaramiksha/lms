import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowRight } from "lucide-react";
import { blogPublicService } from "@/lib/services/blog-public.service";
import { BlogListingPage } from "@/components/blog/BlogListingPage";

export const revalidate = 300; // ISR cache 300s

export const metadata: Metadata = {
  title: "Engineering Blog & Tutorials — LMS Platform",
  description:
    "Explore in-depth tutorials, system architecture deep dives, and expert career insights written by industry educators.",
  openGraph: {
    title: "Engineering Blog & Tutorials — LMS Platform",
    description:
      "Explore in-depth tutorials, system architecture deep dives, and expert career insights written by industry educators.",
    type: "website",
  },
};

interface BlogPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    tag?: string;
    search?: string;
  }>;
}

export default async function PublicBlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;
  const category = params.category;
  const tag = params.tag;
  const search = params.search;

  const [postsResult, categories, tags] = await Promise.all([
    blogPublicService.getPosts({
      page,
      limit: 12,
      category,
      tag,
      search,
    }),
    blogPublicService.getCategories(),
    blogPublicService.getTags(),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Public Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              LMS Platform
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-4 text-xs font-semibold">
            <Link
              href="/courses"
              className="text-slate-400 hover:text-white transition-colors px-3 py-2"
            >
              Browse Courses
            </Link>
            <Link
              href="/blog"
              className="text-indigo-400 font-bold px-3 py-2"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="text-slate-400 hover:text-white transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1"
            >
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Listing View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <BlogListingPage
          posts={postsResult.data}
          categories={categories}
          tags={tags}
          meta={postsResult.meta}
          activeCategory={category}
          activeTag={tag}
          searchQuery={search}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 LMS Platform, Inc. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-400 font-medium">
            <Link href="/courses" className="hover:text-white transition-colors">Courses</Link>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            <Link href="/teacher/dashboard" className="hover:text-white transition-colors">Teacher Studio</Link>
            <Link href="/admin/dashboard" className="hover:text-white transition-colors">Admin Console</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
