"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import type { FFFSType } from "@ffmpeg/ffmpeg";

import {
  buildChunkWindows,
  CLIENT_AUDIO_CHUNK_FALLBACK_MIME_TYPE,
} from "@/lib/audio-processing";
import {
  getExtensionForMimeType,
  normalizeUploadAudioMimeType,
} from "@/lib/storage";

type PreparedAudioChunk = {
  index: number;
  file: File;
  startMs: number;
  endMs: number;
  durationSeconds: number;
  mimeType: string;
};

let ffmpegPromise: Promise<FFmpeg> | null = null;
const WORKER_FS_TYPE = "WORKERFS" as FFFSType;
const COPYABLE_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp4",
  "audio/m4a",
  "audio/aac",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/opus",
  "audio/flac",
  "audio/aiff",
  "audio/x-caf",
]);

function resolveChunkOutputFormat(file: File) {
  const normalizedMimeType = normalizeUploadAudioMimeType({
    mimeType: file.type || "application/octet-stream",
    fileName: file.name,
  });

  if (COPYABLE_AUDIO_MIME_TYPES.has(normalizedMimeType)) {
    return {
      mimeType: normalizedMimeType,
      extension: getExtensionForMimeType(normalizedMimeType),
      codecArgs: ["-c:a", "copy"],
    };
  }

  return {
    mimeType: CLIENT_AUDIO_CHUNK_FALLBACK_MIME_TYPE,
    extension: getExtensionForMimeType(CLIENT_AUDIO_CHUNK_FALLBACK_MIME_TYPE),
    codecArgs: ["-ac", "1", "-ar", "16000", "-b:a", "48k", "-c:a", "libmp3lame"],
  };
}

async function getFfmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ffmpeg = new FFmpeg();
      const coreBaseUrl = "/vendor/ffmpeg";

      await ffmpeg.load({
        coreURL: `${coreBaseUrl}/ffmpeg-core.js`,
        wasmURL: `${coreBaseUrl}/ffmpeg-core.wasm`,
      });

      return ffmpeg;
    })();
  }

  return ffmpegPromise;
}

export async function createAudioProcessingChunks(params: {
  file: File;
  durationSeconds: number;
  onProgress?: (message: string) => void;
  signal?: AbortSignal;
}) {
  const ffmpeg = await getFfmpeg();
  const inputDirectory = `/input-${crypto.randomUUID()}`;
  const outputDirectory = `/output-${crypto.randomUUID()}`;
  const mountedInputFileName = params.file.name || `lecture-${Date.now()}.bin`;
  const windows = buildChunkWindows(params.durationSeconds);
  const chunks: PreparedAudioChunk[] = [];
  const outputFormat = resolveChunkOutputFormat(params.file);

  const assertNotAborted = () => {
    if (params.signal?.aborted) {
      throw new DOMException("Chunk preparation was aborted.", "AbortError");
    }
  };

  assertNotAborted();

  try {
    await ffmpeg.createDir(inputDirectory);
    await ffmpeg.createDir(outputDirectory);
    await ffmpeg.mount(WORKER_FS_TYPE, { files: [params.file] }, inputDirectory);

    for (const window of windows) {
      assertNotAborted();
      params.onProgress?.(
        `Preparing audio chunks (${window.index + 1}/${windows.length})...`,
      );

      const outputFileName = `chunk-${window.index}.${outputFormat.extension}`;
      const outputPath = `${outputDirectory}/${outputFileName}`;
      const exitCode = await ffmpeg.exec([
        "-ss",
        window.startSeconds.toString(),
        "-t",
        window.durationSeconds.toString(),
        "-i",
        `${inputDirectory}/${mountedInputFileName}`,
        "-map",
        "0:a:0",
        "-vn",
        ...outputFormat.codecArgs,
        outputPath,
      ]);

      if (exitCode !== 0) {
        throw new Error(`Audio chunking failed on chunk ${window.index + 1}.`);
      }

      const chunkBytes = await ffmpeg.readFile(outputPath);

      if (!(chunkBytes instanceof Uint8Array)) {
        throw new Error("Chunk output could not be read.");
      }

      chunks.push({
        index: window.index,
        file: new File([chunkBytes.slice().buffer], outputFileName, {
          type: outputFormat.mimeType,
        }),
        startMs: window.startMs,
        endMs: window.endMs,
        durationSeconds: window.durationSeconds,
        mimeType: outputFormat.mimeType,
      });

      await ffmpeg.deleteFile(outputPath);
    }

    return chunks;
  } finally {
    await ffmpeg.unmount(inputDirectory).catch(() => null);
    await ffmpeg.deleteDir(inputDirectory).catch(() => null);
    await ffmpeg.deleteDir(outputDirectory).catch(() => null);
  }
}
