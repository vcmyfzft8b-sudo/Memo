import type { TranscriptSegmentInput } from "@/lib/types";

interface TranscriptWindow {
  startMs: number;
  endMs: number;
  text: string;
  segmentIndexes: number[];
}

function formatSegmentText(segment: TranscriptSegmentInput) {
  const label = segment.speakerLabel?.trim();

  if (!label) {
    return segment.text;
  }

  return `[${label}] ${segment.text}`;
}

export function buildTranscriptWindows(
  segments: TranscriptSegmentInput[],
  maxChars = 5000,
): TranscriptWindow[] {
  const windows: TranscriptWindow[] = [];

  let current: TranscriptWindow | null = null;

  for (const segment of segments) {
    if (!current) {
      current = {
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: formatSegmentText(segment),
        segmentIndexes: [segment.idx],
      };
      continue;
    }

    const activeWindow: TranscriptWindow = current;
    const nextText = `${activeWindow.text}\n${formatSegmentText(segment)}`;

    if (nextText.length > maxChars) {
      windows.push(activeWindow);
      current = {
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: formatSegmentText(segment),
        segmentIndexes: [segment.idx],
      };
      continue;
    }

    current = {
      startMs: activeWindow.startMs,
      endMs: segment.endMs,
      text: nextText,
      segmentIndexes: [...activeWindow.segmentIndexes, segment.idx],
    };
  }

  if (current) {
    windows.push(current);
  }

  return windows;
}
