"use client";

import React, { useEffect } from "react";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { useSession } from "next-auth/react";

export function CartBadge() {
  const { data: session, status } = useSession();
  const { itemCount, toggleCart, fetchCart, mergeGuestCart } = useCartStore();

  useEffect(() => {
    if (status === "loading") return;

    const isAuth = !!session?.user;
    if (isAuth) {
      // Merge guest cart if any exists upon login
      mergeGuestCart().then(() => {
        fetchCart(true);
      });
    } else {
      fetchCart(false);
    }
  }, [session, status, fetchCart, mergeGuestCart]);

  return (
    <button
      onClick={toggleCart}
      type="button"
      className="relative p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      aria-label="Shopping Cart"
    >
      <ShoppingCart className="w-6 h-6" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg shadow-indigo-500/30 animate-pulse">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </button>
  );
}
