"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, AlertCircle, CheckCircle2, ArrowRight, Loader2, Lock, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified");
  const pendingApproval = searchParams.get("pendingApproval");
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Step 1: Pre-check to get the precise error code.
      // NextAuth v5 wraps all credential errors as "CredentialsSignin",
      // so we validate first to show the correct message.
      const preCheck = await fetch("/api/auth/pre-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const preData = await preCheck.json();

      if (!preCheck.ok) {
        if (preData.code === "EMAIL_NOT_VERIFIED") {
          setError("Your email address is not verified. Please check your inbox for the verification link.");
        } else if (preData.code === "ACCOUNT_SUSPENDED") {
          setError("Your account has been suspended. Please contact platform support.");
        } else if (preData.code === "PENDING_APPROVAL") {
          setError("Your Teacher account is awaiting Admin approval. You will be notified once approved.");
        } else {
          setError("Invalid email address or password.");
        }
        return;
      }

      // Step 2: Credentials valid — proceed with NextAuth session creation
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (!res?.error) {
        // Role-based redirect
        const role = preData.role;
        if (role === "ADMIN") {
          router.push("/admin/dashboard");
        } else if (role === "TEACHER") {
          router.push("/teacher/dashboard");
        } else {
          router.push(callbackUrl);
        }
        router.refresh();
        return;
      }

      setError("Sign in failed. Please try again.");
    } catch (err: any) {
      setError("An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-foreground">LMS Platform</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Sign in to your account</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Access your courses, dashboard, and learning resources
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-2xl shadow-xl backdrop-blur-xl">
          {verified && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Email verified successfully!</p>
                {pendingApproval ? (
                  <p className="mt-1 text-xs text-emerald-400/80">
                    Your Teacher account is currently pending Admin approval. You will receive an email once approved.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-emerald-400/80">
                    You can now sign in with your credentials.
                  </p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground/60"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Signing In...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-border/40 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
