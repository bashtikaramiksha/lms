"use client";

import React, { useState } from "react";
import { type Coupon } from "@/lib/db/schema";
import {
  Tag,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Percent,
  DollarSign,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";

export function CouponsClientTable({ initialCoupons }: { initialCoupons: Coupon[] }) {
  const [coupons, setCoupons] = useState<Coupon[]>(initialCoupons);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("20");
  const [minOrderValue, setMinOrderValue] = useState("0");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          type,
          value: parseFloat(value),
          minOrderValue: parseFloat(minOrderValue || "0"),
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          isActive: true,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to create coupon");
      }

      setCoupons([json.data, ...coupons]);
      setIsCreating(false);
      setCode("");
      setValue("20");
      setMaxUses("");
      setExpiresAt("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to update coupon status");
      }

      setCoupons(
        coupons.map((c) => (c.id === coupon.id ? { ...c, isActive: !coupon.isActive } : c))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-indigo-400" />
          Active Coupons & Vouchers
        </h2>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" /> Create New Coupon
        </button>
      </div>

      {/* Creation Modal / Form Card */}
      {isCreating && (
        <form
          onSubmit={handleCreateCoupon}
          className="p-6 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" /> Create Promotional Coupon
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Coupon Code *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. FLASH30"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Discount Type *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="PERCENT">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (USD/INR)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Discount Value *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "PERCENT" ? "20" : "15.00"}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Minimum Order Value ($/₹)
              </label>
              <input
                type="number"
                step="0.01"
                value={minOrderValue}
                onChange={(e) => setMinOrderValue(e.target.value)}
                placeholder="0"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Max Uses (Limit)
              </label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited if blank"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Expiration Date
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                </>
              ) : (
                "Create Coupon"
              )}
            </button>
          </div>
        </form>
      )}

      {/* Coupons Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Code</th>
                <th className="py-3.5 px-4">Discount</th>
                <th className="py-3.5 px-4">Min. Subtotal</th>
                <th className="py-3.5 px-4">Usage (Used / Max)</th>
                <th className="py-3.5 px-4">Expires At</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500 text-xs">
                    No coupons created yet. Click "Create New Coupon" to start.
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-white text-xs tracking-wider">
                      {coupon.code}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200">
                      {coupon.type === "PERCENT" ? `${coupon.value}% OFF` : `$${coupon.value} FLAT`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {coupon.minOrderValue ? `$${coupon.minOrderValue}` : "None"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-xs">
                      <span className="font-semibold text-white">{coupon.usedCount}</span>
                      {coupon.maxUses ? ` / ${coupon.maxUses}` : " / Unlimited"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-xs">
                      {coupon.expiresAt ? (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {new Date(coupon.expiresAt).toLocaleDateString()}
                        </span>
                      ) : (
                        "No expiry"
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {coupon.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle className="w-3 h-3" /> Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => toggleStatus(coupon)}
                        className={`text-xs px-3 py-1 rounded-lg border font-semibold transition ${
                          coupon.isActive
                            ? "border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                            : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        {coupon.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
