import { auth } from "@/lib/auth";
import Link from "next/link";
import { BookOpen, GraduationCap, Clock, Award, PlayCircle, LogOut } from "lucide-react";

export default async function StudentDashboardPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Student Portal</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Welcome, <strong className="text-foreground">{session?.user?.name || "Student"}</strong>
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Learning</h1>
          <p className="text-muted-foreground mt-1">
            Pick up where you left off or explore new courses.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enrolled Courses</span>
              <BookOpen className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3">0</p>
            <p className="text-xs text-muted-foreground mt-1">Browse catalog to enroll</p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hours Learned</span>
              <Clock className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3">0.0</p>
            <p className="text-xs text-muted-foreground mt-1">Study time tracked</p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Certificates</span>
              <Award className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3">0</p>
            <p className="text-xs text-muted-foreground mt-1">Earned upon completion</p>
          </div>
        </div>

        {/* Empty state for courses */}
        <div className="glass-panel p-12 rounded-2xl text-center border border-dashed border-border/60">
          <div className="h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold">No Courses Enrolled Yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 mb-6">
            Explore our curated catalog of interactive courses, live workshops, and expert-led curriculum.
          </p>
          <Link
            href="/"
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-sm inline-flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <PlayCircle className="h-4 w-4" /> Browse Courses
          </Link>
        </div>
      </main>
    </div>
  );
}
