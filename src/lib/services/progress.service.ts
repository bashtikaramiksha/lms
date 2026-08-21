import { db } from "../db/client";
import {
  enrollments,
  courses,
  modules,
  lessons,
  lessonProgress,
  Enrollment,
} from "../db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
import { inngest } from "../inngest";
import { AppError } from "./course.service";

export interface UpdateProgressDto {
  studentId: string;
  courseId: string;
  lessonId: string;
  watchPercent: number;
}

export interface ProgressResultDto {
  watchPercent: number;
  isCompleted: boolean;
  justCompleted: boolean;
  courseCompleted: boolean;
}

export interface CurriculumLessonDto {
  id: string;
  title: string;
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "LIVE_SESSION";
  order: number;
  duration?: number | null;
  isPreview?: boolean | null;
  isCompleted: boolean;
}

export interface CurriculumModuleDto {
  moduleId: string;
  moduleTitle: string;
  order: number;
  lessons: CurriculumLessonDto[];
}

export interface LessonNavigationDto {
  prevLesson: { id: string; title: string } | null;
  nextLesson: { id: string; title: string } | null;
}

export interface LessonDataResponseDto {
  course: {
    id: string;
    title: string;
    slug: string;
  };
  lesson: {
    id: string;
    title: string;
    type: "VIDEO" | "ARTICLE" | "QUIZ" | "LIVE_SESSION";
    videoUrl?: string | null;
    duration?: number | null;
    content?: string | null;
    isPreview?: boolean | null;
  };
  progress: {
    watchPercent: number;
    isCompleted: boolean;
    lastWatchedAt?: string | null;
  };
  curriculum: CurriculumModuleDto[];
  navigation: LessonNavigationDto;
  courseProgressPercent: number;
}

export class ProgressService {
  /**
   * Validate that the student has an active, non-expired enrollment for the course
   */
  async validateEnrollment(studentId: string, courseId: string): Promise<Enrollment> {
    const enrollment = await db.query.enrollments.findFirst({
      where: and(eq(enrollments.userId, studentId), eq(enrollments.courseId, courseId)),
    });

    if (!enrollment || (enrollment.status !== "ACTIVE" && enrollment.status !== "COMPLETED")) {
      throw new AppError("NOT_ENROLLED", 403, "You are not enrolled in this course");
    }

    if (enrollment.expiresAt && new Date(enrollment.expiresAt) < new Date()) {
      throw new AppError("ENROLLMENT_EXPIRED", 403, "Your enrollment for this course has expired");
    }

    return enrollment;
  }

