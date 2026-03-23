import "server-only";

import { getTranscriptionProviderName } from "@/lib/server-env";
import { OpenAiTranscriptionProvider } from "@/lib/transcription/openai";
import { GeminiTranscriptionProvider } from "@/lib/transcription/gemini";
import { SonioxTranscriptionProvider } from "@/lib/transcription/soniox";
import type { TranscriptionProvider } from "@/lib/transcription/types";

const openAiProvider = new OpenAiTranscriptionProvider();
const geminiProvider = new GeminiTranscriptionProvider();
const sonioxProvider = new SonioxTranscriptionProvider();

export function getTranscriptionProvider(): TranscriptionProvider {
  const provider = getTranscriptionProviderName();

  if (provider === "soniox") {
    return sonioxProvider;
  }

  return provider === "gemini" ? geminiProvider : openAiProvider;
}
