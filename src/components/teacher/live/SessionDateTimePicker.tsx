"use client";

import React, { useState, useEffect } from "react";
import { Clock, Calendar as CalendarIcon, Sparkles } from "lucide-react";

interface SessionDateTimePickerProps {
  value: string; // ISO 8601 string
  onChange: (isoString: string) => void;
  error?: string;
}

export const SessionDateTimePicker: React.FC<SessionDateTimePickerProps> = ({
  value,
  onChange,
  error,
}) => {
  // Format to local YYYY-MM-DDTHH:mm for datetime-local input
  const formatForInput = (isoDate: string) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}`;
  };

  const [localInputVal, setLocalInputVal] = useState(formatForInput(value));

  // Compute minimum date (1 hour from now)
  const minDate = new Date(Date.now() + 60 * 60 * 1000);
  const minInputVal = formatForInput(minDate.toISOString());

  useEffect(() => {
    if (value) {
      setLocalInputVal(formatForInput(value));
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalInputVal(val);
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        onChange(d.toISOString());
      }
    }
  };

  const applyPreset = (presetType: "1h" | "tomorrow-morning" | "tomorrow-evening" | "weekend") => {
    const now = new Date();
    let target = new Date();

    if (presetType === "1h") {
      target = new Date(now.getTime() + 65 * 60 * 1000); // 1h 5m from now
    } else if (presetType === "tomorrow-morning") {
      target.setDate(target.getDate() + 1);
      target.setHours(10, 0, 0, 0);
    } else if (presetType === "tomorrow-evening") {
      target.setDate(target.getDate() + 1);
      target.setHours(18, 0, 0, 0);
    } else if (presetType === "weekend") {
      const day = now.getDay();
      const daysUntilSaturday = (6 - day + 7) % 7 || 7;
      target.setDate(target.getDate() + daysUntilSaturday);
      target.setHours(11, 0, 0, 0);
    }

    setLocalInputVal(formatForInput(target.toISOString()));
    onChange(target.toISOString());
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <CalendarIcon className="h-3.5 w-3.5 text-indigo-400" />
          Scheduled Date & Time (IST / Local Time)
        </label>
        <span className="text-[11px] text-muted-foreground/80">Min 1 hour lead time</span>
      </div>

      <div className="relative">
        <input
          type="datetime-local"
          value={localInputVal}
          min={minInputVal}
          onChange={handleInputChange}
          className={`w-full rounded-xl border bg-card/60 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-inner ${
            error ? "border-rose-500" : "border-border/60"
          }`}
        />
      </div>

      {error && <p className="text-xs text-rose-400 font-medium">{error}</p>}

      {/* Quick Schedule Presets */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] text-muted-foreground/70 flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-indigo-400" /> Presets:
        </span>
        <button
          type="button"
          onClick={() => applyPreset("1h")}
          className="px-2.5 py-1 rounded-lg border border-border/50 bg-white/5 hover:bg-white/10 text-xs text-muted-foreground hover:text-foreground transition"
        >
          +1 Hour
        </button>
        <button
          type="button"
          onClick={() => applyPreset("tomorrow-morning")}
          className="px-2.5 py-1 rounded-lg border border-border/50 bg-white/5 hover:bg-white/10 text-xs text-muted-foreground hover:text-foreground transition"
        >
          Tomorrow 10:00 AM
        </button>
        <button
          type="button"
          onClick={() => applyPreset("tomorrow-evening")}
          className="px-2.5 py-1 rounded-lg border border-border/50 bg-white/5 hover:bg-white/10 text-xs text-muted-foreground hover:text-foreground transition"
        >
          Tomorrow 6:00 PM
        </button>
        <button
          type="button"
          onClick={() => applyPreset("weekend")}
          className="px-2.5 py-1 rounded-lg border border-border/50 bg-white/5 hover:bg-white/10 text-xs text-muted-foreground hover:text-foreground transition"
        >
          Saturday 11:00 AM
        </button>
      </div>
    </div>
  );
};
