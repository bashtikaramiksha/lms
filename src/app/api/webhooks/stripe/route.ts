import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/services/payment.service";
import { AppError } from "@/lib/services/course.service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature") || "";

    await paymentService.handleStripeWebhook(rawBody, signature);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/webhooks/stripe error:", err);
    if (err instanceof AppError && err.code === "INVALID_STRIPE_SIGNATURE") {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: 400 }
      );
    }

    // Always acknowledge 200 to stripe on standard processing errors to avoid webhook storm
    return NextResponse.json(
      { received: true, note: "Handled with internal error logged" },
      { status: 200 }
    );
  }
}
