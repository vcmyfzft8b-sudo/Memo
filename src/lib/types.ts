import type {
  ChatMessageRow,
  Citation,
  LectureArtifactRow,
  LectureRow,
  ProfileRow,
  TranscriptSegmentRow,
} from "@/lib/database.types";

export interface AppLectureListItem extends LectureRow {
  profile?: ProfileRow | null;
}

export interface LectureDetail {
  lecture: LectureRow;
  artifact: LectureArtifactRow | null;
  transcript: TranscriptSegmentRow[];
  chatMessages: ChatMessageWithCitations[];
  audioUrl: string | null;
}

export interface ChatMessageWithCitations extends Omit<ChatMessageRow, "citations_json"> {
  citations: Citation[];
}

export interface CreateLectureResponse {
  lectureId: string;
  path: string;
  token: string;
}

export interface NoteGenerationResult {
  title: string;
  summary: string;
  keyTopics: string[];
  structuredNotesMd: string;
  modelMetadata: Record<string, unknown>;
}

export interface TranscriptSegmentInput {
  idx: number;
  startMs: number;
  endMs: number;
  speakerLabel: string | null;
  text: string;
}

export interface TranscriptResult {
  text: string;
  durationSeconds: number;
  segments: TranscriptSegmentInput[];
}
