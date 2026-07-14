"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  Copy, Check, Info, AlertTriangle, Lightbulb, ChevronDown,
  CheckCircle, ArrowRight, ArrowLeft, Clock,
} from "lucide-react";
import type { DocPage } from "./docsConfig";
import { ResizableSidebar } from "./ResizableSidebar";

// ── CodeBlock ────────────────────────────────────────────────────────────────

export function CodeBlock({ code, language = "json" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="relative my-5 rounded-xl overflow-hidden border border-zinc-800 shadow-lg">
      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2.5 border-b border-zinc-700/60">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{language}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 hover:text-zinc-200 transition-colors px-2 py-1 rounded-md hover:bg-zinc-800"
        >
          {copied
            ? <><Check size={12} className="text-emerald-400" /><span className="text-emerald-400">Copied!</span></>
            : <><Copy size={12} /><span>Copy</span></>
          }
        </button>
      </div>
      <pre className="bg-[#0d1117] text-zinc-200 text-[12.5px] leading-relaxed p-5 overflow-x-auto font-mono whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Callout ──────────────────────────────────────────────────────────────────

type CalloutType = "note" | "warning" | "tip" | "important";

const CALLOUT_CFG: Record<CalloutType, {
  icon: React.ElementType; bg: string; border: string;
  text: string; iconColor: string; label: string;
}> = {
  note:      { icon: Info,          bg: "bg-blue-50",    border: "border-blue-400",   text: "text-blue-900",   iconColor: "text-blue-500",   label: "Note"      },
  warning:   { icon: AlertTriangle, bg: "bg-amber-50",   border: "border-amber-400",  text: "text-amber-900",  iconColor: "text-amber-500",  label: "Warning"   },
  tip:       { icon: Lightbulb,     bg: "bg-emerald-50", border: "border-emerald-400",text: "text-emerald-900",iconColor: "text-emerald-500",label: "Tip"       },
  important: { icon: AlertTriangle, bg: "bg-red-50",     border: "border-red-400",    text: "text-red-900",    iconColor: "text-red-500",    label: "Important" },
};

export function Callout({ type, children }: { type: CalloutType; children: React.ReactNode }) {
  const c = CALLOUT_CFG[type];
  const Icon = c.icon;
  return (
    <div className={`flex gap-3 my-5 p-4 rounded-xl border-l-[3px] ${c.bg} ${c.border}`}>
      <Icon size={16} className={`${c.iconColor} mt-0.5 shrink-0`} />
      <div className={`text-sm ${c.text} leading-relaxed`}>
        <span className="font-bold">{c.label}:</span>{" "}{children}
      </div>
    </div>
  );
}

// ── HTTP Method Badge ────────────────────────────────────────────────────────

const BADGE_COLORS: Record<string, string> = {
  GET:    "bg-sky-100    text-sky-700    border border-sky-200",
  POST:   "bg-emerald-100 text-emerald-700 border border-emerald-200",
  DELETE: "bg-red-100    text-red-700    border border-red-200",
  PATCH:  "bg-amber-100  text-amber-700  border border-amber-200",
  PUT:    "bg-violet-100 text-violet-700 border border-violet-200",
};

export function Badge({ method }: { method: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono shrink-0 ${BADGE_COLORS[method] ?? "bg-zinc-100 text-zinc-700 border border-zinc-200"}`}>
      {method}
    </span>
  );
}

// ── EndpointCard ─────────────────────────────────────────────────────────────

export function EndpointCard({
  method, path, title, description, requiredData, request, response, responses, errors, children,
}: {
  method: string; path: string; title: string; description: string;
  requiredData?: string[]; request?: string; response?: string;
  responses?: { label: string; body: string }[];
  errors?: { code: string; cause: string }[];
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const responseList = responses ?? (response ? [{ label: "200 — Success", body: response }] : []);
  const hasCodePane = Boolean(request) || responseList.length > 0;

  return (
    <div className="my-6 rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
      {/* Header: method + path + collapse toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!open); } }}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-white hover:bg-zinc-50/80 transition-colors text-left group cursor-pointer focus:outline-none border-b border-zinc-100"
      >
        <Badge method={method} />
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <code className="text-[13px] font-mono text-zinc-700 font-semibold truncate">{path}</code>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(path).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            title="Copy path"
            className="hidden group-hover:flex items-center justify-center p-1 rounded hover:bg-zinc-200 text-zinc-400 hover:text-zinc-700 transition-all cursor-pointer shrink-0"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </div>
        <span className="text-xs text-zinc-400 hidden lg:block shrink-0">{title}</span>
        <ChevronDown size={15} className={`text-zinc-400 transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </div>

      {open && (
        <div className={`bg-zinc-50/40 px-5 pb-5 pt-4 grid gap-x-8 gap-y-4 ${hasCodePane ? "xl:grid-cols-2" : ""}`}>
          {/* Left pane: what it does, parameters, errors, extra content */}
          <div className="space-y-4 min-w-0">
            <p className="text-sm text-zinc-600 leading-relaxed">{description}</p>

            {requiredData && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-2.5">Required Parameters</p>
                <ul className="space-y-1.5">
                  {requiredData.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-emerald-800">
                      <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                      <code className="text-xs font-mono">{d}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {errors && (
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Errors</p>
                <div className="rounded-lg border border-zinc-200 overflow-hidden">
                  {errors.map((e, i) => (
                    <div key={i} className={`flex gap-3 px-4 py-2.5 text-sm ${i % 2 === 0 ? "bg-white" : "bg-zinc-50"} border-t border-zinc-100 first:border-t-0`}>
                      <span className="font-mono font-bold text-red-600 w-8 shrink-0">{e.code}</span>
                      <span className="text-zinc-600">{e.cause}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {children}
          </div>

          {/* Right pane: request / response examples, sticky like Stripe's code column */}
          {hasCodePane && (
            <div className="space-y-4 min-w-0 xl:sticky xl:top-20 xl:self-start">
              {request && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Request Body
                  </p>
                  <CodeBlock code={request} language="json" />
                </div>
              )}

              {responseList.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Response</p>
                  <div className="space-y-4">
                    {responseList.map((r, i) => {
                      const code = parseInt(r.label.match(/^(\d{3})/)?.[1] ?? "0");
                      const badgeClass = code >= 200 && code < 300
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : code >= 400
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : "bg-zinc-100 text-zinc-600 border border-zinc-200";
                      return (
                        <div key={i}>
                          <div className="flex items-center gap-2 mb-1.5">
                            {code > 0 && (
                              <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold font-mono ${badgeClass}`}>{code}</span>
                            )}
                            <span className="text-xs text-zinc-500 font-medium">{r.label.replace(/^\d{3}\s*[—–-]?\s*/, "")}</span>
                          </div>
                          <CodeBlock code={r.body} language="json" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Step ─────────────────────────────────────────────────────────────────────

export function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 my-5">
      <div className="shrink-0 w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold shadow-md shadow-brand-500/25">
        {n}
      </div>
      <div className="flex-1 pt-0.5">
        <p className="font-semibold text-zinc-800 mb-1.5 text-[15px]">{title}</p>
        <div className="text-sm text-zinc-600 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

// ── PropTable ────────────────────────────────────────────────────────────────

export function PropTable({ rows }: { rows: [string, string, "Yes" | "No", string][] }) {
  return (
    <div className="my-5 rounded-xl border border-zinc-200 overflow-hidden text-sm">
      <div className="grid grid-cols-12 bg-zinc-800 text-zinc-200 text-[10px] font-bold uppercase tracking-wider">
        <div className="col-span-3 px-4 py-3">Field</div>
        <div className="col-span-2 px-4 py-3">Type</div>
        <div className="col-span-2 px-4 py-3">Required</div>
        <div className="col-span-5 px-4 py-3">Description</div>
      </div>
      {rows.map(([field, type, req, desc], i) => (
        <div key={i} className={`grid grid-cols-12 border-t border-zinc-100 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}`}>
          <div className="col-span-3 px-4 py-3 font-mono text-xs text-brand-700 font-semibold">{field}</div>
          <div className="col-span-2 px-4 py-3 font-mono text-xs text-zinc-500">{type}</div>
          <div className="col-span-2 px-4 py-3">
            {req === "Yes"
              ? <span className="text-[9px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Required</span>
              : <span className="text-[9px] font-bold bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">Optional</span>}
          </div>
          <div className="col-span-5 px-4 py-3 text-xs text-zinc-600 leading-relaxed">{desc}</div>
        </div>
      ))}
    </div>
  );
}

// ── Inline code ──────────────────────────────────────────────────────────────

export function IC({ children }: { children: React.ReactNode }) {
  return <code className="text-xs bg-zinc-100 border border-zinc-200 text-brand-700 px-1.5 py-0.5 rounded font-mono">{children}</code>;
}

// ── Section headings ─────────────────────────────────────────────────────────

export function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-[22px] font-bold text-zinc-900 mt-12 mb-4 pb-3 border-b border-zinc-100">
      {children}
    </h2>
  );
}

export function H3({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24 text-[17px] font-semibold text-zinc-800 mt-8 mb-3">
      {children}
    </h3>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-zinc-600 leading-7 mb-4 text-[15px]">{children}</p>;
}

// ── PageHeader ───────────────────────────────────────────────────────────────

export function PageHeader({
  title, description, readingTime, group,
}: {
  title: string; description: string; readingTime: string; group: string;
}) {
  return (
    <div className="mb-10 pb-8 border-b border-zinc-100">
      <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-3">
        <span>{group}</span>
        <ArrowRight size={11} />
        <span className="text-brand-500">{title}</span>
      </div>
      <h1 className="text-3xl font-extrabold text-zinc-900 mb-3 leading-tight">{title}</h1>
      <p className="text-zinc-500 text-[15px] leading-relaxed mb-4">{description}</p>
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Clock size={12} />
        <span>{readingTime} read</span>
      </div>
    </div>
  );
}

// ── PrevNextNav ──────────────────────────────────────────────────────────────

export function PrevNextNav({ prev, next }: { prev: DocPage | null; next: DocPage | null }) {
  return (
    <div className="mt-16 pt-8 border-t border-zinc-100 flex items-stretch gap-4">
      {prev ? (
        <Link
          href={`/docs/${prev.slug}`}
          className="flex-1 flex items-center gap-4 p-5 rounded-xl border border-zinc-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all group"
        >
          <ArrowLeft size={18} className="text-zinc-400 group-hover:text-brand-500 transition-colors shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Previous</p>
            <p className="font-semibold text-zinc-800 text-sm group-hover:text-brand-700 transition-colors">{prev.title}</p>
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{prev.description}</p>
          </div>
        </Link>
      ) : <div className="flex-1" />}

      {next ? (
        <Link
          href={`/docs/${next.slug}`}
          className="flex-1 flex items-center justify-end gap-4 p-5 rounded-xl border border-zinc-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all group text-right"
        >
          <div>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Next</p>
            <p className="font-semibold text-zinc-800 text-sm group-hover:text-brand-700 transition-colors">{next.title}</p>
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{next.description}</p>
          </div>
          <ArrowRight size={18} className="text-zinc-400 group-hover:text-brand-500 transition-colors shrink-0" />
        </Link>
      ) : <div className="flex-1" />}
    </div>
  );
}

// ── On This Page (right TOC) ──────────────────────────────────────────────────

export function OnThisPage({ items }: { items: { id: string; label: string; level?: number }[] }) {
  return (
    <ResizableSidebar
      defaultWidth={208}
      minWidth={150}
      maxWidth={350}
      position="right"
      className="hidden xl:flex sticky top-16 h-[calc(100vh-4rem)] pl-6 py-8 border-l border-zinc-100/50"
    >
      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">On this page</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={`block text-xs text-zinc-500 hover:text-brand-600 transition-colors leading-relaxed ${item.level === 3 ? "pl-3 border-l border-zinc-200" : ""}`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </ResizableSidebar>
  );
}
