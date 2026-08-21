import { db, rawClient } from "@/lib/db/client";
import {
  courses,
  categories,
  users,
  modules,
  lessons,
  enrollments,
  reviews,
  type Course,
  type Category,
  type Module,
  type Lesson,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";
import { eq, desc, asc, and, or, like, inArray, lt, sql } from "drizzle-orm";
import crypto from "crypto";
import {
  CreateCourseInput,
  UpdateCourseInput,
  SeoInput,
  ListCoursesQuery,
  CourseCard,
  PaginatedResult,
  CourseDetail,
  CurriculumModuleDetail,
  InstructorDetail,
  CourseReviewItem,
  PaginatedReviews,
} from "@/lib/validations/course";
import { CreateLessonInput, UpdateLessonInput } from "@/lib/validations/curriculum";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { inngest } from "@/lib/inngest";
import { upsertCourseFts, removeCourseFts } from "@/lib/db/fts";
import { redis } from "@/lib/redis";

export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(code: string, statusCode = 400, message?: string, details?: any) {
    super(message || code);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/&/g, "-and-") // Replace & with 'and'
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export class CourseService {
  /**
   * Creates a new course draft.
   */
  async createCourse(
    dto: CreateCourseInput,
    authorId: string,
    authorRole: UserRole,
    authorStatus: UserStatus
  ): Promise<{ id: string; slug: string; status: string; title: string }> {
    if (authorRole === "TEACHER" && authorStatus !== "ACTIVE") {
      throw new AppError("TEACHER_NOT_APPROVED", 403, "Instructor account must be approved before creating courses");
    }

    if (
      dto.discountPrice !== undefined &&
      dto.discountPrice !== null &&
      dto.discountPrice >= dto.price
    ) {
      throw new AppError("INVALID_DISCOUNT_PRICE", 400, "Discount price must be less than the regular price");
    }

    const slug = await this.generateUniqueSlug(dto.title);

    const [newCourse] = await db
      .insert(courses)
      .values({
        title: dto.title.trim(),
        slug,
        shortDesc: dto.shortDesc?.trim() || null,
        description: dto.description || null,
        type: dto.type,
        level: dto.level || null,
        language: dto.language || "English",
        price: dto.price ?? 0,
        discountPrice: dto.discountPrice ?? null,
        accessDuration: dto.accessDuration ?? null,
        categoryId: dto.categoryId || null,
        thumbnailUrl: dto.thumbnailUrl || null,
        previewUrl: dto.previewUrl || null,
        authorId,
        status: "DRAFT",
      })
      .returning({
        id: courses.id,
        slug: courses.slug,
        status: courses.status,
        title: courses.title,
      });

    return newCourse;
  }

  /**
   * Generates a unique slug from title, appending random suffix if collision exists.
   */
  async generateUniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    const existing = await db.query.courses.findFirst({
      where: eq(courses.slug, base),
    });

    if (!existing) return base;

    const suffix = crypto.randomBytes(2).toString("hex");
    return `${base}-${suffix}`;
  }

  /**
   * Updates an existing course draft.
   */
  async updateCourse(
    courseId: string,
    callerId: string,
    callerRole: UserRole,
    dto: UpdateCourseInput
  ): Promise<Course> {
    const course = await this.findCourseOrThrow(courseId);

    if (callerRole !== "ADMIN" && course.authorId !== callerId) {
      throw new AppError("NOT_COURSE_OWNER", 403, "You do not have permission to edit this course");
    }

    if (course.status === "PUBLISHED") {
      throw new AppError("CANNOT_EDIT_PUBLISHED", 422, "Published courses cannot be directly edited");
    }

    const effectivePrice = dto.price !== undefined ? dto.price : (course.price ?? 0);
    const effectiveDiscount = dto.discountPrice !== undefined ? dto.discountPrice : course.discountPrice;

    if (
      effectiveDiscount !== undefined &&
      effectiveDiscount !== null &&
      effectiveDiscount >= effectivePrice
    ) {
      throw new AppError("INVALID_DISCOUNT_PRICE", 400, "Discount price must be less than regular price");
    }

    const updateData: Partial<typeof courses.$inferInsert> = {
      ...dto,
      updatedAt: new Date().toISOString(),
    };

    if (dto.title && dto.title !== course.title) {
      updateData.title = dto.title.trim();
    }

    const [updated] = await db
      .update(courses)
      .set(updateData)
      .where(eq(courses.id, courseId))
      .returning();

    return updated;
  }

  /**
   * Retrieves presigned URL for thumbnail upload (or local dev upload fallback).
   */
  async getThumbnailPresignedUrl(
    filename: string,
    mimeType: string
  ): Promise<{ uploadUrl: string; publicUrl: string; expiresIn: number; isDevLocal?: boolean }> {
    const extension = filename.split(".").pop() || "jpg";
    const key = `thumbnails/${crypto.randomUUID()}.${extension}`;

    const hasAwsCredentials = !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME
    );

    if (hasAwsCredentials) {
      const s3Client = new S3Client({
        region: env.AWS_REGION || "ap-south-1",
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const uploadUrl = await getSignedUrl(
        s3Client,
        new PutObjectCommand({
          Bucket: env.AWS_S3_BUCKET_NAME,
          Key: key,
          ContentType: mimeType,
        }),
        { expiresIn: 300 }
      );

      const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com`;
      const publicUrl = `${cdnUrl}/${key}`;

      return { uploadUrl, publicUrl, expiresIn: 300 };
    }

    // Dev Fallback when AWS is not configured
    const devUploadUrl = `/api/uploads/dev-upload?key=${encodeURIComponent(key)}&mimeType=${encodeURIComponent(mimeType)}`;
    const devPublicUrl = `/uploads/${key}`;

    return {
      uploadUrl: devUploadUrl,
      publicUrl: devPublicUrl,
      expiresIn: 600,
      isDevLocal: true,
    };
  }

  /**
   * Returns all categories.
   */
  async getCategories(): Promise<Category[]> {
    return await db.query.categories.findMany({
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });
  }

  /**
   * Returns teacher courses.
   */
  async getTeacherCourses(teacherId: string, role?: UserRole) {
    if (role === "ADMIN") {
      return await db.query.courses.findMany({
        with: { category: true, author: true },
        orderBy: [desc(courses.createdAt)],
      });
    }

    return await db.query.courses.findMany({
      where: eq(courses.authorId, teacherId),
      with: { category: true },
      orderBy: [desc(courses.createdAt)],
    });
  }

  /**
   * Finds a course by ID or throws 404.
   */
  async findCourseOrThrow(id: string): Promise<Course> {
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, id),
    });
    if (!course) {
      throw new AppError("COURSE_NOT_FOUND", 404, "Course not found");
    }
    return course;
  }

  // ==========================================
  // Slice 2.2 — Curriculum Builder Service Methods
  // ==========================================

  /**
   * Asserts caller is owner or admin, and course is in DRAFT/PENDING_REVIEW.
   */
  async assertCourseOwnerAndEditable(
    courseId: string,
    callerId: string,
    callerRole: UserRole
  ): Promise<Course> {
    const course = await this.findCourseOrThrow(courseId);

    if (callerRole !== "ADMIN" && course.authorId !== callerId) {
      throw new AppError("NOT_COURSE_OWNER", 403, "You do not have permission to edit this course curriculum");
    }

    if (course.status === "PUBLISHED" || course.status === "ARCHIVED") {
      throw new AppError("CANNOT_EDIT_PUBLISHED", 422, "Cannot edit curriculum of a published or archived course");
    }

    return course;
  }

  /**
   * Asserts preview limit of 3 free preview lessons per course.
   */
  async assertPreviewLimit(courseId: string): Promise<void> {
    const previewLessons = await db
      .select({ count: sql<number>`count(*)` })
      .from(lessons)
      .innerJoin(modules, eq(lessons.moduleId, modules.id))
      .where(
        and(
          eq(modules.courseId, courseId),
          eq(lessons.isPreview, true)
        )
      );

    const count = Number(previewLessons[0]?.count ?? 0);
    if (count >= 3) {
      throw new AppError(
        "MAX_PREVIEWS_EXCEEDED",
        409,
        "A course can have a maximum of 3 free preview lessons"
      );
    }
  }

  /**
   * Adds a new module to a course.
   */
  async addModule(
    courseId: string,
    callerId: string,
    callerRole: UserRole,
    title: string
  ): Promise<Module> {
    await this.assertCourseOwnerAndEditable(courseId, callerId, callerRole);

    const lastModule = await db.query.modules.findFirst({
      where: eq(modules.courseId, courseId),
      orderBy: [desc(modules.order)],
    });

    const order = (lastModule?.order ?? 0) + 1;

    const [newMod] = await db
      .insert(modules)
      .values({
        courseId,
        title: title.trim(),
        order,
      })
      .returning();

    return newMod;
  }

  /**
   * Updates a module's title.
   */
  async updateModule(
    moduleId: string,
    callerId: string,
    callerRole: UserRole,
    title: string
  ): Promise<Module> {
    const mod = await db.query.modules.findFirst({
      where: eq(modules.id, moduleId),
    });

    if (!mod) {
      throw new AppError("MODULE_NOT_FOUND", 404, "Module not found");
    }

    await this.assertCourseOwnerAndEditable(mod.courseId, callerId, callerRole);

    const [updated] = await db
      .update(modules)
      .set({
        title: title.trim(),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(modules.id, moduleId))
      .returning();

    return updated;
  }

  /**
   * Deletes a module and cascades lessons.
   */
  async deleteModule(
    moduleId: string,
    callerId: string,
    callerRole: UserRole
  ): Promise<void> {
    const mod = await db.query.modules.findFirst({
      where: eq(modules.id, moduleId),
    });

    if (!mod) {
      throw new AppError("MODULE_NOT_FOUND", 404, "Module not found");
    }

    await this.assertCourseOwnerAndEditable(mod.courseId, callerId, callerRole);

    // Cascade delete lessons and module
    await db.delete(lessons).where(eq(lessons.moduleId, moduleId));
    await db.delete(modules).where(eq(modules.id, moduleId));

    // Reorder remaining modules
    const remainingModules = await db.query.modules.findMany({
      where: eq(modules.courseId, mod.courseId),
      orderBy: [asc(modules.order)],
    });

    for (let i = 0; i < remainingModules.length; i++) {
      if (remainingModules[i].order !== i + 1) {
        await db
          .update(modules)
          .set({ order: i + 1, updatedAt: new Date().toISOString() })
          .where(eq(modules.id, remainingModules[i].id));
      }
    }
  }

  /**
   * Reorders modules for a course in a single batch.
   */
  async reorderModules(
    courseId: string,
    callerId: string,
    callerRole: UserRole,
    orderedIds: string[]
  ): Promise<void> {
    await this.assertCourseOwnerAndEditable(courseId, callerId, callerRole);

    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(modules)
        .set({ order: i + 1, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(modules.id, orderedIds[i]),
            eq(modules.courseId, courseId)
          )
        );
    }
  }

  /**
   * Adds a new lesson to a module.
   */
  async addLesson(
    moduleId: string,
    callerId: string,
    callerRole: UserRole,
    dto: CreateLessonInput
  ): Promise<Lesson> {
    const mod = await db.query.modules.findFirst({
      where: eq(modules.id, moduleId),
    });

    if (!mod) {
      throw new AppError("MODULE_NOT_FOUND", 404, "Module not found");
    }

    await this.assertCourseOwnerAndEditable(mod.courseId, callerId, callerRole);

    if (dto.isPreview) {
      await this.assertPreviewLimit(mod.courseId);
    }

    const lastLesson = await db.query.lessons.findFirst({
      where: eq(lessons.moduleId, moduleId),
      orderBy: [desc(lessons.order)],
    });

    const order = (lastLesson?.order ?? 0) + 1;

    const [newLesson] = await db
      .insert(lessons)
      .values({
        moduleId,
        title: dto.title.trim(),
        type: dto.type,
        isPreview: dto.isPreview ?? false,
        order,
      })
      .returning();

    return newLesson;
  }

  /**
   * Updates an existing lesson.
   */
  async updateLesson(
    lessonId: string,
    callerId: string,
    callerRole: UserRole,
    dto: UpdateLessonInput
  ): Promise<Lesson> {
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
    });

    if (!lesson) {
      throw new AppError("LESSON_NOT_FOUND", 404, "Lesson not found");
    }

    const mod = await db.query.modules.findFirst({
      where: eq(modules.id, lesson.moduleId),
    });

    if (!mod) {
      throw new AppError("MODULE_NOT_FOUND", 404, "Parent module not found");
    }

    await this.assertCourseOwnerAndEditable(mod.courseId, callerId, callerRole);

    if (dto.isPreview === true && !lesson.isPreview) {
      await this.assertPreviewLimit(mod.courseId);
    }

    const updateData: Partial<typeof lessons.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.content !== undefined) updateData.content = dto.content;
    if (dto.videoUrl !== undefined) updateData.videoUrl = dto.videoUrl || null;
    if (dto.duration !== undefined) updateData.duration = dto.duration;
    if (dto.isPreview !== undefined) updateData.isPreview = dto.isPreview;

    const [updated] = await db
      .update(lessons)
      .set(updateData)
      .where(eq(lessons.id, lessonId))
      .returning();

    return updated;
  }

  /**
   * Deletes a lesson and reorders remaining lessons in module.
   */
  async deleteLesson(
    lessonId: string,
    callerId: string,
    callerRole: UserRole
  ): Promise<void> {
    const lesson = await db.query.lessons.findFirst({
      where: eq(lessons.id, lessonId),
    });

    if (!lesson) {
      throw new AppError("LESSON_NOT_FOUND", 404, "Lesson not found");
    }

    const mod = await db.query.modules.findFirst({
      where: eq(modules.id, lesson.moduleId),
    });

    if (!mod) {
      throw new AppError("MODULE_NOT_FOUND", 404, "Parent module not found");
    }

    await this.assertCourseOwnerAndEditable(mod.courseId, callerId, callerRole);

    await db.delete(lessons).where(eq(lessons.id, lessonId));

    // Reorder remaining lessons in the module
    const remainingLessons = await db.query.lessons.findMany({
      where: eq(lessons.moduleId, mod.id),
      orderBy: [asc(lessons.order)],
    });

    for (let i = 0; i < remainingLessons.length; i++) {
      if (remainingLessons[i].order !== i + 1) {
        await db
          .update(lessons)
          .set({ order: i + 1, updatedAt: new Date().toISOString() })
          .where(eq(lessons.id, remainingLessons[i].id));
      }
    }
  }

  /**
   * Reorders lessons within a module.
   */
  async reorderLessons(
    moduleId: string,
    callerId: string,
    callerRole: UserRole,
    orderedIds: string[]
  ): Promise<void> {
    const mod = await db.query.modules.findFirst({
      where: eq(modules.id, moduleId),
    });

    if (!mod) {
      throw new AppError("MODULE_NOT_FOUND", 404, "Module not found");
    }

    await this.assertCourseOwnerAndEditable(mod.courseId, callerId, callerRole);

    for (let i = 0; i < orderedIds.length; i++) {
      await db
        .update(lessons)
        .set({ order: i + 1, updatedAt: new Date().toISOString() })
        .where(
          and(
            eq(lessons.id, orderedIds[i]),
            eq(lessons.moduleId, moduleId)
          )
        );
    }
  }

  /**
   * Retrieves presigned URL for lesson video upload (with local dev fallback).
   */
  async getVideoPresignedUrl(
    filename: string,
    mimeType: string,
    lessonId?: string
  ): Promise<{ uploadUrl: string; publicUrl: string; expiresIn: number; isDevLocal?: boolean }> {
    const extension = filename.split(".").pop() || "mp4";
    const key = `videos/${lessonId || crypto.randomUUID()}-${crypto.randomUUID().slice(0, 8)}.${extension}`;

    const hasAwsCredentials = !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME
    );

    if (hasAwsCredentials) {
      const s3Client = new S3Client({
        region: env.AWS_REGION || "ap-south-1",
        credentials: {
          accessKeyId: env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      const uploadUrl = await getSignedUrl(
        s3Client,
        new PutObjectCommand({
          Bucket: env.AWS_S3_BUCKET_NAME,
          Key: key,
          ContentType: mimeType,
        }),
        { expiresIn: 3600 }
      );

      const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL || `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com`;
      const publicUrl = `${cdnUrl}/${key}`;

      return { uploadUrl, publicUrl, expiresIn: 3600 };
    }

    // Dev Fallback when AWS is not configured
    const devUploadUrl = `/api/uploads/dev-upload?key=${encodeURIComponent(key)}&mimeType=${encodeURIComponent(mimeType)}`;
    const devPublicUrl = `/uploads/${key}`;

    return {
      uploadUrl: devUploadUrl,
      publicUrl: devPublicUrl,
      expiresIn: 3600,
      isDevLocal: true,
    };
  }

  /**
   * Returns full curriculum for a course (modules with nested lessons ordered).
   */
  async getCurriculum(courseId: string) {
    const courseModules = await db.query.modules.findMany({
      where: eq(modules.courseId, courseId),
      with: {
        lessons: {
          orderBy: (lessons, { asc }) => [asc(lessons.order)],
        },
      },
      orderBy: (modules, { asc }) => [asc(modules.order)],
    });

    return courseModules;
  }

  // ==========================================
  // Slice 2.3 — Course SEO & Publishing Service Methods
  // ==========================================

  /**
   * Evaluates the 8-point publish readiness checklist for a course.
   */
  async checkPublishReadiness(courseId: string): Promise<{
    ready: boolean;
    failures: string[];
    checks: { name: string; label: string; passed: boolean; message?: string }[];
  }> {
    const course = await this.findCourseOrThrow(courseId);
    const mods = await db.query.modules.findMany({
      where: eq(modules.courseId, courseId),
      with: {
        lessons: {
          orderBy: (lessons, { asc }) => [asc(lessons.order)],
        },
      },
      orderBy: (modules, { asc }) => [asc(modules.order)],
    });

    const failures: string[] = [];
    const checks: { name: string; label: string; passed: boolean; message?: string }[] = [];

    // 1. Title check (min 10 chars)
    const titlePassed = Boolean(course.title && course.title.trim().length >= 10);
    if (!titlePassed) {
      failures.push("title is required (min 10 chars)");
    }
    checks.push({
      name: "title",
      label: "Course Title (min 10 chars)",
      passed: titlePassed,
      message: titlePassed ? undefined : "Title must be at least 10 characters",
    });

    // 2. Description check
    const descPassed = Boolean(course.description && course.description.trim().length > 0);
    if (!descPassed) {
      failures.push("description is required");
    }
    checks.push({
      name: "description",
      label: "Course Detailed Description",
      passed: descPassed,
      message: descPassed ? undefined : "Description is required",
    });

    // 3. Thumbnail check
    const thumbnailPassed = Boolean(course.thumbnailUrl && course.thumbnailUrl.trim().length > 0);
    if (!thumbnailPassed) {
      failures.push("thumbnailUrl is required");
    }
    checks.push({
      name: "thumbnailUrl",
      label: "Course Thumbnail Image",
      passed: thumbnailPassed,
      message: thumbnailPassed ? undefined : "Thumbnail is required",
    });

    // 4. Course Type
    const typePassed = Boolean(course.type);
    if (!typePassed) {
      failures.push("course type must be set");
    }
    checks.push({
      name: "type",
      label: "Course Format Type (RECORDED/LIVE)",
      passed: typePassed,
      message: typePassed ? undefined : "Course type must be set",
    });

    // 5. Price >= 0
    const pricePassed = course.price !== null && course.price !== undefined && course.price >= 0;
    if (!pricePassed) {
      failures.push("price must be >= 0");
    }
    checks.push({
      name: "price",
      label: "Valid Course Pricing",
      passed: pricePassed,
      message: pricePassed ? undefined : "Price must be >= 0",
    });

    // 6. At least 1 module
    const hasModulesPassed = mods.length > 0;
    if (!hasModulesPassed) {
      failures.push("at least 1 module is required");
    }
    checks.push({
      name: "hasModules",
      label: "At least 1 Curriculum Module",
      passed: hasModulesPassed,
      message: hasModulesPassed ? undefined : "Course must contain at least 1 module",
    });

    // 7. All modules have >= 1 lesson
    let allModulesHaveLessonsPassed = mods.length > 0;
    const emptyModuleNames: string[] = [];
    for (const mod of mods) {
      if (!mod.lessons || mod.lessons.length === 0) {
        allModulesHaveLessonsPassed = false;
        emptyModuleNames.push(mod.title);
        failures.push(`Module '${mod.title}' has no lessons`);
      }
    }
    checks.push({
      name: "allModulesHaveLessons",
      label: "All Modules Contain Lessons",
      passed: allModulesHaveLessonsPassed,
      message: allModulesHaveLessonsPassed
        ? undefined
        : `Module(s) without lessons: ${emptyModuleNames.join(", ")}`,
    });

    // 8. All VIDEO lessons have videoUrl
    let allVideosUploadedPassed = true;
    const missingVideoLessonTitles: string[] = [];
    for (const mod of mods) {
      for (const lesson of mod.lessons || []) {
        if (lesson.type === "VIDEO" && (!lesson.videoUrl || !lesson.videoUrl.trim())) {
          allVideosUploadedPassed = false;
          missingVideoLessonTitles.push(lesson.title);
          failures.push(`Lesson '${lesson.title}' is missing a video file`);
        }
      }
    }
    checks.push({
      name: "allVideosUploaded",
      label: "All Video Lessons Uploaded",
      passed: allVideosUploadedPassed,
      message: allVideosUploadedPassed
        ? undefined
        : `Video lesson(s) missing file: ${missingVideoLessonTitles.join(", ")}`,
    });

    return {
      ready: failures.length === 0,
      failures,
      checks,
    };
  }

  /**
   * Updates SEO metadata fields for a course draft or pending review.
   */
  async updateCourseSeo(
    courseId: string,
    callerId: string,
    callerRole: UserRole,
    dto: SeoInput
  ): Promise<Course> {
    const course = await this.findCourseOrThrow(courseId);

    if (callerRole !== "ADMIN" && course.authorId !== callerId) {
      throw new AppError("NOT_COURSE_OWNER", 403, "You do not have permission to edit this course's SEO");
    }

    if (course.status === "PUBLISHED" || course.status === "ARCHIVED") {
      throw new AppError("CANNOT_EDIT_PUBLISHED", 422, "Cannot edit SEO metadata of a published or archived course");
    }

    const updateData: Partial<typeof courses.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (dto.seoTitle !== undefined) updateData.seoTitle = dto.seoTitle ? dto.seoTitle.trim() : null;
    if (dto.seoDesc !== undefined) updateData.seoDesc = dto.seoDesc ? dto.seoDesc.trim() : null;
    if (dto.ogImageUrl !== undefined) updateData.ogImageUrl = dto.ogImageUrl || null;

    const [updated] = await db
      .update(courses)
      .set(updateData)
      .where(eq(courses.id, courseId))
      .returning();

    return updated;
  }

  /**
   * Submits a DRAFT course for review (Teacher / Owner).
   */
  async submitForReview(
    courseId: string,
    callerId: string,
    callerRole: UserRole
  ): Promise<Course> {
    const course = await this.findCourseOrThrow(courseId);

    if (callerRole !== "ADMIN" && course.authorId !== callerId) {
      throw new AppError("NOT_COURSE_OWNER", 403, "Only the course owner or Admin can submit for review");
    }

    if (course.status !== "DRAFT") {
      throw new AppError("INVALID_STATE_TRANSITION", 422, `Cannot submit course with status ${course.status} (must be DRAFT)`);
    }

    const { ready, failures } = await this.checkPublishReadiness(courseId);
    if (!ready) {
      throw new AppError(
        "COURSE_INCOMPLETE",
        422,
        "Course is missing required information before it can be submitted.",
        failures
      );
    }

    const [updated] = await db
      .update(courses)
      .set({
        status: "PENDING_REVIEW",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    try {
      await inngest.send({
        name: "course/submitted-for-review",
        data: {
          courseId: updated.id,
          teacherId: updated.authorId,
          courseTitle: updated.title,
        },
      });
    } catch (e) {
      console.warn("Inngest send event warning (course/submitted-for-review):", e);
    }

    return updated;
  }

  /**
   * Publishes a course to public catalog (Admin only).
   */
  async publishCourse(
    courseId: string,
    callerId: string,
    callerRole: UserRole
  ): Promise<Course> {
    if (callerRole !== "ADMIN") {
      throw new AppError("FORBIDDEN", 403, "Only administrators can publish courses");
    }

    const course = await this.findCourseOrThrow(courseId);

    if (!["DRAFT", "PENDING_REVIEW"].includes(course.status)) {
      throw new AppError(
        "INVALID_STATE_TRANSITION",
        422,
        `Cannot publish course with status ${course.status} (must be DRAFT or PENDING_REVIEW)`
      );
    }

    const { ready, failures } = await this.checkPublishReadiness(courseId);
    if (!ready) {
      throw new AppError(
        "COURSE_INCOMPLETE",
        422,
        "Course is missing required information before it can be published.",
        failures
      );
    }

    const [updated] = await db
      .update(courses)
      .set({
        status: "PUBLISHED",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    // Sync FTS index
    await upsertCourseFts(updated.id, updated.title, updated.description, updated.shortDesc);

    try {
      await inngest.send({
        name: "course/published",
        data: {
          courseId: updated.id,
          adminId: callerId,
          teacherId: updated.authorId,
          courseTitle: updated.title,
        },
      });
    } catch (e) {
      console.warn("Inngest send event warning (course/published):", e);
    }

    return updated;
  }

  /**
   * Archives a course (Admin only).
   */
  async archiveCourse(
    courseId: string,
    callerId: string,
    callerRole: UserRole
  ): Promise<Course> {
    if (callerRole !== "ADMIN") {
      throw new AppError("FORBIDDEN", 403, "Only administrators can archive courses");
    }

    const course = await this.findCourseOrThrow(courseId);

    if (course.status === "ARCHIVED") {
      throw new AppError("INVALID_STATE_TRANSITION", 422, "Course is already archived");
    }

    const [updated] = await db
      .update(courses)
      .set({
        status: "ARCHIVED",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    // Remove from FTS index
    await removeCourseFts(courseId);

    return updated;
  }

  /**
   * Unarchives an archived course back to DRAFT (Admin only).
   */
  async unarchiveCourse(
    courseId: string,
    callerId: string,
    callerRole: UserRole
  ): Promise<Course> {
    if (callerRole !== "ADMIN") {
      throw new AppError("FORBIDDEN", 403, "Only administrators can unarchive courses");
    }

    const course = await this.findCourseOrThrow(courseId);

    if (course.status !== "ARCHIVED") {
      throw new AppError("INVALID_STATE_TRANSITION", 422, "Course is not archived");
    }

    const [updated] = await db
      .update(courses)
      .set({
        status: "DRAFT",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(courses.id, courseId))
      .returning();

    return updated;
  }

  /**
   * Lists public courses with full-text search, multi-facet filtering, 4 sort modes,
   * cursor-based pagination, and Redis caching.
   */
  async listPublicCourses(query: ListCoursesQuery): Promise<PaginatedResult<CourseCard>> {
    const {
      q,
      category,
      level,
      type,
      sort = "newest",
      cursor,
      limit = 12,
    } = query;

    const cacheKey = q
      ? null
      : `courses:list:${JSON.stringify({ category, level, type, sort, cursor, limit })}`;

    if (cacheKey) {
      const cached = await redis.get<PaginatedResult<CourseCard>>(cacheKey);
      if (cached) return cached;
    }

    let categoryId: string | undefined;
    if (category) {
      const cat = await db.query.categories.findFirst({
        where: eq(categories.slug, category),
      });
      if (cat) {
        categoryId = cat.id;
      } else {
        return { data: [], meta: { hasNext: false, total: 0 } };
      }
    }

    const conditions: any[] = [eq(courses.status, "PUBLISHED")];

    if (categoryId) {
      conditions.push(eq(courses.categoryId, categoryId));
    }
    if (level) {
      conditions.push(eq(courses.level, level));
    }
    if (type) {
      conditions.push(eq(courses.type, type));
    }
    if (cursor) {
      conditions.push(lt(courses.createdAt, cursor));
    }

    if (q && q.trim().length >= 3) {
      const cleanQ = q.trim().replace(/['"*()]/g, "").trim();
      if (cleanQ) {
        try {
          const ftsRes = await rawClient.execute({
            sql: `SELECT course_id FROM courses_fts WHERE courses_fts MATCH ? LIMIT 100`,
            args: [`${cleanQ}*`],
          });
          const matchedIds = ftsRes.rows.map((r: any) => String(r.course_id || r.rowid));
          if (matchedIds.length === 0) {
            return { data: [], meta: { hasNext: false, total: 0 } };
          }
          conditions.push(inArray(courses.id, matchedIds));
        } catch (ftsErr) {
          console.warn("FTS query fallback to LIKE:", ftsErr);
          conditions.push(
            or(
              like(courses.title, `%${cleanQ}%`),
              like(courses.shortDesc, `%${cleanQ}%`),
              like(courses.description, `%${cleanQ}%`)
            )
          );
        }
      }
    } else if (q && q.trim().length > 0) {
      const cleanQ = q.trim();
      conditions.push(
        or(
          like(courses.title, `%${cleanQ}%`),
          like(courses.shortDesc, `%${cleanQ}%`)
        )
      );
    }

    // Subquery for active enrollment counts
    const enrollmentSq = db
      .select({
        courseId: enrollments.courseId,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(enrollments)
      .where(eq(enrollments.status, "ACTIVE"))
      .groupBy(enrollments.courseId)
      .as("enrollment_counts");

    // Subquery for curriculum stats (lesson count and total duration)
    const curriculumSq = db
      .select({
        courseId: modules.courseId,
        lessonCount: sql<number>`count(${lessons.id})`.as("lesson_count"),
        totalDuration: sql<number>`coalesce(sum(${lessons.duration}), 0)`.as("total_duration"),
      })
      .from(modules)
      .leftJoin(lessons, eq(modules.id, lessons.moduleId))
      .groupBy(modules.courseId)
      .as("curriculum_stats");

    const orderBy =
      sort === "price_asc"
        ? [asc(courses.price), desc(courses.createdAt)]
        : sort === "price_desc"
        ? [desc(courses.price), desc(courses.createdAt)]
        : sort === "popular"
        ? [desc(sql`coalesce(${enrollmentSq.count}, 0)`), desc(courses.createdAt)]
        : [desc(courses.createdAt)];

    const rows = await db
      .select({
        id: courses.id,
        title: courses.title,
        slug: courses.slug,
        shortDesc: courses.shortDesc,
        thumbnailUrl: courses.thumbnailUrl,
        price: courses.price,
        discountPrice: courses.discountPrice,
        type: courses.type,
        level: courses.level,
        createdAt: courses.createdAt,
        categoryName: categories.name,
        categorySlug: categories.slug,
        instructorId: users.id,
        instructorName: users.fullName,
        instructorAvatar: users.avatarUrl,
        enrollmentCount: sql<number>`coalesce(${enrollmentSq.count}, 0)`,
        lessonCount: sql<number>`coalesce(${curriculumSq.lessonCount}, 0)`,
        totalDuration: sql<number>`coalesce(${curriculumSq.totalDuration}, 0)`,
      })
      .from(courses)
      .leftJoin(categories, eq(courses.categoryId, categories.id))
      .leftJoin(users, eq(courses.authorId, users.id))
      .leftJoin(enrollmentSq, eq(courses.id, enrollmentSq.courseId))
      .leftJoin(curriculumSq, eq(courses.id, curriculumSq.courseId))
      .where(and(...conditions))
      .orderBy(...orderBy)
      .limit(limit + 1);

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;

    const data: CourseCard[] = items.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      shortDesc: r.shortDesc,
      thumbnailUrl: r.thumbnailUrl,
      price: r.price ?? 0,
      discountPrice: r.discountPrice,
      type: r.type as "RECORDED" | "LIVE",
      level: r.level as any,
      category: r.categoryName && r.categorySlug ? { name: r.categoryName, slug: r.categorySlug } : null,
      instructor: r.instructorId ? { id: r.instructorId, fullName: r.instructorName, avatarUrl: r.instructorAvatar } : null,
      enrollmentCount: Number(r.enrollmentCount || 0),
      lessonCount: Number(r.lessonCount || 0),
      totalDuration: Number(r.totalDuration || 0),
      createdAt: r.createdAt || new Date().toISOString(),
    }));

    const nextCursor = hasNext && data.length > 0 ? data[data.length - 1].createdAt : undefined;
    const result: PaginatedResult<CourseCard> = {
      data,
      meta: {
        hasNext,
        nextCursor,
      },
    };

    if (cacheKey) {
      await redis.set(cacheKey, result, { ex: 60 });
    }

    return result;
  }

  /**
   * Fetches full public course detail by slug or ID with curriculum gating,
   * instructor statistics, review ratings, and enrollment status.
   */
  async getCourseDetail(slugOrId: string, requestingUserId?: string): Promise<CourseDetail> {
    const course = await db.query.courses.findFirst({
      where: and(
        or(eq(courses.slug, slugOrId), eq(courses.id, slugOrId)),
        eq(courses.status, "PUBLISHED")
      ),
      with: {
        category: true,
      },
    });

    if (!course) {
      throw new AppError("COURSE_NOT_FOUND", 404, "Course not found or is not published");
    }

    // Fetch instructor
    const instructorUser = await db.query.users.findFirst({
      where: eq(users.id, course.authorId),
      columns: {
        id: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
      },
    });

    // Compute instructor stats: total published courses & total distinct enrolled students
    const instructorCourses = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.authorId, course.authorId), eq(courses.status, "PUBLISHED")));

    const instructorCourseIds = instructorCourses.map((c) => c.id);

    let instructorStudentCount = 0;
    if (instructorCourseIds.length > 0) {
      const [studentCountResult] = await db
        .select({
          count: sql<number>`count(distinct ${enrollments.userId})`,
        })
        .from(enrollments)
        .where(
          and(
            inArray(enrollments.courseId, instructorCourseIds),
            eq(enrollments.status, "ACTIVE")
          )
        );
      instructorStudentCount = Number(studentCountResult?.count || 0);
    }

    const instructorDetail: InstructorDetail = {
      id: instructorUser?.id || course.authorId,
      fullName: instructorUser?.fullName || "Verified Instructor",
      avatarUrl: instructorUser?.avatarUrl || null,
      bio: instructorUser?.bio || "Experienced instructor and industry professional.",
      courseCount: instructorCourses.length,
      studentCount: instructorStudentCount,
    };

    // Check if requesting user is enrolled
    let isEnrolled = false;
    if (requestingUserId) {
      const enrollmentRecord = await db.query.enrollments.findFirst({
        where: and(
          eq(enrollments.userId, requestingUserId),
          eq(enrollments.courseId, course.id),
          eq(enrollments.status, "ACTIVE")
        ),
      });
      isEnrolled = !!enrollmentRecord;
    }

    // Fetch curriculum tree: modules ordered ascending with lessons ordered ascending
    const rawModules = await db.query.modules.findMany({
      where: eq(modules.courseId, course.id),
      orderBy: [asc(modules.order)],
      with: {
        lessons: {
          orderBy: [asc(lessons.order)],
        },
      },
    });

    // Sanitize lesson video URLs: include only if isPreview: true OR user isEnrolled
    const curriculum: CurriculumModuleDetail[] = rawModules.map((m) => ({
      id: m.id,
      title: m.title,
      order: m.order,
      lessons: m.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        type: l.type as any,
        order: l.order,
        duration: l.duration ?? 0,
        isPreview: Boolean(l.isPreview),
        videoUrl: (l.isPreview || isEnrolled) ? l.videoUrl : null,
        content: l.content,
      })),
    }));

    // Aggregate stats: active enrollments, lesson count, total duration, avg rating, review count
    const [enrollmentStat] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, course.id), eq(enrollments.status, "ACTIVE")));

    const [reviewStat] = await db
      .select({
        count: sql<number>`count(*)`,
        avg: sql<number>`avg(${reviews.rating})`,
      })
      .from(reviews)
      .where(eq(reviews.courseId, course.id));

    let lessonCount = 0;
    let totalDuration = 0;
    for (const mod of curriculum) {
      lessonCount += mod.lessons.length;
      for (const les of mod.lessons) {
        totalDuration += les.duration || 0;
      }
    }

    const avgRating = reviewStat?.avg ? Number(Number(reviewStat.avg).toFixed(1)) : 0;
    const reviewCount = Number(reviewStat?.count || 0);
    const enrollmentCount = Number(enrollmentStat?.count || 0);

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      description: course.description,
      shortDesc: course.shortDesc,
      thumbnailUrl: course.thumbnailUrl,
      previewUrl: course.previewUrl,
      type: course.type as "RECORDED" | "LIVE",
      level: course.level as any,
      language: course.language || "English",
      price: course.price ?? 0,
      discountPrice: course.discountPrice,
      accessDuration: course.accessDuration,
      status: course.status,
      isEnrolled,
      enrollmentCount,
      lessonCount,
      totalDuration,
      avgRating,
      reviewCount,
      seoTitle: course.seoTitle,
      seoDesc: course.seoDesc,
      ogImageUrl: course.ogImageUrl,
      category: course.category ? { name: course.category.name, slug: course.category.slug } : null,
      instructor: instructorDetail,
      curriculum,
      createdAt: course.createdAt || new Date().toISOString(),
      updatedAt: course.updatedAt || new Date().toISOString(),
    };
  }

  /**
   * Fetches paginated reviews for a published course.
   */
  async getCourseReviews(
    slugOrId: string,
    options?: { cursor?: string; limit?: number }
  ): Promise<PaginatedReviews> {
    const course = await db.query.courses.findFirst({
      where: and(
        or(eq(courses.slug, slugOrId), eq(courses.id, slugOrId)),
        eq(courses.status, "PUBLISHED")
      ),
      columns: { id: true },
    });

    if (!course) {
      throw new AppError("COURSE_NOT_FOUND", 404, "Course not found");
    }

    const limit = Math.min(Math.max(options?.limit ?? 10, 1), 50);
    const conditions: any[] = [eq(reviews.courseId, course.id)];
    if (options?.cursor) {
      conditions.push(lt(reviews.createdAt, options.cursor));
    }

    const rows = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        studentId: users.id,
        studentName: users.fullName,
        studentAvatar: users.avatarUrl,
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.studentId, users.id))
      .where(and(...conditions))
      .orderBy(desc(reviews.createdAt))
      .limit(limit + 1);

    const hasNext = rows.length > limit;
    const items = hasNext ? rows.slice(0, limit) : rows;

    const data: CourseReviewItem[] = items.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt || new Date().toISOString(),
      student: {
        id: r.studentId || "",
        fullName: r.studentName || "Student",
        avatarUrl: r.studentAvatar || null,
      },
    }));

    const nextCursor = hasNext && data.length > 0 ? data[data.length - 1].createdAt : undefined;

    return {
      data,
      meta: {
        hasNext,
        nextCursor,
      },
    };
  }
}

export const courseService = new CourseService();



