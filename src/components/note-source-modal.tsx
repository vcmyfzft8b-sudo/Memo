"use client";

import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronsUpDown,
  FileText,
  Info,
  Loader2,
  Mic,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createAudioLectureWithProcessingChunks } from "@/lib/audio-lecture-upload";
import {
  AUDIO_FILE_INPUT_ACCEPT,
  DOCUMENT_FILE_INPUT_ACCEPT,
  MAX_AUDIO_BYTES,
  MAX_AUDIO_SECONDS,
  MAX_DOCUMENT_BYTES,
} from "@/lib/constants";
import {
  createSafeTransportFileName,
  isSupportedDocumentFile,
} from "@/lib/document-files";
import {
  assignLectureToFolder,
  readStoredFolders,
  readStoredSelectedFolderId,
  type LibraryFolder,
} from "@/lib/library-folders";
import { NOTE_LANGUAGE_OPTIONS } from "@/lib/languages";
import { getExtensionForMimeType, normalizeMimeType } from "@/lib/storage";
import { formatTimestamp } from "@/lib/utils";

export type NoteSourceMode = "record" | "link" | "text" | "upload";

type AudioSource = {
  file: File;
  durationSeconds: number;
  previewUrl: string;
  origin: "upload" | "recording";
};

type UploadRecordingType = "lecture" | "meeting" | "other";

const MODE_COPY: Record<
  NoteSourceMode,
  {
    title: string;
    eyebrow: string;
    description: string;
  }
> = {
  record: {
    title: "Record audio",
    eyebrow: "Live capture",
    description: "Start recording to create a note from your lecture in one pass.",
  },
  upload: {
    title: "Upload audio",
    eyebrow: "Import file",
    description: "Bring in an existing lecture recording and turn it into notes.",
  },
  text: {
    title: "Upload text or PDF",
    eyebrow: "Text import",
    description: "Paste text, scan pages from your phone, or import a document.",
  },
  link: {
    title: "Web link",
    eyebrow: "Link import",
    description: "Paste a webpage or media link and turn it into study notes.",
  },
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
      reject(new Error("The audio duration could not be read."));
    };
  });
}

function validateAudio(file: File, durationSeconds: number) {
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error("The audio file is too large. The limit is 300 MB.");
  }

  if (durationSeconds > MAX_AUDIO_SECONDS) {
    throw new Error("The audio file is too long. The limit is 3 hours.");
  }
}

function modeTitle(mode: NoteSourceMode) {
  return MODE_COPY[mode].title;
}

