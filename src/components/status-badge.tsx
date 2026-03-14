import type { LectureStatus } from "@/lib/database.types";
import { cn } from "@/lib/utils";

const statusMap: Record<
  LectureStatus,
  { label: string; className: string }
> = {
  uploading: {
    label: "Nalaganje",
    className: "bg-amber-100 text-amber-900 border-amber-200",
  },
  queued: {
    label: "V vrsti",
    className: "bg-sky-100 text-sky-900 border-sky-200",
  },
  transcribing: {
    label: "Prepisovanje",
    className: "bg-violet-100 text-violet-900 border-violet-200",
  },
  generating_notes: {
    label: "Ustvarjanje zapiskov",
    className: "bg-indigo-100 text-indigo-900 border-indigo-200",
  },
  ready: {
    label: "Pripravljeno",
    className: "bg-emerald-100 text-emerald-900 border-emerald-200",
  },
  failed: {
    label: "Napaka",
    className: "bg-rose-100 text-rose-900 border-rose-200",
  },
};

export function StatusBadge({ status }: { status: LectureStatus }) {
  const config = statusMap[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
