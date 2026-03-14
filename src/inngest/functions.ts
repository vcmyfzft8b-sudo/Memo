import { inngest } from "@/inngest/client";
import { runLecturePipeline } from "@/lib/pipeline";

export const processLectureFunction = inngest.createFunction(
  { id: "process-lecture" },
  { event: "lecture/process.requested" },
  async ({ event, step }) => {
    await step.run("process-lecture", async () => {
      await runLecturePipeline({
        lectureId: event.data.lectureId,
      });
    });
  },
);
