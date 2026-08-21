import { z } from "zod";

export const validateCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required").max(50),
  subtotal: z.number().positive("Subtotal must be positive"),
});

export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(50)
    .transform((v) => v.toUpperCase().trim()),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number().positive("Discount value must be positive"),
  minOrderValue: z.number().min(0, "Minimum order value cannot be negative").default(0).optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().default(true).optional(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;

export const updateCouponSchema = z.object({
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxUses: z.number().int().positive().nullable().optional(),
  minOrderValue: z.number().min(0).optional(),
});

export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;

export const listCouponsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export type ListCouponsQueryInput = z.infer<typeof listCouponsQuerySchema>;

export const refundSchema = z.object({
  amount: z.number().positive("Refund amount must be positive"),
  reason: z.enum(["DUPLICATE", "FRAUDULENT", "REQUESTED_BY_CUSTOMER"]),
  orderItemIds: z.array(z.string()).optional(),
});

export type RefundInput = z.infer<typeof refundSchema>;

export const adminPaymentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  gateway: z.enum(["STRIPE", "RAZORPAY"]).optional(),
  status: z
    .enum(["PENDING", "COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED", "FAILED"])
    .optional(),
  studentId: z.string().optional(),
});

export type AdminPaymentsQueryInput = z.infer<typeof adminPaymentsQuerySchema>;

export interface CouponValidationResult {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  discountAmount: number;
  newTotal: number;
}

export interface RefundResult {
  orderId: string;
  refundedAmount: number;
  newOrderStatus: "REFUNDED" | "PARTIALLY_REFUNDED";
  gatewayRefundId: string;
}
