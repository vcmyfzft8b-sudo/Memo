import "server-only";

import type { User } from "@supabase/supabase-js";

import type {
  ChatMessageRow,
  Citation,
  LectureArtifactRow,
  LectureRow,
  TranscriptSegmentRow,
} from "@/lib/database.types";
import type { AppLectureListItem, ChatMessageWithCitations, LectureDetail } from "@/lib/types";
import { createSupabaseServerClient, createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function parseCitations(value: ChatMessageRow["citations_json"]): Citation[] {
  return Array.isArray(value) ? (value as unknown as Citation[]) : [];
}

function mapChatMessage(message: ChatMessageRow): ChatMessageWithCitations {
  return {
    ...message,
    citations: parseCitations(message.citations_json),
  };
}

export async function listLecturesForUser(userId: string): Promise<AppLectureListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("lectures")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as LectureRow[];
}

export async function getLectureDetailForUser(params: {
  lectureId: string;
  userId: string;
}): Promise<LectureDetail | null> {
  const supabase = await createSupabaseServerClient();
  const service = createSupabaseServiceRoleClient();

  const { data: lecture, error: lectureError } = await supabase
    .from("lectures")
    .select("*")
    .eq("id", params.lectureId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (lectureError) {
    throw lectureError;
  }

  if (!lecture) {
    return null;
  }

  const lectureRow = lecture as LectureRow;

  const [{ data: artifact, error: artifactError }, { data: transcript, error: transcriptError }, { data: chatMessages, error: chatError }] =
    await Promise.all([
      supabase
        .from("lecture_artifacts")
        .select("*")
        .eq("lecture_id", lectureRow.id)
        .maybeSingle(),
      supabase
        .from("transcript_segments")
        .select("*")
        .eq("lecture_id", lectureRow.id)
        .order("idx", { ascending: true }),
      supabase
        .from("chat_messages")
        .select("*")
        .eq("lecture_id", lectureRow.id)
        .order("created_at", { ascending: true }),
    ]);

  if (artifactError) {
    throw artifactError;
  }

  if (transcriptError) {
    throw transcriptError;
  }

  if (chatError) {
    throw chatError;
  }

  let audioUrl: string | null = null;

  if (lectureRow.storage_path) {
    const { data: signed } = await service.storage
      .from("lecture-audio")
      .createSignedUrl(lectureRow.storage_path, 60 * 60);

    audioUrl = signed?.signedUrl ?? null;
  }

  return {
    lecture: lectureRow,
    artifact: artifact as LectureArtifactRow | null,
    transcript: (transcript ?? []) as TranscriptSegmentRow[],
    chatMessages: (chatMessages ?? []).map(mapChatMessage),
    audioUrl,
  };
}

export async function ensureUserOwnsLecture(params: {
  lectureId: string;
  user: User;
}): Promise<LectureRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("lectures")
    .select("*")
    .eq("id", params.lectureId)
    .eq("user_id", params.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as LectureRow | null;
}
