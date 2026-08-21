import { inngest } from "@/lib/inngest";
import { db } from "@/lib/db/client";
import { orders, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/resend";

export const sendPurchaseReceipt = inngest.createFunction(
  { id: "payment-send-receipt", retries: 3 },
  { event: "payment/completed" },
  async ({ event, step }) => {
    const { orderId, userId } = event.data;

    const [order, student] = await step.run("fetch-order-and-student", async () => {
      return Promise.all([
        db.query.orders.findFirst({
          where: eq(orders.id, orderId),
          with: {
            items: {
              with: {
                course: true,
              },
            },
          },
        }),
        db.query.users.findFirst({
          where: eq(users.id, userId),
        }),
      ]);
    });

    if (!order || !student) {
      console.warn("Order or student not found for receipt:", { orderId, userId });
      return;
    }

    await step.run("send-receipt-email", async () => {
      const itemsListHtml = (order.items || [])
        .map(
          (item: any) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 0; color: #1e293b;">${item.course?.title || "Course"}</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 600; color: #0f172a;">₹${(item.priceAtPurchase ?? 0).toFixed(2)}</td>
            </tr>
          `
        )
        .join("");

      return sendEmail({
        to: student.email,
        subject: `Your purchase receipt — Order #${order.id.slice(0, 8).toUpperCase()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">Thank You for Your Order! 🎉</h2>
            <p>Hello <strong>${student.fullName}</strong>,</p>
            <p>Your payment via <strong>${order.gateway}</strong> was successful. Here is your order confirmation:</p>
            
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px;">
                <span style="color: #64748b;">Order Number:</span>
                <span style="font-weight: bold; color: #0f172a;">#${order.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 14px;">
                <span style="color: #64748b;">Date:</span>
                <span style="color: #0f172a;">${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}</span>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="border-bottom: 2px solid #cbd5e1; text-align: left;">
                  <th style="padding-bottom: 8px; color: #475569;">Course</th>
                  <th style="padding-bottom: 8px; text-align: right; color: #475569;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsListHtml}
              </tbody>
              <tfoot>
                ${
                  order.discountAmount && order.discountAmount > 0
                    ? `
                  <tr>
                    <td style="padding-top: 12px; color: #16a34a;">Discount Applied</td>
                    <td style="padding-top: 12px; text-align: right; color: #16a34a; font-weight: 600;">-₹${order.discountAmount.toFixed(2)}</td>
                  </tr>
                `
                    : ""
                }
                <tr>
                  <td style="padding-top: 12px; font-size: 16px; font-weight: bold; color: #0f172a;">Total Paid</td>
                  <td style="padding-top: 12px; text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">₹${order.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            <p style="margin-top: 24px;">Your course enrollments are now active. You can start learning immediately in your student dashboard!</p>
          </div>
        `,
      });
    });
  }
);
