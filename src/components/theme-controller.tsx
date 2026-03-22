"use client";

import { useEffect } from "react";

import {
  applyTheme,
  readStoredThemePreference,
  subscribeToThemePreference,
} from "@/lib/theme";

export function ThemeController() {
  useEffect(() => {
    function syncTheme() {
      applyTheme(readStoredThemePreference());
    }

    syncTheme();
    return subscribeToThemePreference(syncTheme);
  }, []);

  return null;
}
