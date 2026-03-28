import { NextResponse } from "next/server";
import { z } from "zod";

import {
  MAX_PRACTICE_TEST_IMAGE_BYTES,
  PRACTICE_TEST_ANSWER_BUCKET,
} from "@/lib/constants";
import { ensureUserOwnsLecture } from "@/lib/lectures";
import { parseFormDataRequest } from "@/lib/request-validation";
import { enforceRateLimit, rateLimitPresets } from "@/lib/rate-limit";
import { buildPracticeTestAnswerStoragePath } from "@/lib/storage";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const paramsSchema = z.object({
  id: z.string().uuid(),
  attemptId: z.string().uuid(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; attemptId: string }> },
) {
  const server = await createSupabaseServerClient();
  const {
    data: { user },
  } = await server.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await enforceRateLimit({
    request,
    route: "api:lectures:practice-test:photo:post",
    rules: rateLimitPresets.expensiveMutate,
    userId: user.id,
  });

  if (limited) {
    return limited;
  }

  const parsedParams = paramsSchema.safeParse(await context.params);

  if (!parsedParams.success) {
    return NextResponse.json({ error: "Invalid params." }, { status: 400 });
  }

  const lecture = await ensureUserOwnsLecture({
    lectureId: parsedParams.data.id,
    user,
  });

  if (!lecture) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = await parseFormDataRequest(request, {
    maxBytes: MAX_PRACTICE_TEST_IMAGE_BYTES + 16 * 1024,
  });

  if (!parsed.success) {
    return parsed.response;
  }

  const fileCandidate = parsed.data.get("file");
  const answerIdCandidate = parsed.data.get("answerId");
  const questionIndexCandidate = parsed.data.get("questionIndex");

  if (!(fileCandidate instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!fileCandidate.type.startsWith("image/")) {
    return NextResponse.json({ error: "Use an image file." }, { status: 400 });
  }

  if (fileCandidate.size > MAX_PRACTICE_TEST_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "The answer image is too large. The limit is 8 MB." },
      { status: 400 },
    );
  }

  if (typeof answerIdCandidate !== "string" || typeof questionIndexCandidate !== "string") {
    return NextResponse.json({ error: "Answer metadata is required." }, { status: 400 });
  }

  const questionIndex = Number.parseInt(questionIndexCandidate, 10);
  if (!Number.isInteger(questionIndex) || questionIndex < 0) {
    return NextResponse.json({ error: "Invalid question index." }, { status: 400 });
  }

  const service = createSupabaseServiceRoleClient();
  await service.storage
    .createBucket(PRACTICE_TEST_ANSWER_BUCKET, {
      public: false,
    })
    .catch(() => null);

  const { data: answer, error: answerError } = await service
    .from("practice_test_attempt_answers")
    .select("id, attempt_id")
    .eq("id", answerIdCandidate)
    .eq("attempt_id", parsedParams.data.attemptId)
    .single();

  if (answerError || !answer) {
    return NextResponse.json({ error: "Answer not found." }, { status: 404 });
  }

  const path = buildPracticeTestAnswerStoragePath({
    userId: user.id,
    lectureId: parsedParams.data.id,
    attemptId: parsedParams.data.attemptId,
    questionIndex,
    mimeType: fileCandidate.type || "image/jpeg",
  });

  const { error: uploadError } = await service.storage
    .from(PRACTICE_TEST_ANSWER_BUCKET)
    .upload(path, fileCandidate, {
      contentType: fileCandidate.type || "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: updateError } = await service
    .from("practice_test_attempt_answers")
    .update(
      {
        photo_path: path,
        photo_mime_type: fileCandidate.type || "image/jpeg",
      } as never,
    )
    .eq("id", answerIdCandidate)
    .eq("attempt_id", parsedParams.data.attemptId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { data: signed } = await service.storage
    .from(PRACTICE_TEST_ANSWER_BUCKET)
    .createSignedUrl(path, 60 * 60);

  return NextResponse.json({
    path,
    mimeType: fileCandidate.type || "image/jpeg",
    photoUrl: signed?.signedUrl ?? null,
  });
}
