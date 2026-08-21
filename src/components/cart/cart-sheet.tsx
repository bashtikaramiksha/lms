"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Trash2, ShoppingBag, ArrowRight, BookOpen } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { useSession } from "next-auth/react";

export function CartSheet() {
  const { data: session } = useSession();
  const isAuth = !!session?.user;

  const {
    items,
    itemCount,
    subtotal,
    isOpen,
    setIsOpen,
    removeItem,
    clearCart,
  } = useCartStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
        onClick={() => setIsOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col shadow-2xl shadow-black/80 animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white tracking-wide">
                Shopping Cart ({itemCount})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-medium text-slate-300">Your cart is empty</p>
                  <p className="text-sm text-slate-500 mt-1 max-w-xs">
                    Explore our course catalog and find new skills to level up today!
                  </p>
                </div>
                <Link
                  href="/courses"
                  onClick={() => setIsOpen(false)}
                  className="mt-2 inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/20"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Browse Courses
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.courseId}
                  className="flex gap-4 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 hover:border-slate-600/80 transition group"
                >
                  <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                    {item.thumbnailUrl ? (
                      <Image
                        src={item.thumbnailUrl}
                        alt={item.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 text-xs">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <Link
                        href={`/courses/${item.slug}`}
                        onClick={() => setIsOpen(false)}
                        className="text-sm font-semibold text-slate-200 hover:text-indigo-400 line-clamp-1 transition"
                      >
                        {item.title}
                      </Link>
                      <p className="text-xs text-slate-400 mt-0.5">
                        By {item.instructor?.fullName || "Instructor"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-sm font-bold text-white">
                          ${(item.discountPrice ?? item.price).toFixed(2)}
                        </span>
                        {item.discountPrice != null && item.discountPrice < item.price && (
                          <span className="text-xs text-slate-500 line-through">
                            ${item.price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(item.courseId, isAuth)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer / Subtotal & Checkout */}
          {items.length > 0 && (
            <div className="border-t border-slate-800 px-6 py-5 bg-slate-900/90 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-xl font-extrabold text-white">
                  ${subtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => clearCart(isAuth)}
                  className="px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition border border-slate-700/60"
                >
                  Clear All
                </button>
                <Link
                  href="/checkout"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white transition shadow-lg shadow-indigo-500/25"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
