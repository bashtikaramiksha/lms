import { z } from "zod";

export const addCartItemSchema = z.object({
  courseId: z.string().min(1, { message: "Course ID is required" }),
});

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;

export const mergeCartSchema = z.object({
  courseIds: z
    .array(z.string().min(1, { message: "Invalid course ID" }))
    .max(20, { message: "Cannot merge more than 20 items at once" }),
});

export type MergeCartInput = z.infer<typeof mergeCartSchema>;

export interface CartItemView {
  id: string;
  courseId: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  price: number;
  discountPrice: number | null;
  instructor: {
    fullName: string;
  };
}

export interface CartSummary {
  items: CartItemView[];
  itemCount: number;
  subtotal: number;
}
