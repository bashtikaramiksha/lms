import { db } from "../db/client";
import {
  courses,
  enrollments,
  lessonProgress,
  modules,
  lessons,
  orders,
  orderItems,
  users,
  reviews,
} from "../db/schema";
import { eq, and, inArray, desc, asc, gte, sql } from "drizzle-orm";
import { AppError } from "./course.service";

export type RevenuePeriod = "7d" | "30d" | "90d" | "12m";

export interface TeacherCourseStatDto {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  status: string;
  enrolledStudents: number;
  completionRate: number; // 0 - 100
  totalRevenue: number;
  rating: number;
  reviewCount: number;
}

export interface RecentEnrollmentDto {
  id: string;
  studentName: string;
  avatarUrl?: string | null;
  courseTitle: string;
  enrolledAt: string;
}

export interface TeacherDashboardDto {
  summary: {
    totalStudents: number;
    totalRevenue: number;
    totalCourses: number;
    publishedCourses: number;
    avgCompletionRate: number;
  };
  courses: TeacherCourseStatDto[];
  recentEnrollments: RecentEnrollmentDto[];
}

export interface ChartPointDto {
  period: string; // e.g. "2026-11-01" or "2026-11"
  revenue: number;
  orders: number;
}

export interface CourseRevenueBreakdownDto {
  courseId: string;
  title: string;
  revenue: number;
  orders: number;
  percentage: number; // 0 - 100
}

export interface RecentOrderDto {
  orderId: string;
  studentName: string;
  courseTitle: string;
  amount: number;
  gateway: string;
  createdAt: string;
}

export interface TeacherRevenueDto {
  totalRevenue: number;
  periodRevenue: number;
  periodOrders: number;
  chart: ChartPointDto[];
  byCourse: CourseRevenueBreakdownDto[];
  recentOrders: RecentOrderDto[];
}

