"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Callout, IC, H2, H3, P, CodeBlock,
} from "../../../../components/docs/DocComponents";

// ── small helper: "save this" banner ─────────────────────────────────────────
function Save({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 my-3 px-3 py-2 rounded-lg bg-brand-50 border border-brand-200 text-xs text-brand-800">
      <span className="font-bold shrink-0 mt-0.5">↓ Save:</span>
      <span>{children}</span>
    </div>
  );
}

// ── small helper: "use next" banner ──────────────────────────────────────────
function Use({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 my-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
      <span className="font-bold shrink-0 mt-0.5">→ Use in:</span>
      <span>{children}</span>
    </div>
  );
}

export default function ThirdPartyPage() {
  return (
    <>
      <P>
        This guide walks you through every API call needed to connect an external system — HRMS, ERP, or
        any web application — to the Workflow Engine. Steps are ordered: one-time setup first, then the
        per-submission runtime flow. Every request shows full headers, URL, body, and response.
      </P>

      <Callout type="tip">
        A ready-to-run Postman collection covering all steps is available in the project repo at{" "}
        <IC>workflow/workflow-engine-third-party-integration.postman_collection.json</IC>. Import it, set{" "}
        <IC>baseUrl</IC> and <IC>jwtToken</IC>, and run the &quot;5. Integration Test Flow&quot; folder
        in order.
      </Callout>

      {/* ── Integration flow ────────────────────────────────────────────── */}
      <H2 id="flow">Integration Flow</H2>
      <div className="my-5 p-5 rounded-xl border border-zinc-200 bg-zinc-50">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-4">Full sequence</p>
        <div className="space-y-2">
          {[
            { label: "One-time",  color: "bg-violet-100 text-violet-700 border border-violet-200", steps: [
              "GET  /mappings/processes       → discover your processCode",
              "POST /mappings/roles/sync      → register your roles & users",
            ]},
            { label: "Per-submit", color: "bg-blue-100 text-blue-700 border border-blue-200", steps: [
              "POST /workflow-runtime/start               → trigger workflow, save recordId",
            ]},
            { label: "Status", color: "bg-amber-100 text-amber-700 border border-amber-200", steps: [
              "GET  /workflow-runtime/instance/by-record/ → poll until status = completed",
            ]},
            { label: "Approver", color: "bg-emerald-100 text-emerald-700 border border-emerald-200", steps: [
              "GET  /workflow-runtime/pending-tasks       → task inbox for the approver",
              "GET  /workflow-runtime/actions?recordId=   → get taskId + action buttons",
              "POST /workflow-runtime/action              → submit approval/rejection",
            ]},
            { label: "Audit", color: "bg-zinc-200 text-zinc-700 border border-zinc-300", steps: [
              "GET  /workflow-runtime/history?recordId=   → full audit trail",
            ]},
          ].map(group => (
            <div key={group.label} className="flex items-start gap-3">
              <span className={`mt-0.5 shrink-0 inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${group.color}`}>
                {group.label}
              </span>
              <div className="space-y-0.5">
                {group.steps.map(s => (
                  <p key={s} className="text-[12px] font-mono text-zinc-700">{s}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Callout type="note">
        <strong>Base URL:</strong> all paths below are relative to{" "}
        <IC>https://your-host</IC>. In local development this is typically{" "}
        <IC>http://localhost:8080</IC>. Replace <IC>{"<token>"}</IC> with a valid JWT Bearer token.
      </Callout>

      {/* ═══════════════════════════════════════════════════════════════════
          ONE-TIME SETUP
      ════════════════════════════════════════════════════════════════════ */}
      <H2 id="setup">One-time Setup</H2>
      <P>
        Run these two calls once during integration setup, and again whenever your IAM/roles change.
        They configure the Workflow Engine so it knows which workflow to trigger and which users can
        approve tasks.
      </P>

      {/* Step 1 ──────────────────────────────────────────────────────── */}
      <H3 id="step-discover">Step 1 — Discover Available Process Codes</H3>
      <P>
        Before writing any code, fetch the list of active process mappings to find the{" "}
        <IC>processCode</IC> your integration should use. Each entry maps a stable code (e.g.{" "}
        <IC>LEAVE</IC>) to an underlying workflow version.
      </P>
      <CodeBlock language="http" code={`GET /workflow-engine-api/mappings/processes
Authorization: Bearer <token>

→ 200 OK
{
  "success": true,
  "data": [
    {
      "id":                1,
      "processCode":       "LEAVE",
      "processName":       "Leave Approval",
      "description":       "Standard leave request approval workflow",
      "entityType":        "leave_request",
      "businessKeyPrefix": "LEAVE",
      "assignmentConfig":  { "role": "HR_MANAGER" },
      "isActive":          true
    },
    {
      "id":                2,
      "processCode":       "PURCHASE",
      "processName":       "Purchase Order Approval",
      "entityType":        "purchase_order",
      "businessKeyPrefix": "PO",
      "isActive":          true
    }
  ]
}`} />
      <Save><IC>processCode</IC> — the value your system will pass in <IC>/start</IC> (e.g. <IC>LEAVE</IC>)</Save>
      <Callout type="tip">
        You can also browse and manage process mappings in the{" "}
        <Link href="/mappings" className="text-brand-600 hover:underline font-semibold">Process Mappings UI</Link>.
        The <IC>businessKeyPrefix</IC> tells you how auto-generated record IDs are prefixed (e.g.{" "}
        <IC>LEAVE-2026-000001</IC>).
      </Callout>

      {/* Step 2 ──────────────────────────────────────────────────────── */}
      <H3 id="step-sync">Step 2 — Sync Roles &amp; Users from Your IAM</H3>
      <P>
        Register the roles and individual users from your external system (HRMS, Active Directory, etc.)
        into the Workflow Engine role registry. These entries populate assignment dropdowns in the
        Workflow Designer and drive task routing at runtime.
      </P>
      <Callout type="important">
        This is a <strong>full replace</strong> per source, not an upsert. Always send the complete list
        for the given <IC>source</IC> value — any roles absent from the payload will be removed, which
        can break task assignment for running workflows.
      </Callout>
      <CodeBlock language="http" code={`POST /workflow-engine-api/mappings/roles/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "source": "HRMS",
  "roles": [
    { "id": "role_manager",  "label": "Department Manager", "type": "role" },
    { "id": "role_hr_admin", "label": "HR Admin",           "type": "role" },
    { "id": "emp_101",       "label": "Rahul Sharma",       "type": "user" },
    { "id": "emp_102",       "label": "Priya Mehta",        "type": "user" }
  ]
}

→ 200 OK
{ "success": true, "message": "Roles synced successfully for source 'HRMS'", "data": null }

→ 400 Bad Request (invalid format)
{ "success": false, "message": "Invalid roles format. Each role must have 'id', 'label', and 'type' fields." }

→ 400 Bad Request (missing source)
{ "success": false, "message": "'source' field is required" }`} />

      {/* ═══════════════════════════════════════════════════════════════════
          RUNTIME — PER SUBMISSION
      ════════════════════════════════════════════════════════════════════ */}
      <H2 id="step-start">Step 3 — Start a Workflow (on Form Submit)</H2>
      <P>
        Call this immediately after your user submits a form or creates a record that requires approval.
        The engine creates a new <IC>WorkflowInstance</IC>, generates a sequential human-readable{" "}
        <IC>recordId</IC>, assigns the first task, and returns everything you need to track progress.
      </P>
      <CodeBlock language="http" code={`POST /workflow-engine-api/workflow-runtime/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "processCode":     "LEAVE",           ← required: from Step 1
  "initiatedBy":     "emp_101",         ← user ID of the submitter
  "initiatedByName": "Rahul Sharma",    ← display name shown in history
  "context": {
    "entityType":  "leave_request",     ← domain type (used for task filtering)
    "entityId":    "5001",              ← primary key in your system
    "variables": {
      "leaveDays": 3                    ← any values used in conditional routing
    },
    "metadata": {
      "subject": "Casual Leave Application"   ← display info only, not used in routing
    }
  }
}

→ 200 OK
{
  "success": true,
  "data": {
    "workflowInstanceId": 42,
    "taskId":             99,
    "recordId":           "LEAVE-2026-000001",
    "status":             "running",
    "currentNodeId":      "approval_node_1"
  }
}

→ 400 Bad Request (processCode missing)
{ "success": false, "message": "processCode is required. Register a process mapping at /mappings before calling /start." }

→ 404 Not Found (processCode not mapped)
{ "success": false, "message": "No active process mapping found for code: LEAVE" }

→ 409 Conflict (already running)
{ "success": false, "message": "A workflow instance is already running for record 'LEAVE-2026-000001'" }`} />
      <Save><IC>data.recordId</IC> — your permanent handle for all subsequent calls (e.g. <IC>LEAVE-2026-000001</IC>)</Save>
      <Callout type="warning">
        Guard against duplicate starts. Before calling <IC>/start</IC>, check{" "}
        <IC>GET /instance/by-record/{"{recordId}"}</IC> first — sending the same record twice returns
        HTTP 409 if a workflow is already running.
      </Callout>

      {/* ═══════════════════════════════════════════════════════════════════
          STATUS POLLING
      ════════════════════════════════════════════════════════════════════ */}
      <H2 id="step-status">Step 4 — Poll Workflow Status</H2>
      <P>
        Use the <IC>recordId</IC> from Step 3 to check the current state of the workflow. Poll this
        endpoint until <IC>status</IC> is <IC>completed</IC> or <IC>terminated</IC>, then read{" "}
        <IC>outcome</IC> to know whether the record was approved or rejected.
      </P>
      <CodeBlock language="http" code={`GET /workflow-engine-api/workflow-runtime/instance/by-record/LEAVE-2026-000001
Authorization: Bearer <token>

→ 200 OK  (still running — waiting for approval)
{
  "success": true,
  "data": {
    "id":            42,
    "recordId":      "LEAVE-2026-000001",
    "status":        "running",
    "currentNodeId": "approval_node_1",
    "outcome":       null,
    "createdBy":     "emp_101",
    "createdAt":     "2026-06-15T10:00:00Z",
    "completedAt":   null
  }
}

→ 200 OK  (completed — approved)
{
  "success": true,
  "data": {
    "status":      "completed",
    "outcome":     "success",
    "currentNodeId": "end_approved",
    "completedAt": "2026-06-15T10:30:00Z"
  }
}

→ 200 OK  (completed — rejected)
{
  "success": true,
  "data": {
    "status":      "completed",
    "outcome":     "failure",
    "currentNodeId": "end_rejected",
    "completedAt": "2026-06-15T11:15:00Z"
  }
}

→ 404 Not Found
{ "success": false, "message": "No workflow instance found for record 'LEAVE-2026-000001'" }`} />

      <div className="my-4 rounded-xl border border-zinc-200 overflow-hidden text-sm">
        <div className="grid grid-cols-12 bg-zinc-800 text-zinc-200 text-[10px] font-bold uppercase tracking-wider">
          <div className="col-span-3 px-4 py-3">status</div>
          <div className="col-span-3 px-4 py-3">outcome</div>
          <div className="col-span-6 px-4 py-3">Meaning</div>
        </div>
        {[
          ["running",    "null",      "Workflow is in progress — approvers have pending tasks"],
          ["completed",  "success",   "All approval nodes passed — record is approved"],
          ["completed",  "failure",   "A rejection branch was taken — record is rejected"],
          ["terminated", "null",      "Admin forcefully stopped the instance"],
        ].map(([s, o, m], i) => (
          <div key={i} className={`grid grid-cols-12 border-t border-zinc-100 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}`}>
            <div className="col-span-3 px-4 py-3 font-mono text-xs text-brand-700 font-semibold">{s}</div>
            <div className="col-span-3 px-4 py-3 font-mono text-xs text-zinc-500">{o}</div>
            <div className="col-span-6 px-4 py-3 text-xs text-zinc-600">{m}</div>
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          APPROVER FLOW
      ════════════════════════════════════════════════════════════════════ */}
      <H2 id="approver">Approver Flow</H2>
      <P>
        The approver flow runs on the other side of the integration — inside the inbox or approval
        screen of whoever is assigned to act on the workflow. Three calls in sequence: get tasks →
        get actions for a specific record → submit the decision.
      </P>

      {/* Step 5 ──────────────────────────────────────────────────────── */}
      <H3 id="step-tasks">Step 5 — Show Pending Tasks to the Approver</H3>
      <P>
        Two variants depending on your architecture. Use <strong>Option A</strong> (JWT-scoped) for
        user-facing web apps where the approver is logged in. Use <strong>Option B</strong> (explicit
        user/role) from backend services or when acting on behalf of another user.
      </P>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {[
          {
            label: "Option A — JWT-scoped (user-facing apps)",
            color: "border-brand-200 bg-brand-50/50",
            badge: "bg-sky-100 text-sky-700",
            method: "GET",
          },
          {
            label: "Option B — Explicit actor (backend services)",
            color: "border-emerald-200 bg-emerald-50/50",
            badge: "bg-emerald-100 text-emerald-700",
            method: "POST",
          },
        ].map(v => (
          <div key={v.label} className={`p-3 rounded-xl border ${v.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${v.badge}`}>{v.method}</span>
              <span className="text-xs font-semibold text-zinc-700">{v.label}</span>
            </div>
          </div>
        ))}
      </div>

      <CodeBlock language="http" code={`── Option A: JWT-scoped (recommended for user-facing apps) ──────────────────

GET /workflow-engine-api/workflow-runtime/pending-tasks
Authorization: Bearer <approver-jwt>

→ 200 OK
{
  "success": true,
  "data": [
    {
      "taskId":       99,
      "instanceId":   42,
      "recordId":     "LEAVE-2026-000001",
      "workflowName": "Leave Approval",
      "nodeLabel":    "HR Manager Review",
      "createdAt":    "2026-06-15T10:00:00Z",
      "slaStatus": {
        "status":   "ON_TIME",
        "deadline": "2026-06-17T10:00:00Z",
        "breached": false
      }
    }
  ]
}

── Option B: Explicit user/role (backend services, proxying) ────────────────

POST /workflow-engine-api/workflow-runtime/tasks/pending
Authorization: Bearer <service-token>
Content-Type: application/json

{
  "assignedRole": "HR_MANAGER"      ← or "assignedTo": "emp_102" for a specific user
}

→ 200 OK
{
  "success": true,
  "data": [
    {
      "id":                  99,
      "workflowInstanceId":  42,
      "nodeId":              "approval_node_1",
      "assignmentType":      "ROLE",
      "assignmentValue":     "HR_MANAGER",
      "status":              "pending",
      "slaDeadline":         "2026-06-17T04:58:43Z",
      "slaBreached":         false
    }
  ]
}`} />
      <Use>
        <IC>recordId</IC> from a task entry → pass to Step 6 to get the action buttons for that specific record
      </Use>

      {/* Step 6 ──────────────────────────────────────────────────────── */}
      <H3 id="step-actions">Step 6 — Get Available Actions (Before Rendering Buttons)</H3>
      <P>
        <strong>Always call this before showing action buttons.</strong> It returns the exact{" "}
        <IC>taskId</IC> and the full action configuration — labels, remarks requirements, and predefined
        rejection reasons — for the current pending node of a record. Never hardcode action buttons.
      </P>
      <CodeBlock language="http" code={`GET /workflow-engine-api/workflow-runtime/actions?recordId=LEAVE-2026-000001
Authorization: Bearer <approver-token>

→ 200 OK  (standard approve / reject)
{
  "success": true,
  "data": {
    "taskId":           99,           ← SAVE THIS — required in Step 7
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
        "predefinedReasons": [
          "Insufficient leave balance",
          "Dates conflict with project deadline",
          "Incomplete application"
        ]
      }
    ],
    "status": "running",
    "slaStatus": { "status": "ON_TIME", "deadline": "2026-06-17T10:00:00Z", "breached": false }
  }
}

→ 200 OK  (with send-back action — shown on nodes that allow revision)
{
  "availableActions": [
    { "action": "approve",  "label": "Approve",                 "remarksMandatory": false },
    { "action": "reject",   "label": "Reject",                  "remarksMandatory": true  },
    { "action": "sendback", "label": "Send Back for Revision",  "remarksMandatory": false,
      "predefinedReasons": ["Missing documents", "Incorrect amount"] }
  ]
}

→ 200 OK  (SLA breached — slaStatus.breached = true, action still available)
{
  "slaStatus": { "status": "OVERDUE", "deadline": "2026-06-13T10:00:00Z", "breached": true }
}

→ 404 Not Found (no active workflow for this record)
{ "success": false, "message": "No active workflow instance found for form record 'LEAVE-2026-000001'" }`} />
      <Save>
        <IC>data.taskId</IC> — required when submitting an action in Step 7
      </Save>

      <div className="my-4 rounded-xl border border-zinc-200 overflow-hidden text-sm">
        <div className="grid grid-cols-12 bg-zinc-800 text-zinc-200 text-[10px] font-bold uppercase tracking-wider">
          <div className="col-span-3 px-4 py-3">slaStatus.status</div>
          <div className="col-span-2 px-4 py-3">breached</div>
          <div className="col-span-7 px-4 py-3">UI recommendation</div>
        </div>
        {[
          ["ON_TIME",  "false", "Show deadline quietly — no urgency indicator needed"],
          ["DUE_SOON", "false", "Highlight deadline in amber — approver should act soon"],
          ["OVERDUE",  "true",  "Show a red breach badge — action is still allowed but SLA violated"],
        ].map(([s, b, m], i) => (
          <div key={i} className={`grid grid-cols-12 border-t border-zinc-100 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}`}>
            <div className="col-span-3 px-4 py-3 font-mono text-xs text-brand-700 font-semibold">{s}</div>
            <div className="col-span-2 px-4 py-3 font-mono text-xs text-zinc-500">{b}</div>
            <div className="col-span-7 px-4 py-3 text-xs text-zinc-600">{m}</div>
          </div>
        ))}
      </div>

      {/* Step 7 ──────────────────────────────────────────────────────── */}
      <H3 id="step-execute">Step 7 — Execute an Action</H3>
      <P>
        Submit the approver&apos;s decision. Two variants — use Option A for end-user apps where the
        approver is authenticated via JWT, and Option B for backend services that act on behalf of a user.
      </P>
      <CodeBlock language="http" code={`── Option A: JWT-scoped (end-user apps) ─────────────────────────────────────

POST /workflow-engine-api/workflow-runtime/action
Authorization: Bearer <approver-jwt>
Content-Type: application/json

{
  "taskId":  99,                                 ← from Step 6
  "action":  "approve",                          ← from availableActions[].action
  "remarks": "Approved — leave balance verified" ← required if remarksMandatory = true
}

→ 200 OK  (approved)
{
  "success": true,
  "message": "Action 'approve' executed successfully",
  "data": {
    "id":                99,
    "workflowInstanceId": 42,
    "nodeId":            "approval_node_1",
    "status":            "Approve",
    "remarks":           "Approved — leave balance verified",
    "actionTaken":       true
  }
}

→ 200 OK  (rejected)
{
  "data": { "status": "Reject", "remarks": "Insufficient leave balance", "actionTaken": true }
}

→ 400 Bad Request (task already actioned)
{ "success": false, "message": "Task 99 is not in pending state (current: Approve)" }

→ 400 Bad Request (action not allowed at this node)
{ "success": false, "message": "Action 'sendback' is not allowed at node 'approval_node_1'. Allowed: [approve, reject]" }

→ 403 Forbidden (user not assigned to this task)
{ "success": false, "message": "User 'emp_101' is not assigned to task 99" }

── Note: identity (role + user) always comes from X-Test-Role / JWT header ──────

POST /workflow-engine-api/workflow-runtime/action
Authorization: Bearer <approver-token>
X-Test-Role: HR_MANAGER
X-Test-User-Id: emp_102
Content-Type: application/json

{
  "taskId":   99,
  "recordId": "LEAVE-2026-000001",
  "action":   "approve",
  "remarks":  "Approved via HR system"
}

→ 200 OK
{
  "success": true,
  "data": {
    "id": 99, "status": "Approve", "actedAt": "2026-06-15T10:00:00Z", "actionTaken": true
  }
}`} />

      {/* ═══════════════════════════════════════════════════════════════════
          AUDIT TRAIL
      ════════════════════════════════════════════════════════════════════ */}
      <H2 id="step-history">Step 8 — Read the Audit Trail</H2>
      <P>
        Fetch the full chronological event log for a record. Use this to build a Timeline or History
        component in your application. Each entry includes who acted, what they did, when, and any
        remarks.
      </P>
      <CodeBlock language="http" code={`GET /workflow-engine-api/workflow-runtime/history?recordId=LEAVE-2026-000001
Authorization: Bearer <token>

→ 200 OK  (running — 2 events so far)
{
  "success": true,
  "data": [
    {
      "title":  "Workflow Started",
      "by":     "Rahul Sharma",
      "actorId":"emp_101",
      "date":   "2026-06-15T10:00:00Z",
      "status": "Running"
    },
    {
      "title":      "Task Assigned",
      "step":       "HR Manager Review",
      "by":         "System",
      "slaDeadline":"2026-06-17T10:00:00Z",
      "date":       "2026-06-15T10:00:01Z",
      "status":     "Pending Review"
    }
  ]
}

→ 200 OK  (completed — full trail with approval)
{
  "data": [
    { "title": "Workflow Started", "by": "Rahul Sharma", "date": "2026-06-15T10:00:00Z", "status": "Running" },
    { "title": "Task Assigned",    "step": "HR Manager Review", "by": "System", "date": "2026-06-15T10:00:01Z", "status": "Pending Review" },
    { "title": "Approved", "step": "HR Manager Review", "by": "Priya Mehta", "actorId": "emp_102",
      "action": "Approved", "remarks": "Approved — leave balance verified", "date": "2026-06-15T10:28:00Z", "status": "Approved" },
    { "title": "Workflow Completed", "by": "System", "date": "2026-06-15T10:28:01Z", "status": "Completed" }
  ]
}

→ 404 Not Found
{ "success": false, "message": "No workflow instance found for record 'LEAVE-2026-000001'" }`} />

      <Callout type="note">
        <strong>action</strong> event types:{" "}
        <IC>workflow_started</IC> · <IC>task_created</IC> · <IC>approve</IC> · <IC>reject</IC> ·{" "}
        <IC>sendback</IC> · <IC>workflow_completed</IC> · <IC>sla_breached</IC> · <IC>escalated</IC>
      </Callout>

      {/* ═══════════════════════════════════════════════════════════════════
          ERROR REFERENCE
      ════════════════════════════════════════════════════════════════════ */}
      <H2 id="errors">Error Reference</H2>
      <P>All error responses follow the same envelope shape:</P>
      <CodeBlock language="json" code={`{
  "success": false,
  "message": "human-readable description of what went wrong",
  "data":    null
}`} />

      <div className="my-5 rounded-xl border border-zinc-200 overflow-hidden text-sm">
        <div className="grid grid-cols-12 bg-zinc-800 text-zinc-200 text-[10px] font-bold uppercase tracking-wider">
          <div className="col-span-1 px-4 py-3">Code</div>
          <div className="col-span-4 px-4 py-3">When</div>
          <div className="col-span-7 px-4 py-3">Fix</div>
        </div>
        {[
          ["400", "Missing required fields, invalid processCode, task already actioned, invalid action for node", "Check request body; verify processCode is registered and task is still in pending state"],
          ["401", "Missing or expired JWT token", "Refresh the Bearer token and retry"],
          ["403", "Authenticated user is not assigned to the task or action", "Verify role assignment in the workflow config; the approver must have a matching role or be directly assigned"],
          ["404", "processCode not mapped / recordId not found / task does not exist", "Confirm processCode is active and mapped; check recordId is the exact value returned by /start"],
          ["409", "A workflow is already running for this record", "Call GET /instance/by-record/{recordId} first to check current state before calling /start again"],
          ["500", "Internal server error", "Check server logs; contact your Workflow Engine admin"],
        ].map(([code, when, fix], i) => (
          <div key={code} className={`grid grid-cols-12 border-t border-zinc-100 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}`}>
            <div className="col-span-1 px-4 py-3 font-mono font-bold text-red-600 text-xs">{code}</div>
            <div className="col-span-4 px-4 py-3 text-xs text-zinc-600 leading-relaxed">{when}</div>
            <div className="col-span-7 px-4 py-3 text-xs text-zinc-600 leading-relaxed">{fix}</div>
          </div>
        ))}
      </div>

      <Callout type="tip">
        For debugging a stuck or misbehaving instance, use the{" "}
        <Link href="/docs/api-runtime" className="text-brand-600 hover:underline font-semibold">
          Diagnostic endpoint
        </Link>{" "}
        (<IC>GET /workflow-runtime/diagnostic?recordId=...</IC>) — it shows the current node,
        all pending tasks, and which user/role the engine is waiting on.
      </Callout>
    </>
  );
}
