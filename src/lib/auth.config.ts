import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const role = (auth?.user as any)?.role || "STUDENT";
      const status = (auth?.user as any)?.status || "ACTIVE";

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        return role === "ADMIN";
      }

      if (pathname.startsWith("/teacher")) {
        if (!isLoggedIn) return false;
        if (status === "PENDING_APPROVAL") {
          return Response.redirect(new URL("/pending-approval", nextUrl));
        }
        return role === "TEACHER" || role === "ADMIN";
      }

      if (pathname.startsWith("/dashboard")) {
        return isLoggedIn;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.status = (user as any).status;
        token.isEmailVerified = (user as any).emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) || (token.sub as string);
        (session.user as any).role = (token.role as any) || "STUDENT";
        (session.user as any).status = (token.status as any) || "ACTIVE";
        (session.user as any).emailVerified = !!token.isEmailVerified;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
