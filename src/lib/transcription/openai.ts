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

const DIARIZATION_MODEL = "gpt-4o-transcribe-diarize";

function resolveTranscriptionModel(configuredModel: string) {
  return configuredModel.includes("diarize") ? configuredModel : DIARIZATION_MODEL;
}

export class OpenAiTranscriptionProvider implements TranscriptionProvider {
  async transcribe(input: {
    file: File;
    languageHint: string | null;
    durationSeconds?: number | null;
  }): Promise<TranscriptResult> {
    const openai = getOpenAiClient();
    const env = getServerEnv();
    const model = resolveTranscriptionModel(env.OPENAI_TRANSCRIPTION_MODEL);

    const transcription = (await openai.audio.transcriptions.create({
      file: input.file,
      model,
      language: input.languageHint ?? "sl",
      response_format: "diarized_json",
      ...(input.durationSeconds && input.durationSeconds > 30
        ? { chunking_strategy: "auto" as const }
        : {}),
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
