"use client";

import { Download, Loader2, RefreshCcw, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { POLL_INTERVAL_MS } from "@/lib/constants";
import type { ChatMessageWithCitations, LectureDetail } from "@/lib/types";
import { formatLectureDuration, formatRelativeDate, formatTimestamp } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { StatusBadge } from "@/components/status-badge";

function shouldPoll(status: LectureDetail["lecture"]["status"]) {
  return ["uploading", "queued", "transcribing", "generating_notes"].includes(
    status,
  );
}

export function LectureWorkspace({
  initialDetail,
}: {
  initialDetail: LectureDetail;
}) {
  const [detail, setDetail] = useState(initialDetail);
  const [question, setQuestion] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    setDetail(initialDetail);
  }, [initialDetail]);

  useEffect(() => {
    if (!shouldPoll(detail.lecture.status)) {
      return;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/lectures/${detail.lecture.id}`);
      if (!response.ok) {
        return;
      }

      const nextDetail = (await response.json()) as LectureDetail;
      setDetail(nextDetail);
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [detail.lecture.id, detail.lecture.status]);

  const exportMarkdown = useMemo(() => {
    const lines = [
      `# ${detail.lecture.title ?? "Predavanje"}`,
      "",
      `Status: ${detail.lecture.status}`,
      `Datum: ${formatRelativeDate(detail.lecture.created_at)}`,
      "",
      "## Povzetek",
      "",
      detail.artifact?.summary ?? "Povzetek še ni na voljo.",
      "",
      "## Ključne teme",
      "",
      ...(detail.artifact?.key_topics.map((topic) => `- ${topic}`) ?? [
        "- Ključne teme še niso pripravljene.",
      ]),
      "",
      "## Zapiski",
      "",
      detail.artifact?.structured_notes_md ?? "Zapiski še niso pripravljeni.",
    ];

    return lines.join("\n");
  }, [detail]);

  async function handleRetry() {
    setIsRetrying(true);
    const response = await fetch(`/api/lectures/${detail.lecture.id}/retry`, {
      method: "POST",
    });
    setIsRetrying(false);

    if (!response.ok) {
      return;
    }

    const refresh = await fetch(`/api/lectures/${detail.lecture.id}`);
    if (refresh.ok) {
      setDetail((await refresh.json()) as LectureDetail);
    }
  }

  async function handleChatSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    const tempUserMessage: ChatMessageWithCitations = {
      id: `temp-user-${Date.now()}`,
      lecture_id: detail.lecture.id,
      user_id: "me",
      role: "user",
      content: question.trim(),
      citations: [],
      created_at: new Date().toISOString(),
    };

    setDetail((current) => ({
      ...current,
      chatMessages: [...current.chatMessages, tempUserMessage],
    }));
    setIsSending(true);
    setChatError(null);
    const currentQuestion = question.trim();
    setQuestion("");

    const response = await fetch(`/api/lectures/${detail.lecture.id}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: currentQuestion,
      }),
    });

    const payload = await response.json();
    setIsSending(false);

    if (!response.ok) {
      setChatError(payload.error ?? "Odgovora ni bilo mogoče ustvariti.");
      setDetail((current) => ({
        ...current,
        chatMessages: current.chatMessages.filter(
          (message) => message.id !== tempUserMessage.id,
        ),
      }));
      return;
    }

    setDetail((current) => ({
      ...current,
      chatMessages: [
        ...current.chatMessages.filter((message) => message.id !== tempUserMessage.id),
        tempUserMessage,
        payload.answer as ChatMessageWithCitations,
      ],
    }));
  }

  function downloadMarkdown() {
    const blob = new Blob([exportMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${detail.lecture.title ?? "predavanje"}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-stone-200/70 bg-[rgba(255,252,247,0.9)] p-6 shadow-[0_30px_80px_rgba(34,25,23,0.08)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              Predavanje
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-stone-950">
              {detail.lecture.title ?? "Predavanje v obdelavi"}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-600">
              <StatusBadge status={detail.lecture.status} />
              <span>{formatRelativeDate(detail.lecture.created_at)}</span>
              <span>{formatLectureDuration(detail.lecture.duration_seconds)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={downloadMarkdown}
              disabled={!detail.artifact}
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Izvozi Markdown
            </button>
            {detail.lecture.status === "failed" ? (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-2 rounded-full border border-blue-500 bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.18)] transition hover:border-blue-600 hover:bg-blue-700"
                style={{ color: "#ffffff" }}
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Poskusi znova
              </button>
            ) : null}
          </div>
        </div>

        {detail.lecture.error_message ? (
          <div className="mt-5 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {detail.lecture.error_message}
          </div>
        ) : null}

        {shouldPoll(detail.lecture.status) ? (
          <div className="mt-5 rounded-[22px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Posnetek je uspešno shranjen. Trenutni korak:{" "}
            <span className="font-semibold">{detail.lecture.status}</span>.
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-stone-200/70 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_30px_80px_rgba(34,25,23,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              Povzetek
            </p>
            <p className="mt-4 text-base leading-8 text-stone-700">
              {detail.artifact?.summary ?? "Povzetek bo prikazan po uspešni obdelavi."}
            </p>
          </section>

          <section className="rounded-[32px] border border-stone-200/70 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_30px_80px_rgba(34,25,23,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              Ključne teme
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {detail.artifact?.key_topics.length ? (
                detail.artifact.key_topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-900"
                  >
                    {topic}
                  </span>
                ))
              ) : (
                <p className="text-sm text-stone-600">
                  Ključne teme bodo prikazane po obdelavi.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-stone-200/70 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_30px_80px_rgba(34,25,23,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              Zapiski
            </p>
            <div className="mt-4">
              {detail.artifact ? (
                <MarkdownRenderer content={detail.artifact.structured_notes_md} />
              ) : (
                <p className="text-sm leading-7 text-stone-600">
                  Zapiski še niso pripravljeni.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-stone-200/70 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_30px_80px_rgba(34,25,23,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
                  Transkript
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  Vir za vse ustvarjene zapiske in odgovore v klepetu.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {detail.transcript.length > 0 ? (
                detail.transcript.map((segment) => (
                  <article
                    id={`segment-${segment.idx}`}
                    key={segment.id}
                    className="rounded-[22px] border border-stone-200 bg-white px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      <span>{formatTimestamp(segment.start_ms)}</span>
                      {segment.speaker_label ? <span>{segment.speaker_label}</span> : null}
                    </div>
                    <p className="mt-2 text-sm leading-7 text-stone-700">
                      {segment.text}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-sm text-stone-600">
                  Transkript bo prikazan po uspešnem prepisu zvoka.
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-stone-200/70 bg-[rgba(255,252,247,0.94)] p-6 shadow-[0_30px_80px_rgba(34,25,23,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
              Klepet z zapiski
            </p>
            <p className="mt-3 text-sm leading-7 text-stone-600">
              Vprašanja se odgovarjajo samo iz trenutnega predavanja in s citati
              na transkript.
            </p>

            <div className="mt-5 max-h-[26rem] space-y-4 overflow-y-auto pr-1">
              {detail.chatMessages.length > 0 ? (
                detail.chatMessages.map((message) => (
                  <article
                    key={message.id}
                    className={`rounded-[22px] px-4 py-3 ${
                      message.role === "assistant"
                        ? "border border-blue-200 bg-blue-50/70"
                        : "border border-stone-200 bg-white"
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      {message.role === "assistant" ? "AI odgovor" : "Ti"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-stone-700">
                      {message.content}
                    </p>
                    {message.citations.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.citations.map((citation) => (
                          <a
                            key={`${message.id}-${citation.idx}-${citation.startMs}`}
                            href={`#segment-${citation.idx}`}
                            className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-900"
                          >
                            {formatTimestamp(citation.startMs)}
                          </a>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="text-sm text-stone-600">
                  Ko bodo zapiski pripravljeni, lahko postaviš vprašanje o
                  snovi.
                </p>
              )}
            </div>

            <form onSubmit={handleChatSubmit} className="mt-5 space-y-3">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={detail.lecture.status !== "ready" || isSending}
                rows={4}
                placeholder="Vprašaj po definiciji, razlagi ali povzetku iz predavanja."
                className="w-full rounded-[22px] border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-blue-400"
              />
              {chatError ? (
                <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                  {chatError}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={detail.lecture.status !== "ready" || isSending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-blue-500 bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.18)] transition hover:border-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400 disabled:shadow-none"
                style={{ color: detail.lecture.status !== "ready" || isSending ? undefined : "#ffffff" }}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Pošlji vprašanje
              </button>
            </form>
          </section>

          <section className="rounded-[32px] border border-stone-200/70 bg-[rgba(255,252,247,0.94)] p-6 shadow-[0_30px_80px_rgba(34,25,23,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              Avdio
            </p>
            {detail.audioUrl ? (
              <audio controls src={detail.audioUrl} className="mt-4 w-full" />
            ) : (
              <p className="mt-4 text-sm text-stone-600">
                Zvok bo na voljo po uspešnem nalaganju.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
