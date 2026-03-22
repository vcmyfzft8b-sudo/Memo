"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import type { ThemePreference } from "@/lib/theme";
import {
  applyTheme,
  readStoredThemePreference,
  subscribeToThemePreference,
} from "@/lib/theme";

const OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "system",
    label: "System",
    icon: Monitor,
  },
  {
    value: "light",
    label: "Light",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
  },
];

export function ThemeSettings() {
  const preference = useSyncExternalStore(
    subscribeToThemePreference,
    readStoredThemePreference,
    () => "system",
  );

  function updatePreference(next: ThemePreference) {
    if (next === preference) {
      return;
    }

    applyTheme(next);
  }

  return (
    <div className="theme-choice-grid">
      {OPTIONS.map((option) => {
        const active = preference === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => updatePreference(option.value)}
            aria-pressed={active}
            className={`dashboard-link-card settings-link-card theme-choice-card ${active ? "active" : ""}`}
          >
            <span className="note-action-card-icon">
              <option.icon className="h-5 w-5" />
            </span>
            <span className="note-action-card-copy">
              <span className="note-action-card-label">{option.label}</span>
            </span>
            <Check
              className={`theme-choice-check h-4 w-4 ${active ? "" : "opacity-0"}`}
            />
          </button>
        );
      })}
    </div>
  );
}
