import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-16">
      <div className="w-full rounded-[32px] border border-stone-200 bg-white p-8 shadow-[0_24px_100px_rgba(28,25,23,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-700">
          Prijava ni uspela
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-stone-950">
          Google prijave trenutno ni bilo mogoče zaključiti.
        </h1>
        <p className="mt-4 text-base leading-7 text-stone-600">
          {params.message ?? "Poskusi ponovno ali preveri nastavitve Supabase OAuth."}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          Nazaj na začetek
        </Link>
      </div>
    </main>
  );
}
