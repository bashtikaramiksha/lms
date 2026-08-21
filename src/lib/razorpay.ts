import Razorpay from "razorpay";
import { env } from "@/lib/env";

export const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID || "rzp_test_mock_key_id",
  key_secret: env.RAZORPAY_KEY_SECRET || "rzp_test_mock_key_secret",
});
