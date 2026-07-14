export interface DocPage {
  slug: string;
  title: string;
  description: string;
  readingTime: string;
}

export interface DocGroup {
  id: string;
  group: string;
  iconName: string;
  pages: DocPage[];
}

export const DOCS_NAV: DocGroup[] = [
  {
    id: "getting-started", group: "Getting Started", iconName: "Zap",
    pages: [
      { slug: "introduction",  title: "Introduction",  description: "What the engine is and who it's for",        readingTime: "2 min" },
      { slug: "architecture",  title: "Architecture",  description: "System design, layers, and components",      readingTime: "3 min" },
      { slug: "core-concepts", title: "Core Concepts", description: "Masters, versions, instances, tasks",        readingTime: "5 min" },
    ],
  },
  {
    id: "lifecycle", group: "Workflow Lifecycle", iconName: "Activity",
    pages: [
      { slug: "lifecycle", title: "Workflow Lifecycle", description: "Design → activate → run → complete",        readingTime: "5 min" },
    ],
  },
  {
    id: "api", group: "API Reference", iconName: "Code2",
    pages: [
      { slug: "api-auth",       title: "Authentication",  description: "Signup, login, and Bearer tokens",         readingTime: "4 min"  },
      { slug: "api-definition", title: "Definition APIs", description: "Create, version, validate, activate",     readingTime: "10 min" },
      { slug: "api-runtime",    title: "Runtime APIs",    description: "Start, act, query, and monitor",          readingTime: "10 min" },
      { slug: "api-mapping",    title: "Mapping APIs",    description: "Process mappings and role sync",           readingTime: "4 min"  },
    ],
  },
  {
    id: "schema", group: "Definition Schema", iconName: "FileCode",
    pages: [
      { slug: "schema", title: "JSON Schema Reference", description: "Nodes, connections, SLA, actions",          readingTime: "8 min" },
    ],
  },

  {
    id: "examples", group: "Examples", iconName: "Play",
    pages: [
      { slug: "example", title: "Leave Approval Walkthrough", description: "Full end-to-end example",            readingTime: "8 min" },
    ],
  },
  {
    id: "guides", group: "Guides", iconName: "Shield",
    pages: [
      { slug: "sla",             title: "SLA & Escalation",  description: "Deadlines and escalation types",      readingTime: "4 min" },
      { slug: "troubleshooting", title: "Troubleshooting",   description: "Common errors and debugging",         readingTime: "5 min" },
    ],
  },
  {
    id: "reference", group: "Reference", iconName: "Lightbulb",
    pages: [
      { slug: "cheatsheet", title: "Cheat Sheet", description: "Quick API reference and checklist",              readingTime: "3 min" },
    ],
  },
];

export const ALL_PAGES: DocPage[] = DOCS_NAV.flatMap(g => g.pages);

export function getPageMeta(slug: string): DocPage | undefined {
  return ALL_PAGES.find(p => p.slug === slug);
}

export function getPrevNext(slug: string): { prev: DocPage | null; next: DocPage | null } {
  const idx = ALL_PAGES.findIndex(p => p.slug === slug);
  return {
    prev: idx > 0 ? ALL_PAGES[idx - 1] : null,
    next: idx < ALL_PAGES.length - 1 ? ALL_PAGES[idx + 1] : null,
  };
}

export function getGroupForSlug(slug: string): DocGroup | undefined {
  return DOCS_NAV.find(g => g.pages.some(p => p.slug === slug));
}
