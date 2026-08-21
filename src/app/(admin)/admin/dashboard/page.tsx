import { auth } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { users, auditLogs } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { ShieldCheck, Users, GraduationCap, AlertTriangle, LogOut, CheckCircle2, XCircle, Ban, RefreshCw } from "lucide-react";
import { AdminUserTable } from "./user-table";

export default async function AdminDashboardPage() {
  const session = await auth();

  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      status: users.status,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);

  const totalUsers = allUsers.length;
  const pendingTeachers = allUsers.filter((u) => u.role === "TEACHER" && u.status === "PENDING_APPROVAL").length;
  const activeStudents = allUsers.filter((u) => u.role === "STUDENT" && u.status === "ACTIVE").length;
  const suspendedUsers = allUsers.filter((u) => u.status === "SUSPENDED").length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Admin Governance Console</span>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-3 text-xs font-semibold">
              <Link href="/admin/dashboard" className="text-indigo-400 font-bold">Users</Link>
              <Link href="/admin/coupons" className="text-slate-400 hover:text-slate-200 transition">Coupons</Link>
              <Link href="/admin/payments" className="text-slate-400 hover:text-slate-200 transition">Transactions & Refunds</Link>
              <Link href="/admin/blog" className="text-slate-400 hover:text-slate-200 transition">Blog</Link>
              <Link href="/admin/cms" className="text-slate-400 hover:text-slate-200 transition">Pages CMS</Link>
              <Link href="/admin/settings" className="text-slate-400 hover:text-slate-200 transition">Settings</Link>
            </nav>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Superadmin: <strong className="text-foreground">{session?.user?.name || "Admin"}</strong>
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
          <h1 className="text-3xl font-bold tracking-tight">User Management & Moderation</h1>
          <p className="text-muted-foreground mt-1">
            Review teacher applications, manage platform roles, inspect audit logs, and enforce policies.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Users</span>
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3">{totalUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
          </div>

          <div className="glass-card p-6 rounded-2xl border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Pending Teachers</span>
              <GraduationCap className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-amber-400">{pendingTeachers}</p>
            <p className="text-xs text-amber-400/80 mt-1">Require verification approval</p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Students</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3">{activeStudents}</p>
            <p className="text-xs text-muted-foreground mt-1">Verified and learning</p>
          </div>

          <div className="glass-card p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suspended</span>
              <Ban className="h-5 w-5 text-destructive" />
            </div>
            <p className="text-3xl font-extrabold mt-3">{suspendedUsers}</p>
            <p className="text-xs text-muted-foreground mt-1">Access restricted</p>
          </div>
        </div>

        {/* Interactive User Table Component */}
        <AdminUserTable initialUsers={allUsers} />
      </main>
    </div>
  );
}
