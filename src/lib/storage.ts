import { STORAGE_BUCKET, SUPPORTED_AUDIO_MIME_TYPES } from "@/lib/constants";

const extensionMap = new Map<string, string>([
  ["audio/mpeg", "mp3"],
  ["audio/mp3", "mp3"],
  ["audio/mp4", "m4a"],
  ["audio/m4a", "m4a"],
  ["audio/aac", "aac"],
  ["audio/wav", "wav"],
  ["audio/webm", "webm"],
  ["audio/webm;codecs=opus", "webm"],
  ["audio/ogg", "ogg"],
  ["audio/ogg;codecs=opus", "ogg"],
]);

export function normalizeMimeType(mimeType: string) {
  return mimeType.toLowerCase().trim();
}

export function isSupportedAudioMimeType(mimeType: string) {
  return SUPPORTED_AUDIO_MIME_TYPES.includes(
    normalizeMimeType(mimeType) as (typeof SUPPORTED_AUDIO_MIME_TYPES)[number],
  );
}

export function getExtensionForMimeType(mimeType: string) {
  return extensionMap.get(normalizeMimeType(mimeType)) ?? "webm";
}

export function buildLectureStoragePath(params: {
  userId: string;
  lectureId: string;
  mimeType: string;
}) {
  const ext = getExtensionForMimeType(params.mimeType);
  return `${params.userId}/${params.lectureId}.${ext}`;
}

export function buildStorageObjectUrl(path: string) {
  return `${STORAGE_BUCKET}/${path}`;
}
