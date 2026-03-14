import "server-only";

import OpenAI from "openai";

import { getServerEnv } from "@/lib/server-env";

let openaiClient: OpenAI | undefined;

export function getOpenAiClient() {
  if (!openaiClient) {
    const env = getServerEnv();
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}
