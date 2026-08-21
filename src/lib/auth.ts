import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "@/lib/env";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const providers = [];

if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: env.AUTH_GOOGLE_ID,
      clientSecret: env.AUTH_GOOGLE_SECRET,
    })
  );
}

providers.push(
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const user = await db.query.users.findFirst({
        where: eq(users.email, parsed.data.email.toLowerCase().trim()),
      });

      if (!user || !user.passwordHash) return null;

      const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!isValid) return null;

      if (!user.emailVerified) {
        throw new Error("EMAIL_NOT_VERIFIED");
      }

      if (user.status === "SUSPENDED") {
        throw new Error("ACCOUNT_SUSPENDED");
      }

      return {
        id: user.id,
        email: user.email,
        name: user.fullName,
        image: user.avatarUrl,
        role: user.role,
        status: user.status,
        emailVerified: !!user.emailVerified,
      };
    },
  })
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  session: { strategy: "jwt" },
  secret: env.AUTH_SECRET,
  // Required for Vercel/production deployments: trusts the HOST header set by the platform.
  // Without this, NextAuth v5 rejects sign-in requests when AUTH_URL doesn't exactly match
  // the deployment URL (e.g. preview deployments or custom domains).
  trustHost: true,
});
