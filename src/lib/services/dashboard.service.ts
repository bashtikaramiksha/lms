import { db } from "../db/client";
import {
  enrollments,
  courses,
  modules,
  lessons,
  lessonProgress,
  liveSessions,
  users,
} from "../db/schema";
import { eq, and, inArray, desc, gte, asc, sql } from "drizzle-orm";

export interface StudentDashboardCourse {
  id: string;
  title: string;
  slug: string;
  thumbnailUrl: string | null;
  instructor?: {
    fullName: string;
  };
}

export interface StudentDashboardLastLesson {
  id: string;
  title: string;
  moduleTitle?: string;
}

export interface InProgressCourseDto {
  enrollmentId: string;
  course: StudentDashboardCourse;
  progressPercent: number;
  lastLesson?: StudentDashboardLastLesson | null;
  lastWatchedAt?: string | null;
}

export interface UpcomingLiveSessionDto {
  sessionId: string;
  courseId: string;
  courseTitle: string;
  title: string;
  scheduledAt: string;
  duration: number;
  platform: "ZOOM" | "GOOGLE_MEET";
  joinUrl: string | null;
  status: string;
}

export interface CompletedCourseDto {
  enrollmentId: string;
  course: StudentDashboardCourse;
  completedAt?: string | null;
  certificateUrl?: string | null;
}

export interface StudentDashboardDto {
  inProgress: InProgressCourseDto[];
  upcomingLiveSessions: UpcomingLiveSessionDto[];
  completed: CompletedCourseDto[];
  stats?: {
    enrolledCount: number;
    completedCount: number;
    inProgressCount: number;
    hoursLearned: number;
  };
}

