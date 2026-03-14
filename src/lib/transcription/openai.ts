import "server-only";

import type { TranscriptionDiarized } from "openai/resources/audio/transcriptions";

import { getOpenAiClient } from "@/lib/ai/openai";
import { getServerEnv } from "@/lib/server-env";
import type { TranscriptResult } from "@/lib/types";
import type { TranscriptionProvider } from "@/lib/transcription/types";

function fallbackSegments(text: string, durationSeconds: number): TranscriptResult["segments"] {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const slice = Math.max(1, Math.floor((durationSeconds * 1000) / Math.max(parts.length, 1)));

  return parts.map((part, index) => ({
    idx: index,
    startMs: index * slice,
    endMs: (index + 1) * slice,
    speakerLabel: null,
    text: part,
  }));
}

export class OpenAiTranscriptionProvider implements TranscriptionProvider {
  async transcribe(input: {
    file: File;
    languageHint: string | null;
  }): Promise<TranscriptResult> {
    const openai = getOpenAiClient();
    const env = getServerEnv();

    const transcription = (await openai.audio.transcriptions.create({
      file: input.file,
      model: env.OPENAI_TRANSCRIPTION_MODEL,
      language: input.languageHint ?? "sl",
      response_format: "diarized_json",
    })) as TranscriptionDiarized;

    const segments =
      transcription.segments?.map((segment, index) => ({
        idx: index,
        startMs: Math.round(segment.start * 1000),
        endMs: Math.round(segment.end * 1000),
        speakerLabel: segment.speaker ?? null,
        text: segment.text.trim(),
      })) ?? [];

    return {
      text: transcription.text,
      durationSeconds: Math.round(transcription.duration),
      segments:
        segments.length > 0
          ? segments
          : fallbackSegments(
              transcription.text,
              Math.round(transcription.duration || 0),
            ),
    };
  }
}
