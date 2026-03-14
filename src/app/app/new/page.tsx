import { CaptureStudio } from "@/components/capture-studio";

export default function NewLecturePage() {
  return (
    <main className="space-y-6">
      <section className="rounded-[36px] border border-stone-200/70 bg-[rgba(255,252,247,0.9)] px-6 py-8 shadow-[0_30px_80px_rgba(34,25,23,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-700">
          Novo predavanje
        </p>
        <h1 className="mt-3 font-serif text-5xl tracking-tight text-stone-950">
          Posnetek v zapiske v enem koraku.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-stone-600">
          Za MVP podpiramo samo zvok. Po uspešnem nalaganju se sproži prepis,
          izdelava povzetka, ključnih tem in strukturiranih zapiskov.
        </p>
      </section>

      <CaptureStudio />
    </main>
  );
}
