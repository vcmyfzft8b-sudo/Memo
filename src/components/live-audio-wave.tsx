"use client";

import { cn } from "@/lib/utils";

export function LiveAudioWave({
  active,
  className,
}: {
  stream: MediaStream | null;
  active: boolean;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex items-center justify-center", className)}
    >
      <div className="inline-flex min-h-16 items-center justify-center rounded-full px-6 py-4">
        <span className="relative flex h-5 w-5 items-center justify-center">
          <span
            className={cn(
              "absolute h-5 w-5 rounded-full bg-red-500/22 transition-opacity duration-300",
              active ? "animate-ping opacity-100" : "opacity-0",
            )}
          />
          <span
            className={cn(
              "absolute h-3 w-3 rounded-full bg-red-500 shadow-[0_0_14px_rgba(239,68,68,0.55)] transition-all duration-300",
              active ? "scale-100 opacity-100" : "scale-75 opacity-35",
            )}
          />
        </span>
      </div>
    </div>
  );
}
