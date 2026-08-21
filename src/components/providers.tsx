"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { CartSheet } from "@/components/cart/cart-sheet";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <CartSheet />
    </SessionProvider>
  );
}
