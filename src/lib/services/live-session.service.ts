import { db } from "@/lib/db/client";
import { liveSessions, courses, lessons, users, enrollments } from "@/lib/db/schema";
import { eq, and, desc, asc, count, inArray } from "drizzle-orm";
import { AppError } from "@/lib/services/course.service";
import { liveOAuthService, LiveOAuthService } from "@/lib/services/live-oauth.service";
import { zoomApiClient, ZoomApiClient } from "@/lib/integrations/zoom.client";
import { googleMeetApiClient, GoogleMeetApiClient } from "@/lib/integrations/google-meet.client";
import { inngest } from "@/lib/inngest";
import {
  CreateLiveSessionDto,
  UpdateLiveSessionDto,
  ListLiveSessionsQuery,
  LiveSessionResponseDto,
  StudentUpcomingSessionDto,
  StudentPastSessionDto,
  JoinUrlResponseDto,
} from "@/lib/validations/live.schema";
import crypto from "crypto";

export class LiveSessionService {
  constructor(
    private readonly liveOAuth: LiveOAuthService = liveOAuthService,
    private readonly zoom: ZoomApiClient = zoomApiClient,
    private readonly googleMeet: GoogleMeetApiClient = googleMeetApiClient
  ) {}

  /**
   * Schedules a live session for a course and provisions the Zoom/Meet meeting.
   */
  async createSession(
    dto: CreateLiveSessionDto,
    teacherId: string,
    role?: string
  ): Promise<LiveSessionResponseDto> {
    // 1. Verify Course Ownership
    const course = await db.query.courses.findFirst({
      where: eq(courses.id, dto.courseId),
    });

    if (!course || (course.authorId !== teacherId && role !== "ADMIN")) {
      throw new AppError("COURSE_NOT_FOUND", 404, "Course not found or unauthorized");
    }

    // 2. Provision meeting via third-party provider
    let joinUrl: string | null = null;
    let hostUrl: string | null = null;

    if (dto.platform === "ZOOM") {
      const zoomToken = await this.liveOAuth.getDecryptedZoomToken(teacherId);
      const teacher = await db.query.users.findFirst({
        where: eq(users.id, teacherId),
      });

      const meeting = await this.zoom.createMeeting(
        zoomToken,
        teacher?.zoomUserId || "me",
        {
          topic: dto.title,
          type: 2,
          start_time: dto.scheduledAt,
          duration: dto.duration,
          timezone: "Asia/Kolkata",
          settings: {
            waiting_room: false,
            join_before_host: false,
            mute_upon_entry: true,
          },
        }
      );

      joinUrl = meeting.join_url;
      hostUrl = meeting.start_url;
    } else if (dto.platform === "GOOGLE_MEET") {
      const googleToken = await this.liveOAuth.getDecryptedGoogleToken(teacherId);
      const startTime = new Date(dto.scheduledAt);
      const endTime = new Date(startTime.getTime() + dto.duration * 60 * 1000);

      const event = await this.googleMeet.createCalendarEvent(googleToken, {
        summary: dto.title,
        description: `Live lecture for course: ${course.title}`,
        start: { dateTime: startTime.toISOString(), timeZone: "Asia/Kolkata" },
        end: { dateTime: endTime.toISOString(), timeZone: "Asia/Kolkata" },
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      });

      joinUrl = event.hangoutLink;
      hostUrl = event.hangoutLink;
    } else {
      throw new AppError("INVALID_PLATFORM", 400, `Unsupported platform: ${dto.platform}`);
    }

    // 3. Persist Live Session into database
    const sessionId = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    await db.insert(liveSessions).values({
      id: sessionId,
      courseId: dto.courseId,
      lessonId: dto.lessonId || null,
      teacherId,
      title: dto.title,
      scheduledAt: dto.scheduledAt,
      duration: dto.duration,
      platform: dto.platform,
      joinUrl,
      hostUrl,
      status: "SCHEDULED",
      recordingUrl: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // 4. If linked to a lesson, update lesson type to LIVE_SESSION
    if (dto.lessonId) {
      await db
        .update(lessons)
        .set({
          type: "LIVE_SESSION",
          duration: dto.duration,
          title: dto.title,
          updatedAt: nowIso,
        })
        .where(eq(lessons.id, dto.lessonId));
    }

    // 5. Dispatch Inngest Event for background reminders & automation
    if (process.env.INNGEST_EVENT_KEY && process.env.INNGEST_EVENT_KEY !== "local-inngest-key") {
      try {
        await inngest.send({
          name: "live/session-created",
          data: {
            sessionId,
            teacherId,
            courseId: dto.courseId,
          },
        });
      } catch (inngestErr) {
        console.warn("Non-fatal: Inngest event dispatch failed:", inngestErr);
      }
    }

    return {
      id: sessionId,
      courseId: dto.courseId,
      lessonId: dto.lessonId || null,
      teacherId,
      title: dto.title,
      scheduledAt: dto.scheduledAt,
      duration: dto.duration,
      platform: dto.platform,
      joinUrl,
      hostUrl,
      status: "SCHEDULED",
      recordingUrl: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  /**
   * Retrieves teacher's sessions with pagination, filters, and enrolled student counts.
   */
  async getTeacherSessions(
    teacherId: string,
    options: Partial<ListLiveSessionsQuery> = {}
  ): Promise<{
    data: LiveSessionResponseDto[];
    meta: { total: number; page: number; limit: number; hasNext: boolean };
  }> {
    const conditions = [eq(liveSessions.teacherId, teacherId)];

    if (options.status) {
      conditions.push(eq(liveSessions.status, options.status));
    }
    if (options.courseId) {
      conditions.push(eq(liveSessions.courseId, options.courseId));
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(liveSessions)
      .where(whereClause);

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const rawSessions = await db.query.liveSessions.findMany({
      where: whereClause,
      orderBy: [desc(liveSessions.scheduledAt)],
      limit,
      offset,
      with: {
        course: true,
      },
    });

    // Compute enrolled student counts for the courses in this page
    const courseIds = Array.from(new Set(rawSessions.map((s) => s.courseId)));
    const enrollmentCounts: Record<string, number> = {};

    for (const cId of courseIds) {
      const [{ c }] = await db
        .select({ c: count() })
        .from(enrollments)
        .where(and(eq(enrollments.courseId, cId), eq(enrollments.status, "ACTIVE")));
      enrollmentCounts[cId] = c;
    }

    const formattedData: LiveSessionResponseDto[] = rawSessions.map((s) => ({
      id: s.id,
      courseId: s.courseId,
      lessonId: s.lessonId,
      teacherId: s.teacherId,
      title: s.title,
      scheduledAt: s.scheduledAt,
      duration: s.duration,
      platform: s.platform as "ZOOM" | "GOOGLE_MEET",
      joinUrl: s.joinUrl,
      hostUrl: s.hostUrl,
      status: s.status as "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED",
      recordingUrl: s.recordingUrl,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      course: s.course
        ? {
            id: s.course.id,
            title: s.course.title,
            slug: s.course.slug,
          }
        : undefined,
      enrolledCount: enrollmentCounts[s.courseId] || 0,
    }));

    return {
      data: formattedData,
      meta: {
        total,
        page,
        limit,
        hasNext: total > offset + limit,
      },
    };
  }

  /**
   * Retrieves a live session by ID.
   */
  async getSessionById(sessionId: string, teacherId?: string, role?: string): Promise<LiveSessionResponseDto> {
    const session = await db.query.liveSessions.findFirst({
      where: eq(liveSessions.id, sessionId),
      with: {
        course: true,
      },
    });

    if (!session) {
      throw new AppError("SESSION_NOT_FOUND", 404, "Live session not found");
    }

    if (teacherId && session.teacherId !== teacherId && role !== "ADMIN") {
      throw new AppError("SESSION_NOT_FOUND", 404, "Live session not found or unauthorized");
    }

    const [{ c }] = await db
      .select({ c: count() })
      .from(enrollments)
      .where(and(eq(enrollments.courseId, session.courseId), eq(enrollments.status, "ACTIVE")));

    return {
      id: session.id,
      courseId: session.courseId,
      lessonId: session.lessonId,
      teacherId: session.teacherId,
      title: session.title,
      scheduledAt: session.scheduledAt,
      duration: session.duration,
      platform: session.platform as "ZOOM" | "GOOGLE_MEET",
      joinUrl: session.joinUrl,
      hostUrl: session.hostUrl,
      status: session.status as "SCHEDULED" | "LIVE" | "ENDED" | "CANCELLED",
      recordingUrl: session.recordingUrl,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      course: session.course
        ? {
            id: session.course.id,
            title: session.course.title,
            slug: session.course.slug,
          }
        : undefined,
      enrolledCount: c,
    };
  }

  /**
   * Updates an existing session (reschedule, title, duration, recording URL).
   */
  async updateSession(
    sessionId: string,
    teacherId: string,
    dto: UpdateLiveSessionDto,
    role?: string
  ): Promise<LiveSessionResponseDto> {
    const session = await db.query.liveSessions.findFirst({
      where: eq(liveSessions.id, sessionId),
    });

    if (!session || (session.teacherId !== teacherId && role !== "ADMIN")) {
      throw new AppError("SESSION_NOT_FOUND", 404, "Session not found or unauthorized");
    }

    if (session.status === "ENDED" || session.status === "CANCELLED") {
      throw new AppError("SESSION_ALREADY_ENDED", 409, "Cannot edit an ended or cancelled session");
    }

    // Enforce 2-hour rescheduling lead time rule if scheduledAt is modified
    if (dto.scheduledAt && dto.scheduledAt !== session.scheduledAt) {
      const originalStartTime = new Date(session.scheduledAt).getTime();
      const twoHoursAhead = Date.now() + 2 * 60 * 60 * 1000;
      if (originalStartTime <= twoHoursAhead) {
        throw new AppError(
          "RESCHEDULE_TOO_LATE",
          422,
          "Cannot reschedule a session within 2 hours of its original start time"
        );
      }

      // Update third-party meeting time if tokens available
      if (session.platform === "ZOOM") {
        try {
          const zoomToken = await this.liveOAuth.getDecryptedZoomToken(teacherId);
          // Parse meeting ID from joinUrl or hostUrl
          const meetingIdMatch = session.joinUrl?.match(/zoom\.us\/j\/(\d+)/);
          if (meetingIdMatch && meetingIdMatch[1]) {
            await this.zoom.updateMeeting(zoomToken, meetingIdMatch[1], {
              topic: dto.title || session.title,
              start_time: dto.scheduledAt,
              duration: dto.duration || session.duration,
            });
          }
        } catch (err) {
          console.warn("Non-fatal: Zoom meeting update error:", err);
        }
      }
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      updatedAt: nowIso,
    };

    if (dto.title !== undefined) updatePayload.title = dto.title;
    if (dto.scheduledAt !== undefined) updatePayload.scheduledAt = dto.scheduledAt;
    if (dto.duration !== undefined) updatePayload.duration = dto.duration;
    if (dto.recordingUrl !== undefined) updatePayload.recordingUrl = dto.recordingUrl;

    await db.update(liveSessions).set(updatePayload).where(eq(liveSessions.id, sessionId));

    // Update lesson if attached
    if (session.lessonId && (dto.title || dto.duration)) {
      await db
        .update(lessons)
        .set({
          title: dto.title || session.title,
          duration: dto.duration || session.duration,
          updatedAt: nowIso,
        })
        .where(eq(lessons.id, session.lessonId));
    }

    return this.getSessionById(sessionId, teacherId, role);
  }

  /**
   * Cancels a scheduled session.
   */
  async cancelSession(sessionId: string, teacherId: string, role?: string): Promise<LiveSessionResponseDto> {
    const session = await db.query.liveSessions.findFirst({
      where: eq(liveSessions.id, sessionId),
    });

    if (!session || (session.teacherId !== teacherId && role !== "ADMIN")) {
      throw new AppError("SESSION_NOT_FOUND", 404, "Session not found or unauthorized");
    }

    if (session.status === "LIVE") {
      throw new AppError("SESSION_ALREADY_LIVE", 409, "Cannot cancel a session that is currently live");
    }

    const nowIso = new Date().toISOString();
    await db
      .update(liveSessions)
      .set({
        status: "CANCELLED",
        updatedAt: nowIso,
      })
      .where(eq(liveSessions.id, sessionId));

    // Dispatch Inngest Event for cancellation notifications
    if (process.env.INNGEST_EVENT_KEY && process.env.INNGEST_EVENT_KEY !== "local-inngest-key") {
      try {
        await inngest.send({
          name: "live/session-cancelled",
          data: { sessionId },
        });
      } catch (err) {
        console.warn("Non-fatal: Inngest cancellation event dispatch failed:", err);
      }
    }

    return this.getSessionById(sessionId, teacherId, role);
  }

  /**
   * Adds or updates the post-session recording URL.
   */
  async addRecordingUrl(
    sessionId: string,
    teacherId: string,
    recordingUrl: string,
    role?: string
  ): Promise<LiveSessionResponseDto> {
    const session = await db.query.liveSessions.findFirst({
      where: eq(liveSessions.id, sessionId),
    });

    if (!session || (session.teacherId !== teacherId && role !== "ADMIN")) {
      throw new AppError("SESSION_NOT_FOUND", 404, "Session not found or unauthorized");
    }

    const nowIso = new Date().toISOString();
    await db
      .update(liveSessions)
      .set({
        recordingUrl,
        updatedAt: nowIso,
      })
      .where(eq(liveSessions.id, sessionId));

    // Dispatch Inngest Event for recording notifications
    if (process.env.INNGEST_EVENT_KEY && process.env.INNGEST_EVENT_KEY !== "local-inngest-key") {
      try {
        await inngest.send({
          name: "live/recording-added",
          data: { sessionId },
        });
      } catch (err) {
        console.warn("Non-fatal: Inngest recording event dispatch failed:", err);
      }
    }

    return this.getSessionById(sessionId, teacherId, role);
  }

  /**
   * Retrieves upcoming live sessions for courses in which the student is actively enrolled.
   * joinUrl and hostUrl are explicitly excluded for security.
   */
  async getStudentUpcomingSessions(studentId: string): Promise<StudentUpcomingSessionDto[]> {
    const studentEnrollments = await db.query.enrollments.findMany({
      where: and(eq(enrollments.userId, studentId), eq(enrollments.status, "ACTIVE")),
    });

    if (!studentEnrollments || studentEnrollments.length === 0) {
      return [];
    }

    const enrolledCourseIds = studentEnrollments.map((e) => e.courseId);

    const upcomingSessions = await db.query.liveSessions.findMany({
      where: and(
        inArray(liveSessions.courseId, enrolledCourseIds),
        inArray(liveSessions.status, ["SCHEDULED", "LIVE"])
      ),
      orderBy: [asc(liveSessions.scheduledAt)],
      with: {
        course: true,
      },
    });

    const now = Date.now();

    return upcomingSessions.map((s) => {
      const scheduledTime = new Date(s.scheduledAt).getTime();
      const windowOpen = scheduledTime - 15 * 60 * 1000;
      const windowClose = scheduledTime + (s.duration + 15) * 60 * 1000;
      const canJoin = now >= windowOpen && now <= windowClose;

      return {
        id: s.id,
        title: s.title,
        scheduledAt: s.scheduledAt,
        duration: s.duration,
        platform: s.platform as "ZOOM" | "GOOGLE_MEET",
        status: s.status as "SCHEDULED" | "LIVE",
        course: {
          id: s.courseId,
          title: s.course?.title || "Untitled Course",
          slug: s.course?.slug || "",
        },
        canJoin,
        joinOpenAt: new Date(windowOpen).toISOString(),
      };
    });
  }

  /**
   * Retrieves past live sessions with recordings for courses in which the student is actively enrolled.
   */
  async getStudentPastSessions(studentId: string): Promise<StudentPastSessionDto[]> {
    const studentEnrollments = await db.query.enrollments.findMany({
      where: and(eq(enrollments.userId, studentId), eq(enrollments.status, "ACTIVE")),
    });

    if (!studentEnrollments || studentEnrollments.length === 0) {
      return [];
    }

    const enrolledCourseIds = studentEnrollments.map((e) => e.courseId);

    const pastSessions = await db.query.liveSessions.findMany({
      where: and(
        inArray(liveSessions.courseId, enrolledCourseIds),
        eq(liveSessions.status, "ENDED")
      ),
      orderBy: [desc(liveSessions.scheduledAt)],
      with: {
        course: true,
      },
    });

    return pastSessions
      .filter((s) => s.recordingUrl !== null && s.recordingUrl !== "")
      .map((s) => ({
        id: s.id,
        title: s.title,
        scheduledAt: s.scheduledAt,
        duration: s.duration,
        platform: s.platform as "ZOOM" | "GOOGLE_MEET",
        status: s.status as "ENDED" | "CANCELLED",
        recordingUrl: s.recordingUrl,
        course: {
          id: s.courseId,
          title: s.course?.title || "Untitled Course",
          slug: s.course?.slug || "",
        },
      }));
  }

  /**
   * Validates enrollment and timing window before returning meeting joinUrl.
   */
  async getJoinUrl(sessionId: string, studentId: string): Promise<JoinUrlResponseDto> {
    const session = await db.query.liveSessions.findFirst({
      where: eq(liveSessions.id, sessionId),
    });

    if (!session || session.status === "CANCELLED") {
      throw new AppError("SESSION_NOT_FOUND", 404, "Live session not found or cancelled");
    }

    if (session.status === "ENDED") {
      throw new AppError("SESSION_ENDED", 410, "This live session has already ended");
    }

    // 1. Verify Active Enrollment in associated course
    const enrollment = await db.query.enrollments.findFirst({
      where: and(
        eq(enrollments.userId, studentId),
        eq(enrollments.courseId, session.courseId),
        eq(enrollments.status, "ACTIVE")
      ),
    });

    if (!enrollment) {
      throw new AppError("NOT_ENROLLED", 403, "You must be actively enrolled in this course to join");
    }

    // 2. Validate Join Timing Window: [scheduledAt - 15m, scheduledAt + duration + 15m]
    const now = Date.now();
    const scheduledTime = new Date(session.scheduledAt).getTime();
    const windowOpen = scheduledTime - 15 * 60 * 1000;
    const windowClose = scheduledTime + (session.duration + 15) * 60 * 1000;

    if (now < windowOpen) {
      throw new AppError(
        "JOIN_WINDOW_NOT_OPEN",
        422,
        "Classroom opens 15 minutes before the scheduled start time"
      );
    }

    if (now > windowClose) {
      throw new AppError("SESSION_ENDED", 410, "This live session has concluded");
    }

    if (!session.joinUrl) {
      throw new AppError("MEETING_URL_MISSING", 500, "Meeting join URL is unavailable");
    }

    return {
      joinUrl: session.joinUrl,
      platform: session.platform as "ZOOM" | "GOOGLE_MEET",
      expiresAt: new Date(windowClose).toISOString(),
    };
  }
}

export const liveSessionService = new LiveSessionService();
