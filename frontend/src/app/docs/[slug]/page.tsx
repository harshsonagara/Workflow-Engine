"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { PageHeader, PrevNextNav, OnThisPage } from "../../../components/docs/DocComponents";
import { getPageMeta, getPrevNext, getGroupForSlug } from "../../../components/docs/docsConfig";
import { PAGES } from "./pages/pageRegistry";
import { TOCS } from "./pages/tocData";

// ── Dynamic page ──────────────────────────────────────────────────────────────

export default function DocSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const Content = PAGES[slug];
  const meta    = getPageMeta(slug);
  const group   = getGroupForSlug(slug);
  const { prev, next } = getPrevNext(slug);
  const toc     = TOCS[slug] ?? [];

  if (!Content || !meta) {
    notFound();
  }

  return (
    <div className="flex min-h-full">
      {/* Main content */}
      <div className="flex-1 min-w-0 px-6 md:px-10 py-10 max-w-5xl xl:max-w-none min-w-[300px]">
        <PageHeader
          title={meta.title}
          description={meta.description}
          readingTime={meta.readingTime}
          group={group?.group ?? "Docs"}
        />
        <Content />
        <PrevNextNav prev={prev} next={next} />
      </div>

      {/* Right TOC */}
      {toc.length > 0 && <OnThisPage items={toc} />}
    </div>
  );
}
