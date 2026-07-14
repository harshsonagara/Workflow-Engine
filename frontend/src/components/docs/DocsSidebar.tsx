"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, Activity, Code2, FileCode, Terminal, Play, Shield,
  Lightbulb, ChevronDown, BookOpen, X, Menu,
} from "lucide-react";
import { DOCS_NAV } from "./docsConfig";

const ICON_MAP: Record<string, React.ElementType> = {
  Zap, Activity, Code2, FileCode, Terminal, Play, Shield, Lightbulb,
};

export function DocsSidebar() {
  const pathname = usePathname();
  const currentSlug = pathname.split("/").pop() ?? "";

  // Default all groups open
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(DOCS_NAV.map(g => g.id))
  );

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="py-5 px-3 space-y-0.5">
      {DOCS_NAV.map(group => {
        const Icon = ICON_MAP[group.iconName] ?? BookOpen;
        const isOpen = expanded.has(group.id);
        const hasActive = group.pages.some(p => p.slug === currentSlug);

        return (
          <div key={group.id}>
            <button
              onClick={() => toggle(group.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors
                ${hasActive ? "text-brand-700 bg-brand-50" : "text-zinc-700 hover:bg-zinc-100"}`}
            >
              <Icon size={14} className={hasActive ? "text-brand-500" : "text-zinc-400"} />
              <span className="flex-1 text-left">{group.group}</span>
              <ChevronDown
                size={12}
                className={`transition-transform text-zinc-400 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <ul className="ml-3 pl-3 border-l border-zinc-200/80 mt-0.5 mb-1 space-y-0.5">
                {group.pages.map(page => {
                  const isActive = page.slug === currentSlug;
                  return (
                    <li key={page.slug}>
                      <Link
                        href={`/docs/${page.slug}`}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-colors
                          ${isActive
                            ? "bg-brand-600 text-white font-semibold shadow-sm shadow-brand-500/30"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                          }`}
                      >
                        {page.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Mobile sidebar with drawer ────────────────────────────────────────────────

export function MobileDocsSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const currentSlug = pathname.split("/").pop() ?? "";
  const group = DOCS_NAV.find(g => g.pages.some(p => p.slug === currentSlug));
  const page  = group?.pages.find(p => p.slug === currentSlug);

  return (
    <>
      <div className="md:hidden sticky top-16 z-30 bg-white/95 backdrop-blur border-b border-zinc-200 px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-zinc-700 px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50"
        >
          <Menu size={15} />
          Menu
        </button>
        {page && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 min-w-0">
            <span className="truncate text-zinc-400">{group?.group}</span>
            <span className="text-zinc-300">/</span>
            <span className="font-medium text-zinc-700 truncate">{page.title}</span>
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
                  <BookOpen size={13} className="text-white" />
                </div>
                <span className="font-bold text-zinc-900 text-sm">Workflow Docs</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X size={18} />
              </button>
            </div>
            <DocsSidebar />
          </div>
        </div>
      )}
    </>
  );
}
