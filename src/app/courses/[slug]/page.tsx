import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { courseService } from "@/lib/services/course.service";
import { CourseCurriculumAccordion } from "@/components/courses/course-curriculum-accordion";
import { CartBadge } from "@/components/cart/cart-badge";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import {
  BookOpen,
  Sparkles,
  ArrowRight,
  Star,
  Clock,
  Globe,
  Award,
  Video,
  Radio,
  Users,
  CheckCircle2,
  ShieldCheck,
  Share2,
  Calendar,
  Tag,
  GraduationCap,
  Play,
} from "lucide-react";

export const revalidate = 30; // ISR revalidation every 30 seconds

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = await courseService.getCourseDetail(slug);
    return {
      title: course.seoTitle || `${course.title} — LMS Platform`,
      description:
        course.seoDesc ||
        course.shortDesc ||
        `Learn ${course.title} from verified instructor ${course.instructor.fullName || "expert"}.`,
      openGraph: {
        title: course.seoTitle || course.title,
        description: course.seoDesc || course.shortDesc || undefined,
        images: course.ogImageUrl ? [course.ogImageUrl] : course.thumbnailUrl ? [course.thumbnailUrl] : [],
        type: "website",
      },
    };
  } catch (e) {
    return {
      title: "Course Detail — LMS Platform",
    };
  }
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  let course;
  try {
    course = await courseService.getCourseDetail(slug, userId);
  } catch (err) {
    notFound();
  }

  // Schema.org Course Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.shortDesc || course.description || course.title,
    provider: {
      "@type": "Organization",
      name: "LMS Platform",
    },
    author: {
      "@type": "Person",
      name: course.instructor.fullName || "Instructor",
    },
    ...(course.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: course.avgRating.toFixed(1),
            reviewCount: course.reviewCount,
            bestRating: "5",
            worstRating: "1",
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      price: course.discountPrice ?? course.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  const hasDiscount =
    course.discountPrice !== null &&
    course.discountPrice !== undefined &&
    course.discountPrice < course.price;

  const discountPercent = hasDiscount
    ? Math.round(((course.price - (course.discountPrice || 0)) / course.price) * 100)
    : 0;

  const formattedDate = new Date(course.updatedAt || course.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              LMS Platform
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/courses"
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
            >
              Browse Courses
            </Link>
            <CartBadge />
            {userId ? (
              <Link
                href="/dashboard"
                className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-1.5"
                >
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Header Section */}
      <section className="relative border-b border-border/40 bg-gradient-to-b from-slate-900/90 via-slate-900/50 to-background py-10 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
            {/* Left Header Content */}
            <div className="lg:col-span-2 space-y-5">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Link href="/courses" className="hover:text-foreground transition-colors">
                  Courses
                </Link>
                <span>/</span>
                {course.category && (
                  <>
                    <Link
                      href={`/courses?category=${course.category.slug}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {course.category.name}
                    </Link>
                    <span>/</span>
                  </>
                )}
                <span className="truncate max-w-[200px] text-foreground">{course.title}</span>
              </div>

              {/* Title & Subtitle */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Type Badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/30 text-primary">
                    {course.type === "LIVE" ? (
                      <>
                        <Radio className="h-3 w-3 text-rose-400 animate-pulse" /> Live Cohort
                      </>
                    ) : (
                      <>
                        <Video className="h-3 w-3 text-blue-400" /> Recorded Course
                      </>
                    )}
                  </span>

                  {/* Level Badge */}
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-card border border-border/80 text-foreground">
                    {course.level || "All Levels"}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
                  {course.title}
                </h1>

                {course.shortDesc && (
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                    {course.shortDesc}
                  </p>
                )}
              </div>

              {/* Course Meta Info */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground pt-2">
                {/* Rating */}
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-amber-400 text-sm">
                    {course.avgRating > 0 ? course.avgRating.toFixed(1) : "New"}
                  </span>
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < Math.round(course.avgRating)
                            ? "fill-current text-amber-400"
                            : "text-slate-600"
                        }`}
                      />
                    ))}
                  </div>
                  {course.reviewCount > 0 && (
                    <span className="text-xs text-muted-foreground underline underline-offset-2">
                      ({course.reviewCount} {course.reviewCount === 1 ? "rating" : "ratings"})
                    </span>
                  )}
                </div>

                {/* Students */}
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>{course.enrollmentCount} {course.enrollmentCount === 1 ? "student" : "students"}</span>
                </div>

                {/* Instructor */}
                <div className="flex items-center gap-2">
                  <span>Created by</span>
                  <strong className="text-foreground font-semibold">
                    {course.instructor.fullName || "Instructor"}
                  </strong>
                </div>

                {/* Last Updated & Language */}
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" /> Last updated {formattedDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5 text-slate-400" /> {course.language}
                  </span>
                </div>
              </div>
            </div>

            {/* Sticky Card placeholder for lg breakpoint desktop view */}
            <div className="hidden lg:block lg:col-span-1" />
          </div>
        </div>
      </section>

      {/* Main Content & Sticky Sidebar Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Left Column: Details, Curriculum, Instructor, Reviews */}
          <div className="lg:col-span-2 space-y-12">
            {/* Key Benefits Card */}
            <div className="rounded-2xl border border-border/70 bg-card/40 p-6 sm:p-8 space-y-4">
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> What you'll learn
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-foreground/90">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Comprehensive mastery of core and advanced principles</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Hands-on portfolio projects and real-world architectures</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Industry best practices, performance optimization, and testing</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Verified certificate of completion upon finishing all lessons</span>
                </div>
              </div>
            </div>

            {/* Curriculum Accordion Section */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-foreground">Course Content</h2>
              <CourseCurriculumAccordion
                modules={course.curriculum}
                isEnrolled={course.isEnrolled}
              />
            </div>

            {/* Description Section */}
            {course.description && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Course Description</h2>
                <div className="prose prose-invert max-w-none text-muted-foreground text-sm sm:text-base leading-relaxed space-y-3">
                  {course.description.split("\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Instructor Profile Card */}
            <div className="space-y-4 pt-4 border-t border-border/40">
              <h2 className="text-2xl font-bold text-foreground">Meet Your Instructor</h2>
              <div className="rounded-2xl border border-border/60 bg-card/30 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-4">
                  {course.instructor.avatarUrl ? (
                    <img
                      src={course.instructor.avatarUrl}
                      alt={course.instructor.fullName || "Instructor"}
                      className="h-16 w-16 rounded-2xl object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                      {course.instructor.fullName?.charAt(0) || "T"}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      {course.instructor.fullName || "Verified Instructor"}
                    </h3>
                    <p className="text-xs text-primary font-medium">Platform Instructor & Mentor</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    <span>{course.instructor.courseCount} Courses</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>{course.instructor.studentCount} Students</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Award className="h-4 w-4 text-emerald-400" />
                    <span>Verified Instructor</span>
                  </div>
                </div>

                {course.instructor.bio && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {course.instructor.bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Sticky Pricing & Enrollment Card */}
          <div className="lg:col-span-1">
            <div className="lg:sticky lg:top-24 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md shadow-xl overflow-hidden space-y-6 p-6">
              {/* Media Thumbnail */}
              <div className="relative aspect-video w-full rounded-xl bg-slate-900 overflow-hidden border border-border/40">
                {course.thumbnailUrl ? (
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 flex items-center justify-center p-6 text-center">
                    <BookOpen className="h-10 w-10 text-primary" />
                  </div>
                )}
                {course.previewUrl && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="h-12 w-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30">
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing Section */}
              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  {course.price === 0 ? (
                    <span className="text-3xl font-extrabold text-emerald-400">Free</span>
                  ) : hasDiscount ? (
                    <>
                      <span className="text-3xl font-extrabold text-foreground">
                        ${course.discountPrice}
                      </span>
                      <span className="text-lg text-muted-foreground line-through">
                        ${course.price}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        {discountPercent}% OFF
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl font-extrabold text-foreground">
                      ${course.price}
                    </span>
                  )}
                </div>

                {course.accessDuration ? (
                  <p className="text-xs text-muted-foreground">
                    Access valid for {course.accessDuration} days from enrollment
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Full lifetime access included</p>
                )}
              </div>

              {/* CTA Action Buttons */}
              <div className="space-y-3">
                {course.isEnrolled ? (
                  <Link
                    href={`/learn/${course.slug}`}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <GraduationCap className="h-5 w-5" /> Continue Learning
                  </Link>
                ) : (
                  <div className="space-y-2">
                    <AddToCartButton
                      course={{
                        id: course.id,
                        title: course.title,
                        slug: course.slug,
                        thumbnailUrl: course.thumbnailUrl,
                        price: course.price,
                        discountPrice: course.discountPrice,
                        instructorName: course.instructor.fullName,
                      }}
                      isEnrolled={course.isEnrolled}
                    />
                  </div>
                )}

                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-1">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" /> 30-Day Money-Back Guarantee
                </p>
              </div>

              {/* What's included list */}
              <div className="space-y-3 pt-4 border-t border-border/40 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">This course includes:</span>
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Video className="h-4 w-4 text-blue-400" />
                    <span>HD on-demand video lessons</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    <span>{course.lessonCount} downloadable lessons & exercises</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-4 w-4 text-purple-400" />
                    <span>Full lifetime access</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Award className="h-4 w-4 text-emerald-400" />
                    <span>Certificate of completion</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-4 sm:px-6 lg:px-8 bg-card/20 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 LMS Platform Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/courses" className="hover:text-foreground transition-colors">
              Courses
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
