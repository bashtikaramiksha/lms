"use client";

import React, { useState } from "react";
import { Notification } from "@/lib/db/schema/notifications";
import { NotificationItem } from "./NotificationItem";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  loading,
  onMarkAllRead,
  onMarkRead,
  onClose,
}) => {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const displayedList =
    filter === "unread" ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="w-80 sm:w-96 rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden flex flex-col max-h-[480px] animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="p-4 border-b border-border/60 flex items-center justify-between gap-3 bg-background/40">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-500/15 flex items-center justify-center text-indigo-400">
            <Bell className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <span className="text-[10px] text-indigo-400 font-semibold">
                {unreadCount} unread
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition"
          >
            <CheckCheck className="h-3.5 w-3.5" /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-4 py-2 border-b border-border/40 flex items-center gap-2 bg-background/20">
        <button
          onClick={() => setFilter("all")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
            filter === "all"
              ? "bg-indigo-600 text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-card"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
            filter === "unread"
              ? "bg-indigo-600 text-white"
              : "text-muted-foreground hover:text-foreground hover:bg-card"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-border/20">
        {loading && notifications.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <Loader2 className="h-6 w-6 text-indigo-400 animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground">Checking notifications...</p>
          </div>
        ) : displayedList.length > 0 ? (
          displayedList.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
              onCloseDropdown={onClose}
            />
          ))
        ) : (
          <div className="py-12 text-center space-y-2">
            <div className="h-10 w-10 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground mx-auto">
              <Bell className="h-5 w-5 opacity-40" />
            </div>
            <p className="text-xs text-muted-foreground">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
