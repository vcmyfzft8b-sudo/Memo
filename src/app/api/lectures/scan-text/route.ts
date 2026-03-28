import { Buffer } from "node:buffer";

import type { ResponseInput } from "openai/resources/responses/responses";
import { z } from "zod";

import { generateStructuredObjectWithGeminiFile } from "@/lib/ai/gemini";
import { generateStructuredObject } from "@/lib/ai/json";
import { getAiProvider, getServerEnv } from "@/lib/server-env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_SCAN_IMAGE_BYTES = 10 * 1024 * 1024;

const scanTextSchema = z.object({
  text: z.string().min(1),
});

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "Attach an image first." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return Response.json({ error: "Use an image when scanning text." }, { status: 400 });
  }

  if (file.size > MAX_SCAN_IMAGE_BYTES) {
    return Response.json({ error: "The scanned image is too large. The limit is 10 MB." }, { status: 400 });
  }

  try {
    const instructions =
      "Extract all readable text from this image. Return only the text content in natural reading order. Preserve paragraph breaks when they are clear, but do not add commentary or summarize.";
    const provider = getAiProvider();

    const result =
      provider === "gemini"
        ? await generateStructuredObjectWithGeminiFile({
            schema: scanTextSchema,
            instructions,
            file,
            model: getServerEnv().GEMINI_TEXT_MODEL,
            maxOutputTokens: 4000,
          })
        : await generateStructuredObject({
            schema: scanTextSchema,
            instructions,
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: instructions,
                  },
                  {
                    type: "input_image",
                    image_url: `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`,
                    detail: "auto",
                  },
                ],
              },
            ] satisfies ResponseInput,
            maxOutputTokens: 4000,
          });

    return Response.json({
      text: result.text.trim(),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "The text could not be scanned.",
      },
      { status: 500 },
    );
  }
}
