import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { blogPosts } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  FileEdit,
  LogOut,
  Compass,
  FileText,
} from "lucide-react";
import { PostsTeacherTable } from "@/components/blog/PostsTeacherTable";

export default async function TeacherBlogPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/teacher/blog");
  }

  const userRole = (session.user as any)?.role;
  if (userRole === "STUDENT") {
    redirect("/dashboard");
  }

  const rawPosts = await db.query.blogPosts.findMany({
    where: eq(blogPosts.authorId, session.user.id),
    orderBy: [desc(blogPosts.createdAt)],
    limit: 100,
    with: {
      category: true,
      tags: {
        with: {
          tag: true,
        },
      },
    },
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
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Teacher Studio</span>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-3 text-xs font-semibold">
              <Link href="/teacher/dashboard" className="text-slate-400 hover:text-slate-200 transition">
                Overview
              </Link>
              <Link href="/teacher/courses" className="text-slate-400 hover:text-slate-200 transition">
                Courses
              </Link>
              <Link href="/teacher/live-sessions" className="text-slate-400 hover:text-slate-200 transition">
                Live Classes
              </Link>
              <Link href="/teacher/revenue" className="text-slate-400 hover:text-slate-200 transition">
                Revenue
              </Link>
              <Link href="/teacher/blog" className="text-indigo-400 font-bold">
                Articles & Blog
              </Link>
              <Link href="/teacher/settings" className="text-slate-400 hover:text-slate-200 transition">
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
            <h1 className="text-3xl font-bold tracking-tight text-white">My Articles & Blog Posts</h1>
            <p className="text-slate-400 mt-1">
              Share knowledge with students, boost your educator presence, and publish or schedule articles.
            </p>
          </div>
          <Link
            href="/teacher/blog/new"
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            Write New Article
          </Link>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">My Posts</span>
              <FileText className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-white">{totalPosts}</p>
            <p className="text-xs text-slate-500 mt-1">Total articles authored</p>
          </div>

          <div className="bg-slate-900 border border-emerald-500/30 bg-emerald-500/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Published</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-emerald-400">{publishedPosts}</p>
            <p className="text-xs text-emerald-400/80 mt-1">Publicly readable</p>
          </div>

          <div className="bg-slate-900 border border-amber-500/30 bg-amber-500/5 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Scheduled</span>
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-amber-400">{scheduledPosts}</p>
            <p className="text-xs text-amber-400/80 mt-1">Auto-releasing soon</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Drafts</span>
              <FileEdit className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-white">{draftPosts}</p>
            <p className="text-xs text-slate-500 mt-1">Work in progress</p>
          </div>
        </div>

        {/* Teacher Posts Table */}
        <PostsTeacherTable
          initialPosts={formattedPosts as any}
          total={totalPosts}
          currentPage={1}
          pageSize={100}
        />
      </main>
    </div>
  );
}
