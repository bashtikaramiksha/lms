import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { users, auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateUserSchema = z.object({
  status: z.enum(["ACTIVE", "PENDING_APPROVAL", "SUSPENDED", "REJECTED"]).optional(),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT"]).optional(),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Admin access required" } },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await params;
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", details: parsed.error.format() } },
        { status: 400 }
      );
    }

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "User not found" } },
        { status: 404 }
      );
    }

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    let actionName = "UPDATE_USER";

    if (parsed.data.status) {
      updateData.status = parsed.data.status;
      if (parsed.data.status === "ACTIVE" && targetUser.status === "PENDING_APPROVAL") {
        actionName = "APPROVE_TEACHER";
      } else if (parsed.data.status === "REJECTED") {
        actionName = "REJECT_TEACHER";
      } else if (parsed.data.status === "SUSPENDED") {
        actionName = "SUSPEND_USER";
      } else if (parsed.data.status === "ACTIVE" && targetUser.status === "SUSPENDED") {
        actionName = "RESTORE_USER";
      }
    }

    if (parsed.data.role) {
      updateData.role = parsed.data.role;
      actionName = "CHANGE_ROLE";
    }

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, targetUserId))
      .returning({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        status: users.status,
      });

    // Record audit log
    await db.insert(auditLogs).values({
      adminId: session.user.id,
      action: actionName,
      targetUserId,
      details: JSON.stringify({
        previousStatus: targetUser.status,
        newStatus: updated.status,
        previousRole: targetUser.role,
        newRole: updated.role,
        reason: parsed.data.reason || null,
      }),
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1",
    });

    return NextResponse.json({
      success: true,
      data: { user: updated, message: `User updated successfully: ${actionName}` },
    });
  } catch (err: any) {
    console.error("Update user error:", err);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update user" } },
      { status: 500 }
    );
  }
}
