import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { courses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { BookOpen, LogOut, Compass } from "lucide-react";
import { ScheduleSessionPage } from "@/components/teacher/live/ScheduleSessionPage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function NewLiveSessionPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login?callbackUrl=/teacher/courses");
  }

  const userRole = (session.user as any)?.role;
  if (userRole === "STUDENT") {
    redirect("/dashboard");
  }

  const { id: courseId } = await params;

  const course = await db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      modules: {
        orderBy: (modules, { asc }) => [asc(modules.order)],
        with: {
          lessons: {
            orderBy: (lessons, { asc }) => [asc(lessons.order)],
          },
        },
      },
    },
  });

  if (!course) {
    notFound();
  }

  if (course.authorId !== session.user.id && userRole !== "ADMIN") {
    redirect("/teacher/courses");
  }

  const formattedModules = course.modules.map((m) => ({
    id: m.id,
    title: m.title,
    lessons: m.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
    })),
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Teacher Studio</span>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-3 text-xs font-semibold">
              <Link href="/teacher/dashboard" className="text-muted-foreground hover:text-foreground transition">
                Overview
              </Link>
              <Link href="/teacher/courses" className="text-indigo-400 font-bold">
                Courses
              </Link>
              <Link href="/teacher/revenue" className="text-muted-foreground hover:text-foreground transition">
                Revenue
              </Link>
              <Link href="/teacher/blog" className="text-muted-foreground hover:text-foreground transition">
                Articles & Blog
              </Link>
              <Link href="/teacher/settings" className="text-muted-foreground hover:text-foreground transition">
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

      {/* Main Studio View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <ScheduleSessionPage
          course={{ id: course.id, title: course.title, type: course.type }}
          modules={formattedModules}
        />
      </main>
    </div>
  );
}
