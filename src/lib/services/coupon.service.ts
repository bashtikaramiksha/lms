import { db } from "@/lib/db/client";
import { coupons, type Coupon } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { AppError } from "@/lib/services/course.service";
import type {
  CreateCouponInput,
  UpdateCouponInput,
  ListCouponsQueryInput,
  CouponValidationResult,
} from "@/lib/validations/coupon";

export class CouponService {
  async validateCoupon(code: string, subtotal: number): Promise<Coupon> {
    const coupon = await db.query.coupons.findFirst({
      where: eq(coupons.code, code.toUpperCase().trim()),
    });

    if (!coupon) {
      throw new AppError("INVALID_COUPON", 422, "Coupon not found", { reason: "NOT_FOUND" });
    }

    if (!coupon.isActive) {
      throw new AppError("INVALID_COUPON", 422, "This coupon is inactive", { reason: "INACTIVE" });
    }

    if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
      throw new AppError("INVALID_COUPON", 422, "This coupon has expired", { reason: "EXPIRED" });
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new AppError("INVALID_COUPON", 422, "This coupon has reached its usage limit", { reason: "EXHAUSTED" });
    }

    if (subtotal < (coupon.minOrderValue ?? 0)) {
      throw new AppError("INVALID_COUPON", 422, "Minimum order value not met for this coupon", { reason: "MIN_ORDER_NOT_MET" });
    }

    return coupon;
  }

  async validateCouponWithCalculation(
    code: string,
    subtotal: number
  ): Promise<CouponValidationResult> {
    const coupon = await this.validateCoupon(code, subtotal);

    let discountAmount =
      coupon.type === "PERCENT"
        ? (subtotal * coupon.value) / 100
        : coupon.value;

    discountAmount = Math.min(discountAmount, subtotal);
    discountAmount = Math.round(discountAmount * 100) / 100;
    const newTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

    return {
      code: coupon.code,
      type: coupon.type as "PERCENT" | "FIXED",
      value: coupon.value,
      discountAmount,
      newTotal,
    };
  }

  async createCoupon(dto: CreateCouponInput, adminId: string): Promise<Coupon> {
    if (dto.type === "PERCENT" && dto.value > 100) {
      throw new AppError("VALIDATION_ERROR", 400, "Percentage discount cannot exceed 100%");
    }

    const code = dto.code.toUpperCase().trim();

    // Check if code already exists
    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.code, code),
    });
    if (existing) {
      throw new AppError("COUPON_CODE_EXISTS", 409, `Coupon code "${code}" already exists`);
    }

    try {
      const [coupon] = await db
        .insert(coupons)
        .values({
          code,
          type: dto.type,
          value: dto.value,
          minOrderValue: dto.minOrderValue ?? 0,
          maxUses: dto.maxUses ?? null,
          expiresAt: dto.expiresAt ?? null,
          isActive: dto.isActive !== undefined ? dto.isActive : true,
          createdBy: adminId,
          usedCount: 0,
        })
        .returning();

      return coupon;
    } catch (err: any) {
      if (err.message?.includes("UNIQUE constraint failed")) {
        throw new AppError("COUPON_CODE_EXISTS", 409, `Coupon code "${code}" already exists`);
      }
      throw err;
    }
  }

  async getCoupons(
    query?: ListCouponsQueryInput
  ): Promise<{ coupons: Coupon[]; nextCursor?: string }> {
    const limit = query?.limit ?? 20;

    const whereClause =
      query?.isActive !== undefined
        ? eq(coupons.isActive, query.isActive)
        : undefined;

    const items = await db.query.coupons.findMany({
      where: whereClause,
      orderBy: [desc(coupons.createdAt)],
      limit: limit + 1,
    });

    const hasNext = items.length > limit;
    const couponsToReturn = hasNext ? items.slice(0, limit) : items;
    const nextCursor = hasNext ? couponsToReturn[couponsToReturn.length - 1]?.id : undefined;

    return {
      coupons: couponsToReturn,
      nextCursor,
    };
  }

  async updateCoupon(id: string, dto: UpdateCouponInput): Promise<Coupon> {
    const existing = await db.query.coupons.findFirst({
      where: eq(coupons.id, id),
    });

    if (!existing) {
      throw new AppError("COUPON_NOT_FOUND", 404, "Coupon not found");
    }

    const updates: Partial<typeof coupons.$inferInsert> = {};
    if (dto.isActive !== undefined) updates.isActive = dto.isActive;
    if (dto.expiresAt !== undefined) updates.expiresAt = dto.expiresAt;
    if (dto.maxUses !== undefined) updates.maxUses = dto.maxUses;
    if (dto.minOrderValue !== undefined) updates.minOrderValue = dto.minOrderValue;

    const [updated] = await db
      .update(coupons)
      .set(updates)
      .where(eq(coupons.id, id))
      .returning();

    return updated;
  }
}

export const couponService = new CouponService();
