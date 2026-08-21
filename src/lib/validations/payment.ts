import { z } from "zod";

export const createStripeIntentSchema = z.object({
  couponCode: z.string().max(50).optional(),
});

export type CreateStripeIntentInput = z.infer<typeof createStripeIntentSchema>;

export const createRazorpayOrderSchema = z.object({
  couponCode: z.string().max(50).optional(),
});

export type CreateRazorpayOrderInput = z.infer<typeof createRazorpayOrderSchema>;

export const orderHistoryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(10),
});

export type OrderHistoryQueryInput = z.infer<typeof orderHistoryQuerySchema>;

export interface PriceBreakdownItem {
  courseId: string;
  title: string;
  price: number;
}

export interface StripeIntentResult {
  clientSecret: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  breakdown: PriceBreakdownItem[];
}

export interface RazorpayOrderResult {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  razorpayKey: string;
  prefill: {
    name: string;
    email: string;
  };
  breakdown: PriceBreakdownItem[];
}

export interface ProcessEnrollmentsParams {
  userId: string;
  courseIds: string[];
  gateway: "STRIPE" | "RAZORPAY";
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  total: number;
  couponId?: string | null;
}

export interface OrderItemView {
  id: string;
  courseId: string;
  title: string;
  priceAtPurchase: number;
}

export interface OrderView {
  id: string;
  status: string;
  gateway: string;
  subtotal: number;
  discountAmount: number;
  total: number;
  currency: string;
  invoiceUrl: string | null;
  createdAt: string | null;
  items: OrderItemView[];
}
