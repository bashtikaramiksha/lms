import { cartService } from "../cart.service";
import { courseService, AppError } from "../course.service";
import { db } from "../../db/client";
import { courses, users, enrollments, cartItems } from "../../db/schema";
import { eq, and } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function runCartTests() {
  console.log("🧪 Starting Slice 3.1 Shopping Cart Verification Tests...\n");

  const timestamp = Date.now();

  // 1. Create test teacher and student
  console.log("1️⃣ Setting up test users...");
  const [teacher] = await db
    .insert(users)
    .values({
      fullName: `Test Instructor ${timestamp}`,
      email: `instructor-${timestamp}@example.com`,
      role: "TEACHER",
      status: "ACTIVE",
    })
    .returning();

  const [student] = await db
    .insert(users)
    .values({
      fullName: `Test Student ${timestamp}`,
      email: `student-${timestamp}@example.com`,
      role: "STUDENT",
      status: "ACTIVE",
    })
    .returning();

  console.log("   ✅ Teacher and Student created:", teacher.id, student.id);

  // 2. Create test courses: one published with discount, one published with regular price, one draft
  console.log("2️⃣ Creating test courses (published & draft)...");
  const [publishedCourse1] = await db
    .insert(courses)
    .values({
      title: `Published Course with Discount ${timestamp}`,
      slug: `pub-course-discount-${timestamp}`,
      type: "RECORDED",
      status: "PUBLISHED",
      price: 100.0,
      discountPrice: 69.99,
      authorId: teacher.id,
      thumbnailUrl: "https://example.com/thumb1.jpg",
    })
    .returning();

  const [publishedCourse2] = await db
    .insert(courses)
    .values({
      title: `Published Course Standard Price ${timestamp}`,
      slug: `pub-course-standard-${timestamp}`,
      type: "RECORDED",
      status: "PUBLISHED",
      price: 49.99,
      discountPrice: null,
      authorId: teacher.id,
      thumbnailUrl: "https://example.com/thumb2.jpg",
    })
    .returning();

  const [draftCourse] = await db
    .insert(courses)
    .values({
      title: `Draft Course Not Published ${timestamp}`,
      slug: `draft-course-${timestamp}`,
      type: "RECORDED",
      status: "DRAFT",
      price: 29.99,
      authorId: teacher.id,
    })
    .returning();

  const [enrolledCourse] = await db
    .insert(courses)
    .values({
      title: `Enrolled Course ${timestamp}`,
      slug: `enrolled-course-${timestamp}`,
      type: "RECORDED",
      status: "PUBLISHED",
      price: 39.99,
      authorId: teacher.id,
    })
    .returning();

  // Create active enrollment for student in enrolledCourse
  await db.insert(enrollments).values({
    userId: student.id,
    courseId: enrolledCourse.id,
    status: "ACTIVE",
  });

  console.log("   ✅ Courses created: 2 Published, 1 Draft, 1 Active Enrollment");

  // 3. Test getCart() on empty cart
  console.log("3️⃣ Testing getCart() on empty cart...");
  const emptyCart = await cartService.getCart(student.id);
  if (emptyCart.itemCount !== 0 || emptyCart.items.length !== 0 || emptyCart.subtotal !== 0) {
    throw new Error(`Expected empty cart, got count=${emptyCart.itemCount}, subtotal=${emptyCart.subtotal}`);
  }
  console.log("   ✅ Empty cart returns itemCount=0, subtotal=0, items=[]");

  // 4. Test addItem() for valid PUBLISHED course
  console.log("4️⃣ Testing addItem() for published course...");
  const item1 = await cartService.addItem(student.id, publishedCourse1.id);
  if (item1.courseId !== publishedCourse1.id || item1.userId !== student.id) {
    throw new Error("addItem() failed to return correct item data");
  }
  console.log("   ✅ Course successfully added to cart");

  // 5. Test addItem() error on duplicate add (ALREADY_IN_CART)
  console.log("5️⃣ Testing duplicate addItem() rejection...");
  let caughtDuplicate = false;
  try {
    await cartService.addItem(student.id, publishedCourse1.id);
  } catch (err: any) {
    if (err instanceof AppError && err.code === "ALREADY_IN_CART" && err.statusCode === 409) {
      caughtDuplicate = true;
    }
  }
  if (!caughtDuplicate) throw new Error("Expected ALREADY_IN_CART (409) on duplicate course add");
  console.log("   ✅ Correctly threw ALREADY_IN_CART (409)");

  // 6. Test addItem() error on DRAFT course (COURSE_NOT_FOUND)
  console.log("6️⃣ Testing addItem() rejection on draft course...");
  let caughtDraftError = false;
  try {
    await cartService.addItem(student.id, draftCourse.id);
  } catch (err: any) {
    if (err instanceof AppError && err.code === "COURSE_NOT_FOUND" && err.statusCode === 404) {
      caughtDraftError = true;
    }
  }
  if (!caughtDraftError) throw new Error("Expected COURSE_NOT_FOUND (404) on draft course add");
  console.log("   ✅ Correctly threw COURSE_NOT_FOUND (404) for draft course");

  // 7. Test addItem() error on already-enrolled course (ALREADY_ENROLLED)
  console.log("7️⃣ Testing addItem() rejection on enrolled course...");
  let caughtEnrolledError = false;
  try {
    await cartService.addItem(student.id, enrolledCourse.id);
  } catch (err: any) {
    if (err instanceof AppError && err.code === "ALREADY_ENROLLED" && err.statusCode === 409) {
      caughtEnrolledError = true;
    }
  }
  if (!caughtEnrolledError) throw new Error("Expected ALREADY_ENROLLED (409) on enrolled course add");
  console.log("   ✅ Correctly threw ALREADY_ENROLLED (409) for enrolled course");

  // 8. Test addItem() for second published course & getCart() calculation
  console.log("8️⃣ Testing multiple items & getCart() pricing calculations...");
  await cartService.addItem(student.id, publishedCourse2.id);

  const cart = await cartService.getCart(student.id);
  if (cart.itemCount !== 2) throw new Error(`Expected 2 items in cart, got ${cart.itemCount}`);

  // Expected subtotal = 69.99 (discountPrice of course1) + 49.99 (regular price of course2) = 119.98
  const expectedSubtotal = 119.98;
  if (Math.abs(cart.subtotal - expectedSubtotal) > 0.01) {
    throw new Error(`Expected subtotal ${expectedSubtotal}, got ${cart.subtotal}`);
  }

  const itemWithDiscount = cart.items.find((i) => i.courseId === publishedCourse1.id);
  if (!itemWithDiscount || itemWithDiscount.discountPrice !== 69.99 || itemWithDiscount.price !== 100.0) {
    throw new Error("Cart item discount pricing mapping mismatch");
  }

  if (itemWithDiscount.instructor.fullName !== teacher.fullName) {
    throw new Error(`Expected instructor fullName '${teacher.fullName}', got '${itemWithDiscount.instructor.fullName}'`);
  }
  console.log("   ✅ Cart correctly computed subtotal ($119.98) using discountPrice when available & joined instructor details");

  // 9. Test removeItem()
  console.log("9️⃣ Testing removeItem()...");
  await cartService.removeItem(student.id, publishedCourse2.id);
  const cartAfterRemove = await cartService.getCart(student.id);
  if (cartAfterRemove.itemCount !== 1 || cartAfterRemove.items[0].courseId !== publishedCourse1.id) {
    throw new Error("removeItem() failed to remove target item");
  }

  let caughtItemNotFound = false;
  try {
    await cartService.removeItem(student.id, publishedCourse2.id);
  } catch (err: any) {
    if (err instanceof AppError && err.code === "ITEM_NOT_FOUND" && err.statusCode === 404) {
      caughtItemNotFound = true;
    }
  }
  if (!caughtItemNotFound) throw new Error("Expected ITEM_NOT_FOUND (404) when removing nonexistent item");
  console.log("   ✅ removeItem() successfully removed item and threw ITEM_NOT_FOUND (404) on repeated remove");

  // 10. Test clearCart()
  console.log("🔟 Testing clearCart()...");
  await cartService.clearCart(student.id);
  const cartAfterClear = await cartService.getCart(student.id);
  if (cartAfterClear.itemCount !== 0) throw new Error("clearCart() failed to empty cart");
  console.log("   ✅ clearCart() emptied cart successfully");

  // 11. Test mergeGuestCart()
  console.log("1️⃣1️⃣ Testing mergeGuestCart() with mixed course batch...");
  // Mix:
  // - publishedCourse1 (valid -> should be added)
  // - publishedCourse2 (valid -> should be added)
  // - draftCourse (invalid status -> should be skipped)
  // - enrolledCourse (already enrolled -> should be skipped)
  // - "nonexistent-id-uuid" (not found -> should be skipped)
  const mergeResult = await cartService.mergeGuestCart(student.id, [
    publishedCourse1.id,
    publishedCourse2.id,
    draftCourse.id,
    enrolledCourse.id,
    "00000000-0000-0000-0000-000000000000",
  ]);

  if (mergeResult.added !== 2 || mergeResult.skipped !== 3) {
    throw new Error(`Expected { added: 2, skipped: 3 }, got ${JSON.stringify(mergeResult)}`);
  }

  const mergedCart = await cartService.getCart(student.id);
  if (mergedCart.itemCount !== 2) {
    throw new Error(`Expected merged cart to contain 2 items, got ${mergedCart.itemCount}`);
  }
  console.log("   ✅ mergeGuestCart() successfully added 2 valid items and skipped 3 invalid/enrolled/draft items");

  // Clean up test data
  console.log("1️⃣2️⃣ Cleaning up test data...");
  await db.delete(cartItems).where(eq(cartItems.userId, student.id));
  await db.delete(enrollments).where(eq(enrollments.userId, student.id));
  await db.delete(courses).where(eq(courses.authorId, teacher.id));
  await db.delete(users).where(eq(users.id, student.id));
  await db.delete(users).where(eq(users.id, teacher.id));

  console.log("\n🎉 ALL SLICE 3.1 TESTS PASSED SUCCESSFULLY! 🚀\n");
}

runCartTests().catch((err) => {
  console.error("❌ Cart test run failed:", err);
  process.exit(1);
});
