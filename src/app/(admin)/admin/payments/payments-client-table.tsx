"use client";

import React, { useState } from "react";
import {
  CreditCard,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  X,
  Smartphone,
  ShieldAlert,
} from "lucide-react";

export function PaymentsClientTable({ initialOrders }: { initialOrders: any[] }) {
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState<
    "REQUESTED_BY_CUSTOMER" | "DUPLICATE" | "FRAUDULENT"
  >("REQUESTED_BY_CUSTOMER");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openRefundModal = (order: any) => {
    setSelectedOrder(order);
    setRefundAmount(order.total.toString());
    setError(null);
  };

  const closeRefundModal = () => {
    setSelectedOrder(null);
    setError(null);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    setIsProcessing(true);
    setError(null);

    try {
      const amount = parseFloat(refundAmount);
      const res = await fetch(`/api/admin/payments/${selectedOrder.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          reason: refundReason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Failed to process refund");
      }

      setOrders(
        orders.map((ord) =>
          ord.id === selectedOrder.id
            ? { ...ord, status: json.data.newOrderStatus }
            : ord
        )
      );
      closeRefundModal();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-indigo-400" />
          Recent Transactions
        </h2>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Gateway</th>
                <th className="py-3.5 px-4">Purchased Courses</th>
                <th className="py-3.5 px-4">Total Paid</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 text-xs">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-300 text-xs">
                      #{ord.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-semibold text-white text-xs">
                          {ord.student?.fullName || "Student"}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {ord.student?.email}
                        </p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {ord.gateway === "STRIPE" ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400">
                          <CreditCard className="w-3.5 h-3.5" /> Stripe
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                          <Smartphone className="w-3.5 h-3.5" /> Razorpay
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-300 max-w-xs truncate">
                      {ord.items?.map((i: any) => i.title).join(", ") || "Course enrollment"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white text-xs">
                      ${ord.total.toFixed(2)}
                      {ord.discountAmount > 0 && (
                        <span className="text-[10px] block text-emerald-400">
                          -${ord.discountAmount.toFixed(2)} coupon
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {ord.status === "COMPLETED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3" /> Paid
                        </span>
                      )}
                      {ord.status === "REFUNDED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          <RotateCcw className="w-3 h-3" /> Refunded
                        </span>
                      )}
                      {ord.status === "PARTIALLY_REFUNDED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          <RotateCcw className="w-3 h-3" /> Partial Refund
                        </span>
                      )}
                      {ord.status === "FAILED" && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          <AlertCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : "Recent"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {ord.status === "COMPLETED" && (
                        <button
                          onClick={() => openRefundModal(ord)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-semibold transition"
                        >
                          <RotateCcw className="w-3 h-3" /> Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                Issue Refund for #{selectedOrder.id.slice(0, 8)}
              </h3>
              <button
                onClick={closeRefundModal}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Automatic Access Revocation</p>
                <p className="text-[11px] text-amber-300/80">
                  Processing this refund will automatically revoke the student's active course enrollments.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleProcessRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Refund Amount (Max: ${selectedOrder.total.toFixed(2)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedOrder.total}
                  required
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason for Refund
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="REQUESTED_BY_CUSTOMER">Requested by Customer</option>
                  <option value="DUPLICATE">Duplicate Charge</option>
                  <option value="FRAUDULENT">Fraudulent Transaction</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeRefundModal}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Issuing Refund...
                    </>
                  ) : (
                    "Confirm & Issue Refund"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
