import Link from "next/link";
import { BookOpen, Clock, ArrowRight, ShieldAlert, LogOut } from "lucide-react";

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Teacher Application</span>
          </div>

          <Link
            href="/api/auth/signout"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-border bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full glass-card p-8 rounded-2xl shadow-xl text-center">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-6">
            <Clock className="h-8 w-8" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Application Under Review</h2>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
            Thank you for applying as a Course Instructor on our LMS platform. Your profile is currently undergoing review by our administration team.
          </p>

          <div className="my-6 p-4 rounded-xl bg-white/5 border border-border text-xs text-left space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <ShieldAlert className="h-4 w-4 text-primary" /> What happens next?
            </div>
            <p className="text-muted-foreground">
              Once an Admin approves your account, you will gain immediate access to the Instructor Studio, Course Builder, and live analytics dashboard.
            </p>
          </div>

          <Link
            href="/"
            className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all text-sm inline-flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
          >
            Return to Homepage <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
