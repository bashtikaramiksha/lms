import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users, auditLogs } from "@/lib/db/schema";
import { desc, eq, like, or, and, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role");
    const status = searchParams.get("status");

    let conditions = [];

    if (search) {
      conditions.push(
        or(
          like(users.email, `%${search}%`),
          like(users.fullName, `%${search}%`)
        )
      );
    }

    if (role && ["ADMIN", "TEACHER", "STUDENT"].includes(role)) {
      conditions.push(eq(users.role, role as any));
    }

    if (status && ["ACTIVE", "PENDING_APPROVAL", "SUSPENDED", "REJECTED"].includes(status)) {
      conditions.push(eq(users.status, status as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const userList = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(100);

    return NextResponse.json({
      success: true,
      data: { users: userList, total: userList.length },
    });
  } catch (err: any) {
    console.error("Admin user list error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch users" } },
      { status: 500 }
    );
  }
}
