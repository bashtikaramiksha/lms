import { db } from "@/lib/db/client";
import { notifications, Notification, NotificationType } from "@/lib/db/schema/notifications";
import { eq, and, desc, count } from "drizzle-orm";
import { AppError } from "@/lib/services/course.service";
import crypto from "crypto";

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl?: string | null;
}

export interface GetNotificationsQuery {
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

export class NotificationService {
  /**
   * Inserts an in-app notification row for a specific user.
   */
  async createNotification(dto: CreateNotificationDto): Promise<Notification> {
    const id = crypto.randomUUID();
    const nowIso = new Date().toISOString();

    const [created] = await db
      .insert(notifications)
      .values({
        id,
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        body: dto.body,
        actionUrl: dto.actionUrl || null,
        isRead: false,
        createdAt: nowIso,
      })
      .returning();

    return created;
  }

  /**
   * Retrieves paginated notifications scoped to the requesting user.
   */
  async getUserNotifications(
    userId: string,
    options: GetNotificationsQuery = { page: 1, limit: 20 }
  ): Promise<{
    data: Notification[];
    meta: {
      unreadCount: number;
      total: number;
      page: number;
      limit: number;
      hasNext: boolean;
    };
  }> {
    const conditions = [eq(notifications.userId, userId)];

    if (options.unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const whereClause = and(...conditions);

    // Total count for current query filter
    const [{ total }] = await db
      .select({ total: count() })
      .from(notifications)
      .where(whereClause);

    // Total unread count for user (regardless of pagination or filter)
    const [{ unreadCount }] = await db
      .select({ unreadCount: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const data = await db.query.notifications.findMany({
      where: whereClause,
      orderBy: [desc(notifications.createdAt)],
      limit,
      offset,
    });

    return {
      data,
      meta: {
        unreadCount,
        total,
        page,
        limit,
        hasNext: total > offset + limit,
      },
    };
  }

  /**
   * Fast count of unread notifications for navigation badge.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const [{ unreadCount }] = await db
      .select({ unreadCount: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return unreadCount;
  }

  /**
   * Marks a specific notification as read.
   */
  async markNotificationAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await db.query.notifications.findFirst({
      where: and(eq(notifications.id, id), eq(notifications.userId, userId)),
    });

    if (!notification) {
      throw new AppError("NOTIFICATION_NOT_FOUND", 404, "Notification not found or unauthorized");
    }

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();

    return updated;
  }

  /**
   * Marks all unread notifications for a user as read.
   */
  async markAllNotificationsAsRead(userId: string): Promise<{ markedRead: number }> {
    const unreadList = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    if (unreadList.length > 0) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
    }

    return { markedRead: unreadList.length };
  }
}

export const notificationService = new NotificationService();
