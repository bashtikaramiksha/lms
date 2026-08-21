"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, AlertCircle, CheckCircle2, ArrowRight, Loader2, Lock } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("Missing password reset token in URL.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Failed to reset password.");
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-foreground">LMS Platform</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Create new password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose a strong password to secure your account
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl shadow-xl backdrop-blur-xl">
          {success ? (
            <div className="space-y-6 text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-400">Password Updated</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Your password has been changed successfully. You can now sign in with your new credentials.
                </p>
              </div>

              <div className="pt-4 border-t border-border/40">
                <Link
                  href="/login"
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-blue-500/20 inline-flex items-center justify-center gap-2"
                >
                  Sign In Now <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
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
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving Password...
                    </>
                  ) : (
                    <>
                      Update Password <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