export class DashboardService {
  async getStudentDashboard(userId: string): Promise<StudentDashboardDto> {
    // 1. Fetch active/completed enrollments
    const activeEnrollments = await db.query.enrollments.findMany({
      where: and(
        eq(enrollments.userId, userId),
        inArray(enrollments.status, ["ACTIVE", "COMPLETED"])
      ),
      orderBy: [desc(enrollments.enrolledAt)],
    });

    if (!activeEnrollments.length) {
      return {
        inProgress: [],
        upcomingLiveSessions: [],
        completed: [],
        stats: {
          enrolledCount: 0,
          completedCount: 0,
          inProgressCount: 0,
          hoursLearned: 0,
        },
      };
    }

    const enrollmentIds = activeEnrollments.map((e) => e.id);
    const courseIds = Array.from(new Set(activeEnrollments.map((e) => e.courseId)));

    // 2. Fetch course details with authors
    const coursesList = await db.query.courses.findMany({
      where: inArray(courses.id, courseIds),
      with: {
        author: {
          columns: {
            fullName: true,
          },
        },
        modules: {
          orderBy: [asc(modules.order)],
          with: {
            lessons: {
              orderBy: [asc(lessons.order)],
            },
          },
        },
      },
    });

    const courseMap = new Map(coursesList.map((c) => [c.id, c]));

    // 3. Fetch progress for all enrollments
    const progressList = await db.query.lessonProgress.findMany({
      where: inArray(lessonProgress.enrollmentId, enrollmentIds),
    });

    // 4. Group progress by enrollmentId
    const progressByEnrollment = new Map<string, typeof progressList>();
    for (const prog of progressList) {
      const list = progressByEnrollment.get(prog.enrollmentId) || [];
      list.push(prog);
      progressByEnrollment.set(prog.enrollmentId, list);
    }

    // 5. Fetch upcoming live sessions for enrolled courses
    const upcomingSessions = await this.getUpcomingLiveSessions(courseIds);

    // 6. Build inProgress and completed lists
    const inProgress: InProgressCourseDto[] = [];
    const completed: CompletedCourseDto[] = [];
    let totalWatchSeconds = 0;

    for (const enrollment of activeEnrollments) {
      const course = courseMap.get(enrollment.courseId);
      if (!course) continue;

      const courseModules = course.modules || [];
      const allCourseLessons: Array<{
        id: string;
        title: string;
        moduleTitle: string;
        duration?: number | null;
      }> = [];

      for (const mod of courseModules) {
        for (const les of mod.lessons || []) {
          allCourseLessons.push({
            id: les.id,
            title: les.title,
            moduleTitle: mod.title,
            duration: les.duration,
          });
        }
      }

      const totalLessonsCount = allCourseLessons.length;
      const enrollmentProgress = progressByEnrollment.get(enrollment.id) || [];
      const completedCount = enrollmentProgress.filter((p) => p.isCompleted).length;

      // Accumulate watch time
      for (const p of enrollmentProgress) {
        const les = allCourseLessons.find((l) => l.id === p.lessonId);
        if (les?.duration && p.watchPercent) {
          totalWatchSeconds += (les.duration * p.watchPercent) / 100;
        }
      }

      let progressPercent = 0;
      if (totalLessonsCount > 0) {
        progressPercent = Math.min(100, Math.round((completedCount / totalLessonsCount) * 100));
      }

      const courseDto: StudentDashboardCourse = {
        id: course.id,
        title: course.title,
        slug: course.slug,
        thumbnailUrl: course.thumbnailUrl,
        instructor: {
          fullName: course.author?.fullName || "Instructor",
        },
      };

      if (progressPercent === 100 && totalLessonsCount > 0) {
        // Completed course
        const latestProgress = enrollmentProgress
          .filter((p) => p.lastWatchedAt)
          .sort((a, b) => (b.lastWatchedAt! > a.lastWatchedAt! ? 1 : -1))[0];

        completed.push({
          enrollmentId: enrollment.id,
          course: courseDto,
          completedAt: enrollment.certIssuedAt || latestProgress?.lastWatchedAt || enrollment.enrolledAt,
          certificateUrl: enrollment.certificateUrl,
        });
      } else {
        // In-progress course
        // Determine last watched lesson
        let lastLessonDto: StudentDashboardLastLesson | null = null;
        let lastWatchedAt: string | null = null;

        const incompleteWatched = enrollmentProgress
          .filter((p) => !p.isCompleted && p.lastWatchedAt)
          .sort((a, b) => (b.lastWatchedAt! > a.lastWatchedAt! ? 1 : -1))[0];

        if (incompleteWatched) {
          const matchingLesson = allCourseLessons.find((l) => l.id === incompleteWatched.lessonId);
          if (matchingLesson) {
            lastLessonDto = {
              id: matchingLesson.id,
              title: matchingLesson.title,
              moduleTitle: matchingLesson.moduleTitle,
            };
            lastWatchedAt = incompleteWatched.lastWatchedAt;
          }
        }

        // If no incomplete watched lesson found, find the first incomplete lesson in course order
        if (!lastLessonDto) {
          const completedLessonIds = new Set(
            enrollmentProgress.filter((p) => p.isCompleted).map((p) => p.lessonId)
          );
          const firstIncompleteLesson = allCourseLessons.find((l) => !completedLessonIds.has(l.id));

          if (firstIncompleteLesson) {
            lastLessonDto = {
              id: firstIncompleteLesson.id,
              title: firstIncompleteLesson.title,
              moduleTitle: firstIncompleteLesson.moduleTitle,
            };
          } else if (allCourseLessons.length > 0) {
            lastLessonDto = {
              id: allCourseLessons[0].id,
              title: allCourseLessons[0].title,
              moduleTitle: allCourseLessons[0].moduleTitle,
            };
          }
        }

        inProgress.push({
          enrollmentId: enrollment.id,
          course: courseDto,
          progressPercent,
          lastLesson: lastLessonDto,
          lastWatchedAt,
        });
      }
    }

    // Sort inProgress: most recently watched first
    inProgress.sort((a, b) => {
      if (a.lastWatchedAt && b.lastWatchedAt) {
        return b.lastWatchedAt.localeCompare(a.lastWatchedAt);
      }
      if (a.lastWatchedAt) return -1;
      if (b.lastWatchedAt) return 1;
      return 0;
    });

    const hoursLearned = Math.round((totalWatchSeconds / 3600) * 10) / 10;

    return {
      inProgress,
      upcomingLiveSessions: upcomingSessions,
      completed,
      stats: {
        enrolledCount: activeEnrollments.length,
        completedCount: completed.length,
        inProgressCount: inProgress.length,
        hoursLearned,
      },
    };
  }

  private async getUpcomingLiveSessions(courseIds: string[]): Promise<UpcomingLiveSessionDto[]> {
    if (!courseIds.length) return [];

    const now = new Date();
    // Allow sessions from 2 hours ago (in case ongoing) onwards
    const timeThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();

    const sessions = await db.query.liveSessions.findMany({
      where: and(
        inArray(liveSessions.courseId, courseIds),
        gte(liveSessions.scheduledAt, timeThreshold),
        inArray(liveSessions.status, ["SCHEDULED", "LIVE"])
      ),
      orderBy: [asc(liveSessions.scheduledAt)],
      limit: 5,
      with: {
        course: {
          columns: {
            title: true,
          },
        },
      },
    });

    const currentTimeMs = now.getTime();
    const fifteenMinutesMs = 15 * 60 * 1000;

    return sessions.map((s) => {
      const scheduledTimeMs = new Date(s.scheduledAt).getTime();
      // Join URL is available if session is within 15 minutes of starting, or has already started
      const isAccessible = scheduledTimeMs - currentTimeMs <= fifteenMinutesMs;

      return {
        sessionId: s.id,
        courseId: s.courseId,
        courseTitle: s.course?.title || "Course Session",
        title: s.title,
        scheduledAt: s.scheduledAt,
        duration: s.duration,
        platform: s.platform as "ZOOM" | "GOOGLE_MEET",
        joinUrl: isAccessible ? s.joinUrl : null,
        status: s.status,
      };
    });
  }
}

export const dashboardService = new DashboardService();
