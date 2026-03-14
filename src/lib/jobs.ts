import "server-only";

import { inngest } from "@/inngest/client";
import { runLecturePipeline } from "@/lib/pipeline";
import { getServerEnv } from "@/lib/server-env";

export async function enqueueLectureProcessing(lectureId: string) {
  const env = getServerEnv();

  if (env.INNGEST_EVENT_KEY) {
    await inngest.send({
      name: "lecture/process.requested",
      data: { lectureId },
    });
    return;
  }

  void runLecturePipeline({ lectureId });
}
