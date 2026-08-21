import Link from "next/link";
import Image from "next/image";
import { CourseCard as CourseCardType } from "@/lib/validations/course";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import {
  Clock,
  BookOpen,
  Users,
  Video,
  Radio,
  Tag,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "Self-paced";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  return `${minutes}m`;
}

function getLevelBadge(level: string | null) {
  switch (level) {
    case "BEGINNER":
      return {
        label: "Beginner",
        classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    case "INTERMEDIATE":
      return {
        label: "Intermediate",
        classes: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      };
    case "ADVANCED":
      return {
        label: "Advanced",
        classes: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      };
    default:
      return {
        label: "All Levels",
        classes: "bg-slate-500/10 text-slate-400 border-slate-500/20",
      };
  }
}

export function CourseCard({ course }: { course: CourseCardType }) {
  const levelBadge = getLevelBadge(course.level);
  const hasDiscount =
    course.discountPrice !== null &&
    course.discountPrice !== undefined &&
    course.discountPrice < course.price;

  const discountPercent = hasDiscount
    ? Math.round(((course.price - (course.discountPrice || 0)) / course.price) * 100)
    : 0;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group relative flex flex-col rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
    >
      {/* Thumbnail / Header Media */}
      <div className="relative aspect-video w-full bg-slate-900 overflow-hidden border-b border-border/30">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-950/60 via-slate-900 to-blue-950/40 flex items-center justify-center p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground line-clamp-1">
                {course.category?.name || "LMS Platform"}
              </span>
            </div>
          </div>
        )}

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          {/* Format Type */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-background/80 backdrop-blur-md border border-border/60 text-foreground shadow-sm">
            {course.type === "LIVE" ? (
              <>
                <Radio className="h-3 w-3 text-red-400 animate-pulse" />
                <span>Live Class</span>
              </>
            ) : (
              <>
                <Video className="h-3 w-3 text-blue-400" />
                <span>Recorded</span>
              </>
            )}
          </span>

          {/* Level Badge */}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border backdrop-blur-md ${levelBadge.classes}`}
          >
            {levelBadge.label}
          </span>
        </div>

        {/* Hover Arrow Icon */}
        <div className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-md">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 flex flex-col p-5 space-y-4">
        {/* Category Pill */}
        {course.category && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <Tag className="h-3 w-3" />
            <span>{course.category.name}</span>
          </div>
        )}

        {/* Title & Short Description */}
        <div className="space-y-1.5">
          <h3 className="font-bold text-lg leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {course.title}
          </h3>
          {course.shortDesc && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {course.shortDesc}
            </p>
          )}
        </div>

        {/* Instructor Info */}
        <div className="flex items-center gap-2.5 pt-1">
          {course.instructor?.avatarUrl ? (
            <img
              src={course.instructor.avatarUrl}
              alt={course.instructor.fullName || "Instructor"}
              className="h-7 w-7 rounded-full object-cover border border-border"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 flex items-center justify-center text-xs font-bold">
              {course.instructor?.fullName?.charAt(0) || "T"}
            </div>
          )}
          <span className="text-xs font-medium text-muted-foreground truncate">
            {course.instructor?.fullName || "Verified Instructor"}
          </span>
        </div>

        {/* Metrics: Lessons, Duration, Students */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40">
          <div className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 text-slate-400" />
            <span>{course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{formatDuration(course.totalDuration)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            <span>{course.enrollmentCount} {course.enrollmentCount === 1 ? "student" : "students"}</span>
          </div>
        </div>

        {/* Pricing Footer */}
        <div className="mt-auto pt-3 border-t border-border/40 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            {course.price === 0 ? (
              <span className="text-lg font-extrabold text-emerald-400">Free</span>
            ) : hasDiscount ? (
              <>
                <span className="text-xl font-extrabold text-foreground">
                  ${course.discountPrice}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  ${course.price}
                </span>
              </>
            ) : (
              <span className="text-xl font-extrabold text-foreground">
                ${course.price}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {hasDiscount && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                {discountPercent}% OFF
              </span>
            )}
            <AddToCartButton
              course={{
                id: course.id,
                title: course.title,
                slug: course.slug,
                thumbnailUrl: course.thumbnailUrl,
                price: course.price,
                discountPrice: course.discountPrice,
                instructorName: course.instructor?.fullName,
              }}
              variant="icon"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
