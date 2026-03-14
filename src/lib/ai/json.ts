import "server-only";

import { z } from "zod";

import { getOpenAiClient } from "@/lib/ai/openai";
import { getServerEnv } from "@/lib/server-env";
import { safeJsonParse } from "@/lib/utils";

export async function generateStructuredObject<TSchema extends z.ZodTypeAny>(params: {
  schema: TSchema;
  instructions: string;
  input: string;
}) {
  const env = getServerEnv();
  const openai = getOpenAiClient();

  const response = await openai.responses.create({
    model: env.OPENAI_TEXT_MODEL,
    instructions: `${params.instructions}\n\nReturn valid JSON only. Do not wrap the JSON in markdown.`,
    input: params.input,
  });

  return params.schema.parse(safeJsonParse(response.output_text));
}
