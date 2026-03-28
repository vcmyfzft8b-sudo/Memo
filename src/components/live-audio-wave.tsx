"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const BAR_COUNT = 20;

function createFallbackLevels(seed: number) {
  return Array.from({ length: BAR_COUNT }, (_, index) => {
    const phase = seed / 220 + index * 0.85;
    return 0.3 + ((Math.sin(phase) + 1) / 2) * 0.5;
  });
}

export function LiveAudioWave({
  stream,
  active,
  className,
}: {
  stream: MediaStream | null;
  active: boolean;
  className?: string;
}) {
  const [levels, setLevels] = useState<number[]>(() => Array(BAR_COUNT).fill(0.12));
  const frameRef = useRef<number | null>(null);
  const renderedLevels = active ? levels : Array(BAR_COUNT).fill(0.12);

  useEffect(() => {
    if (!active) {
      return;
    }

    if (!stream) {
      let fallbackTick = 0;

      const renderFallback = () => {
        fallbackTick += 1;
        setLevels(createFallbackLevels(fallbackTick));
        frameRef.current = window.requestAnimationFrame(renderFallback);
      };

      frameRef.current = window.requestAnimationFrame(renderFallback);

      return () => {
        if (frameRef.current) {
          window.cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
      };
    }

    const AudioContextCtor =
      window.AudioContext ||
      ((window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
        null);

    if (!AudioContextCtor) {
      return;
    }

    const audioContext = new AudioContextCtor();
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);

    const renderFrame = () => {
      analyser.getByteFrequencyData(frequencyData);

      const bucketSize = Math.max(1, Math.floor(frequencyData.length / BAR_COUNT));
      const nextLevels = Array.from({ length: BAR_COUNT }, (_, index) => {
        const start = index * bucketSize;
        const end =
          index === BAR_COUNT - 1
            ? frequencyData.length
            : Math.min(frequencyData.length, start + bucketSize);

        let total = 0;

        for (let cursor = start; cursor < end; cursor += 1) {
          total += frequencyData[cursor] ?? 0;
        }

        const average = total / Math.max(1, end - start);
        return 0.16 + Math.min(0.84, average / 255);
      });

      setLevels(nextLevels);
      frameRef.current = window.requestAnimationFrame(renderFrame);
    };

    const start = async () => {
      if (audioContext.state === "suspended") {
        await audioContext.resume().catch(() => undefined);
      }

      renderFrame();
    };

    void start();

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      source.disconnect();
      void audioContext.close().catch(() => undefined);
    };
  }, [active, stream]);

  return (
    <div
      aria-hidden="true"
      className={cn("flex h-16 items-end justify-center gap-1.5", className)}
    >
      {renderedLevels.map((level, index) => (
        <span
          key={index}
          className="block w-1.5 rounded-full bg-current shadow-[0_0_18px_rgba(255,255,255,0.18)] transition-[height,transform,opacity] duration-75 ease-out will-change-[height,transform]"
          style={{
            height: `${Math.round(level * 100)}%`,
            opacity: 0.42 + level * 0.58,
            transform: `scaleY(${0.92 + level * 0.2})`,
          }}
        />
      ))}
    </div>
  );
}