export function NoteSourceModal({
  mode,
  open,
  onClose,
  userId,
}: {
  mode: NoteSourceMode | null;
  open: boolean;
  onClose: () => void;
  userId: string;
}) {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const activeRequestControllerRef = useRef<AbortController | null>(null);
  const createdLectureIdRef = useRef<string | null>(null);
  const cancelRequestedRef = useRef(false);

  const recordingMimeType = useMemo(() => pickRecorderMimeType(), []);

  const [selectedMode, setSelectedMode] = useState<NoteSourceMode>(mode ?? "record");
  const [audioSource, setAudioSource] = useState<AudioSource | null>(null);
  const [pdfSource, setPdfSource] = useState<File | null>(null);
  const [textValue, setTextValue] = useState("");
  const [linkValue, setLinkValue] = useState("");
  const [languageHint, setLanguageHint] = useState("sl");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [availableFolders, setAvailableFolders] = useState<LibraryFolder[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [recordingSupported, setRecordingSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [uploadRecordingType, setUploadRecordingType] =
    useState<UploadRecordingType>("lecture");
  const [hasMultipleSpeakers, setHasMultipleSpeakers] = useState(false);

  useEffect(() => {
    if (mode) {
      setSelectedMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    setRecordingSupported(typeof window !== "undefined" && "MediaRecorder" in window);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const folders = readStoredFolders(userId);
    const storedSelectedFolderId = readStoredSelectedFolderId(userId);
    const resolvedFolderId = folders.some((folder) => folder.id === storedSelectedFolderId)
      ? storedSelectedFolderId
      : null;

    setAvailableFolders(folders);
    setSelectedFolderId(resolvedFolderId);
  }, [open, userId]);

  const preparedRecording = audioSource?.origin === "recording" ? audioSource : null;
  const preparedUpload = audioSource?.origin === "upload" ? audioSource : null;
  const trimmedTextValue = textValue.trim();
  const trimmedLinkValue = linkValue.trim();
  const canGenerateText = Boolean(pdfSource) || trimmedTextValue.length >= 120;

  async function replaceAudioSource(nextSource: AudioSource) {
    try {
      validateAudio(nextSource.file, nextSource.durationSeconds);

      if (audioSource?.previewUrl) {
        URL.revokeObjectURL(audioSource.previewUrl);
      }

      setAudioSource(nextSource);
      setError(null);
    } catch (validationError) {
      URL.revokeObjectURL(nextSource.previewUrl);
      setAudioSource(null);
      setError(
        validationError instanceof Error
          ? validationError.message
          : "The audio could not be prepared.",
      );
    }
  }

  const clearAudioSource = useCallback(() => {
    setAudioSource((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return null;
    });
  }, []);

  const resetState = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    recorderRef.current = null;
    chunksRef.current = [];
    elapsedRef.current = 0;
    clearAudioSource();
    setPdfSource(null);
    setTextValue("");
    setLinkValue("");
    setLanguageHint("sl");
    setIsRecording(false);
    setElapsedSeconds(0);
    setError(null);
    setBusyLabel(null);
    setIsCancelling(false);
    setUploadRecordingType("lecture");
    setHasMultipleSpeakers(false);
    activeRequestControllerRef.current = null;
    createdLectureIdRef.current = null;
    cancelRequestedRef.current = false;
  }, [clearAudioSource]);

  const deleteCreatedLecture = useCallback(async () => {
    const lectureId = createdLectureIdRef.current;

    if (!lectureId) {
      return;
    }

    await fetch(`/api/lectures/${lectureId}`, {
      method: "DELETE",
    }).catch(() => null);
    createdLectureIdRef.current = null;
  }, []);

  const finalizeLectureCreation = useCallback(
    (lectureId: string) => {
      assignLectureToFolder(userId, selectedFolderId, lectureId);
      createdLectureIdRef.current = null;
      onClose();
      router.push(`/app/lectures/${lectureId}`);
      router.refresh();
    },
    [onClose, router, selectedFolderId, userId],
  );

  const createManualLecture = useCallback(
    async (sourceType: "text" | "pdf" | "link") => {
      const controller = new AbortController();
      activeRequestControllerRef.current = controller;

      const response = await fetch("/api/lectures/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          sourceType,
          languageHint,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "The note could not be created.");
      }

      createdLectureIdRef.current = payload.lectureId;
      return payload.lectureId as string;
    },
    [languageHint],
  );

  const handleCancelBusyAction = useCallback(async () => {
    cancelRequestedRef.current = true;
    activeRequestControllerRef.current?.abort();
    setIsCancelling(true);
    setBusyLabel((current) => current ?? "Cancelling...");
    await deleteCreatedLecture();
    setBusyLabel(null);
    setIsCancelling(false);
    setError("Creation cancelled.");
  }, [deleteCreatedLecture]);

  const requestClose = useCallback(() => {
    if (busyLabel) {
      void handleCancelBusyAction();
      return;
    }

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    onClose();
  }, [busyLabel, handleCancelBusyAction, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, requestClose]);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  useEffect(() => {
    return () => {
      if (audioSource?.previewUrl) {
        URL.revokeObjectURL(audioSource.previewUrl);
      }
    };
  }, [audioSource]);

  async function handleUploadFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const durationSeconds = await readAudioDuration(file);
      await replaceAudioSource({
        file,
        durationSeconds,
        previewUrl: URL.createObjectURL(file),
        origin: "upload",
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "The file could not be prepared.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function startRecording() {
    if (!recordingSupported) {
      setError("This browser does not support in-app recording.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(
        stream,
        recordingMimeType ? { mimeType: recordingMimeType } : undefined,
      );

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
        const normalizedMimeType = normalizeMimeType(
          recorder.mimeType || blob.type || "audio/webm",
        );
        const extension = getExtensionForMimeType(normalizedMimeType);
        const file = new File([blob], `recording-${Date.now()}.${extension}`, {
          type: normalizedMimeType,
        });

        await replaceAudioSource({
          file,
          durationSeconds: elapsedRef.current,
          previewUrl: URL.createObjectURL(blob),
          origin: "recording",
        });

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
      setElapsedSeconds(0);
      elapsedRef.current = 0;
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
        recordError instanceof Error ? recordError.message : "Recording could not be started.",
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

  async function createAudioLecture() {
    if (!audioSource) {
      setError("Choose or record audio first.");
      return;
    }

    let processingStarted = false;

    try {
      const createController = new AbortController();
      activeRequestControllerRef.current = createController;

      setError(null);
      cancelRequestedRef.current = false;
      const result = await createAudioLectureWithProcessingChunks({
        file: audioSource.file,
        durationSeconds: Math.max(audioSource.durationSeconds, 1),
        languageHint,
        signal: createController.signal,
        onLectureCreated: (lectureId) => {
          createdLectureIdRef.current = lectureId;
        },
        onStageChange: (_stage, message) => {
          setBusyLabel(message);
        },
      });

      processingStarted = true;
      finalizeLectureCreation(result.lectureId);
    } catch (submitError) {
      if (!processingStarted) {
        await deleteCreatedLecture();
      }

      if (!cancelRequestedRef.current) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "The audio note could not be created.",
        );
      }
    } finally {
      activeRequestControllerRef.current = null;
      setBusyLabel(null);
      setIsCancelling(false);
    }
  }

  async function createTextLecture() {
    if (trimmedTextValue.length < 120) {
      setError("Paste at least a short text sample.");
      return;
    }

    try {
      setBusyLabel("Preparing...");
      setError(null);
      cancelRequestedRef.current = false;
      const lectureId = await createManualLecture("text");

      if (cancelRequestedRef.current) {
        await deleteCreatedLecture();
        return;
      }

      const controller = new AbortController();
      activeRequestControllerRef.current = controller;
      setBusyLabel("Creating notes...");

      const response = await fetch("/api/lectures/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          lectureId,
          text: trimmedTextValue,
          languageHint,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "The text could not be processed.");
      }

      finalizeLectureCreation(lectureId);
    } catch (submitError) {
      await deleteCreatedLecture();
      if (!cancelRequestedRef.current) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "The text note could not be created.",
        );
      }
    } finally {
      activeRequestControllerRef.current = null;
      setBusyLabel(null);
      setIsCancelling(false);
    }
  }

  async function createLinkLecture() {
    if (!trimmedLinkValue) {
      setError("Paste a link first.");
      return;
    }

    try {
      setBusyLabel("Preparing...");
      setError(null);
      cancelRequestedRef.current = false;
      const lectureId = await createManualLecture("link");

      if (cancelRequestedRef.current) {
        await deleteCreatedLecture();
        return;
      }

      const controller = new AbortController();
      activeRequestControllerRef.current = controller;
      setBusyLabel("Reading page...");

      const response = await fetch("/api/lectures/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          lectureId,
          url: trimmedLinkValue,
          languageHint,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "The link could not be processed.");
      }

      finalizeLectureCreation(lectureId);
    } catch (submitError) {
      await deleteCreatedLecture();
      if (!cancelRequestedRef.current) {
        setError(
          submitError instanceof Error ? submitError.message : "The web note could not be created.",
        );
      }
    } finally {
      activeRequestControllerRef.current = null;
      setBusyLabel(null);
      setIsCancelling(false);
    }
  }

  async function handlePdfPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      if (!isSupportedDocumentFile(file)) {
        throw new Error("Use PDF, TXT, Markdown, HTML, RTF, or DOCX.");
      }

      if (file.size > MAX_DOCUMENT_BYTES) {
        throw new Error("The document file is too large. The current limit is 4 MB.");
      }

      setPdfSource(file);
      setError(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The document could not be prepared.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function createPdfLecture() {
    if (!pdfSource) {
      setError("Choose a document first.");
      return;
    }

    try {
      setBusyLabel("Preparing...");
      setError(null);
      cancelRequestedRef.current = false;
      const lectureId = await createManualLecture("pdf");

      if (cancelRequestedRef.current) {
        await deleteCreatedLecture();
        return;
      }

      const uploadFileName = createSafeTransportFileName(pdfSource.name);
      const uploadFile =
        uploadFileName === pdfSource.name
          ? pdfSource
          : new File([pdfSource], uploadFileName, {
              type: pdfSource.type,
              lastModified: pdfSource.lastModified,
            });

      const formData = new FormData();
      formData.append("lectureId", lectureId);
      formData.append("file", uploadFile);
      formData.append("originalFileName", pdfSource.name);
      formData.append("languageHint", languageHint);

      const controller = new AbortController();
      activeRequestControllerRef.current = controller;
      setBusyLabel("Reading document...");

      const response = await fetch("/api/lectures/pdf", {
        method: "POST",
        signal: controller.signal,
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "The document could not be processed.");
      }

      finalizeLectureCreation(lectureId);
    } catch (submitError) {
      await deleteCreatedLecture();
      if (!cancelRequestedRef.current) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "The document note could not be created.",
        );
      }
    } finally {
      activeRequestControllerRef.current = null;
      setBusyLabel(null);
      setIsCancelling(false);
    }
  }

  async function handleScanTextImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      setBusyLabel("Scanning text...");
      setError(null);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/lectures/scan-text", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        text?: string;
      };

      if (!response.ok || !payload.text) {
        throw new Error(payload.error ?? "The text could not be scanned.");
      }

      setPdfSource(null);
      setTextValue(payload.text);
    } catch (scanError) {
      setError(
        scanError instanceof Error ? scanError.message : "The text could not be scanned.",
      );
    } finally {
      setBusyLabel(null);
      event.target.value = "";
    }
  }

  async function handleLinkPrimaryAction() {
    if (trimmedLinkValue) {
      await createLinkLecture();
      return;
    }

    if (!navigator.clipboard?.readText) {
      setError("Clipboard access is not available in this browser.");
      return;
    }

    try {
      const clipboardValue = (await navigator.clipboard.readText()).trim();

      if (!clipboardValue) {
        throw new Error("Your clipboard is empty.");
      }

      setLinkValue(clipboardValue);
      setError(null);
    } catch (clipboardError) {
      setError(
        clipboardError instanceof Error
          ? clipboardError.message
          : "The link could not be pasted from the clipboard.",
      );
    }
  }

  function renderFolderField() {
    return (
      <div className="note-source-panel-block">
        <label className="note-source-panel-label" htmlFor="note-folder-select">
          Folder
        </label>
        <div className="note-source-panel-select-wrap">
          <select
            id="note-folder-select"
            value={selectedFolderId ?? ""}
            onChange={(event) => setSelectedFolderId(event.target.value || null)}
            className="note-source-panel-select"
          >
            <option value="">All notes</option>
            {availableFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
          <ChevronsUpDown className="note-source-panel-select-icon" />
        </div>
      </div>
    );
  }

  function renderLanguageField(label: string) {
    return (
      <div className="note-source-panel-block">
        <label className="note-source-panel-label" htmlFor={`note-language-${selectedMode}`}>
          {label}
        </label>
        <div className="note-source-panel-select-wrap">
          <select
            id={`note-language-${selectedMode}`}
            value={languageHint}
            onChange={(event) => setLanguageHint(event.target.value)}
            className="note-source-panel-select"
          >
            {NOTE_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="note-source-panel-select-icon" />
        </div>
      </div>
    );
  }

  function renderHeader() {
    return (
      <div className="note-source-panel-header">
        <button type="button" className="note-source-panel-icon-button ghost" onClick={onClose}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="note-source-panel-header-copy">
          <span className="note-source-panel-eyebrow">{MODE_COPY[selectedMode].eyebrow}</span>
          <h2 className="note-source-panel-title">{modeTitle(selectedMode)}</h2>
        </div>
        <button
          type="button"
          className="note-source-panel-icon-button"
          onClick={requestClose}
          disabled={isCancelling}
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }

  function renderFooterActions(primaryLabel: string, onPrimaryAction: () => void, disabled: boolean) {
    return (
      <div className="note-source-panel-footer">
        <button
          type="button"
          className="note-source-panel-primary-button"
          disabled={disabled}
          onClick={onPrimaryAction}
        >
          {busyLabel ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          <span>{busyLabel ?? primaryLabel}</span>
        </button>
        {busyLabel ? (
          <button
            type="button"
            className="note-source-panel-secondary-button"
            onClick={() => void handleCancelBusyAction()}
            disabled={isCancelling}
          >
            {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Cancel
          </button>
        ) : null}
      </div>
    );
  }

  function renderRecordMode() {
    return (
      <>
        <div className="note-source-record-hero">
          <div className="note-source-record-hero-icon">
            <Mic className="h-12 w-12" />
          </div>
          <h3>Start recording to create a note</h3>
          <p>Tap below to capture your lecture, then we&apos;ll turn it into organized notes.</p>
        </div>

        <div className="note-source-record-grid">
          {renderLanguageField("Language")}
          {renderFolderField()}
        </div>

        {preparedRecording ? (
          <div className="note-source-panel-card">
            <div className="note-source-panel-card-header">
              <span className="note-source-panel-card-title">Ready to upload</span>
              <span className="note-source-panel-card-meta">
                {formatTimestamp(preparedRecording.durationSeconds * 1000)}
              </span>
            </div>
            <p className="note-source-panel-card-value">{preparedRecording.file.name}</p>
          </div>
        ) : null}

        {isRecording ? (
          <div className="note-source-panel-card record-live">
            <div className="note-source-panel-card-header">
              <span className="note-source-panel-card-title">Recording now</span>
              <span className="note-source-panel-live-pill">Live</span>
            </div>
            <p className="note-source-panel-card-value">
              {formatTimestamp(elapsedSeconds * 1000)}
            </p>
          </div>
        ) : null}

        <p className="note-source-record-legal">
          By recording, you confirm you have permission to record in accordance with our Privacy
          Policy and Terms of Use.
        </p>

        {isRecording
          ? renderFooterActions("Stop Recording", stopRecording, false)
          : preparedRecording
            ? (
              <div className="note-source-panel-footer">
                <button
                  type="button"
                  className="note-source-panel-primary-button"
                  disabled={Boolean(busyLabel)}
                  onClick={() => void createAudioLecture()}
                >
                  {busyLabel ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  <span>{busyLabel ?? "Create notes"}</span>
                </button>
                <button
                  type="button"
                  className="note-source-panel-secondary-button"
                  disabled={Boolean(busyLabel)}
                  onClick={() => {
                    clearAudioSource();
                    void startRecording();
                  }}
                >
                  Record again
                </button>
              </div>
            )
            : renderFooterActions("Start Recording", () => void startRecording(), Boolean(busyLabel))}
      </>
    );
  }

  function renderUploadMode() {
    return (
      <>
        <div className="note-source-panel-tip">
          <Info className="h-5 w-5" />
          <span>How to import from Voice Memos</span>
        </div>

        <input
          ref={uploadInputRef}
          type="file"
          accept={AUDIO_FILE_INPUT_ACCEPT}
          onChange={handleUploadFileChange}
          className="hidden"
        />

        <div className="note-source-panel-grid">
          <div className="note-source-panel-block">
            <span className="note-source-panel-label">Audio file</span>
            <button
              type="button"
              className="note-source-panel-picker"
              onClick={() => uploadInputRef.current?.click()}
            >
              <span className="note-source-panel-picker-copy">
                <span className="note-source-panel-picker-title">
                  {preparedUpload ? preparedUpload.file.name : "Select a file"}
                </span>
                <span className="note-source-panel-picker-meta">
                  {preparedUpload
                    ? formatTimestamp(preparedUpload.durationSeconds * 1000)
                    : "MP3, M4A, WAV, or WEBM"}
                </span>
              </span>
              <Upload className="h-5 w-5" />
            </button>
          </div>

          {renderLanguageField("Audio language")}
          {renderFolderField()}
        </div>

        <div className="note-source-panel-block">
          <span className="note-source-panel-label">Recording type</span>
          <div className="note-source-toggle-group">
            {(["lecture", "meeting", "other"] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`note-source-toggle-chip ${
                  uploadRecordingType === value ? "active" : ""
                }`}
                onClick={() => setUploadRecordingType(value)}
              >
                {value[0]?.toUpperCase()}
                {value.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <label className="note-source-switch-row">
          <span>
            <span className="note-source-switch-title">Multiple people speaking?</span>
            <span className="note-source-switch-copy">
              Helps keep the upload setup aligned with your lecture recording style.
            </span>
          </span>
          <span className={`note-source-switch ${hasMultipleSpeakers ? "active" : ""}`}>
            <input
              type="checkbox"
              checked={hasMultipleSpeakers}
              onChange={(event) => setHasMultipleSpeakers(event.target.checked)}
            />
            <span className="note-source-switch-thumb" />
          </span>
        </label>

        {renderFooterActions("Create notes", () => void createAudioLecture(), !preparedUpload)}
      </>
    );
  }

  function renderTextMode() {
    return (
      <>
        <input
          ref={pdfInputRef}
          type="file"
          accept={DOCUMENT_FILE_INPUT_ACCEPT}
          onChange={handlePdfPick}
          className="hidden"
        />
        <input
          ref={scanInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleScanTextImageChange}
          className="hidden"
        />

        <div className="note-source-panel-grid compact">
          {renderLanguageField("Language")}
          {renderFolderField()}
        </div>

        <div className="note-source-panel-block grow">
          <label className="note-source-panel-label" htmlFor="note-text-input">
            Text
          </label>
          <textarea
            id="note-text-input"
            value={textValue}
            onChange={(event) => {
              if (pdfSource && event.target.value.trim().length > 0) {
                setPdfSource(null);
              }

              setTextValue(event.target.value);
            }}
            className="note-source-panel-textarea"
            placeholder="Paste lecture notes, article text, or scanned content here..."
          />
        </div>

        {pdfSource ? (
          <div className="note-source-panel-card">
            <div className="note-source-panel-card-header">
              <span className="note-source-panel-card-title">Imported document</span>
              <span className="note-source-panel-card-meta">Ready</span>
            </div>
            <p className="note-source-panel-card-value">{pdfSource.name}</p>
          </div>
        ) : null}

        <div className="note-source-dual-actions">
          <button
            type="button"
            className="note-source-panel-secondary-button wide"
            disabled={Boolean(busyLabel)}
            onClick={() => scanInputRef.current?.click()}
          >
            <Camera className="h-4 w-4" />
            Scan text
          </button>
          <button
            type="button"
            className="note-source-panel-secondary-button wide"
            disabled={Boolean(busyLabel)}
            onClick={() => pdfInputRef.current?.click()}
          >
            <FileText className="h-4 w-4" />
            Import PDF
          </button>
        </div>

        {renderFooterActions(
          pdfSource ? "Create from document" : "Create notes",
          () => {
            if (pdfSource) {
              void createPdfLecture();
              return;
            }

            void createTextLecture();
          },
          Boolean(busyLabel) || !canGenerateText,
        )}
      </>
    );
  }

  function renderLinkMode() {
    return (
      <>
        <div className="note-source-panel-grid compact">
          {renderLanguageField("Language")}
          {renderFolderField()}
        </div>

        <div className="note-source-panel-block">
          <label className="note-source-panel-label" htmlFor="note-link-input">
            Paste a web link
          </label>
          <input
            id="note-link-input"
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            className="note-source-panel-input"
            placeholder="https://example.com"
          />
          <p className="note-source-panel-helper">
            Works with websites, audio, video, articles, and other public pages.
          </p>
        </div>

        {renderFooterActions(
          trimmedLinkValue ? "Create notes" : "Paste",
          () => void handleLinkPrimaryAction(),
          Boolean(busyLabel),
        )}
      </>
    );
  }

  if (!open || !mode) {
    return null;
  }

  return (
    <>
      <div className="ios-sheet-backdrop" onClick={requestClose} aria-hidden="true" />
      <div className="ios-sheet-wrap note-source-modal-wrap" role="presentation">
        <div className="ios-sheet-stack note-source-modal-stack">
          <section
            className={`ios-sheet note-source-panel note-source-panel-${selectedMode}`}
            role="dialog"
            aria-modal="true"
            aria-label={modeTitle(selectedMode)}
          >
            <div className="note-source-sheet-handle" />
            {renderHeader()}

            <div className="note-source-panel-scroll">
              <p className="note-source-panel-description">{MODE_COPY[selectedMode].description}</p>

              {selectedMode === "record" ? renderRecordMode() : null}
              {selectedMode === "upload" ? renderUploadMode() : null}
              {selectedMode === "text" ? renderTextMode() : null}
              {selectedMode === "link" ? renderLinkMode() : null}

              {error ? <p className="ios-info ios-danger note-source-panel-error">{error}</p> : null}
              <div className="note-source-panel-spacer" />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
