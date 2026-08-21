"use client";

import React from "react";
import { Clock } from "lucide-react";

interface DurationPickerProps {
  value: number; // minutes
  onChange: (duration: number) => void;
}

const PRESET_DURATIONS = [
  { label: "30 Min", value: 30 },
  { label: "45 Min", value: 45 },
  { label: "60 Min (1h)", value: 60 },
  { label: "90 Min (1.5h)", value: 90 },
  { label: "120 Min (2h)", value: 120 },
  { label: "180 Min (3h)", value: 180 },
];

export const DurationPicker: React.FC<DurationPickerProps> = ({ value, onChange }) => {
  const isCustom = !PRESET_DURATIONS.some((d) => d.value === value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-indigo-400" />
          Lecture Duration
        </label>
        <span className="text-xs font-semibold text-foreground">{value} Minutes</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {PRESET_DURATIONS.map((preset) => {
          const isSelected = value === preset.value;
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                isSelected
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-300 shadow-md shadow-indigo-500/10"
                  : "border-border/60 bg-card/40 hover:bg-card/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <span className="text-xs text-muted-foreground">Custom:</span>
        <input
          type="range"
          min={15}
          max={360}
          step={15}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          className="flex-1 accent-indigo-500 cursor-pointer"
        />
        <span className="text-xs font-mono font-bold text-foreground w-12 text-right">{value}m</span>
      </div>
    </div>
  );
};
