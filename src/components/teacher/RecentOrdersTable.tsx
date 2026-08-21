"use client";

import React from "react";
import { Receipt, CreditCard, Clock, CheckCircle } from "lucide-react";
import { RecentOrderDto } from "@/lib/services/teacher-stats.service";

export interface RecentOrdersTableProps {
  orders: RecentOrderDto[];
}

export function RecentOrdersTable({ orders }: RecentOrdersTableProps) {
  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center backdrop-blur-xl">
        <p className="text-sm text-muted-foreground">No recent orders found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-xl space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Receipt className="h-4 w-4" />
          </div>
          <h3 className="text-base font-bold tracking-tight text-foreground">Recent Order Ledger</h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-muted-foreground">
              <th className="pb-3 font-semibold">Student</th>
              <th className="pb-3 font-semibold">Course</th>
              <th className="pb-3 font-semibold">Gateway</th>
              <th className="pb-3 font-semibold">Date</th>
              <th className="pb-3 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {orders.map((order) => {
              const dateStr = new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <tr key={order.orderId} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 font-bold text-foreground">{order.studentName}</td>
                  <td className="py-3.5 text-muted-foreground max-w-[200px] truncate">
                    {order.courseTitle}
                  </td>
                  <td className="py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-semibold text-muted-foreground">
                      <CreditCard className="h-3 w-3" />
                      {order.gateway}
                    </span>
                  </td>
                  <td className="py-3.5 text-muted-foreground">{dateStr}</td>
                  <td className="py-3.5 text-right font-bold text-emerald-400">
                    ₹{order.amount.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
