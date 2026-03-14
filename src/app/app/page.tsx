import { ArrowRight } from "lucide-react";

import { StatusBadge } from "@/components/status-badge";
import { requireUser } from "@/lib/auth";
import { listLecturesForUser } from "@/lib/lectures";
import { formatLectureDuration, formatRelativeDate } from "@/lib/utils";

export default async function AppHomePage() {
  const user = await requireUser();
  const lectures = await listLecturesForUser(user.id);

  return (
    <main className="space-y-6">
      <section className="rounded-[36px] border border-stone-200/70 bg-[rgba(255,252,247,0.9)] px-6 py-8 shadow-[0_30px_80px_rgba(34,25,23,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
          Nadzorna plošča
        </p>
        <h1 className="mt-3 font-serif text-5xl tracking-tight text-stone-950">
          Tvoja predavanja in AI zapiski.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600">
          Tukaj vidiš vse svoje posnetke, trenutno stanje obdelave in pripravljen
          dostop do transkripta, povzetka, zapiskov in klepeta.
        </p>
      </section>

      {lectures.length > 0 ? (
        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {lectures.map((lecture) => (
            <a
              key={lecture.id}
              href={`/app/lectures/${lecture.id}`}
              className="group rounded-[28px] border border-stone-200/70 bg-[rgba(255,252,247,0.92)] p-6 shadow-[0_24px_80px_rgba(34,25,23,0.06)] transition hover:-translate-y-0.5 hover:border-stone-300"
            >
              <div className="flex items-center justify-between gap-4">
                <StatusBadge status={lecture.status} />
                <ArrowRight className="h-4 w-4 text-stone-500 transition group-hover:translate-x-0.5" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-stone-950">
                {lecture.title ?? "Predavanje v pripravi"}
              </h2>
              <div className="mt-4 space-y-2 text-sm leading-7 text-stone-600">
                <p>{formatRelativeDate(lecture.created_at)}</p>
                <p>{formatLectureDuration(lecture.duration_seconds)}</p>
                {lecture.error_message ? (
                  <p className="text-rose-700">{lecture.error_message}</p>
                ) : null}
              </div>
            </a>
          ))}
        </section>
      ) : (
        <section className="rounded-[32px] border border-dashed border-stone-300 bg-[rgba(255,252,247,0.86)] p-8 text-center shadow-[0_24px_80px_rgba(34,25,23,0.05)]">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
            Prazno
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-stone-950">
            Prvo predavanje še čaka.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-stone-600">
            Začni z enim posnetkom predavanja. Ko bo obdelava končana, boš tukaj
            videl prepis, zapiske in klepet nad snovjo.
          </p>
          <a
            href="/app/new"
            className="mt-8 inline-flex rounded-full border border-blue-500 bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(37,99,235,0.18)] transition hover:border-blue-600 hover:bg-blue-700"
            style={{ color: "#ffffff" }}
          >
            Ustvari prvo predavanje
          </a>
        </section>
      )}
    </main>
  );
}
