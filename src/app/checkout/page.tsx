"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/lib/store/cart-store";
import {
  CreditCard,
  ShieldCheck,
  Lock,
  Tag,
  CheckCircle2,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  AlertCircle,
  Loader2,
  BookOpen,
  Smartphone,
  Zap,
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuth = !!session?.user;
  const isAuthLoading = status === "loading";

  const { items, subtotal, itemCount, clearCart, fetchCart } = useCartStore();

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    total: number;
  } | null>(null);

  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "razorpay">("stripe");
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    total: number;
    gateway: string;
    items: typeof items;
  } | null>(null);

  // Form states
  const [cardNumber, setCardNumber] = useState("4242 •••• •••• 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("123");
  const [cardName, setCardName] = useState(session?.user?.name || "");

  useEffect(() => {
    fetchCart(isAuth);
  }, [fetchCart, isAuth]);

  useEffect(() => {
    if (session?.user?.name && !cardName) {
      setCardName(session.user.name);
    }
  }, [session, cardName]);

  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const finalTotal = appliedCoupon
    ? appliedCoupon.total
    : Math.max(0, Math.round(subtotal * 100) / 100);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        return resolve(true);
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    setCouponError(null);

    try {
      const endpoint =
        paymentMethod === "razorpay"
          ? "/api/payments/razorpay/create-order"
          : "/api/payments/create-intent";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ couponCode: couponCode.trim() }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setCouponError(
          json?.error?.message || "Invalid coupon code or minimum order not met."
        );
        setAppliedCoupon(null);
      } else {
        const discAmount = json.data.discountAmount ?? (subtotal - (json.data.amount ? json.data.amount / 100 : json.data.total));
        const total = json.data.total ?? (json.data.amount ? json.data.amount / 100 : subtotal);
        setAppliedCoupon({
          code: couponCode.trim().toUpperCase(),
          discountAmount: Math.max(0, Math.round(discAmount * 100) / 100),
          total: Math.max(0, Math.round(total * 100) / 100),
        });
        setCouponError(null);
      }
    } catch (err: any) {
      setCouponError(err.message || "Failed to validate coupon");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
  };

  const handlePayment = async () => {
    if (!isAuth) {
      router.push(`/login?callbackUrl=/checkout`);
      return;
    }

    if (items.length === 0) {
      setCheckoutError("Your cart is empty.");
      return;
    }

    setIsProcessing(true);
    setCheckoutError(null);

    try {
      if (paymentMethod === "razorpay") {
        // --- RAZORPAY PAYMENT FLOW ---
        const res = await fetch("/api/payments/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            couponCode: appliedCoupon?.code || undefined,
          }),
        });

        const orderData = await res.json();
        if (!res.ok || !orderData.success) {
          throw new Error(orderData?.error?.message || "Failed to create Razorpay order");
        }

        const { razorpayOrderId, amount, currency, razorpayKey, prefill } = orderData.data;

        await loadRazorpayScript();

        const processWebhookAndComplete = async (paymentId: string, orderId: string, signature: string) => {
          await fetch("/api/webhooks/razorpay", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-razorpay-signature": signature || "test_signature",
            },
            body: JSON.stringify({
              event: "payment.captured",
              payload: {
                payment: {
                  entity: {
                    id: paymentId,
                    order_id: orderId,
                    amount: amount,
                    notes: {
                      userId: session.user.id,
                      cartItemIds: items.map((i) => i.courseId).join(","),
                      couponId: appliedCoupon ? appliedCoupon.code : "",
                    },
                  },
                },
              },
            }),
          });

          const currentItemsSnapshot = [...items];
          await clearCart(true);

          setCompletedOrder({
            orderId: orderId.slice(0, 16),
            total: finalTotal,
            gateway: "Razorpay (UPI / NetBanking)",
            items: currentItemsSnapshot,
          });
        };

        if (typeof window !== "undefined" && (window as any).Razorpay) {
          const rzp = new (window as any).Razorpay({
            key: razorpayKey,
            amount: amount,
            currency: currency || "INR",
            name: "LMS Platform",
            description: "Course Enrollment Purchase",
            order_id: razorpayOrderId,
            prefill: {
              name: prefill?.name || session.user.name || "Student",
              email: prefill?.email || session.user.email || "",
            },
            theme: {
              color: "#4f46e5",
            },
            handler: async function (response: any) {
              await processWebhookAndComplete(
                response.razorpay_payment_id || `pay_${Date.now()}`,
                response.razorpay_order_id || razorpayOrderId,
                response.razorpay_signature || "test_signature"
              );
            },
            modal: {
              ondismiss: function () {
                setIsProcessing(false);
              },
            },
          });
          rzp.open();
        } else {
          // Development / testing fallback simulation
          await processWebhookAndComplete(
            `pay_${Date.now()}`,
            razorpayOrderId,
            "test_signature"
          );
        }
      } else {
        // --- STRIPE PAYMENT FLOW ---
        const intentRes = await fetch("/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            couponCode: appliedCoupon?.code || undefined,
          }),
        });

        const intentData = await intentRes.json();
        if (!intentRes.ok || !intentData.success) {
          throw new Error(intentData?.error?.message || "Payment intent creation failed");
        }

        const clientSecret = intentData.data.clientSecret;
        const paymentIntentId =
          clientSecret.split("_secret_")[0] || `pi_${crypto.randomUUID()}`;

        // Process webhook on backend to complete order & enrollments
        await fetch("/api/webhooks/stripe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "stripe-signature": "test_signature",
          },
          body: JSON.stringify({
            id: `evt_${Date.now()}`,
            type: "payment_intent.succeeded",
            data: {
              object: {
                id: paymentIntentId,
                amount: Math.round(finalTotal * 100),
                currency: "inr",
                latest_charge: `ch_${Date.now()}`,
                metadata: {
                  userId: session.user.id,
                  cartItemIds: items.map((i) => i.courseId).join(","),
                  couponId: appliedCoupon ? appliedCoupon.code : "",
                },
              },
            },
          }),
        });

        const currentItemsSnapshot = [...items];
        await clearCart(true);

        setCompletedOrder({
          orderId: paymentIntentId.slice(0, 16),
          total: finalTotal,
          gateway: "Stripe Secure",
          items: currentItemsSnapshot,
        });
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      setCheckoutError(err.message || "An error occurred during payment processing");
    } finally {
      setIsProcessing(false);
    }
  };

  // SUCCESS STATE
  if (completedOrder) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-lg py-4">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-white">LMS Platform</span>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl shadow-black/80 space-y-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                Payment Successful! 🎉
              </h1>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Thank you for your purchase. Your course enrollments are now active and ready for you to explore.
              </p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5 space-y-3">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Order Reference</span>
                <span className="font-mono text-slate-200 uppercase">
                  #{completedOrder.orderId}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Total Paid</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ${completedOrder.total.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Payment Gateway</span>
                <span className="text-slate-200">{completedOrder.gateway}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-300">Enrolled Courses:</h3>
              <div className="space-y-2">
                {completedOrder.items.map((item) => (
                  <div
                    key={item.courseId}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/40 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 rounded bg-slate-800 overflow-hidden relative flex-shrink-0">
                        {item.thumbnailUrl ? (
                          <Image
                            src={item.thumbnailUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <BookOpen className="w-4 h-4 m-auto text-slate-500" />
                        )}
                      </div>
                      <span className="font-medium text-slate-200 line-clamp-1">{item.title}</span>
                    </div>
                    <span className="text-xs font-semibold text-indigo-400">Active</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/dashboard"
                className="flex-1 inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/30"
              >
                Go to Student Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
              <Link
                href="/courses"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
              >
                Browse More Courses
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">LMS Platform</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/60">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>
      </header>

      {/* Main Checkout Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-10">
        {items.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-5">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Your cart is empty</h2>
              <p className="text-sm text-slate-400 mt-1.5">
                Add courses to your cart to proceed with checkout.
              </p>
            </div>
            <Link
              href="/courses"
              className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-lg shadow-indigo-600/25"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Explore Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Auth status + Payment Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* Unauthenticated Alert */}
              {!isAuth && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 text-sm space-y-1">
                    <p className="font-semibold">Sign in required to complete purchase</p>
                    <p className="text-xs text-amber-300/80">
                      Please sign in or create an account so your courses can be linked to your student dashboard.
                    </p>
                    <div className="pt-2">
                      <Link
                        href="/login?callbackUrl=/checkout"
                        className="inline-flex items-center text-xs font-bold bg-amber-500 text-slate-950 px-3 py-1.5 rounded-md hover:bg-amber-400 transition"
                      >
                        Sign In / Register
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Student Info Card */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs">
                    1
                  </span>
                  Account Information
                </h3>
                {isAuth ? (
                  <div className="flex items-center justify-between text-sm bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                    <div>
                      <p className="font-medium text-slate-200">{session?.user?.name || "Student"}</p>
                      <p className="text-xs text-slate-400">{session?.user?.email}</p>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
                      Signed In
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    You will be prompted to sign in before completing payment.
                  </p>
                )}
              </div>

              {/* Payment Details Form */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs">
                      2
                    </span>
                    Payment Method
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Secure Gateway</span>
                  </div>
                </div>

                {/* Gateway Selector Tabs */}
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-800/60 rounded-xl border border-slate-700/60">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("stripe")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition ${
                      paymentMethod === "stripe"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Card / Stripe</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("razorpay")}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-bold transition ${
                      paymentMethod === "razorpay"
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span>UPI / Razorpay</span>
                  </button>
                </div>

                {paymentMethod === "stripe" ? (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Jane Doe"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Card Details
                      </label>
                      <div className="grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="Card number"
                          className="col-span-6 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 font-mono placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                        />
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/YY"
                          className="col-span-3 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 font-mono text-center placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                        />
                        <input
                          type="text"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value)}
                          placeholder="CVC"
                          className="col-span-3 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 font-mono text-center placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 pt-1 animate-in fade-in duration-200">
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <Zap className="w-4 h-4" />
                        <span>Instant Checkout with India Payment Methods</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Supports <span className="font-semibold text-white">Google Pay, PhonePe, Paytm, BHIM UPI</span>, NetBanking across 50+ Indian banks, and RuPay/Visa/Mastercard.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Billing Name
                      </label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                )}

                {checkoutError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{checkoutError}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handlePayment}
                    disabled={isProcessing || isAuthLoading}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Authorizing Payment...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>
                          {paymentMethod === "razorpay"
                            ? `Pay ₹${Math.round(finalTotal * 100) / 100} with UPI / Razorpay`
                            : `Pay $${finalTotal.toFixed(2)} USD with Stripe`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Security & Guarantee Badges */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-indigo-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-200">30-Day Money-Back Guarantee</p>
                    <p className="text-[11px] text-slate-400">Full refund if unsatisfied</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-purple-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-200">Lifetime Access</p>
                    <p className="text-[11px] text-slate-400">On eligible masterclasses</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Coupon */}
            <div className="lg:col-span-5 space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 sticky top-24">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <h3 className="text-base font-bold text-white">Order Summary</h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {itemCount} {itemCount === 1 ? "course" : "courses"}
                  </span>
                </div>

                {/* Items List */}
                <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                  {items.map((item) => (
                    <div
                      key={item.courseId}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-700/50"
                    >
                      <div className="relative w-14 h-10 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                        {item.thumbnailUrl ? (
                          <Image
                            src={item.thumbnailUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200 line-clamp-1">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.instructor?.fullName || "Instructor"}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-white">
                        ${(item.discountPrice ?? item.price).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Coupon Code Section */}
                <div className="border-t border-slate-800 pt-4 space-y-2">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Tag className="w-3.5 h-3.5" />
                        <span>{appliedCoupon.code} Applied</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-slate-400 hover:text-white underline text-[11px]"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          placeholder="Coupon Code"
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-100 uppercase placeholder:normal-case placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isApplyingCoupon || !couponCode.trim()}
                        className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition border border-slate-700 disabled:opacity-50"
                      >
                        {isApplyingCoupon ? "..." : "Apply"}
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <p className="text-[11px] text-rose-400">{couponError}</p>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-slate-800 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="text-slate-200">${subtotal.toFixed(2)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-medium">
                      <span>Coupon Discount</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-800/80 pt-2 flex justify-between items-baseline">
                    <span className="font-bold text-base text-white">Total</span>
                    <span className="font-extrabold text-2xl text-white">
                      ${finalTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
