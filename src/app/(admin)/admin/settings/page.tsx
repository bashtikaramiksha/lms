import { auth } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { settingsService } from "@/lib/services/settings.service";
import { ShieldCheck, LogOut } from "lucide-react";
import { SiteSettingsPage } from "@/components/admin/settings/SiteSettingsPage";

export default async function AdminSettingsPage() {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    redirect("/api/auth/signin");
  }

  const settings = await settingsService.getAll();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Admin Navbar */}
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
              <Link href="/admin/cms" className="text-slate-400 hover:text-slate-200 transition">
                Pages CMS
              </Link>
              <Link href="/admin/settings" className="text-indigo-400 font-bold">
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

      {/* Main Settings Panel */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <SiteSettingsPage initialSettings={settings} />
      </main>
    </div>
  );
}
