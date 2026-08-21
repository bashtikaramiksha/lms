import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, LogOut, Compass, PlusCircle, Video, Search, Filter } from "lucide-react";
import { teacherStatsService } from "@/lib/services/teacher-stats.service";
import { TeacherCoursesClientList } from "./courses-client-list";

export default async function TeacherCoursesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/teacher/courses");
  }

  const userRole = (session.user as any)?.role;
  if (userRole === "STUDENT") {
    redirect("/dashboard");
  }

  const stats = await teacherStatsService.getDashboardStats(session.user.id);

  return (
    <div className="min-h-screen bg-background flex flex-col text-slate-100">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
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
              <Link href="/teacher/courses" className="text-indigo-400 font-bold">
                Courses
              </Link>
              <Link href="/teacher/live-sessions" className="text-slate-400 hover:text-slate-200 transition">
                Live Classes
              </Link>
              <Link href="/teacher/revenue" className="text-slate-400 hover:text-slate-200 transition">
                Revenue
              </Link>
              <Link href="/teacher/blog" className="text-slate-400 hover:text-slate-200 transition">
                Articles & Blog
              </Link>
              <Link href="/teacher/settings" className="text-slate-400 hover:text-slate-200 transition">
                Settings
              </Link>
            </nav>
            <Link
              href="/"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
            >
              <Compass className="h-3.5 w-3.5" /> Course Catalog
            </Link>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Instructor: <strong className="text-foreground">{session.user.name || "Teacher"}</strong>
            </span>
            <Link
              href="/api/auth/signout"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
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
            <h1 className="text-3xl font-bold tracking-tight text-white">My Courses</h1>
            <p className="text-slate-400 mt-1">
              Manage your course catalog, edit curriculum modules, and monitor student engagement.
            </p>
          </div>

          <Link
            href="/teacher/courses/new"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] self-start sm:self-auto"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Course</span>
          </Link>
        </div>

        {/* Client Interactive Course List with Search and Filter */}
        <TeacherCoursesClientList courses={stats.courses} />
      </main>
    </div>
  );
}
