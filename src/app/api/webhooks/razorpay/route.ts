import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/services/payment.service";
import { AppError } from "@/lib/services/course.service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    await paymentService.handleRazorpayWebhook(rawBody, signature);

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error("POST /api/webhooks/razorpay error:", err);
    if (err instanceof AppError && err.code === "INVALID_RAZORPAY_SIGNATURE") {
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: 400 }
      );
    }

    // Always acknowledge with 200 on standard processing errors to avoid webhook storm
    return NextResponse.json(
      { received: true, note: "Handled with internal error logged" },
      { status: 200 }
    );
  }
}
