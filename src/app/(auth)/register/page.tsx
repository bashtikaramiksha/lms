"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, AlertCircle, CheckCircle2, ArrowRight, Loader2, Lock, Mail, User, GraduationCap } from "lucide-react";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verifyTokenDev, setVerifyTokenDev] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error?.code === "EMAIL_ALREADY_EXISTS") {
          setError("An account with this email address already exists. Try signing in.");
        } else if (data.error?.details) {
          const firstErr = Object.values(data.error.details).find(Boolean);
          setError(Array.isArray(firstErr) ? firstErr[0] : "Please check your inputs.");
        } else {
          setError(data.error?.message || "Failed to register.");
        }
        return;
      }

      setSuccess(
        role === "TEACHER"
          ? "Teacher account created! Please verify your email. Once verified, an Admin will review your account."
          : "Account created successfully! Please verify your email before signing in."
      );
      if (data.data?.verifyTokenDevOnly) {
        setVerifyTokenDev(data.data.verifyTokenDevOnly);
      }
    } catch (err: any) {
      setError("An unexpected error occurred during registration.");
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
          <h2 className="text-2xl font-bold tracking-tight">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Join as a Student or apply as a Course Instructor
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-2xl shadow-xl backdrop-blur-xl">
          {success ? (
            <div className="space-y-6 text-center">
              <div className="h-14 w-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-emerald-400">Registration Complete</h3>
                <p className="text-sm text-muted-foreground mt-2">{success}</p>
              </div>

              {verifyTokenDev && (
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-left text-xs">
                  <span className="font-semibold text-blue-400 block mb-1">⚡ Quick Local Dev Verification Link:</span>
                  <Link
                    href={`/api/auth/verify-email?token=${verifyTokenDev}`}
                    className="text-primary underline break-all font-mono hover:text-primary/80"
                  >
                    Click here to instantly verify this account
                  </Link>
                </div>
              )}

              <div className="pt-4 border-t border-border/40">
                <Link
                  href="/login"
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-blue-500/20 inline-flex items-center justify-center gap-2"
                >
                  Go to Sign In <ArrowRight className="h-4 w-4" />
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
                {/* Role Switcher */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    I am joining as
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("STUDENT")}
                      className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                        role === "STUDENT"
                          ? "bg-primary/10 border-primary text-primary shadow-sm"
                          : "bg-white/5 border-border text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      <User className="h-4 w-4" /> Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("TEACHER")}
                      className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                        role === "TEACHER"
                          ? "bg-primary/10 border-primary text-primary shadow-sm"
                          : "bg-white/5 border-border text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      <GraduationCap className="h-4 w-4" /> Teacher
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>

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
                      placeholder="jane@example.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Password
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
                    </>
                  ) : (
                    <>
                      Create {role === "TEACHER" ? "Teacher" : "Student"} Account <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-border/40 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
