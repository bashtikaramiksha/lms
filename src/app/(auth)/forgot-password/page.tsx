"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, AlertCircle, CheckCircle2, ArrowRight, Loader2, Mail, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetTokenDev, setResetTokenDev] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || "Failed to process request.");
        return;
      }

      setSuccess("If an account exists with that email address, password reset instructions have been dispatched.");
      if (data.data?.resetTokenDevOnly) {
        setResetTokenDev(data.data.resetTokenDevOnly);
      }
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
          <h2 className="text-2xl font-bold tracking-tight">Reset your password</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email to receive a password reset link
          </p>
        </div>

        <div className="glass-card p-8 rounded-2xl shadow-xl backdrop-blur-xl">
          {success ? (
            <div className="space-y-6 text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-400">Check Your Inbox</h3>
                <p className="text-sm text-muted-foreground mt-2">{success}</p>
              </div>

              {resetTokenDev && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left text-xs">
                  <span className="font-semibold text-blue-400 block mb-1">⚡ Quick Dev Reset Link:</span>
                  <Link
                    href={`/reset-password?token=${resetTokenDev}`}
                    className="text-primary underline break-all font-mono hover:text-primary/80"
                  >
                    Click here to reset password directly
                  </Link>
                </div>
              )}

              <div className="pt-4 border-t border-border/40">
                <Link
                  href="/login"
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-blue-500/20 inline-flex items-center justify-center gap-2"
                >
                  Return to Sign In <ArrowRight className="h-4 w-4" />
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending Link...
                    </>
                  ) : (
                    <>
                      Send Reset Instructions <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-border/40 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
