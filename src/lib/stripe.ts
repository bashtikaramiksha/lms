import Stripe from "stripe";
import { env } from "@/lib/env";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY || "sk_test_mock_key_for_development_and_testing", {
  apiVersion: "2025-01-27.acacia" as any,
  typescript: true,
});
