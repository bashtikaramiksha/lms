"use client";

import React, { useState } from "react";
import { ShoppingCart, Check, Loader2 } from "lucide-react";
import { useCartStore } from "@/lib/store/cart-store";
import { useSession } from "next-auth/react";

interface AddToCartButtonProps {
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnailUrl?: string | null;
    price: number;
    discountPrice?: number | null;
    instructorName?: string | null;
  };
  isEnrolled?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "icon";
}

export function AddToCartButton({
  course,
  isEnrolled = false,
  className = "",
  variant = "primary",
}: AddToCartButtonProps) {
  const { data: session } = useSession();
  const isAuth = !!session?.user;
  const { addItem, isInCart, setIsOpen } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inCart = isInCart(course.id);

  if (isEnrolled) {
    return (
      <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
        <Check className="w-3.5 h-3.5 mr-1" /> Enrolled
      </span>
    );
  }

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (inCart) {
      setIsOpen(true);
      return;
    }

    setLoading(true);
    setError(null);

    const result = await addItem(
      {
        courseId: course.id,
        title: course.title,
        slug: course.slug,
        thumbnailUrl: course.thumbnailUrl,
        price: course.price,
        discountPrice: course.discountPrice,
        instructorName: course.instructorName,
      },
      isAuth
    );

    setLoading(false);

    if (result.success) {
      setIsOpen(true);
    } else if (result.error) {
      setError(result.error);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={loading}
        className={`p-2.5 rounded-xl border transition ${
          inCart
            ? "bg-indigo-600/20 text-indigo-400 border-indigo-500/40"
            : "bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700"
        } ${className}`}
        title={inCart ? "In Cart (Click to view)" : "Add to Cart"}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : inCart ? (
          <Check className="w-4 h-4" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={loading}
        className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition shadow-lg ${
          inCart
            ? "bg-indigo-950/80 text-indigo-300 border border-indigo-600/50 hover:bg-indigo-900/80"
            : variant === "secondary"
            ? "bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25"
        } ${className}`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : inCart ? (
          <>
            <Check className="w-4 h-4 text-indigo-400" />
            <span>In Cart — View Cart</span>
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4" />
            <span>Add to Cart</span>
          </>
        )}
      </button>
      {error && (
        <span className="text-xs text-rose-400 mt-1 text-center font-medium">
          {error}
        </span>
      )}
    </div>
  );
}
