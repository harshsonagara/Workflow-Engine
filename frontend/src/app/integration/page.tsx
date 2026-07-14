"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import { ResizableSidebar } from "../../components/docs/ResizableSidebar";
import {
  CodeBlock, Callout, IC, P, H2, H3, Badge,
} from "../../components/docs/DocComponents";
import {
  Globe, RefreshCw, Play, Clock, AlertTriangle, ChevronDown,
  ChevronRight, ArrowRight, ArrowLeft, BookOpen, Menu, X,
} from "lucide-react";

// ── Sidebar nav config ────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    id: "overview",
    label: "Overview",
    icon: Globe,
    items: [
      { id: "overview", label: "Integration Flow", desc: "Sequence and prerequisites" },
    ],
  },
  {
    id: "setup",
    label: "One-time Setup",
    icon: RefreshCw,
    items: [
      { id: "step-1", label: "1 · Discover Processes", desc: "Get processCode values" },
      { id: "step-2", label: "2 · Sync Roles",         desc: "Push IAM roles & users" },
    ],
  },
  {
    id: "runtime",
    label: "Runtime Flow",
    icon: Play,
    items: [
      { id: "step-3", label: "3 · Start Workflow",  desc: "Trigger a new instance" },
      { id: "step-4", label: "4 · Poll Status",     desc: "Check until completed" },
      { id: "step-5", label: "5 · Task Inbox",      desc: "Approver pending tasks" },
      { id: "step-6", label: "6 · Get Actions",     desc: "Fetch taskId + buttons" },
      { id: "step-7", label: "7 · Execute Action",  desc: "Submit decision" },
      { id: "step-8", label: "8 · Audit Trail",     desc: "Full event log" },
    ],
  },
  {
    id: "reference",
    label: "Reference",
    icon: AlertTriangle,
    items: [
      { id: "errors", label: "Error Reference", desc: "HTTP codes and fixes" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap(g => g.items);

// ── TOC per section ───────────────────────────────────────────────────────────

const TOCS: Record<string, { id: string; label: string }[]> = {
  overview: [
    { id: "complete-sequence", label: "Complete Sequence" },
    { id: "prerequisites",     label: "Prerequisites" },
  ],
  "step-1": [
    { id: "endpoint",  label: "Endpoint" },
    { id: "save-it",   label: "What to save" },
  ],
  "step-2": [
    { id: "endpoint",  label: "Endpoint" },
    { id: "payload",   label: "Payload structure" },
    { id: "errors-2",  label: "Error responses" },
  ],
  "step-3": [
    { id: "endpoint",    label: "Endpoint" },
    { id: "save-record", label: "Save recordId" },
    { id: "duplicate",   label: "Avoid duplicate starts" },
  ],
  "step-4": [
    { id: "endpoint",      label: "Endpoint" },
    { id: "status-matrix", label: "Status matrix" },
  ],
  "step-5": [
    { id: "option-a", label: "Option A · JWT-scoped" },
    { id: "option-b", label: "Option B · Explicit role" },
  ],
  "step-6": [
    { id: "endpoint",    label: "Endpoint" },
    { id: "sla-display", label: "SLA display guide" },
  ],
  "step-7": [
    { id: "option-a", label: "Option A · JWT-scoped" },
    { id: "option-b", label: "Option B · Explicit actor" },
  ],
  "step-8": [
    { id: "endpoint",       label: "Endpoint" },
    { id: "action-values",  label: "Action value reference" },
  ],
  errors: [
    { id: "envelope",    label: "Error envelope" },
    { id: "error-table", label: "Error codes" },
  ],
};

// ── Simple table (integration-only, not needed in DocComponents) ─────────────

function Table({ cols, rows }: { cols: string[]; rows: string[][] }) {
  return (
    <div className="my-5 rounded-xl border border-zinc-200 overflow-hidden text-[13px]">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
        {cols.map(c => (
          <div key={c} className="px-4 py-2.5 bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-200">{c}</div>
        ))}
        {rows.map((row, i) =>
          row.map((cell, j) => (
            <div
              key={`${i}-${j}`}
              className={`px-4 py-3 text-[12px] border-b border-zinc-100 leading-relaxed
                ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/50"}
                ${j === 0 ? "font-mono font-semibold text-brand-700" : "text-zinc-600"}`}
            >
              {cell}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Endpoint row ──────────────────────────────────────────────────────────────

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-6">
      <Badge method={method} />
      <code className="text-[13px] text-zinc-600 font-mono">{path}</code>
    </div>
  );
}

// ── Section components ────────────────────────────────────────────────────────

function SectionOverview() {
  return (
    <>
      <P>
        A complete sequence for connecting any external system to the Workflow Engine —
        from discovering process codes to reading the final audit trail.
        All paths are relative to your host (e.g. <IC>http://localhost:8080</IC>).
        Every request requires <IC>Authorization: Bearer {"<token>"}</IC>.
      </P>

      <H2 id="complete-sequence">Complete Sequence</H2>
      <div className="rounded-xl border border-zinc-200 overflow-hidden my-5">
        <div className="px-5 py-3 border-b border-zinc-200 bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
          All phases at a glance
        </div>
        <div className="p-5 space-y-3">
          {[
            { phase: "One-time", color: "bg-violet-100 text-violet-700 border-violet-200", items: ["GET  /mappings/processes                           → discover processCode", "POST /mappings/roles/sync                        → register roles & users"] },
            { phase: "Submit",   color: "bg-blue-100 text-blue-700 border-blue-200",       items: ["POST /workflow-runtime/start                    → start workflow → save recordId"] },
            { phase: "Status",   color: "bg-amber-100 text-amber-700 border-amber-200",    items: ["GET  /workflow-runtime/instance/by-record/{id}  → poll until completed"] },
            { phase: "Approver", color: "bg-emerald-100 text-emerald-700 border-emerald-200", items: ["GET  /workflow-runtime/pending-tasks             → task inbox (JWT)", "GET  /workflow-runtime/actions?recordId=        → get taskId + buttons", "POST /workflow-runtime/action                   → submit decision"] },
            { phase: "Audit",    color: "bg-zinc-100 text-zinc-700 border-zinc-200",       items: ["GET  /workflow-runtime/history?recordId=        → full audit trail"] },
          ].map(g => (
            <div key={g.phase} className="flex items-start gap-3">
              <span className={`shrink-0 mt-0.5 inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${g.color}`}>{g.phase}</span>
              <div className="space-y-0.5">
                {g.items.map(item => (
                  <p key={item} className="text-[12px] font-mono text-zinc-600">{item}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <H2 id="prerequisites">Prerequisites</H2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {[
          { label: "processCode required",   color: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "JWT Bearer auth",         color: "bg-sky-50 border-sky-200 text-sky-700" },
          { label: "JSON request/response",   color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
        ].map(b => (
          <div key={b.label} className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[12px] font-semibold ${b.color}`}>
            {b.label}
          </div>
        ))}
      </div>
    </>
  );
}

function SectionStep1() {
  return (
    <>
      <P>
        Fetch the list of active process mappings to find the <IC>processCode</IC> your integration
        will use. Each entry maps a stable code (e.g. <IC>LEAVE</IC>) to a workflow version, keeping
        your app decoupled from internal workflow IDs.
      </P>

      <H2 id="endpoint">Endpoint</H2>
      <Endpoint method="GET" path="/workflow-engine-api/mappings/processes" />
      <H3>Request</H3>
      <CodeBlock language="http" code={`GET /workflow-engine-api/mappings/processes
Authorization: Bearer <token>`} />

      <H3>Response (200 OK)</H3>
      <CodeBlock language="json" code={`{
  "success": true,
  "message": "Processes retrieved successfully",
  "data": [
    {
      "id":                1,
      "processCode":       "LEAVE",
      "processName":       "Leave Approval",
      "description":       "Approval process for employee leave requests",
      "workflowMasterId":  1605,
      "entityType":        "leave_request",
      "businessKeyPrefix": "LEAVE",
      "assignmentConfig":  {},
      "isActive":          true
    }
  ]
}`} />

      <H2 id="save-it">What to save</H2>
      <Callout type="tip">
        <IC>data[n].processCode</IC> — the string you pass to <IC>/start</IC> (e.g. <IC>LEAVE</IC>).
        Store it in your config; it changes only when your workflow admin creates a new mapping.
      </Callout>
    </>
  );
}

function SectionStep2() {
  return (
    <>
      <P>
        Push your organisation's current users and roles into the engine's role registry.
        This enables task assignment routing and populates human-readable names in audit history.
        Call again whenever your IAM changes.
      </P>

      <H2 id="endpoint">Endpoint</H2>
      <Endpoint method="POST" path="/workflow-engine-api/mappings/roles/sync" />

      <H2 id="payload">Payload structure</H2>
      <H3>Request</H3>
      <CodeBlock language="http" code={`POST /workflow-engine-api/mappings/roles/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "source": "HRMS",
  "roles": [
    { "id": "role_manager",  "label": "Department Manager", "type": "role" },
    { "id": "emp_101",       "label": "Rahul Sharma",       "type": "user" }
  ]
}`} />

      <H3>Response (200 OK)</H3>
      <CodeBlock language="json" code={`{ 
  "success": true, 
  "message": "Roles synced successfully for source 'HRMS'", 
  "data": {} 
}`} />

      <H2 id="errors-2">Error responses</H2>
      <Callout type="warning">
        This is a <strong>full replace</strong> per source. Send the complete list for the given{" "}
        <IC>source</IC> value — entries absent from the payload are removed, which can break
        routing for in-flight workflows.
      </Callout>
      <CodeBlock language="json" code={`→ 400  (missing source)
{ "success": false, "message": "'source' field is required" }

→ 400  (invalid entry format)
{ "success": false, "message": "Invalid roles format. Each role must have 'id', 'label', and 'type' fields." }`} />
    </>
  );
}

function SectionStep3() {
  return (
    <>
      <P>
        Call this immediately after your user submits a form or creates a record that needs approval.
        The engine creates a new instance, generates a sequential human-readable <IC>recordId</IC>,
        assigns the first task, and returns your handle for all subsequent calls.
      </P>

      <H2 id="endpoint">Endpoint</H2>
      <Endpoint method="POST" path="/workflow-engine-api/workflow-runtime/start" />
      <H3>Request</H3>
      <CodeBlock language="http" code={`POST /workflow-engine-api/workflow-runtime/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "processCode":     "LEAVE",
  "initiatedBy":     "emp_101",
  "initiatedByName": "Rahul Sharma",
  "context": {
    "application": "HR Portal",
    "entityType":  "leave_request",
    "entityId":    "5001",
    "businessKey": "LEAVE-2026-000001",
    "variables":   { "leaveDays": 3 },
    "metadata":    { "subject": "Casual Leave Application" }
  }
}`} />

      <H3>Response (200 OK)</H3>
      <CodeBlock language="json" code={`{
  "success": true,
  "message": "Workflow started successfully",
  "data": {
    "success":            true,
    "workflowInstanceId": 42,
    "taskId":             99,
    "recordId":           "LEAVE-2026-000001",
    "status":             "running",
    "currentNodeId":      "approval_node_1",
    "message":            "Workflow instance started successfully"
  }
}`} />

      <H3>Error Responses</H3>
      <CodeBlock language="json" code={`→ 400 (processCode missing)
{ "success": false, "message": "processCode is required." }

→ 404 (processCode not mapped or inactive)
{ "success": false, "message": "No active process mapping found for code: LEAVE" }`} />

      <H2 id="save-record">Save recordId</H2>
      <Callout type="tip">
        <IC>data.recordId</IC> (e.g. <IC>LEAVE-2026-000001</IC>) — your permanent handle.
        Store it in your database alongside the record. Every subsequent call uses it.
      </Callout>

      <H2 id="duplicate">Avoid duplicate starts</H2>
      <Callout type="warning">
        Before calling <IC>/start</IC> for an existing record, call{" "}
        <IC>GET /instance/by-record/{"{recordId}"}</IC> first. Sending the same record
        twice while a workflow is running returns HTTP 409.
      </Callout>
    </>
  );
}

function SectionStep4() {
  return (
    <>
      <P>
        Check the current state of any workflow instance by its <IC>recordId</IC>. Poll until{" "}
        <IC>status</IC> is <IC>completed</IC> (or <IC>terminated</IC>), then read{" "}
        <IC>outcome</IC> to determine whether the record was approved or rejected.
      </P>

      <H2 id="endpoint">Endpoint</H2>
      <Endpoint method="GET" path="/workflow-engine-api/workflow-runtime/instance/by-record/{recordId}" />
      <H3>Request</H3>
      <CodeBlock language="http" code={`GET /workflow-engine-api/workflow-runtime/instance/by-record/LEAVE-2026-000001
Authorization: Bearer <token>`} />

      <H3>Response (200 OK - running)</H3>
      <CodeBlock language="json" code={`{
  "success": true,
  "message": "Instance retrieved",
  "data": {
    "id":            42,
    "recordId":      "LEAVE-2026-000001",
    "status":        "running",
    "currentNodeId": "approval_node_1",
    "outcome":       null,
    "workflowVersionId": 9187,
    "createdAt":     "2026-06-15T10:00:00Z",
    "completedAt":   null,
    "workflowTasks": []
  }
}`} />

      <H3>Response (200 OK - completed)</H3>
      <CodeBlock language="json" code={`{ 
  "success": true,
  "message": "Instance retrieved",
  "data": { 
    "status": "completed", 
    "outcome": "success",  
    "completedAt": "2026-06-15T10:30:00Z",
    "workflowTasks": [] 
  } 
}`} />

      <H2 id="status-matrix">Status matrix</H2>
      <Table
        cols={["status", "outcome", "Meaning"]}
        rows={[
          ["running",    "null",    "Awaiting approver action"],
          ["completed",  "success", "All approval nodes passed — record approved"],
          ["completed",  "failure", "A rejection branch was taken — record rejected"],
          ["terminated", "null",    "Admin forcefully stopped the instance"],
        ]}
      />
    </>
  );
}

function SectionStep5() {
  return (
    <>
      <P>
        Two variants: <strong>Option A</strong> (JWT-scoped) returns only tasks assigned to the
        authenticated user — ideal for user-facing apps. <strong>Option B</strong> lets a backend
        service query by an explicit role or user ID.
      </P>

      <H2 id="option-a">Option A · JWT-scoped</H2>
      <P>Recommended for user-facing apps where the approver is logged in.</P>
      <H3>Request</H3>
      <CodeBlock language="http" code={`GET /workflow-engine-api/workflow-runtime/pending-tasks
Authorization: Bearer <approver-jwt>`} />

      <H3>Response (200 OK)</H3>
      <CodeBlock language="json" code={`{
  "success": true,
  "message": "Pending tasks retrieved",
  "data": [
    {
      "taskId":       99,
      "instanceId":   42,
      "recordId":     "LEAVE-2026-000001",
      "workflowName": "Leave Approval",
      "nodeLabel":    "HR Manager Review",
      "allowEdit":    true,
      "createdAt":    "2026-06-15T10:00:00Z",
      "slaStatus": { 
        "deadline":         "2026-06-17T10:00:00Z", 
        "breached":         false,
        "breachedAt":       null,
        "breachedDuration": null,
        "escalationType":   "None",
        "warningMessage":   null,
        "canTakeAction":    true,
        "originalAssignee": null,
        "escalated":        false
      }
    }
  ]
}`} />

      <H2 id="option-b">Option B · Explicit role</H2>
      <P>For backend services acting on behalf of a user or role.</P>
      <H3>Request</H3>
      <CodeBlock language="http" code={`POST /workflow-engine-api/workflow-runtime/tasks/pending
Authorization: Bearer <service-token>
Content-Type: application/json

{ 
  "assignedRole": "HR_MANAGER" 
}`} />

      <H3>Response (200 OK)</H3>
      <CodeBlock language="json" code={`{
  "success": true,
  "message": "Tasks retrieved",
  "data": [
    {
      "id":                 99,
      "workflowInstanceId": 42,
      "recordId":           "LEAVE-2026-000001",
      "nodeId":             "approval_node_1",
      "assignedTo":         null,
      "assignedRole":       "HR_MANAGER",
      "status":             "pending",
      "actionTaken":        false,
      "slaDeadline":        "2026-06-17T04:58:43Z",
      "slaBreached":        false,
      "escalated":          false,
      "allowEdit": true
    }
  ]
}`} />
      <Callout type="note">
        <IC>recordId</IC> from any task entry → pass to Step 6 to get action buttons for that record.
      </Callout>
    </>
  );
}

function SectionStep6() {
  return (
    <>
      <P>
        <strong>Always call this before rendering action buttons.</strong> It returns the exact{" "}
        <IC>taskId</IC> for the current pending node and the full action configuration — labels,
        whether remarks are required, and predefined rejection reasons.
        Never hardcode button lists.
      </P>

      <H2 id="endpoint">Endpoint</H2>
      <Endpoint method="GET" path="/workflow-engine-api/workflow-runtime/actions?recordId=…" />
      <H3>Request</H3>
      <CodeBlock language="http" code={`GET /workflow-engine-api/workflow-runtime/actions?recordId=LEAVE-2026-000001
Authorization: Bearer <approver-token>`} />

      <H3>Response (200 OK)</H3>
      <CodeBlock language="json" code={`{
  "success": true,
  "message": "Actions retrieved",
  "data": {
    "taskId":           99,
    "instanceId":       42,
    "recordId":         "LEAVE-2026-000001",
    "workflowName":     "Leave Approval",
    "currentNodeId":    "approval_node_1",
    "currentNodeLabel": "HR Manager Review",
    "availableActions": [
      {
        "action":           "approve",
        "label":            "Approve",
        "requiresRemarks":  false,
        "remarksMandatory": false,
        "predefinedReasons": []
      },
      {
        "action":           "reject",
        "label":            "Reject",
        "requiresRemarks":  true,
        "remarksMandatory": true,
        "predefinedReasons": ["Insufficient leave balance", "Dates conflict"]
      }
    ],
    "status": "pending",
    "slaStatus": { 
      "deadline":         "2026-06-17T10:00:00Z", 
      "breached":         false,
      "breachedAt":       null,
      "breachedDuration": null,
      "escalationType":   "None",
      "warningMessage":   null,
      "canTakeAction":    true,
      "originalAssignee": null,
      "escalated":        false
    },
    "allowEdit": true
  }
}`} />

      <H3>Error Responses</H3>
      <CodeBlock language="json" code={`→ 404 (no active workflow)
{ "success": false, "message": "No active workflow instance found for form record 'LEAVE-2026-000001'" }`} />
      <Callout type="tip">
        <IC>data.taskId</IC> — required when submitting the action in Step 7.
      </Callout>

      <H2 id="sla-display">SLA display guide</H2>
      <Table
        cols={["slaStatus.status", "What to show in your UI"]}
        rows={[
          ["ON_TIME",  "Quiet deadline display — no urgency"],
          ["DUE_SOON", "Amber highlight — approver should act soon"],
          ["OVERDUE",  "Red breach badge — action still allowed but SLA violated"],
        ]}
      />
    </>
  );
}

function SectionStep7() {
  return (
    <>
      <P>
        Submit the approver's decision. Use <strong>Option A</strong> for end-user apps where
        the approver is logged in via JWT. Use <strong>Option B</strong> for backend services
        acting on behalf of a user.
      </P>

      <H2 id="option-a">Option A · JWT-scoped</H2>
      <H3>Request</H3>
      <CodeBlock language="http" code={`POST /workflow-engine-api/workflow-runtime/action
Authorization: Bearer <approver-jwt>
Content-Type: application/json

{
  "taskId":  99,
  "action":  "approve",
  "remarks": "Approved — leave balance verified"
}`} />

      <H3>Response (200 OK)</H3>
      <CodeBlock language="json" code={`{
  "success": true,
  "message": "Action 'approve' executed successfully",
  "data": { "id": 99, "status": "Approve", "actionTaken": true }
}`} />

      <H3>Error Responses</H3>
      <CodeBlock language="json" code={`→ 400 (task already actioned)
{ "success": false, "message": "Task 99 is not in pending state (current: Approve)" }

→ 403 (user not assigned to this task)
{ "success": false, "message": "User 'emp_101' is not assigned to task 99" }`} />

      <H2 id="option-b">Backend / proxy services</H2>
      <P>
        There is only one execute endpoint — <IC>POST /action</IC>. Identity always comes from request headers
        or a Bearer JWT, never from the body. For backend services, pass{" "}
        <IC>X-Test-Role</IC> and <IC>X-Test-User-Id</IC> (or issue a service JWT with those claims).
      </P>
      <H3>Request</H3>
      <CodeBlock language="http" code={`POST /workflow-engine-api/workflow-runtime/action
Authorization: Bearer <service-token>
X-Test-Role: HR_MANAGER
X-Test-User-Id: emp_102
Content-Type: application/json

{
  "taskId":   99,
  "recordId": "LEAVE-2026-000001",
  "action":   "approve",
  "remarks":  "Approved via HR system"
}`} />

      <H3>Response (200 OK)</H3>
      <CodeBlock language="json" code={`{
  "success": true,
  "message": "Action 'approve' executed successfully",
  "data": {
    "id":                 99,
    "workflowInstanceId": 42,
    "recordId":           "LEAVE-2026-000001",
    "nodeId":             "approval_node_1",
    "assignedTo":         "emp_102",
    "status":             "Approve",
    "remarks":            "Approved via HR system",
    "createdAt":          "2026-06-15T10:00:00Z",
    "actedAt":            "2026-06-15T10:28:00Z",
    "actionTaken":        true
  }
}`} />
    </>
  );
}

function SectionStep8() {
  return (
    <>
      <P>
        Fetch the full chronological event log for a record. Use this to render a Timeline or
        History component. Each entry shows who acted, what they did, when, and any remarks.
      </P>

      <H2 id="endpoint">Endpoint</H2>
      <Endpoint method="GET" path="/workflow-engine-api/workflow-runtime/history?recordId=…" />
      <H3>Request</H3>
      <CodeBlock language="http" code={`GET /workflow-engine-api/workflow-runtime/history?recordId=LEAVE-2026-000001
Authorization: Bearer <token>`} />

      <H3>Response (200 OK)</H3>
      <CodeBlock language="json" code={`{
  "success": true,
  "message": "History retrieved",
  "data": [
    {
      "title":   "Workflow Started",
      "step":    "Initiation",
      "action":  "workflow_started",
      "by":      "Rahul Sharma",
      "remarks": "Workflow started for leave_request:5001",
      "date":    "2026-06-15T10:00:00Z",
      "status":  "completed"
    },
    {
      "title":   "Task Created",
      "step":    "HR Manager Review",
      "action":  "task_created",
      "by":      "System",
      "remarks": "Created task for node 'approval_node_1' — assigned to role HR_MANAGER",
      "date":    "2026-06-15T10:00:01Z",
      "status":  "pending"
    },
    {
      "title":   "Task Approved",
      "step":    "HR Manager Review",
      "action":  "approve",
      "by":      "Priya Mehta",
      "remarks": "Approved — leave balance verified",
      "date":    "2026-06-15T10:28:00Z",
      "status":  "completed"
    }
  ]
}`} />

      <H2 id="action-values">Action value reference</H2>
      <Callout type="note">
        <IC>action</IC> values:{" "}
        <IC>workflow_started</IC> · <IC>task_created</IC> · <IC>approve</IC> ·{" "}
        <IC>reject</IC> · <IC>sendback</IC> · <IC>workflow_completed</IC> ·{" "}
        <IC>sla_breached</IC> · <IC>escalated</IC>
      </Callout>
    </>
  );
}

function SectionErrors() {
  return (
    <>
      <P>All error responses share the same envelope shape regardless of endpoint.</P>

      <H2 id="envelope">Error envelope</H2>
      <CodeBlock language="json" code={`{ "success": false, "message": "human-readable description", "data": null }`} />

      <H2 id="error-table">Error codes</H2>
      <Table
        cols={["Code", "When", "Fix"]}
        rows={[
          ["400", "Missing required fields, invalid processCode, task already actioned", "Check the request body; verify processCode is active and the task is still pending"],
          ["401", "Missing or expired JWT token", "Refresh the Bearer token and retry"],
          ["403", "Authenticated user is not assigned to the task", "Verify role assignment in the workflow config"],
          ["404", "processCode not mapped / recordId not found / task does not exist", "Confirm processCode is active; check that recordId is the exact value returned by /start"],
          ["409", "A workflow is already running for this record", "Call GET /instance/by-record/{recordId} first before calling /start again"],
          ["422", "Workflow definition has validation errors", "Fix the workflow definition in the designer and re-activate the version"],
          ["500", "Internal server error", "Check server logs; contact your Workflow Engine admin"],
        ]}
      />

      <div className="mt-8 p-5 rounded-xl border border-brand-200 bg-brand-50 flex items-start gap-4">
        <BookOpen size={18} className="shrink-0 mt-0.5 text-brand-500" />
        <div>
          <p className="font-semibold text-zinc-900 text-[14px] mb-1">Full API Reference</p>
          <p className="text-[13px] text-zinc-600 mb-3">
            Every endpoint is documented with request schemas, all response variants, and error codes.
          </p>
          <Link
            href="/docs/api-runtime"
            className="inline-flex items-center gap-1.5 text-[13px] text-brand-600 hover:text-brand-800 font-semibold transition-colors"
          >
            Open API Reference <ChevronRight size={13} />
          </Link>
        </div>
      </div>
    </>
  );
}

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  overview: SectionOverview,
  "step-1":  SectionStep1,
  "step-2":  SectionStep2,
  "step-3":  SectionStep3,
  "step-4":  SectionStep4,
  "step-5":  SectionStep5,
  "step-6":  SectionStep6,
  "step-7":  SectionStep7,
  "step-8":  SectionStep8,
  errors:    SectionErrors,
};

const SECTION_META: Record<string, { title: string; description: string; readingTime: string }> = {
  overview: { title: "Integration Flow",           description: "Complete sequence and prerequisites",       readingTime: "3 min" },
  "step-1": { title: "1 · Discover Processes",     description: "Fetch available processCode values",        readingTime: "2 min" },
  "step-2": { title: "2 · Sync Roles & Users",     description: "Push your IAM roles and users",            readingTime: "2 min" },
  "step-3": { title: "3 · Start a Workflow",        description: "Trigger a new workflow instance",          readingTime: "2 min" },
  "step-4": { title: "4 · Poll Status",             description: "Check instance state until completed",     readingTime: "2 min" },
  "step-5": { title: "5 · Task Inbox",              description: "Build the approver pending-tasks view",    readingTime: "2 min" },
  "step-6": { title: "6 · Get Available Actions",   description: "Fetch taskId and action buttons",          readingTime: "2 min" },
  "step-7": { title: "7 · Execute an Action",       description: "Submit an approver decision",              readingTime: "2 min" },
  "step-8": { title: "8 · Audit Trail",             description: "Read the full chronological event log",    readingTime: "2 min" },
  errors:   { title: "Error Reference",             description: "HTTP error codes and how to fix them",     readingTime: "3 min" },
};

// ── Sidebar (replicates DocsSidebar style) ────────────────────────────────────

function IntegrationSidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(NAV_GROUPS.map(g => g.id))
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
      {NAV_GROUPS.map(group => {
        const Icon = group.icon;
        const isOpen = expanded.has(group.id);
        const hasActive = group.items.some(i => i.id === active);

        return (
          <div key={group.id}>
            <button
              onClick={() => toggle(group.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-colors
                ${hasActive ? "text-brand-700 bg-brand-50" : "text-zinc-700 hover:bg-zinc-100"}`}
            >
              <Icon size={14} className={hasActive ? "text-brand-500" : "text-zinc-400"} />
              <span className="flex-1 text-left">{group.label}</span>
              <ChevronDown
                size={12}
                className={`transition-transform text-zinc-400 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isOpen && (
              <ul className="ml-3 pl-3 border-l border-zinc-200/80 mt-0.5 mb-1 space-y-0.5">
                {group.items.map(item => {
                  const isActive = item.id === active;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => onSelect(item.id)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-colors
                          ${isActive
                            ? "bg-brand-600 text-white font-semibold shadow-sm shadow-brand-500/30"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                          }`}
                      >
                        {item.label}
                      </button>
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

// ── Right TOC ─────────────────────────────────────────────────────────────────

function IntegrationTOC({ items }: { items: { id: string; label: string }[] }) {
  if (!items.length) return null;
  return (
    <ResizableSidebar
      defaultWidth={208}
      minWidth={150}
      maxWidth={320}
      position="right"
      className="hidden xl:flex sticky top-16 h-[calc(100vh-4rem)] pl-6 py-8 border-l border-zinc-100/50"
    >
      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">On this page</p>
      <ul className="space-y-1.5">
        {items.map(item => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block text-xs text-zinc-500 hover:text-brand-600 transition-colors leading-relaxed"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </ResizableSidebar>
  );
}

// ── Mobile sidebar drawer ─────────────────────────────────────────────────────

function MobileSidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const group = NAV_GROUPS.find(g => g.items.some(i => i.id === active));
  const item  = group?.items.find(i => i.id === active);

  const handleSelect = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

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
        {item && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 min-w-0">
            <span className="truncate text-zinc-400">{group?.label}</span>
            <span className="text-zinc-300">/</span>
            <span className="font-medium text-zinc-700 truncate">{item.label}</span>
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
                  <Globe size={13} className="text-white" />
                </div>
                <span className="font-bold text-zinc-900 text-sm">Integration Guide</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X size={18} />
              </button>
            </div>
            <IntegrationSidebar active={active} onSelect={handleSelect} />
          </div>
        </div>
      )}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function IntegrationPage() {
  const [active, setActive] = useState("overview");

  const currentIdx = ALL_ITEMS.findIndex(i => i.id === active);
  const prev = currentIdx > 0 ? ALL_ITEMS[currentIdx - 1] : null;
  const next = currentIdx < ALL_ITEMS.length - 1 ? ALL_ITEMS[currentIdx + 1] : null;

  const Content = SECTION_COMPONENTS[active] ?? SectionOverview;
  const meta    = SECTION_META[active];
  const toc     = TOCS[active] ?? [];
  const group   = NAV_GROUPS.find(g => g.items.some(i => i.id === active));

  const handleSelect = useCallback((id: string) => {
    setActive(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      {/* Mobile sidebar */}
      <MobileSidebar active={active} onSelect={handleSelect} />

      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <ResizableSidebar
          defaultWidth={240}
          minWidth={200}
          maxWidth={400}
          position="left"
          className="hidden md:flex sticky top-16 h-[calc(100vh-4rem)] border-r border-zinc-100 bg-white"
        >
          <div className="pt-4">

            <IntegrationSidebar active={active} onSelect={handleSelect} />
          </div>
        </ResizableSidebar>

        {/* Main content */}
        <main className="flex-1 min-w-0 flex min-h-full">
          <div className="flex-1 min-w-0 px-6 md:px-10 py-10 max-w-5xl xl:max-w-none">

            {/* Page header (matches DocComponents PageHeader) */}
            <div className="mb-10 pb-8 border-b border-zinc-100">
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-3">
                <span>Integration Guide</span>
                <ArrowRight size={11} />
                {group && group.label !== "Overview" && (
                  <>
                    <span>{group.label}</span>
                    <ArrowRight size={11} />
                  </>
                )}
                <span className="text-brand-500">{meta.title}</span>
              </div>
              <h1 className="text-3xl font-extrabold text-zinc-900 mb-3 leading-tight">{meta.title}</h1>
              <p className="text-zinc-500 text-[15px] leading-relaxed mb-4">{meta.description}</p>
              <div className="flex items-center gap-4 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>{meta.readingTime} read</span>
                </div>
                <Link href="/docs" className="hover:text-brand-600 transition-colors">← Back to Docs</Link>
              </div>
            </div>

            {/* Content */}
            <Content />

            {/* Prev / Next nav */}
            <div className="mt-16 pt-8 border-t border-zinc-100 flex items-stretch gap-4">
              {prev ? (
                <button
                  onClick={() => handleSelect(prev.id)}
                  className="flex-1 flex items-center gap-4 p-5 rounded-xl border border-zinc-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all group text-left"
                >
                  <ArrowLeft size={18} className="text-zinc-400 group-hover:text-brand-500 transition-colors shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Previous</p>
                    <p className="font-semibold text-zinc-800 text-sm group-hover:text-brand-700 transition-colors">{prev.label}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{prev.desc}</p>
                  </div>
                </button>
              ) : <div className="flex-1" />}

              {next ? (
                <button
                  onClick={() => handleSelect(next.id)}
                  className="flex-1 flex items-center justify-end gap-4 p-5 rounded-xl border border-zinc-200 hover:border-brand-300 hover:bg-brand-50/30 transition-all group text-right"
                >
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Next</p>
                    <p className="font-semibold text-zinc-800 text-sm group-hover:text-brand-700 transition-colors">{next.label}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{next.desc}</p>
                  </div>
                  <ArrowRight size={18} className="text-zinc-400 group-hover:text-brand-500 transition-colors shrink-0" />
                </button>
              ) : <div className="flex-1" />}
            </div>
          </div>

          {/* Right TOC */}
          <IntegrationTOC items={toc} />
        </main>
      </div>
    </div>
  );
}
