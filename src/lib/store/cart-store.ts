import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItemView, CartSummary } from "@/lib/validations/cart";

export interface GuestCartItem {
  courseId: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  price: number;
  discountPrice: number | null;
  instructor: {
    fullName: string;
  };
}

interface CartState {
  items: CartItemView[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  isOpen: boolean;

  // Actions
  setIsOpen: (isOpen: boolean) => void;
  toggleCart: () => void;
  fetchCart: (isAuthenticated: boolean) => Promise<void>;
  addItem: (
    item: {
      courseId: string;
      title: string;
      slug: string;
      thumbnailUrl?: string | null;
      price: number;
      discountPrice?: number | null;
      instructorName?: string | null;
    },
    isAuthenticated: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  removeItem: (courseId: string, isAuthenticated: boolean) => Promise<void>;
  clearCart: (isAuthenticated: boolean) => Promise<void>;
  mergeGuestCart: () => Promise<void>;
  isInCart: (courseId: string) => boolean;
}

const GUEST_CART_KEY = "lms_guest_cart_items";

export const useCartStore = create<CartState>()((set, get) => ({
  items: [],
  itemCount: 0,
  subtotal: 0,
  isLoading: false,
  isOpen: false,

  setIsOpen: (isOpen) => set({ isOpen }),
  toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

  isInCart: (courseId: string) => {
    return get().items.some((item) => item.courseId === courseId);
  },

  fetchCart: async (isAuthenticated: boolean) => {
    if (!isAuthenticated) {
      // Load from localStorage for guest
      if (typeof window !== "undefined") {
        try {
          const raw = localStorage.getItem(GUEST_CART_KEY);
          if (raw) {
            const guestItems: CartItemView[] = JSON.parse(raw);
            const subtotal = guestItems.reduce(
              (sum, item) => sum + (item.discountPrice ?? item.price ?? 0),
              0
            );
            set({
              items: guestItems,
              itemCount: guestItems.length,
              subtotal: Math.round(subtotal * 100) / 100,
            });
            return;
          }
        } catch (e) {
          console.error("Failed to parse guest cart from localStorage:", e);
        }
      }
      set({ items: [], itemCount: 0, subtotal: 0 });
      return;
    }

    set({ isLoading: true });
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          set({
            items: json.data.items,
            itemCount: json.data.itemCount,
            subtotal: json.data.subtotal,
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch cart:", err);
    } finally {
      set({ isLoading: false });
    }
  },

  addItem: async (itemData, isAuthenticated) => {
    const currentItems = get().items;
    if (currentItems.some((i) => i.courseId === itemData.courseId)) {
      return { success: false, error: "Course is already in your cart" };
    }

    if (!isAuthenticated) {
      const newItem: CartItemView = {
        id: `guest-${itemData.courseId}`,
        courseId: itemData.courseId,
        title: itemData.title,
        slug: itemData.slug,
        thumbnailUrl: itemData.thumbnailUrl ?? null,
        price: itemData.price,
        discountPrice: itemData.discountPrice ?? null,
        instructor: {
          fullName: itemData.instructorName || "Instructor",
        },
      };

      const updated = [...currentItems, newItem];
      const subtotal = updated.reduce(
        (sum, i) => sum + (i.discountPrice ?? i.price ?? 0),
        0
      );

      if (typeof window !== "undefined") {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
      }

      set({
        items: updated,
        itemCount: updated.length,
        subtotal: Math.round(subtotal * 100) / 100,
      });

      return { success: true };
    }

    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: itemData.courseId }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return {
          success: false,
          error: json?.error?.message || "Failed to add course to cart",
        };
      }

      await get().fetchCart(true);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to add course to cart" };
    }
  },

  removeItem: async (courseId, isAuthenticated) => {
    if (!isAuthenticated) {
      const currentItems = get().items;
      const updated = currentItems.filter((i) => i.courseId !== courseId);
      const subtotal = updated.reduce(
        (sum, i) => sum + (i.discountPrice ?? i.price ?? 0),
        0
      );

      if (typeof window !== "undefined") {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updated));
      }

      set({
        items: updated,
        itemCount: updated.length,
        subtotal: Math.round(subtotal * 100) / 100,
      });
      return;
    }

    try {
      const res = await fetch(`/api/cart/${courseId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await get().fetchCart(true);
      }
    } catch (err) {
      console.error("Failed to remove item from cart:", err);
    }
  },

  clearCart: async (isAuthenticated) => {
    if (!isAuthenticated) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(GUEST_CART_KEY);
      }
      set({ items: [], itemCount: 0, subtotal: 0 });
      return;
    }

    try {
      const res = await fetch("/api/cart", { method: "DELETE" });
      if (res.ok) {
        set({ items: [], itemCount: 0, subtotal: 0 });
      }
    } catch (err) {
      console.error("Failed to clear cart:", err);
    }
  },

  mergeGuestCart: async () => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(GUEST_CART_KEY);
      if (!raw) return;

      const guestItems: CartItemView[] = JSON.parse(raw);
      if (!guestItems || guestItems.length === 0) return;

      const courseIds = guestItems.map((i) => i.courseId);
      const res = await fetch("/api/cart/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds }),
      });

      if (res.ok) {
        localStorage.removeItem(GUEST_CART_KEY);
        await get().fetchCart(true);
      }
    } catch (err) {
      console.error("Failed to merge guest cart:", err);
    }
  },
}));