  /**
   * Fetch all necessary data for the lesson video player page
   */
  async getLessonData(
    studentId: string,
    courseId: string,
    lessonId: string
  ): Promise<LessonDataResponseDto> {
    const enrollment = await this.validateEnrollment(studentId, courseId);

    // Fetch course with modules and lessons
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      with: {
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

    if (!course) {
      throw new AppError("COURSE_NOT_FOUND", 404, "Course not found");
    }

    // Find the target lesson and build flat list for navigation
    const flatLessons: Array<{
      id: string;
      title: string;
      moduleId: string;
      lesson: typeof lessons.$inferSelect;
    }> = [];

    for (const mod of course.modules || []) {
      for (const les of mod.lessons || []) {
        flatLessons.push({
          id: les.id,
          title: les.title,
          moduleId: mod.id,
          lesson: les,
        });
      }
    }

    const currentLessonIndex = flatLessons.findIndex((l) => l.id === lessonId);
    if (currentLessonIndex === -1) {
      throw new AppError(
        "LESSON_NOT_FOUND",
        404,
        "Lesson does not exist or is not part of this course"
      );
    }

    const currentLesson = flatLessons[currentLessonIndex].lesson;

    // Fetch progress for all lessons in this enrollment
    const progressRecords = await db.query.lessonProgress.findMany({
      where: eq(lessonProgress.enrollmentId, enrollment.id),
    });

    const progressMap = new Map<string, typeof lessonProgress.$inferSelect>(
      progressRecords.map((p) => [p.lessonId, p])
    );

    const currentProgress = progressMap.get(lessonId);

    // Build curriculum tree
    const curriculum: CurriculumModuleDto[] = (course.modules || []).map((mod) => ({
      moduleId: mod.id,
      moduleTitle: mod.title,
      order: mod.order,
      lessons: (mod.lessons || []).map((les) => {
        const prog = progressMap.get(les.id);
        return {
          id: les.id,
          title: les.title,
          type: les.type as "VIDEO" | "ARTICLE" | "QUIZ" | "LIVE_SESSION",
          order: les.order,
          duration: les.duration,
          isPreview: les.isPreview,
          isCompleted: prog?.isCompleted ?? false,
        };
      }),
    }));

    // Build navigation
    const prev = currentLessonIndex > 0 ? flatLessons[currentLessonIndex - 1] : null;
    const next =
      currentLessonIndex < flatLessons.length - 1 ? flatLessons[currentLessonIndex + 1] : null;

    const navigation: LessonNavigationDto = {
      prevLesson: prev ? { id: prev.id, title: prev.title } : null,
      nextLesson: next ? { id: next.id, title: next.title } : null,
    };

    // Calculate total course completion percentage
    const completedCount = progressRecords.filter((p) => p.isCompleted).length;
    const totalCount = flatLessons.length;
    const courseProgressPercent =
      totalCount > 0 ? Math.min(100, Math.round((completedCount / totalCount) * 100)) : 0;

    return {
      course: {
        id: course.id,
        title: course.title,
        slug: course.slug,
      },
      lesson: {
        id: currentLesson.id,
        title: currentLesson.title,
        type: currentLesson.type as "VIDEO" | "ARTICLE" | "QUIZ" | "LIVE_SESSION",
        videoUrl: currentLesson.videoUrl,
        duration: currentLesson.duration,
        content: currentLesson.content,
        isPreview: currentLesson.isPreview,
      },
      progress: {
        watchPercent: currentProgress?.watchPercent ?? 0,
        isCompleted: currentProgress?.isCompleted ?? false,
        lastWatchedAt: currentProgress?.lastWatchedAt,
      },
      curriculum,
      navigation,
      courseProgressPercent,
    };
  }

  /**
   * Update watch progress for a lesson (debounced every 10s from video player)
   */
  async updateProgress(dto: UpdateProgressDto): Promise<ProgressResultDto> {
    const enrollment = await this.validateEnrollment(dto.studentId, dto.courseId);

    // Verify lesson exists in course
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, dto.lessonId),
      with: {
        module: {
          columns: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson || lesson.module.courseId !== dto.courseId) {
      throw new AppError("LESSON_NOT_FOUND", 404, "Lesson does not belong to this course");
    }

    // Get existing progress
    const existing = await db.query.lessonProgress.findFirst({
      where: and(
        eq(lessonProgress.enrollmentId, enrollment.id),
        eq(lessonProgress.lessonId, dto.lessonId)
      ),
    });

    const previousPercent = existing?.watchPercent ?? 0;
    const previousCompleted = existing?.isCompleted ?? false;

    // watchPercent only increases
    const newPercent = Math.max(previousPercent, Math.min(100, Math.round(dto.watchPercent * 10) / 10));
    const isCompleted = previousCompleted || newPercent >= 80;
    const justCompleted = isCompleted && !previousCompleted;
    const now = new Date().toISOString();

    if (existing) {
      await db
        .update(lessonProgress)
        .set({
          watchPercent: newPercent,
          isCompleted,
          lastWatchedAt: now,
          updatedAt: now,
        })
        .where(eq(lessonProgress.id, existing.id));
    } else {
      await db.insert(lessonProgress).values({
        enrollmentId: enrollment.id,
        lessonId: dto.lessonId,
        watchPercent: newPercent,
        isCompleted,
        lastWatchedAt: now,
      });
    }

    let courseCompleted = false;
    if (justCompleted) {
      courseCompleted = await this.checkCourseCompletion(enrollment.id, dto.courseId);
      if (courseCompleted) {
        try {
          await inngest.send({
            name: "certificate/generate",
            data: {
              userId: dto.studentId,
              courseId: dto.courseId,
              enrollmentId: enrollment.id,
            },
          });
        } catch (e) {
          // Log background event send error without failing the progress request
          console.warn("Inngest certificate trigger warning:", e);
        }
      }
    }

    return {
      watchPercent: newPercent,
      isCompleted,
      justCompleted,
      courseCompleted,
    };
  }

  /**
   * Manually force mark a lesson complete (e.g. for articles or quizzes)
   */
  async markLessonComplete(
    studentId: string,
    courseId: string,
    lessonId: string
  ): Promise<{ isCompleted: boolean; courseCompleted: boolean; justCompleted: boolean }> {
    const enrollment = await this.validateEnrollment(studentId, courseId);

    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
      with: {
        module: {
          columns: {
            courseId: true,
          },
        },
      },
    });

    if (!lesson || lesson.module.courseId !== courseId) {
      throw new AppError("LESSON_NOT_FOUND", 404, "Lesson does not belong to this course");
    }

    const existing = await db.query.lessonProgress.findFirst({
      where: and(
        eq(lessonProgress.enrollmentId, enrollment.id),
        eq(lessonProgress.lessonId, lessonId)
      ),
    });

    const previousCompleted = existing?.isCompleted ?? false;
    const justCompleted = !previousCompleted;
    const now = new Date().toISOString();

    if (existing) {
      await db
        .update(lessonProgress)
        .set({
          isCompleted: true,
          watchPercent: Math.max(existing.watchPercent, 100),
          lastWatchedAt: now,
          updatedAt: now,
        })
        .where(eq(lessonProgress.id, existing.id));
    } else {
      await db.insert(lessonProgress).values({
        enrollmentId: enrollment.id,
        lessonId,
        watchPercent: 100,
        isCompleted: true,
        lastWatchedAt: now,
      });
    }

    let courseCompleted = false;
    if (justCompleted) {
      courseCompleted = await this.checkCourseCompletion(enrollment.id, courseId);
      if (courseCompleted) {
        try {
          await inngest.send({
            name: "certificate/generate",
            data: {
              userId: studentId,
              courseId,
              enrollmentId: enrollment.id,
            },
          });
        } catch (e) {
          console.warn("Inngest certificate trigger warning:", e);
        }
      }
    }

    return {
      isCompleted: true,
      justCompleted,
      courseCompleted,
    };
  }

  /**
   * Check if all lessons in a course are completed
   */
  async checkCourseCompletion(enrollmentId: string, courseId: string): Promise<boolean> {
    const courseModules = await db.query.modules.findMany({
      where: eq(modules.courseId, courseId),
      with: {
        lessons: {
          columns: {
            id: true,
          },
        },
      },
    });

    const allLessonIds: string[] = [];
    for (const mod of courseModules) {
      for (const les of mod.lessons || []) {
        allLessonIds.push(les.id);
      }
    }

    if (allLessonIds.length === 0) return false;

    const completedRecords = await db.query.lessonProgress.findMany({
      where: and(
        eq(lessonProgress.enrollmentId, enrollmentId),
        eq(lessonProgress.isCompleted, true),
        inArray(lessonProgress.lessonId, allLessonIds)
      ),
    });

    return completedRecords.length >= allLessonIds.length;
  }
}

export const progressService = new ProgressService();
