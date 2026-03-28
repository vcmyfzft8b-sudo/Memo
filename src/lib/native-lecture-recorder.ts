"use client";

import {
  AudioSessionCategoryOption,
  AudioSessionMode,
  CapacitorAudioRecorder,
  RecordingStatus,
  type PermissionStatus,
} from "@capgo/capacitor-audio-recorder";
import { Capacitor } from "@capacitor/core";

import { getExtensionForMimeType, normalizeMimeType } from "@/lib/storage";
import {
  isNativePlatform,
  startNativeRecordingKeepAlive,
  stopNativeRecordingKeepAlive,
} from "@/lib/native-background-recording";

const NATIVE_RECORDING_STORAGE_KEY = "memo.native-recording.session";

type NativeRecordingSession = {
  startedAt: number;
};

function readStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(NATIVE_RECORDING_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<NativeRecordingSession>;

    if (typeof parsed.startedAt !== "number") {
      return null;
    }

    return {
      startedAt: parsed.startedAt,
    } satisfies NativeRecordingSession;
  } catch {
    return null;
  }
}

function writeStoredSession(session: NativeRecordingSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(NATIVE_RECORDING_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(NATIVE_RECORDING_STORAGE_KEY, JSON.stringify(session));
}

function getFileNameFromUri(uri: string, mimeType: string) {
  const cleanUri = uri.split("?")[0] ?? uri;
  const uriFileName = cleanUri.split("/").pop() ?? "";
  const extFromUri = uriFileName.includes(".")
    ? uriFileName.split(".").pop()?.toLowerCase()
    : null;

  if (extFromUri) {
    return `lecture-${Date.now()}.${extFromUri}`;
  }

  return `lecture-${Date.now()}.${getExtensionForMimeType(mimeType)}`;
}

async function readNativeRecordingFile(uri: string) {
  const fetchUrl = Capacitor.convertFileSrc(uri);
  const response = await fetch(fetchUrl);

  if (!response.ok) {
    throw new Error("The recorded audio could not be read from the device.");
  }

  const blob = await response.blob();
  const normalizedMimeType = normalizeMimeType(blob.type || "audio/mp4");
  const fileName = getFileNameFromUri(uri, normalizedMimeType);

  return new File([blob], fileName, {
    type: normalizedMimeType,
  });
}

async function ensureRecordingPermission() {
  const currentPermission = (await CapacitorAudioRecorder.checkPermissions()) as PermissionStatus;

  if (currentPermission.recordAudio === "granted") {
    return;
  }

  const requestedPermission =
    (await CapacitorAudioRecorder.requestPermissions()) as PermissionStatus;

  if (requestedPermission.recordAudio !== "granted") {
    throw new Error("Microphone permission not granted.");
  }
}

export function supportsNativeLectureRecording() {
  return isNativePlatform();
}

export function getNativeRecordingElapsedSeconds() {
  const session = readStoredSession();

  if (!session) {
    return 0;
  }

  return Math.max(0, Math.floor((Date.now() - session.startedAt) / 1000));
}

export async function getNativeRecordingResumeState() {
  if (!supportsNativeLectureRecording()) {
    return {
      isRecording: false,
      elapsedSeconds: 0,
    };
  }

  try {
    const { status } = await CapacitorAudioRecorder.getRecordingStatus();
    const isRecording =
      status === RecordingStatus.Recording || status === RecordingStatus.Paused;

    if (!isRecording) {
      writeStoredSession(null);
      return {
        isRecording: false,
        elapsedSeconds: 0,
      };
    }

    return {
      isRecording: true,
      elapsedSeconds: getNativeRecordingElapsedSeconds(),
    };
  } catch {
    return {
      isRecording: false,
      elapsedSeconds: 0,
    };
  }
}

export async function startNativeLectureRecording() {
  await ensureRecordingPermission();

  await CapacitorAudioRecorder.startRecording({
    audioSessionMode: AudioSessionMode.SpokenAudio,
    audioSessionCategoryOptions: [
      AudioSessionCategoryOption.AllowBluetooth,
      AudioSessionCategoryOption.DefaultToSpeaker,
      AudioSessionCategoryOption.DuckOthers,
    ],
    bitRate: 192_000,
    sampleRate: 44_100,
  });

  try {
    await startNativeRecordingKeepAlive();
  } catch (serviceError) {
    await CapacitorAudioRecorder.cancelRecording().catch(() => undefined);
    throw serviceError;
  }

  writeStoredSession({
    startedAt: Date.now(),
  });
}

export async function stopNativeLectureRecording() {
  const result = await CapacitorAudioRecorder.stopRecording();
  await stopNativeRecordingKeepAlive().catch(() => undefined);
  writeStoredSession(null);

  if (!result.uri) {
    throw new Error("The recorded audio file is missing.");
  }

  const file = await readNativeRecordingFile(result.uri);

  return {
    file,
    durationSeconds: Math.max(1, Math.round((result.duration ?? 0) / 1000)),
    previewUrl: URL.createObjectURL(file),
  };
}

export async function cancelNativeLectureRecording() {
  await CapacitorAudioRecorder.cancelRecording().catch(() => undefined);
  await stopNativeRecordingKeepAlive().catch(() => undefined);
  writeStoredSession(null);
}
