import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  BookOpen,
  Users,
  DollarSign,
  PlusCircle,
  LogOut,
  BarChart3,
  Video,
  Radio,
  Clock,
  Sparkles,
  ExternalLink,
  Edit,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { courseService } from "@/lib/services/course.service";

export default async function TeacherDashboardPage() {
  const session = await auth();
  const userId = session?.user?.id || "";
  const userRole = (session?.user as any)?.role || "TEACHER";

  const courses = userId ? await courseService.getTeacherCourses(userId, userRole) : [];

  const publishedCount = courses.filter((c) => c.status === "PUBLISHED").length;
  const draftCount = courses.filter((c) => c.status === "DRAFT").length;

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
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Instructor: <strong className="text-foreground">{session?.user?.name || "Teacher"}</strong>
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
            <h1 className="text-3xl font-bold tracking-tight">Instructor Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage your courses, curriculum drafts, live cohorts, and revenue.
            </p>
          </div>
          <Link
            href="/teacher/courses/new"
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all text-sm inline-flex items-center gap-2 shadow-md shadow-blue-500/20"
          >
            <PlusCircle className="h-4 w-4" /> Create New Course
          </Link>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Courses</span>
              <Video className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3">{courses.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{draftCount} in draft</p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Published Courses</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3">{publishedCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Active on catalog</p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Students</span>
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3">0</p>
            <p className="text-xs text-muted-foreground mt-1">Active enrollments</p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Earnings</span>
              <DollarSign className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3">$0.00</p>
            <p className="text-xs text-muted-foreground mt-1">Total revenue</p>
          </div>
        </div>

        {/* Course List / Management Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Your Courses</h2>
            {courses.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Showing {courses.length} course{courses.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {courses.length === 0 ? (
            /* Empty state */
            <div className="glass-panel p-12 rounded-2xl text-center border border-dashed border-border/60">
              <div className="h-12 w-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
                <Video className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">No Courses Created Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 mb-6">
                Get started by creating your first course draft, setting your curriculum, and publishing to students.
              </p>
              <Link
                href="/teacher/courses/new"
                className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 text-sm inline-flex items-center gap-2 shadow-md shadow-blue-500/20"
              >
                <PlusCircle className="h-4 w-4" /> Launch Course Wizard
              </Link>
            </div>
          ) : (
            /* Courses Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col hover:border-primary/50 transition-all hover:shadow-xl group"
                >
                  {/* Thumbnail Banner */}
                  <div className="relative aspect-video w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                    {course.thumbnailUrl ? (
                      <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground p-6 text-center">
                        <Video className="h-8 w-8 mb-1 opacity-40" />
                        <span className="text-[11px]">No thumbnail</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <span
                      className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider backdrop-blur-md border ${
                        course.status === "PUBLISHED"
                          ? "bg-emerald-500/80 text-white border-emerald-400/40"
                          : course.status === "PENDING_REVIEW"
                          ? "bg-amber-500/80 text-white border-amber-400/40"
                          : "bg-background/80 text-muted-foreground border-white/10"
                      }`}
                    >
                      {course.status}
                    </span>

                    {/* Format Badge */}
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-background/80 backdrop-blur-md border border-white/10 text-foreground flex items-center gap-1">
                      {course.type === "LIVE" ? (
                        <>
                          <Radio className="h-3 w-3 text-purple-400" /> Live
                        </>
                      ) : (
                        <>
                          <Video className="h-3 w-3 text-blue-400" /> Recorded
                        </>
                      )}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {course.category && (
                          <span className="text-primary font-medium">{course.category.name}</span>
                        )}
                        {course.category && <span>•</span>}
                        <span className="capitalize">{course.level?.toLowerCase() || "All levels"}</span>
                      </div>

                      <h3 className="font-bold text-base line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>

                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {course.shortDesc || course.description || "Draft course details in progress..."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                      <div>
                        {course.price === 0 ? (
                          <span className="text-sm font-bold text-emerald-400">Free</span>
                        ) : (
                          <div className="flex items-baseline gap-1.5">
                            {course.discountPrice ? (
                              <>
                                <span className="text-base font-extrabold text-foreground">
                                  ${course.discountPrice.toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground line-through">
                                  ${course.price?.toFixed(2)}
                                </span>
                              </>
                            ) : (
                              <span className="text-base font-extrabold text-foreground">
                                ${course.price?.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/teacher/courses/${course.id}/edit`}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all border border-border text-xs flex items-center gap-1 font-semibold"
                        >
                          <Edit className="h-3.5 w-3.5" /> Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
