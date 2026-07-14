import {
  CodeBlock, Callout, PropTable, IC, H2, P,
} from "../../../../components/docs/DocComponents";
import { ArrowRight } from "lucide-react";

export default function IntroductionPage() {
  return (
    <>
      <H2 id="what-is">What is the Workflow Engine?</H2>
      <P>
        The Workflow Engine is a stateful, event-driven orchestration microservice that models multi-step
        business processes as directed graphs of nodes and transitions. It manages task assignment,
        user actions, conditional routing, SLA enforcement, escalation, audit logging, and notifications —
        all through a clean REST API.
      </P>
      <P>
        You never access its database directly. Your application communicates exclusively via HTTPS using
        JWT Bearer tokens. The engine is a standalone Spring Boot service backed by PostgreSQL.
      </P>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
        {[
          { title: "REST API",               desc: "Three controller groups — Definition, Runtime, Mapping" },
          { title: "PostgreSQL Backed",       desc: "Complete audit, history, and variable storage via JSONB" },
          { title: "Graph-based Routing",     desc: "Nodes + connections with conditional branching and SLA" },
        ].map(c => (
          <div key={c.title} className="p-4 rounded-xl border border-zinc-200 bg-zinc-50">
            <p className="font-bold text-zinc-800 text-sm mb-1">{c.title}</p>
            <p className="text-xs text-zinc-500 leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>

      <H2 id="who-for">Who is this for?</H2>
      <ul className="space-y-2 mb-6">
        {[
          "Backend developers integrating the engine into a host application",
          "Frontend developers building task-inbox and workflow-tracking UIs",
          "DevOps engineers deploying and monitoring the service",
          "Solution architects evaluating the engine for new business processes",
        ].map(item => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-600">
            <ArrowRight size={14} className="text-brand-400 mt-0.5 shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      <H2 id="base-url">Base URL &amp; Authentication</H2>
      <P>All API endpoints are served under a single base URL:</P>
      <CodeBlock language="plaintext" code={`https://<your-host>/workflow-engine-api`} />
      <Callout type="note">
        Every request requires <IC>Authorization: Bearer &lt;jwt_token&gt;</IC> in the headers.
        The engine extracts <IC>userId</IC> and <IC>roleCode</IC> from the validated token automatically.
      </Callout>

      <P>All responses are wrapped in a standard envelope:</P>
      <CodeBlock language="json" code={`{
  "success": true,
  "message": "Descriptive message",
  "data": { /* endpoint-specific payload */ }
}`} />

      <P>The engine exposes three controller groups:</P>
      <PropTable rows={[
        ["/workflow-definitions/*", "Definition", "Yes", "CRUD for workflow masters and versions, validation, activation"],
        ["/workflow-runtime/*",     "Runtime",    "Yes", "Start instances, execute actions, query status, audit trail"],
        ["/mappings/*",             "Mapping",    "Yes", "Register process mappings and sync roles/users from IAM"],
      ]} />
    </>
  );
}
