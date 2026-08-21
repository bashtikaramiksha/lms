import { DefaultSession } from "next-auth";
import { UserRole, UserStatus } from "@/lib/db/schema/users";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      status: UserStatus;
      emailVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: UserRole;
    status?: UserStatus;
    emailVerified?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    status?: UserStatus;
    emailVerified?: boolean;
  }
}
