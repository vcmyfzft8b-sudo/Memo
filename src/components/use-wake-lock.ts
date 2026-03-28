"use client";

import { useEffect, useRef } from "react";

type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
  removeEventListener?: (type: "release", listener: () => void) => void;
};

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!active || typeof window === "undefined") {
      return;
    }

    let cancelled = false;

    const releaseSentinel = async () => {
      const sentinel = sentinelRef.current;

      if (!sentinel || sentinel.released) {
        return;
      }

      await sentinel.release().catch(() => undefined);
      sentinelRef.current = null;
    };

    const requestWakeLock = async () => {
      const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;

      if (!wakeLock) {
        return;
      }

      try {
        const sentinel = await wakeLock.request("screen");

        if (cancelled) {
          await sentinel.release().catch(() => undefined);
          return;
        }

        sentinelRef.current = sentinel;
      } catch {
        sentinelRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && active) {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void releaseSentinel();
    };
  }, [active]);
}
