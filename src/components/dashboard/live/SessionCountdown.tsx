"use client";

import React, { useState, useEffect } from "react";
import { Clock, Radio } from "lucide-react";

interface SessionCountdownProps {
  scheduledAt: string;
  status: "SCHEDULED" | "LIVE";
}

export const SessionCountdown: React.FC<SessionCountdownProps> = ({
  scheduledAt,
  status,
}) => {
  const [timeLeftStr, setTimeLeftStr] = useState("");
  const [isLiveOrDue, setIsLiveOrDue] = useState(status === "LIVE");

  useEffect(() => {
    const calculateTime = () => {
      if (status === "LIVE") {
        setIsLiveOrDue(true);
        setTimeLeftStr("Broadcast in progress");
        return;
      }

      const diff = new Date(scheduledAt).getTime() - Date.now();

      if (diff <= 0) {
        setIsLiveOrDue(true);
        setTimeLeftStr("Live now");
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const mins = Math.floor((totalSec % 3600) / 60);
      const secs = totalSec % 60;

      if (days > 0) {
        setTimeLeftStr(`Starts in ${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeftStr(`Starts in ${hours}h ${mins}m`);
      } else if (mins > 0) {
        setTimeLeftStr(`Starts in ${mins}m ${secs}s`);
      } else {
        setTimeLeftStr(`Starts in ${secs}s`);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [scheduledAt, status]);

  if (isLiveOrDue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-rose-400">
        <Radio className="h-3.5 w-3.5 animate-pulse" />
        {timeLeftStr}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      <Clock className="h-3.5 w-3.5 text-indigo-400" />
      {timeLeftStr}
    </span>
  );
};
