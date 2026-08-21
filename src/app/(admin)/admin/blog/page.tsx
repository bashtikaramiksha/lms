import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { blogPosts, blogCategories } from "@/lib/db/schema";
import { desc, count } from "drizzle-orm";
import {
  ShieldCheck,
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  FileEdit,
  LogOut,
  FolderTree,
} from "lucide-react";
import { PostsAdminTable } from "@/components/blog/PostsAdminTable";

export default async function AdminBlogPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/api/auth/signin");
  }

  const rawPosts = await db.query.blogPosts.findMany({
    orderBy: [desc(blogPosts.createdAt)],
    limit: 100,
    with: {
      category: true,
      author: {
        columns: {
          id: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
      tags: {
        with: {
          tag: true,
        },
      },
    },
  });

  const categories = await db.query.blogCategories.findMany({
    orderBy: [blogCategories.name],
  });

  const totalPosts = rawPosts.length;
  const publishedPosts = rawPosts.filter((p) => p.status === "PUBLISHED").length;
  const scheduledPosts = rawPosts.filter((p) => p.status === "SCHEDULED").length;
  const draftPosts = rawPosts.filter((p) => p.status === "DRAFT").length;

  const formattedPosts = rawPosts.map((p) => ({
    ...p,
    tags: p.tags.map((t) => t.tag),
  }));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Admin Governance Console</span>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-3 text-xs font-semibold">
              <Link href="/admin/dashboard" className="text-slate-400 hover:text-slate-200 transition">
                Users
              </Link>
              <Link href="/admin/coupons" className="text-slate-400 hover:text-slate-200 transition">
                Coupons
              </Link>
              <Link href="/admin/payments" className="text-slate-400 hover:text-slate-200 transition">
                Transactions & Refunds
              </Link>
              <Link href="/admin/blog" className="text-indigo-400 font-bold">
                Blog
              </Link>
              <Link href="/admin/cms" className="text-slate-400 hover:text-slate-200 transition">
                Pages CMS
              </Link>
              <Link href="/admin/settings" className="text-slate-400 hover:text-slate-200 transition">
                Settings
              </Link>
            </nav>
            <Link
              href="/api/auth/signout"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Blog & Content Management</h1>
            <p className="text-slate-400 mt-1">
              Author articles, manage categories, configure SEO tags, and schedule content publication.
            </p>
          </div>
          <Link
            href="/admin/blog/new"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Create New Post
          </Link>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Posts</span>
              <BookOpen className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-white">{totalPosts}</p>
            <p className="text-xs text-slate-500 mt-1">Across all authors & statuses</p>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 bg-emerald-500/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Published</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-emerald-400">{publishedPosts}</p>
            <p className="text-xs text-emerald-400/80 mt-1">Live on public blog</p>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 bg-amber-500/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Scheduled</span>
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-amber-400">{scheduledPosts}</p>
            <p className="text-xs text-amber-400/80 mt-1">Automated cron publishing</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Drafts</span>
              <FileEdit className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-white">{draftPosts}</p>
            <p className="text-xs text-slate-500 mt-1">In progress articles</p>
          </div>
        </div>

        {/* Posts Table */}
        <PostsAdminTable
          initialPosts={formattedPosts as any}
          total={totalPosts}
          currentPage={1}
          pageSize={100}
          categories={categories}
        />
      </main>
    </div>
  );
}
