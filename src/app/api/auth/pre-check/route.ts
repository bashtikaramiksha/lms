import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Pre-check endpoint called before NextAuth signIn().
 * Returns a specific error code so the UI can show the correct message.
 * NextAuth v5 wraps all credential errors as "CredentialsSignin" — this works around that.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email.toLowerCase().trim()),
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ code: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ code: "INVALID_CREDENTIALS" }, { status: 401 });
    }

    if (!user.emailVerified) {
      return NextResponse.json({ code: "EMAIL_NOT_VERIFIED" }, { status: 403 });
    }

    if (user.status === "SUSPENDED") {
      return NextResponse.json({ code: "ACCOUNT_SUSPENDED" }, { status: 403 });
    }

    if (user.status === "PENDING_APPROVAL") {
      return NextResponse.json({ code: "PENDING_APPROVAL", role: user.role }, { status: 403 });
    }

    // Credentials are valid — caller should now invoke NextAuth signIn()
    return NextResponse.json({ code: "OK", role: user.role }, { status: 200 });
  } catch (err) {
    console.error("Pre-check error:", err);
    return NextResponse.json({ code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
