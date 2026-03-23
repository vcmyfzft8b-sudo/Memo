import "server-only";

import { SonioxNodeClient } from "@soniox/node";

import { normalizeNoteLanguage } from "@/lib/languages";
import { requireSonioxEnv } from "@/lib/server-env";
import type { TranscriptResult } from "@/lib/types";
import type { TranscriptionProvider } from "@/lib/transcription/types";

const SONIOX_WAIT_TIMEOUT_MS = 240_000;
const SONIOX_WAIT_INTERVAL_MS = 2_000;

let sonioxClient: SonioxNodeClient | undefined;

function getSonioxClient() {
  if (!sonioxClient) {
    const env = requireSonioxEnv();
    sonioxClient = new SonioxNodeClient({
      api_key: env.SONIOX_API_KEY,
    });
  }

  return sonioxClient;
}

function resolveLanguageHints(languageHint: string | null) {
  const normalized = normalizeNoteLanguage(languageHint);
  return normalized ? [normalized] : ["sl"];
}

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

function toDurationSeconds(durationSeconds?: number | null, text = "") {
  const safeDuration = Math.round(durationSeconds ?? 0);
  return safeDuration > 0 ? safeDuration : Math.max(1, Math.ceil(text.split(/\s+/).length / 2.5));
}

export class SonioxTranscriptionProvider implements TranscriptionProvider {
  async transcribe(input: {
    file: File;
    languageHint: string | null;
    durationSeconds?: number | null;
  }) {
    const env = requireSonioxEnv();
    const client = getSonioxClient();
    const bytes = Buffer.from(await input.file.arrayBuffer());
    const transcription = await client.stt.transcribe({
      model: env.SONIOX_MODEL,
      file: bytes,
      filename: input.file.name || "lecture-audio",
      language_hints: resolveLanguageHints(input.languageHint),
      language_hints_strict: true,
      enable_speaker_diarization: true,
      enable_language_identification: !input.languageHint,
      wait: true,
      wait_options: {
        interval_ms: SONIOX_WAIT_INTERVAL_MS,
        timeout_ms: SONIOX_WAIT_TIMEOUT_MS,
      },
      cleanup: ["file", "transcription"],
    });

    if (transcription.status !== "completed") {
      throw new Error(
        transcription.error_message || `Soniox transcription failed with status ${transcription.status}.`,
      );
    }

    const transcript = transcription.transcript ?? (await transcription.getTranscript());

    if (!transcript || transcript.text.trim().length === 0) {
      throw new Error("Soniox transcription returned an empty transcript.");
    }

    const segments = transcript
      .segments({ group_by: ["speaker", "language"] })
      .map((segment, index) => ({
        idx: index,
        startMs: segment.start_ms,
        endMs: Math.max(segment.end_ms, segment.start_ms),
        speakerLabel: segment.speaker ?? null,
        text: segment.text.trim(),
      }))
      .filter((segment) => segment.text.length > 0);

    const durationSeconds = toDurationSeconds(
      transcription.audio_duration_ms != null
        ? transcription.audio_duration_ms / 1000
        : input.durationSeconds,
      transcript.text,
    );

    return {
      text: transcript.text.trim(),
      durationSeconds,
      segments:
        segments.length > 0
          ? segments
          : fallbackSegments(transcript.text.trim(), durationSeconds),
    };
  }
}
