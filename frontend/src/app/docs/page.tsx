import Link from "next/link";
import {
  Zap, Code2, Terminal, Play, Shield, Clock, AlertTriangle,
  Lightbulb, Activity, FileCode, ArrowRight, BookOpen,
  Database, GitBranch,
} from "lucide-react";
import { DOCS_NAV, ALL_PAGES } from "../../components/docs/docsConfig";

const ICON_MAP: Record<string, React.ElementType> = {
  Zap, Activity, Code2, FileCode, Terminal, Play,
  Shield, Lightbulb,
};

const QUICK_STARTS = [
  {
    href: "/docs/introduction",
    icon: BookOpen,
    color: "bg-brand-500",
    title: "New to the Workflow Engine?",
    cta: "Start with Introduction →",
  },
  {
    href: "/docs/lifecycle",
    icon: Activity,
    color: "bg-violet-500",
    title: "Understand the full lifecycle",
    cta: "Read Lifecycle Guide →",
  },
  {
    href: "/docs/api-runtime",
    icon: Code2,
    color: "bg-blue-500",
    title: "Just need the API endpoints?",
    cta: "Jump to API Reference →",
  },
  {
    href: "/docs/example",
    icon: Play,
    color: "bg-emerald-500",
    title: "Learn from a real example",
    cta: "See Leave Approval Walkthrough →",
  },
];

const STATS = [
  { icon: Code2,     label: "REST Endpoints",   value: "39" },
  { icon: Database,  label: "PostgreSQL Tables", value: "9"  },
  { icon: GitBranch, label: "Node Types",         value: "5"  },
  { icon: Shield,    label: "Controllers",        value: "3"  },
];

export default function DocsHomePage() {
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12">
      {/* Hero */}
      <div className="mb-14">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-3 py-1 text-xs font-semibold text-brand-700 mb-5">
          <BookOpen size={11} />
          Developer Documentation · v1.0
        </div>
        <h1 className="text-4xl font-extrabold text-zinc-900 mb-4 leading-tight">
          Workflow Engine<br />
          <span className="text-brand-600">Developer Guide</span>
        </h1>
        <p className="text-zinc-500 text-[16px] leading-relaxed max-w-2xl mb-8">
          Everything you need to integrate the Workflow Engine into your application — from core
          concepts and complete API reference to security, SLA, and real production examples.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {STATS.map(s => (
            <div key={s.label} className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
              <s.icon size={18} className="text-brand-500 shrink-0" />
              <div>
                <p className="text-xl font-extrabold text-zinc-900 leading-none">{s.value}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Start cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {QUICK_STARTS.map(q => (
            <Link
              key={q.href}
              href={q.href}
              className="flex items-center gap-4 p-4 rounded-xl border border-zinc-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all group"
            >
              <div className={`w-9 h-9 rounded-lg ${q.color} flex items-center justify-center shrink-0 shadow-sm`}>
                <q.icon size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 mb-0.5">{q.title}</p>
                <p className="text-sm font-semibold text-brand-700 group-hover:text-brand-800">{q.cta}</p>
              </div>
              <ArrowRight size={15} className="text-zinc-300 group-hover:text-brand-400 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* All sections grid */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-zinc-900 mb-5">All Documentation</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {DOCS_NAV.map(group => {
            const Icon = ICON_MAP[group.iconName] ?? BookOpen;
            return (
              <div key={group.id} className="rounded-xl border border-zinc-200 overflow-hidden hover:border-zinc-300 transition-colors">
                {/* Group header */}
                <div className="flex items-center gap-3 px-5 py-3.5 bg-zinc-50 border-b border-zinc-200">
                  <Icon size={15} className="text-brand-500" />
                  <span className="text-[13px] font-bold text-zinc-700">{group.group}</span>
                </div>
                {/* Pages in group */}
                <ul>
                  {group.pages.map((page, i) => (
                    <li key={page.slug} className={i > 0 ? "border-t border-zinc-100" : ""}>
                      <Link
                        href={`/docs/${page.slug}`}
                        className="flex items-center justify-between px-5 py-3 hover:bg-brand-50/40 transition-colors group"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-800 group-hover:text-brand-700 transition-colors">
                            {page.title}
                          </p>
                          <p className="text-xs text-zinc-400 mt-0.5 truncate">{page.description}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-[10px] text-zinc-300 font-medium hidden sm:block">{page.readingTime}</span>
                          <ArrowRight size={13} className="text-zinc-300 group-hover:text-brand-400 transition-colors" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-6 border-t border-zinc-100 flex items-center justify-between">
        <p className="text-xs text-zinc-400">{ALL_PAGES.length} pages · Workflow Engine v1.0 · Silver Silvertouch Technologies · 2025</p>
        <Link href="/docs/introduction" className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-800 font-semibold">
          Start reading <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
