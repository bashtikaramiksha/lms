import { db } from "@/lib/db/client";
import { cartItems, courses, users, enrollments, type CartItem } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { AppError } from "@/lib/services/course.service";
import type { CartSummary, CartItemView } from "@/lib/validations/cart";

export class CartService {
  async getCart(userId: string): Promise<CartSummary> {
    const rows = await db
      .select({
        id: cartItems.id,
        courseId: cartItems.courseId,
        title: courses.title,
        slug: courses.slug,
        thumbnailUrl: courses.thumbnailUrl,
        price: courses.price,
        discountPrice: courses.discountPrice,
        instructorName: users.fullName,
      })
      .from(cartItems)
      .innerJoin(courses, eq(cartItems.courseId, courses.id))
      .innerJoin(users, eq(courses.authorId, users.id))
      .where(eq(cartItems.userId, userId));

    const items: CartItemView[] = rows.map((row) => ({
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      slug: row.slug,
      thumbnailUrl: row.thumbnailUrl,
      price: row.price ?? 0,
      discountPrice: row.discountPrice ?? null,
      instructor: {
        fullName: row.instructorName,
      },
    }));

    const subtotal = items.reduce(
      (sum, item) => sum + (item.discountPrice ?? item.price),
      0
    );

    return {
      items,
      itemCount: items.length,
      subtotal: Math.round(subtotal * 100) / 100,
    };
  }

  async addItem(userId: string, courseId: string): Promise<CartItem> {
    const course = await db.query.courses.findFirst({
      where: and(eq(courses.id, courseId), eq(courses.status, "PUBLISHED")),
    });

    if (!course) {
      throw new AppError("COURSE_NOT_FOUND", 404, "Course does not exist or is not published");
    }

    const enrolled = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, "ACTIVE")
      ),
    });

    if (enrolled) {
      throw new AppError("ALREADY_ENROLLED", 409, "User is already enrolled in this course");
    }

    const existingInCart = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.userId, userId), eq(cartItems.courseId, courseId)),
    });

    if (existingInCart) {
      throw new AppError("ALREADY_IN_CART", 409, "Course is already in your cart");
    }

    try {
      const [item] = await db
        .insert(cartItems)
        .values({ userId, courseId })
        .returning();
      return item;
    } catch (err: any) {
      if (
        err.message?.includes("UNIQUE constraint failed") ||
        err.message?.includes("idx_cart_user_course")
      ) {
        throw new AppError("ALREADY_IN_CART", 409, "Course is already in your cart");
      }
      throw err;
    }
  }

  async removeItem(userId: string, courseId: string): Promise<void> {
    const existing = await db.query.cartItems.findFirst({
      where: and(eq(cartItems.userId, userId), eq(cartItems.courseId, courseId)),
    });

    if (!existing) {
      throw new AppError("ITEM_NOT_FOUND", 404, "Item not found in cart");
    }

    await db
      .delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.courseId, courseId)));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  async mergeGuestCart(
    userId: string,
    courseIds: string[]
  ): Promise<{ added: number; skipped: number }> {
    let added = 0;
    let skipped = 0;

    for (const courseId of courseIds) {
      try {
        await this.addItem(userId, courseId);
        added++;
      } catch {
        skipped++;
      }
    }

    return { added, skipped };
  }
}

export const cartService = new CartService();
