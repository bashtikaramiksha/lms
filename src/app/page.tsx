import Link from "next/link";
import { BookOpen, Sparkles, ShieldCheck, Users, ArrowRight, Zap, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              LMS Platform
            </span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/courses"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Browse Courses
            </Link>
            <Link
              href="/blog"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Blog
            </Link>
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

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 gradient-glow pointer-events-none -z-10" />

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-xs font-medium text-blue-400 mb-8 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Wave 2 Course Ecosystem · Discovery & Catalog Live</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl leading-[1.15]">
          Architected for <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">Scale, Speed & Mastery</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl">
          A high-performance Learning Management System platform engineered with Next.js 15, Drizzle ORM, libSQL, and enterprise role-based access control.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/courses"
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-blue-500/25 flex items-center gap-2"
          >
            Explore Course Catalog <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl glass-panel text-foreground font-medium hover:bg-white/10 transition-all"
          >
            Get Started Free
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl text-left w-full">
          <div className="glass-card p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Role-Based Access</h3>
            <p className="text-sm text-muted-foreground">
              Strict RBAC enforcement for Students, Teachers, and Admins via NextAuth JWT and edge middleware.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Local & Edge Database</h3>
            <p className="text-sm text-muted-foreground">
              Seamless zero-config local SQLite for development, instantly switchable to distributed Turso in production.
            </p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Teacher Workflow</h3>
            <p className="text-sm text-muted-foreground">
              Built-in teacher onboarding with pending approval status and administrative governance controls.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <p>© 2026 LMS Platform. Built with Next.js 15, Drizzle ORM, libSQL.</p>
      </footer>
    </div>
  );
}
