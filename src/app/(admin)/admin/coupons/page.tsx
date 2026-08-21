import { auth } from "@/lib/auth";
import Link from "next/link";
import { db } from "@/lib/db/client";
import { coupons } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { ShieldCheck, Tag, Plus, CheckCircle2, XCircle, Clock, Percent, DollarSign, LogOut } from "lucide-react";
import { CouponsClientTable } from "./coupons-client-table";

export default async function AdminCouponsPage() {
  const session = await auth();

  const allCoupons = await db.query.coupons.findMany({
    orderBy: [desc(coupons.createdAt)],
    limit: 100,
  });

  const totalCoupons = allCoupons.length;
  const activeCoupons = allCoupons.filter((c) => c.isActive).length;
  const totalUses = allCoupons.reduce((sum, c) => sum + c.usedCount, 0);

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
              <Link href="/admin/dashboard" className="text-slate-400 hover:text-slate-200 transition">Users</Link>
              <Link href="/admin/coupons" className="text-indigo-400 font-bold">Coupons</Link>
              <Link href="/admin/payments" className="text-slate-400 hover:text-slate-200 transition">Transactions & Refunds</Link>
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Coupon Management</h1>
          <p className="text-slate-400 mt-1">
            Create promotional discount codes, manage usage quotas, set expiration dates, and monitor redemptions.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Coupons</span>
              <Tag className="h-5 w-5 text-indigo-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-white">{totalCoupons}</p>
            <p className="text-xs text-slate-500 mt-1">Configured promo codes</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Active Coupons</span>
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-emerald-400">{activeCoupons}</p>
            <p className="text-xs text-emerald-400/80 mt-1">Ready for student checkout</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Redemptions</span>
              <Percent className="h-5 w-5 text-purple-400" />
            </div>
            <p className="text-3xl font-extrabold mt-3 text-white">{totalUses}</p>
            <p className="text-xs text-slate-500 mt-1">Across all completed orders</p>
          </div>
        </div>

        {/* Coupons Table & Creation Modal */}
        <CouponsClientTable initialCoupons={allCoupons} />
      </main>
    </div>
  );
}
