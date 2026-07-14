import {
  CodeBlock, PropTable, IC, H2, P,
} from "../../../../components/docs/DocComponents";

export default function ArchitecturePage() {
  return (
    <>
      <H2 id="diagram">Architecture Diagram</H2>
      <P>Your host application talks to the engine exclusively via REST. No direct database access. No shared memory.</P>
      <CodeBlock language="plaintext" code={`┌──────────────────────────────────────────────────────┐
│                  Your Application                    │
│       (backend API / frontend / mobile)              │
└────────────────────┬─────────────────────────────────┘
                     │  REST / HTTPS · JWT Bearer Token
                     ▼
┌──────────────────────────────────────────────────────┐
│           Workflow Engine Microservice                │
│                                                      │
│  ┌──────────────┐  ┌────────────────┐  ┌──────────┐  │
│  │  Definition  │  │    Runtime     │  │ Mapping  │  │
│  │  Controller  │  │  Controller    │  │Controller│  │
│  └──────┬───────┘  └───────┬────────┘  └────┬─────┘  │
│         └──────────────────┼────────────────┘         │
│                            ▼                          │
│         Service Layer: DefinitionSvc · RuntimeSvc    │
│                         TaskSvc · QuerySvc            │
│                            ▼                          │
│         Repository Layer (Spring Data JPA / JPQL)    │
│                            ▼                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │           PostgreSQL  (schema: workflow)         │  │
│  │  master · version · instance · task             │  │
│  │  audit_log · transition_history                 │  │
│  │  instance_variable · process_mapping            │  │
│  │  role_registry                                  │  │
│  └─────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘`} />

      <H2 id="layers">Service Layers</H2>
      <PropTable rows={[
        ["Definition Controller",  "REST",        "Yes", "CRUD for workflow masters and versions, validation, activation"],
        ["Runtime Controller",     "REST",        "Yes", "Start instances, execute actions, query status, audit trail"],
        ["Mapping Controller",     "REST",        "Yes", "Register process→workflow mappings, sync roles from IAM"],
        ["DefinitionService",      "Spring Bean", "Yes", "Validate definitionJson, manage master/version lifecycle"],
        ["RuntimeService",         "Spring Bean", "Yes", "Start instances, advance workflow state, create tasks"],
        ["TaskService",            "Spring Bean", "Yes", "Query pending tasks, execute actions, SLA enforcement"],
        ["QueryService",           "Spring Bean", "Yes", "Audit history, dashboard stats, diagnostic info"],
      ]} />

      <H2 id="database">Database Schema</H2>
      <P>All tables live in the <IC>workflow</IC> PostgreSQL schema. The engine uses Hibernate/JPA with JSONB columns for flexible metadata storage.</P>
      <CodeBlock language="sql" code={`-- Core workflow definition
workflow.master              -- Workflow template families (name, code, tenantId)
workflow.version             -- Immutable graph snapshots (definitionJson JSONB)

-- Runtime execution
workflow.instance            -- Live executions (status, currentNodeId, variables JSONB)
workflow.task                -- Per-node user action items (assignee, SLA, status)
workflow.audit_log           -- Append-only event ledger
workflow.transition_history  -- Node-to-node movement log

-- Dynamic variables
workflow.instance_variable   -- KV pairs attached to a running instance

-- Configuration
workflow.process_mapping     -- processCode → workflowCode registry
workflow.role_registry       -- Synced user/role list from IAM`} />
    </>
  );
}
