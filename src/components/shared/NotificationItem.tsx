"use client";

import React from "react";
import { Notification } from "@/lib/db/schema/notifications";
import { Calendar, Ban, PlaySquare, ShoppingBag, Bell } from "lucide-react";
import { useRouter } from "next/navigation";

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onCloseDropdown?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
  onCloseDropdown,
}) => {
  const router = useRouter();

  const getIcon = () => {
    switch (notification.type) {
      case "SESSION_REMINDER":
        return <Calendar className="h-4 w-4 text-indigo-400" />;
      case "SESSION_CANCELLED":
        return <Ban className="h-4 w-4 text-rose-400" />;
      case "RECORDING_AVAILABLE":
        return <PlaySquare className="h-4 w-4 text-purple-400" />;
      case "COURSE_PURCHASE":
        return <ShoppingBag className="h-4 w-4 text-emerald-400" />;
      default:
        return <Bell className="h-4 w-4 text-blue-400" />;
    }
  };

  const getRelativeTime = (isoString?: string | null) => {
    if (!isoString) return "";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diffMs / (60 * 1000));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleClick = async () => {
    if (!notification.isRead) {
      onMarkRead(notification.id);
      fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" }).catch(() => {});
    }

    if (notification.actionUrl) {
      if (onCloseDropdown) onCloseDropdown();
      router.push(notification.actionUrl);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 border ${
        notification.isRead
          ? "bg-card/30 border-transparent hover:bg-card/60"
          : "bg-indigo-500/5 border-indigo-500/20 hover:bg-indigo-500/10"
      }`}
    >
      <div className="h-8 w-8 rounded-xl bg-background/80 border border-border/40 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h5 className={`text-xs font-bold truncate ${notification.isRead ? "text-foreground/80" : "text-foreground"}`}>
            {notification.title}
          </h5>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {getRelativeTime(notification.createdAt)}
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {notification.body}
        </p>
      </div>

      {!notification.isRead && (
        <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5 shadow-sm shadow-indigo-500" />
      )}
    </div>
  );
};
