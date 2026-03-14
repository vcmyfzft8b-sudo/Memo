import { Plus } from "lucide-react";

import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="min-h-screen px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 rounded-[32px] border border-stone-200/70 bg-[rgba(255,252,247,0.82)] px-6 py-5 shadow-[0_24px_80px_rgba(34,25,23,0.06)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <a href="/app" className="text-sm font-semibold uppercase tracking-[0.32em] text-stone-800">
              Skripta AI
            </a>
            <p className="mt-2 text-sm text-stone-600">
              {user.user_metadata.full_name || user.email}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href="/app/new"
              className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              <Plus className="h-4 w-4" />
              Novo predavanje
            </a>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 transition hover:border-stone-400"
              >
                Odjava
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
