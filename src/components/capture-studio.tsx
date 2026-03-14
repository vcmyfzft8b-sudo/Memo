"use client";

import { Loader2, Mic, PauseCircle, UploadCloud, Waves } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MAX_AUDIO_BYTES, MAX_AUDIO_SECONDS, STORAGE_BUCKET } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn, formatTimestamp } from "@/lib/utils";

type CaptureSource = {
  file: File;
  durationSeconds: number;
  previewUrl: string;
  origin: "upload" | "recording";
};

function pickRecorderMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return null;
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}

function readAudioDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const audio = document.createElement("audio");
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audio.remove();
    };

    audio.preload = "metadata";
    audio.src = objectUrl;

    audio.onloadedmetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      cleanup();
      resolve(duration);
    };

    audio.onerror = () => {
      cleanup();
      reject(new Error("Trajanja posnetka ni bilo mogoče prebrati."));
    };
  });
}

function validateAudio(file: File, durationSeconds: number) {
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error("Posnetek je prevelik. Trenutna omejitev je 150 MB.");
  }

  if (durationSeconds > MAX_AUDIO_SECONDS) {
    throw new Error("Posnetek je predolg. Trenutna omejitev je 2 uri.");
  }
}

export function CaptureStudio() {
  const router = useRouter();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);

  const [consent, setConsent] = useState(false);
  const [source, setSource] = useState<CaptureSource | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stage, setStage] = useState<
    "idle" | "creating" | "uploading" | "finalizing"
  >("idle");

  const recordingSupported = typeof window !== "undefined" && "MediaRecorder" in window;
  const recordingMimeType = useMemo(() => pickRecorderMimeType(), []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (source?.previewUrl) {
        URL.revokeObjectURL(source.previewUrl);
      }
    };
  }, [source]);

  async function setNewSource(nextSource: CaptureSource) {
    try {
      validateAudio(nextSource.file, nextSource.durationSeconds);
      setSource(nextSource);
      setError(null);
    } catch (validationError) {
      if (nextSource.previewUrl) {
        URL.revokeObjectURL(nextSource.previewUrl);
      }

      setSource(null);
      setError(
        validationError instanceof Error
          ? validationError.message
          : "Neveljaven posnetek.",
      );
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const durationSeconds = await readAudioDuration(file);
      await setNewSource({
        file,
        durationSeconds,
        previewUrl: URL.createObjectURL(file),
        origin: "upload",
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Datoteke ni bilo mogoče pripraviti.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function startRecording() {
    if (!recordingSupported) {
      setError("Ta brskalnik ne podpira snemanja v aplikaciji.");
      return;
    }

    if (!consent) {
      setError("Pred snemanjem potrdi dovoljenje za snemanje predavanja.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(stream, recordingMimeType ? { mimeType: recordingMimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const file = new File([blob], `lecture-${Date.now()}.webm`, {
          type: blob.type,
        });

        const previewUrl = URL.createObjectURL(blob);
        await setNewSource({
          file,
          durationSeconds: elapsedRef.current,
          previewUrl,
          origin: "recording",
        });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setElapsedSeconds(0);
      elapsedRef.current = 0;
      setIsRecording(true);
      setError(null);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((value) => {
          const nextValue = value + 1;
          elapsedRef.current = nextValue;
          return nextValue;
        });
      }, 1000);
    } catch (recordError) {
      setError(
        recordError instanceof Error
          ? recordError.message
          : "Snemanja ni bilo mogoče začeti.",
      );
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function handleSubmit() {
    if (!consent) {
      setError("Pred nalaganjem potrdi dovoljenje za snemanje in obdelavo.");
      return;
    }

    if (!source) {
      setError("Najprej naloži ali posnemi zvočni posnetek.");
      return;
    }

    try {
      setIsUploading(true);
      setStage("creating");
      setError(null);

      const createResponse = await fetch("/api/lectures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mimeType: source.file.type || "audio/webm",
          size: source.file.size,
          durationSeconds: Math.max(source.durationSeconds, 1),
          languageHint: "sl",
        }),
      });

      const createData = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(createData.error ?? "Predavanja ni bilo mogoče ustvariti.");
      }

      setStage("uploading");
      const supabase = createSupabaseBrowserClient();
      const uploadResult = await supabase.storage
        .from(STORAGE_BUCKET)
        .uploadToSignedUrl(createData.path, createData.token, source.file, {
          contentType: source.file.type || "audio/webm",
          upsert: true,
        });

      if (uploadResult.error) {
        throw new Error(uploadResult.error.message);
      }

      setStage("finalizing");
      const finalizeResponse = await fetch(
        `/api/lectures/${createData.lectureId}/finalize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: createData.path,
          }),
        },
      );

      const finalizeData = await finalizeResponse.json();

      if (!finalizeResponse.ok) {
        throw new Error(
          finalizeData.error ?? "Posnetka ni bilo mogoče poslati v obdelavo.",
        );
      }

      router.push(`/app/lectures/${createData.lectureId}`);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Obdelave ni bilo mogoče zagnati.",
      );
    } finally {
      setIsUploading(false);
      setStage("idle");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[32px] border border-stone-200/70 bg-[rgba(255,252,247,0.88)] p-6 shadow-[0_30px_80px_rgba(34,25,23,0.08)] backdrop-blur">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              Zajem predavanja
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950">
              Posnemi ali naloži predavanje.
            </h2>
          </div>
          <div className="rounded-full bg-blue-50 p-3 text-blue-700">
            <Waves className="h-5 w-5" />
          </div>
        </div>

        <label className="mt-6 flex items-start gap-3 rounded-[24px] border border-stone-200 bg-stone-50/80 p-4 text-sm leading-6 text-stone-700">
          <input
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-stone-300 text-blue-700"
          />
          <span>
            Potrjujem, da imam dovoljenje za snemanje predavanja in za obdelavo
            posnetka v tej aplikaciji.
          </span>
        </label>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "flex min-h-40 flex-col justify-between rounded-[28px] border p-5 text-left transition",
              isRecording
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-stone-200 bg-white hover:border-blue-300 hover:bg-blue-50/60",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
                Snemanje
              </span>
              {isRecording ? (
                <PauseCircle className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="text-lg font-semibold">
                {isRecording ? "Ustavi snemanje" : "Posnemi predavanje"}
              </p>
              <p className="mt-2 text-sm text-stone-600">
                {isRecording
                  ? `Snemanje teče: ${formatTimestamp(elapsedSeconds * 1000)}`
                  : "Deluje v podprtih mobilnih in namiznih brskalnikih."}
              </p>
            </div>
          </button>

          <label className="flex min-h-40 cursor-pointer flex-col justify-between rounded-[28px] border border-stone-200 bg-white p-5 transition hover:border-blue-300 hover:bg-blue-50/60">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-stone-700">
                Datoteka
              </span>
              <UploadCloud className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <p className="text-lg font-semibold text-stone-950">
                Naloži posnetek
              </p>
              <p className="mt-2 text-sm text-stone-600">
                MP3, M4A, WAV, OGG ali WEBM. Največ 150 MB oziroma 2 uri.
              </p>
            </div>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={!consent || isUploading}
            />
          </label>
        </div>

        {!recordingSupported && (
          <p className="mt-4 text-sm text-amber-800">
            Ta brskalnik ne podpira `MediaRecorder`. Nalaganje datotek še vedno
            deluje.
          </p>
        )}

        {error && (
          <div className="mt-5 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        )}
      </section>

      <section className="rounded-[32px] border border-stone-200/70 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_30px_80px_rgba(34,25,23,0.08)] backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
          Pregled
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-stone-950">
          Izbran posnetek
        </h3>

        {source ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-stone-200 bg-white p-4">
              <p className="text-sm font-semibold text-stone-900">
                {source.file.name}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-600">
                <span>{source.origin === "recording" ? "Posneto v aplikaciji" : "Naložena datoteka"}</span>
                <span>{(source.file.size / (1024 * 1024)).toFixed(1)} MB</span>
                <span>{formatTimestamp(source.durationSeconds * 1000)}</span>
              </div>
            </div>

            <audio
              controls
              src={source.previewUrl}
              className="w-full"
            />
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-stone-300 bg-stone-50/80 p-6 text-sm leading-7 text-stone-600">
            Ko izbereš zvočni posnetek, bo tukaj prikazan predogled predavanja
            pred pošiljanjem v prepis in ustvarjanje zapiskov.
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!source || !consent || isUploading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-stone-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {stage === "creating" && "Ustvarjam predavanje"}
          {stage === "uploading" && "Nalagam zvok"}
          {stage === "finalizing" && "Začenjam obdelavo"}
          {stage === "idle" && "Ustvari zapiske iz predavanja"}
        </button>
      </section>
    </div>
  );
}
