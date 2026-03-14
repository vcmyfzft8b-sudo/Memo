import Link from "next/link";
import { ArrowRight, CheckCircle2, Mic, NotebookTabs, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { hasPublicSupabaseEnv } from "@/lib/public-env";
import { getOptionalUser } from "@/lib/auth";

export default async function HomePage() {
  if (hasPublicSupabaseEnv) {
    const user = await getOptionalUser();
    if (user) {
      redirect("/app");
    }
  }

  return (
    <main className="relative overflow-hidden px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-semibold uppercase tracking-[0.32em] text-stone-800">
            Skripta AI
          </Link>
          <Link
            href="/auth/login?next=/app"
            className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold !text-white no-underline shadow-[0_12px_30px_rgba(29,78,216,0.28)] transition hover:bg-blue-600"
            style={{ color: "#ffffff" }}
          >
            Prijava z Google
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <section className="grid items-end gap-10 py-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-700">
              Slovene-first AI zapiski
            </p>
            <h1 className="mt-6 max-w-4xl font-serif text-6xl leading-none tracking-tight text-stone-950 sm:text-7xl">
              Posnemi predavanje. Dobi prepis, povzetek in uporabne zapiske.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-8 text-stone-600">
              Skripta AI je zasnovana za slovenske dijake in študente. Po enem
              posnetku dobiš strukturirane zapiske, ključne teme in klepet nad
              vsebino z navedbo na transkript.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/auth/login?next=/app"
                className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-6 py-3.5 text-sm font-semibold !text-white no-underline shadow-[0_12px_30px_rgba(29,78,216,0.28)] transition hover:bg-blue-600"
                style={{ color: "#ffffff" }}
              >
                Začni z Google prijavo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center rounded-full border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-900 transition hover:border-stone-400"
              >
                Kaj dobiš v MVP
              </Link>
            </div>

            {!hasPublicSupabaseEnv ? (
              <div className="mt-8 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-7 text-amber-900">
                Manjkajo `Supabase` okoljske spremenljivke. Pred lokalnim
                zagonom izpolni `.env.local` po vzorcu iz `.env.example`.
              </div>
            ) : null}
          </div>

          <div className="rounded-[40px] border border-white/60 bg-[linear-gradient(135deg,rgba(15,58,217,0.96),rgba(19,16,85,0.92))] p-8 text-white shadow-[0_35px_140px_rgba(15,58,217,0.28)]">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-white/12 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em]">
                Core loop
              </span>
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <ol className="mt-8 space-y-5 text-sm leading-7 text-blue-50/92">
              <li className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                1. Posnemi ali naloži predavanje.
              </li>
              <li className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                2. Samodejno dobiš prepis s časovnimi oznakami.
              </li>
              <li className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                3. Aplikacija pripravi povzetek, ključne teme in zapiske.
              </li>
              <li className="rounded-[24px] border border-white/10 bg-white/8 p-4">
                4. Nad predavanjem lahko postavljaš vprašanja z navedenimi citati.
              </li>
            </ol>
          </div>
        </section>

        <section id="features" className="grid gap-6 pb-16 md:grid-cols-3">
          {[
            {
              icon: Mic,
              title: "Zajem brez prekinitev",
              body: "Snemanje v brskalniku ali nalaganje datoteke za primere, ko imaš posnetek že shranjen.",
            },
            {
              icon: NotebookTabs,
              title: "Prepis in strukturirani zapiski",
              body: "Zapiski ostanejo vezani na transkript, zato lahko preveriš vir in hitro najdeš relevanten del predavanja.",
            },
            {
              icon: CheckCircle2,
              title: "Grounded AI klepet",
              body: "Vprašanja se rešujejo samo iz trenutnega predavanja, brez mešanja z drugimi zapiski ali spletnimi viri.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-[28px] border border-stone-200/70 bg-[rgba(255,252,247,0.88)] p-6 shadow-[0_24px_80px_rgba(34,25,23,0.06)]"
            >
              <div className="inline-flex rounded-full bg-blue-50 p-3 text-blue-700">
                <item.icon className="h-5 w-5" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-stone-950">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-stone-600">{item.body}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
