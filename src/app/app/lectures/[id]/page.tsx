import { notFound } from "next/navigation";

import { LectureWorkspace } from "@/components/lecture-workspace";
import { requireUser } from "@/lib/auth";
import { getLectureDetailForUser } from "@/lib/lectures";

export default async function LecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const detail = await getLectureDetailForUser({
    lectureId: id,
    userId: user.id,
  });

  if (!detail) {
    notFound();
  }

  return <LectureWorkspace initialDetail={detail} />;
}
