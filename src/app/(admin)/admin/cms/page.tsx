import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cmsService } from "@/lib/services/cms.service";
import {
  ShieldCheck,
  PlusCircle,
  FileText,
  Globe,
  Lock,
  LogOut,
  Layers,
} from "lucide-react";
import { PagesAdminTable } from "@/components/cms/PagesAdminTable";

export default async function AdminCmsPagesPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/api/auth/signin");
  }

  const pagesResult = await cmsService.getAdminPages({ page: 1, limit: 100 });

  const totalPages = pagesResult.data.length;
  const publishedPages = pagesResult.data.filter((p) => p.status === "PUBLISHED").length;
  const draftPages = pagesResult.data.filter((p) => p.status === "DRAFT").length;
  const navPages = pagesResult.data.filter((p) => p.inNav).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Admin Console</span>
          </div>

          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-3 text-xs font-semibold">
              <Link href="/admin/dashboard" className="text-slate-400 hover:text-slate-200 transition">
                Dashboard
              </Link>
              <Link href="/admin/coupons" className="text-slate-400 hover:text-slate-200 transition">
                Coupons
              </Link>
              <Link href="/admin/payments" className="text-slate-400 hover:text-slate-200 transition">
                Payments
              </Link>
              <Link href="/admin/blog" className="text-slate-400 hover:text-slate-200 transition">
                Blog
              </Link>
              <Link href="/admin/cms" className="text-indigo-400 font-bold">
                Pages CMS
              </Link>
              <Link href="/admin/settings" className="text-slate-400 hover:text-slate-200 transition">
                Settings
              </Link>
            </nav>
            <span className="text-sm text-slate-400 hidden sm:inline">
              Admin: <strong className="text-white">{session.user.name || "Administrator"}</strong>
            </span>
            <Link
              href="/api/auth/signout"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-800 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header Title & CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Static Pages CMS</h1>
            <p className="text-slate-400 mt-1">
              Create and manage marketing pages, legal terms, FAQ, and custom static layouts.
            </p>
          </div>

          <Link
            href="/admin/cms/new"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 transition-all active:scale-[0.98] self-start sm:self-auto"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create New Page</span>
          </Link>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Pages</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-white">{totalPages}</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Published Live</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Globe className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-emerald-400">{publishedPages}</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Draft Pages</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Lock className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-amber-400">{draftPages}</div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Navbar Links</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 text-2xl font-bold text-purple-400">{navPages}</div>
          </div>
        </div>

        {/* Static Pages Table */}
        <PagesAdminTable initialPages={pagesResult.data} />
      </main>
    </div>
  );
}