export class TeacherStatsService {
  /**
   * Fetch aggregate stats, per-course metrics, and recent enrollments for a teacher
   */
  async getDashboardStats(teacherId: string): Promise<TeacherDashboardDto> {
    // 1. Fetch teacher's courses
    const teacherCourses = await db.query.courses.findMany({
      where: eq(courses.authorId, teacherId),
      orderBy: [desc(courses.createdAt)],
      with: {
        modules: {
          with: {
            lessons: {
              columns: {
                id: true,
              },
            },
          },
        },
        reviews: {
          columns: {
            rating: true,
          },
        },
      },
    });

    if (!teacherCourses.length) {
      return {
        summary: {
          totalStudents: 0,
          totalRevenue: 0,
          totalCourses: 0,
          publishedCourses: 0,
          avgCompletionRate: 0,
        },
        courses: [],
        recentEnrollments: [],
      };
    }

    const courseIds = teacherCourses.map((c) => c.id);

    // 2. Fetch all enrollments for these courses
    const allEnrollments = await db.query.enrollments.findMany({
      where: and(
        inArray(enrollments.courseId, courseIds),
        eq(enrollments.status, "ACTIVE")
      ),
      orderBy: [desc(enrollments.enrolledAt)],
      with: {
        user: {
          columns: {
            fullName: true,
            avatarUrl: true,
          },
        },
        course: {
          columns: {
            title: true,
          },
        },
      },
    });

    // Count unique students
    const uniqueStudents = new Set(allEnrollments.map((e) => e.userId));

    // 3. Fetch completed order items for revenue attribution
    const allOrderItems = await db.query.orderItems.findMany({
      where: inArray(orderItems.courseId, courseIds),
      with: {
        order: {
          columns: {
            status: true,
            createdAt: true,
          },
        },
      },
    });

    const completedOrderItems = allOrderItems.filter(
      (item) => item.order?.status === "COMPLETED"
    );

    const revenueByCourse = new Map<string, number>();
    for (const item of completedOrderItems) {
      const current = revenueByCourse.get(item.courseId) || 0;
      revenueByCourse.set(item.courseId, current + item.priceAtPurchase);
    }

    const totalRevenue = completedOrderItems.reduce(
      (sum, item) => sum + item.priceAtPurchase,
      0
    );

    // 4. Fetch lesson progress to calculate completion rate per course
    const enrollmentIds = allEnrollments.map((e) => e.id);
    const allProgress = enrollmentIds.length
      ? await db.query.lessonProgress.findMany({
          where: inArray(lessonProgress.enrollmentId, enrollmentIds),
        })
      : [];

    const progressByEnrollment = new Map<string, typeof allProgress>();
    for (const p of allProgress) {
      const list = progressByEnrollment.get(p.enrollmentId) || [];
      list.push(p);
      progressByEnrollment.set(p.enrollmentId, list);
    }

    // 5. Build per-course stats
    let totalCompletionRateSum = 0;
    let coursesWithEnrollmentsCount = 0;

    const courseStats: TeacherCourseStatDto[] = teacherCourses.map((c) => {
      const courseEnrollments = allEnrollments.filter((e) => e.courseId === c.id);
      const enrolledCount = courseEnrollments.length;

      // Extract all lesson IDs in course
      const courseLessonIds: string[] = [];
      for (const mod of c.modules || []) {
        for (const les of mod.lessons || []) {
          courseLessonIds.push(les.id);
        }
      }

      let completionRate = 0;
      if (enrolledCount > 0 && courseLessonIds.length > 0) {
        let fullyCompletedEnrollments = 0;
        for (const enrollment of courseEnrollments) {
          const prog = progressByEnrollment.get(enrollment.id) || [];
          const completedLessonsCount = prog.filter(
            (p) => p.isCompleted && courseLessonIds.includes(p.lessonId)
          ).length;

          if (completedLessonsCount >= courseLessonIds.length) {
            fullyCompletedEnrollments++;
          }
        }
        completionRate = Math.round((fullyCompletedEnrollments / enrolledCount) * 1000) / 10;
        totalCompletionRateSum += completionRate;
        coursesWithEnrollmentsCount++;
      }

      // Review Rating
      const courseReviews = c.reviews || [];
      const reviewCount = courseReviews.length;
      const avgRating =
        reviewCount > 0
          ? Math.round(
              (courseReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10
            ) / 10
          : 0;

      return {
        id: c.id,
        title: c.title,
        slug: c.slug,
        thumbnailUrl: c.thumbnailUrl,
        status: c.status,
        enrolledStudents: enrolledCount,
        completionRate,
        totalRevenue: Math.round((revenueByCourse.get(c.id) || 0) * 100) / 100,
        rating: avgRating,
        reviewCount,
      };
    });

    const avgCompletionRate =
      coursesWithEnrollmentsCount > 0
        ? Math.round((totalCompletionRateSum / coursesWithEnrollmentsCount) * 10) / 10
        : 0;

    // 6. Recent Enrollments (latest 5)
    const recentEnrollments: RecentEnrollmentDto[] = allEnrollments
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        studentName: e.user?.fullName || "Student",
        avatarUrl: e.user?.avatarUrl,
        courseTitle: e.course?.title || "Course",
        enrolledAt: e.enrolledAt || new Date().toISOString(),
      }));

    const publishedCourses = teacherCourses.filter((c) => c.status === "PUBLISHED").length;

    return {
      summary: {
        totalStudents: uniqueStudents.size,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCourses: teacherCourses.length,
        publishedCourses,
        avgCompletionRate,
      },
      courses: courseStats,
      recentEnrollments,
    };
  }

  /**
   * Fetch revenue analytics, time-series chart, course breakdown, and recent orders
   */
  async getRevenue(
    teacherId: string,
    period: RevenuePeriod = "12m",
    courseId?: string
  ): Promise<TeacherRevenueDto> {
    const validPeriods: RevenuePeriod[] = ["7d", "30d", "90d", "12m"];
    if (!validPeriods.includes(period)) {
      throw new AppError("VALIDATION_ERROR", 400, "Invalid period. Must be 7d, 30d, 90d, or 12m");
    }

    // 1. Fetch teacher courses
    const teacherCourses = await db.query.courses.findMany({
      where: eq(courses.authorId, teacherId),
      columns: {
        id: true,
        title: true,
      },
    });

    const teacherCourseMap = new Map(teacherCourses.map((c) => [c.id, c.title]));
    let targetCourseIds = teacherCourses.map((c) => c.id);

    if (courseId) {
      if (!teacherCourseMap.has(courseId)) {
        throw new AppError("COURSE_NOT_FOUND", 404, "Course not found or not authored by this teacher");
      }
      targetCourseIds = [courseId];
    }

    if (!targetCourseIds.length) {
      return {
        totalRevenue: 0,
        periodRevenue: 0,
        periodOrders: 0,
        chart: [],
        byCourse: [],
        recentOrders: [],
      };
    }

    // 2. Determine time threshold
    const now = new Date();
    let startDate: Date;
    let isDaily = false;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        isDaily = true;
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        isDaily = true;
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        isDaily = false;
        break;
      case "12m":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        isDaily = false;
        break;
    }

    const startIso = startDate.toISOString();

    // 3. Fetch all completed order items for lifetime & period
    const allOrderItems = await db.query.orderItems.findMany({
      where: inArray(orderItems.courseId, teacherCourses.map((c) => c.id)),
      with: {
        order: {
          with: {
            student: {
              columns: {
                fullName: true,
              },
            },
          },
        },
        course: {
          columns: {
            id: true,
            title: true,
          },
        },
      },
    });

    const completedItems = allOrderItems.filter((i) => i.order?.status === "COMPLETED");

    // Lifetime total revenue (for teacher's courses)
    const lifetimeRevenue = completedItems.reduce((sum, i) => sum + i.priceAtPurchase, 0);

    // Filter items in period and target courses
    const periodItems = completedItems.filter((i) => {
      const orderDate = i.order?.createdAt || i.createdAt || "";
      const matchesCourse = targetCourseIds.includes(i.courseId);
      return matchesCourse && orderDate >= startIso;
    });

    const periodRevenue = periodItems.reduce((sum, i) => sum + i.priceAtPurchase, 0);
    const uniquePeriodOrderIds = new Set(periodItems.map((i) => i.orderId));
    const periodOrders = uniquePeriodOrderIds.size;

    // 4. Build chart time-series data
    const chartMap = new Map<string, { revenue: number; orderIds: Set<string> }>();

    // Prepopulate periods to ensure clean axis
    if (isDaily) {
      const daysCount = period === "7d" ? 7 : 30;
      for (let d = daysCount - 1; d >= 0; d--) {
        const day = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        const key = day.toISOString().slice(0, 10); // YYYY-MM-DD
        chartMap.set(key, { revenue: 0, orderIds: new Set() });
      }
    } else {
      const monthsCount = period === "90d" ? 3 : 12;
      for (let m = monthsCount - 1; m >= 0; m--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const key = monthDate.toISOString().slice(0, 7); // YYYY-MM
        chartMap.set(key, { revenue: 0, orderIds: new Set() });
      }
    }

    for (const item of periodItems) {
      const dateStr = item.order?.createdAt || item.createdAt || "";
      if (!dateStr) continue;

      const key = isDaily ? dateStr.slice(0, 10) : dateStr.slice(0, 7);
      const entry = chartMap.get(key) || { revenue: 0, orderIds: new Set() };
      entry.revenue += item.priceAtPurchase;
      entry.orderIds.add(item.orderId);
      chartMap.set(key, entry);
    }

    const chart: ChartPointDto[] = Array.from(chartMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([periodKey, val]) => ({
        period: periodKey,
        revenue: Math.round(val.revenue * 100) / 100,
        orders: val.orderIds.size,
      }));

    // 5. Build byCourse breakdown
    const byCourseMap = new Map<string, { revenue: number; orderIds: Set<string> }>();
    for (const c of teacherCourses) {
      byCourseMap.set(c.id, { revenue: 0, orderIds: new Set() });
    }

    for (const item of completedItems.filter(
      (i) => (i.order?.createdAt || i.createdAt || "") >= startIso
    )) {
      const entry = byCourseMap.get(item.courseId) || { revenue: 0, orderIds: new Set() };
      entry.revenue += item.priceAtPurchase;
      entry.orderIds.add(item.orderId);
      byCourseMap.set(item.courseId, entry);
    }

    const totalPeriodAllCoursesRevenue = Array.from(byCourseMap.values()).reduce(
      (sum, val) => sum + val.revenue,
      0
    );

    const byCourse: CourseRevenueBreakdownDto[] = teacherCourses
      .map((c) => {
        const data = byCourseMap.get(c.id) || { revenue: 0, orderIds: new Set() };
        const percentage =
          totalPeriodAllCoursesRevenue > 0
            ? Math.round((data.revenue / totalPeriodAllCoursesRevenue) * 1000) / 10
            : 0;

        return {
          courseId: c.id,
          title: c.title,
          revenue: Math.round(data.revenue * 100) / 100,
          orders: data.orderIds.size,
          percentage,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // 6. Build recent orders list (latest 10)
    const sortedCompletedItems = [...completedItems].sort((a, b) => {
      const dateA = a.order?.createdAt || a.createdAt || "";
      const dateB = b.order?.createdAt || b.createdAt || "";
      return dateB.localeCompare(dateA);
    });

    const recentOrders: RecentOrderDto[] = sortedCompletedItems.slice(0, 10).map((item) => ({
      orderId: item.orderId,
      studentName: item.order?.student?.fullName || "Student",
      courseTitle: item.course?.title || "Course",
      amount: item.priceAtPurchase,
      gateway: item.order?.gateway || "STRIPE",
      createdAt: item.order?.createdAt || item.createdAt || new Date().toISOString(),
    }));

    return {
      totalRevenue: Math.round(lifetimeRevenue * 100) / 100,
      periodRevenue: Math.round(periodRevenue * 100) / 100,
      periodOrders,
      chart,
      byCourse,
      recentOrders,
    };
  }
}

export const teacherStatsService = new TeacherStatsService();
