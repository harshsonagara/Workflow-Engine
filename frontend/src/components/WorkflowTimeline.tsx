"use client";

import { WorkflowHistory } from "@/lib/api";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type EventStyle = { dot: string; ring: string; icon: string; card: string; badge: string };

function styleFor(title: string | null, status: string | null): EventStyle {
  const t = (title  ?? "").toLowerCase();
  const s = (status ?? "").toLowerCase();

  if (t.includes("complet") || s === "completed")
    return { dot: "bg-green-600", ring: "ring-green-200", icon: "✓",
             card: "border-green-200 bg-green-50", badge: "bg-green-100 text-green-700" };

  if (t.includes("approv") || s === "approved" || s.includes("approv"))
    return { dot: "bg-green-500", ring: "ring-green-100", icon: "✓",
             card: "border-green-100 bg-green-50/60", badge: "bg-green-50 text-green-700" };

  if (t.includes("reject") || s === "rejected" || s.includes("reject"))
    return { dot: "bg-red-500", ring: "ring-red-100", icon: "✕",
             card: "border-red-100 bg-red-50", badge: "bg-red-50 text-red-700" };

  if (t.includes("overdue") || t.includes("sla breach") || s.includes("breach"))
    return { dot: "bg-orange-500", ring: "ring-orange-100", icon: "!",
             card: "border-orange-200 bg-orange-50", badge: "bg-orange-50 text-orange-700" };

  if (t.includes("escalat") || s.includes("escalat"))
    return { dot: "bg-amber-500", ring: "ring-amber-100", icon: "↑",
             card: "border-amber-200 bg-amber-50", badge: "bg-amber-50 text-amber-700" };

  if (t.includes("sent back") || t.includes("return") || s.includes("return"))
    return { dot: "bg-yellow-500", ring: "ring-yellow-100", icon: "↩",
             card: "border-yellow-200 bg-yellow-50", badge: "bg-yellow-50 text-yellow-700" };

  if (t.includes("forward") || t.includes("transfer"))
    return { dot: "bg-blue-400", ring: "ring-blue-100", icon: "→",
             card: "border-blue-100 bg-blue-50/60", badge: "bg-blue-50 text-blue-700" };

  if (t.includes("submitted") || t.includes("started"))
    return { dot: "bg-blue-600", ring: "ring-blue-200", icon: "▶",
             card: "border-blue-200 bg-blue-50", badge: "bg-blue-50 text-blue-700" };

  if (t.includes("assigned") || t.includes("review") || t.includes("sent for"))
    return { dot: "bg-slate-400", ring: "ring-slate-100", icon: "⏱",
             card: "border-slate-200 bg-slate-50", badge: "bg-slate-50 text-slate-600" };

  // generic action — use the designer-configured title colour-matched at runtime
  return { dot: "bg-indigo-400", ring: "ring-indigo-100", icon: "·",
           card: "border-indigo-100 bg-indigo-50/40", badge: "bg-indigo-50 text-indigo-700" };
}

// ── component ────────────────────────────────────────────────────────────────

interface Props {
  history: WorkflowHistory[];
  loading?: boolean;
  error?: string | null;
}

export default function WorkflowTimeline({ history, loading, error }: Props) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3 py-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="ml-8 h-20 rounded-lg border border-gray-100 bg-gray-50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">No history recorded yet.</div>
    );
  }

  return (
    <ol className="relative ml-3 border-l-2 border-gray-200">
      {history.map((entry, i) => {
        const { dot, ring, icon, card, badge } = styleFor(entry.title, entry.status);

        return (
          <li key={i} className="mb-5 ml-6 last:mb-0">
            {/* timeline dot */}
            <span
              className={`absolute -left-[13px] flex h-6 w-6 items-center justify-center
                          rounded-full text-xs font-bold text-white ring-4 ${dot} ${ring}`}
            >
              {icon}
            </span>

            <div className={`rounded-lg border p-3.5 ${card}`}>
              {/* ── title + timestamp ── */}
              <div className="flex flex-wrap items-start justify-between gap-1">
                <span className="text-sm font-semibold leading-tight">
                  {entry.title ?? "Event"}
                </span>
                <time className="shrink-0 text-xs text-gray-400 tabular-nums">
                  {formatDate(entry.date)}
                </time>
              </div>

              {/* ── step / node ── */}
              {entry.step && (
                <div className="mt-0.5 text-xs text-gray-500">
                  at <span className="font-medium text-gray-700">{entry.step}</span>
                </div>
              )}

              {/* ── actor row ── */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs">
                <span className="font-medium text-gray-800">{entry.by ?? "System"}</span>
                {entry.role && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-500">
                    {entry.role}
                  </span>
                )}
                {entry.durationSeconds != null && entry.durationSeconds > 0 && (
                  <span className="text-gray-400">
                    · took {formatDuration(entry.durationSeconds)}
                  </span>
                )}
              </div>

              {/* ── remarks ── */}
              {entry.remarks && (
                <blockquote className="mt-2 border-l-2 border-current pl-2 text-xs italic opacity-70">
                  {entry.remarks}
                </blockquote>
              )}

              {/* ── SLA breach info ── */}
              {entry.slaBreachedAt && (
                <div className="mt-2 text-xs text-orange-700">
                  ⚠ SLA breached at {formatDate(entry.slaBreachedAt)}
                </div>
              )}

              {/* ── escalation ── */}
              {entry.escalatedTo && (
                <div className="mt-1 text-xs text-amber-700">
                  ↑ Escalated to <span className="font-semibold">{entry.escalatedTo}</span>
                </div>
              )}

              {/* ── status badge ── */}
              {entry.status && (
                <div className="mt-2">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${badge}`}>
                    {entry.status}
                  </span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
