import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LMS Platform - Next-Gen Online Learning",
  description: "Enterprise-grade LMS platform built with Next.js 15, libSQL, and Drizzle ORM.",
};

import { Providers } from "@/components/providers";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <div className="relative min-h-screen bg-background text-foreground flex flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
