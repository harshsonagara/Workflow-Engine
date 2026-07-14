"use client";

import Link from "next/link";
import {
  EndpointCard, Callout, IC, H2, H3, P, PropTable, CodeBlock,
} from "../../../../components/docs/DocComponents";

export default function ApiRuntimePage() {
  return (
    <>
      <P>
        Base path: <IC>/workflow-engine-api/workflow-runtime</IC>. All endpoints below are relative to this
        prefix. Process mappings (the <IC>processCode</IC> registry) are managed separately — see{" "}
        <Link href="/docs/api-mapping" className="text-brand-600 hover:underline font-medium">
          Mapping API
        </Link>.
      </P>
      <Callout type="note">
        <IC>POST /action</IC> reads identity (role, user) from <IC>X-Test-Role</IC> / <IC>X-Test-User-Id</IC>{" "}
        headers or a Bearer JWT — do not send them in the request body.
        Read endpoints (<IC>GET /pending-tasks</IC>, <IC>GET /actions</IC>) require the same headers.
      </Callout>

      {/* ── 1. Dropdown ──────────────────────────────────────────────────── */}
      <H2 id="dropdown">Workflow Dropdown</H2>
      <P>Returns a lightweight list of all workflow masters — useful for populating UI selectors.</P>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/dropdown"
        title="List Workflow Masters (dropdown)"
        description="Returns id + workflowName + code for every workflow master record. No pagination. Use once on load to populate a selector."
        response={`{
  "success": true,
  "message": "Dropdown retrieved",
  "data": [
    { "id": 1, "workflowName": "Leave Approval",          "code": "LEAVE_APPROVAL" },
    { "id": 2, "workflowName": "Purchase Order Approval",  "code": "PO_APPROVAL"   }
  ]
}`}
      />

      {/* ── 2. Start ─────────────────────────────────────────────────────── */}
      <H2 id="start">Start a Workflow</H2>
      <P>
        The primary integration point. Creates a new <IC>WorkflowInstance</IC>, generates a human-readable{" "}
        <IC>recordId</IC>, assigns the first task, and returns everything the caller needs to track progress.
      </P>
      <Callout type="important">
        <IC>processCode</IC> is the only mandatory field and must match a code registered via the{" "}
        <Link href="/docs/api-mapping" className="text-brand-600 hover:underline font-semibold">
          Mapping API
        </Link>{" "}
        (or the{" "}
        <Link href="/mappings" className="text-brand-600 hover:underline font-semibold">
          Process Mappings UI
        </Link>
        ). The engine resolves it to the active workflow version at start time — never pass a raw workflow ID.
      </Callout>
      <EndpointCard
        method="POST"
        path="/workflow-engine-api/workflow-runtime/start"
        title="Start Workflow Instance"
        description="Starts a new workflow instance for the given processCode. Auto-generates a sequential recordId (PREFIX-YEAR-SEQNUM) unless you supply your own businessKey in context. Creates the first task and returns the instance snapshot."
        requiredData={[
          "processCode (string) — stable identifier registered in the Mapping API",
        ]}
        request={`{
  "processCode":     "SILVER",
  "initiatedBy":     "Harsh01",
  "initiatedByName": "Prince"
}`}
        response={`{
  "success": true,
  "message": "Workflow started successfully",
  "data": {
    "success":            true,
    "workflowInstanceId": 2,
    "taskId":             2,
    "recordId":           "SILVER-2026-000002",
    "status":             "running",
    "currentNodeId":      "approval_1783932628966",
    "message":            "Workflow instance started successfully"
  }
}`}
        errors={[
          { code: "400", cause: "processCode is missing or blank." },
          { code: "404", cause: "No active process mapping for the given processCode, or the mapped workflow master no longer exists." },
          { code: "422", cause: "No active version for the workflow, the definition fails validation, the definition has no start node, or the start node has no outgoing connection." },
        ]}
      >
        <H3>cURL</H3>
        <CodeBlock
          language="bash"
          code={`curl -X POST http://localhost:8080/workflow-engine-api/workflow-runtime/start \\
  -H "Content-Type: application/json" \\
  -d '{
    "processCode":     "LEAVE",
    "initiatedBy":     "10",
    "initiatedByName": "Admin User",
    "context": {
      "entityType": "leave_request",
      "entityId":   "5001",
      "variables":  { "leaveDays": 3 }
    }
  }'`}
        />
        <H3>Request Fields</H3>
        <PropTable
          rows={[
            ["processCode",         "string", "Yes", "Stable code registered via the Mapping API. Resolves the active workflow version at start time."],
            ["initiatedBy",         "string", "No",  "User ID of the submitter. Stored on the instance and used for task filtering."],
            ["initiatedByName",     "string", "No",  "NEW — Display name shown in workflow history. Falls back to initiatedBy if absent, then to \"System\"."],
            ["context.entityType",  "string", "No",  "Domain entity type (e.g. leave_request). Used for form-scoped task queries."],
            ["context.entityId",    "string", "No",  "Primary key of the triggering entity in your system."],
            ["context.businessKey", "string", "No",  "Overrides the auto-generated businessKey used in recordId construction."],
            ["context.variables",   "object", "No",  "Arbitrary key/value pairs injected into the instance context. Used for conditional routing in the workflow definition."],
            ["context.metadata",    "object", "No",  "Arbitrary metadata stored on the instance (subject, department, etc.). Not used for routing."],
          ]}
        />
      </EndpointCard>

      {/* ── 3. Instance by ID ────────────────────────────────────────────── */}
      <H2 id="instance-by-id">Get Instance by ID</H2>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/instance/{id}"
        title="Get Workflow Instance by ID"
        description="Fetches the full instance record for the given internal numeric ID. Use when you have the workflowInstanceId returned by /start."
        response={`{
  "success": true,
  "message": "Instance retrieved",
  "data": {
    "id":            1,
    "recordId":      "LEAVE-2026-000001",
    "processCode":   "LEAVE",
    "status":        "running",
    "currentNodeId": "manager_approval",
    "initiatedBy":   "10",
    "workflowVersionId": 9187,
    "createdAt":     "2026-06-30T10:00:00Z",
    "completedAt":   null,
    "workflowTasks": []
  }
}`}
      />

      {/* ── 4. All Instances ─────────────────────────────────────────────── */}
      <H2 id="all-instances">List All Instances</H2>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/instances"
        title="List All Workflow Instances"
        description="Returns all workflow instances across all processes. Intended for admin dashboards. Protect behind an admin-only permission — returns every instance in the system."
        response={`{
  "success": true,
  "message": "Instances retrieved",
  "data": [
    {
      "id":          1,
      "recordId":    "LEAVE-2026-000001",
      "processCode": "LEAVE",
      "status":      "running",
      "initiatedBy": "10",
      "createdAt":   "2026-06-30T10:00:00Z"
    }
  ]
}`}
      />

      {/* ── 5. Instance by RecordId ──────────────────────────────────────── */}
      <H2 id="instance-by-record">Get Instance by Record ID</H2>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/instance/by-record/{recordId}"
        title="Get Workflow Instance by Record ID"
        description="Looks up a workflow instance using the human-readable recordId (e.g. LEAVE-2026-000001). The primary status-check endpoint for your application — use this to poll for completion."
        response={`{
  "success": true,
  "message": "Instance retrieved",
  "data": {
    "id":            1,
    "recordId":      "LEAVE-2026-000001",
    "processCode":   "LEAVE",
    "status":        "running",
    "currentNodeId": "manager_approval",
    "initiatedBy":   "10",
    "workflowVersionId": 9187,
    "createdAt":     "2026-06-30T10:00:00Z",
    "completedAt":   null,
    "workflowTasks": []
  }
}`}
      />

      {/* ── 6. Tasks Pending (System) ────────────────────────────────────── */}
      <H2 id="tasks-pending">Get Pending Tasks (Direct/System)</H2>
      <P>
        System-to-system variant — caller supplies <IC>assignedTo</IC> and/or <IC>assignedRole</IC> explicitly
        in the request body. Does not require a JWT; suitable for backend services querying on behalf of a user.
      </P>
      <EndpointCard
        method="POST"
        path="/workflow-engine-api/workflow-runtime/tasks/pending"
        title="Get Pending Tasks (Direct)"
        description="Returns all pending tasks assigned to the given user ID and/or role. Identity is supplied in the body — no JWT required. Use from server-side services or scheduled jobs."
        request={`{
  "assignedTo":   "10",
  "assignedRole": "MANAGER"
}`}
        response={`{
  "success": true,
  "message": "Tasks retrieved",
  "data": [
    {
      "id":                 1,
      "workflowInstanceId": 1,
      "recordId":           "LEAVE-2026-000001",
      "nodeId":             "manager_approval",
      "assignedTo":         "10",
      "assignedRole":       "MANAGER",
      "status":      "pending",
      "actionTaken": false,
      "slaDeadline": "2026-06-30T14:00:00Z",
      "slaBreached": false,
      "escalated":   false,
      "allowEdit":   true
    }
  ]
}`}
      />

      {/* ── 7. Pending Tasks (JWT) ───────────────────────────────────────── */}
      <H2 id="pending-tasks">Get Pending Tasks (JWT)</H2>
      <Callout type="note">
        Identity is read automatically from request headers. In development / testing pass{" "}
        <IC>X-Test-User-Id</IC> and <IC>X-Test-Role</IC>. In production the engine reads the JWT principal.
        No request body is needed.
      </Callout>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/pending-tasks"
        title="Get My Pending Tasks (JWT)"
        description="Returns all pending tasks for the authenticated user. User ID and role are derived from the JWT (or X-Test-User-Id / X-Test-Role headers in non-production environments). slaStatus is null when no SLA is configured on the node."
        response={`{
  "success": true,
  "message": "Form-scoped pending tasks retrieved successfully",
  "data": [
    {
      "taskId":       1,
      "instanceId":   1,
      "recordId":     "SILVER-2026-000001",
      "workflowName": "silver",
      "createdAt":    "2026-07-13T09:03:40.006434Z",
      "nodeLabel":    "Approval 1",
      "slaStatus":    null,
      "allowEdit":    true
    },
    {
      "taskId":       2,
      "instanceId":   2,
      "recordId":     "SILVER-2026-000002",
      "workflowName": "silver",
      "createdAt":    "2026-07-13T09:55:38.862434Z",
      "nodeLabel":    "Approval 1",
      "slaStatus":    null,
      "allowEdit":    true
    }
  ]
}`}
      />

      {/* ── 8. Get Actions ──────────────────────────────────────────────── */}
      <H2 id="get-actions">Get Available Actions</H2>
      <P>
        Returns the actions the authenticated user can perform on the current pending task for a given record.
        Use this to dynamically render action buttons — the <IC>taskId</IC> returned here is required by both
        execute endpoints.
      </P>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/actions?recordId=SILVER-2026-000002"
        title="Get Available Actions (JWT)"
        description="Returns the current taskId, node label, and actions the caller can take. recordId lookup is case-insensitive. slaStatus is null when no SLA is configured on the node. status reflects the workflow instance status (running), not the task."
        response={`{
  "success": true,
  "message": "Available actions retrieved successfully",
  "data": {
    "taskId":           2,
    "instanceId":       2,
    "recordId":         "SILVER-2026-000002",
    "workflowName":     "silver",
    "currentNodeId":    "approval_1783932628966",
    "currentNodeLabel": "Approval 1",
    "availableActions": [
      {
        "action":            "approve",
        "label":             "Approve",
        "requiresRemarks":   false,
        "remarksMandatory":  false,
        "predefinedReasons": []
      },
      {
        "action":            "reject",
        "label":             "Reject",
        "requiresRemarks":   false,
        "remarksMandatory":  false,
        "predefinedReasons": []
      }
    ],
    "status":    "running",
    "slaStatus": null,
    "allowEdit": true
  }
}`}
        errors={[
          { code: "400", cause: "recordId query parameter is missing." },
          { code: "404", cause: "No active instance for this record, no pending task for the caller's user/role, or the task's node is missing from the definition. All failure modes intentionally collapse to the same 404 — use /diagnostic to find the specific cause." },
        ]}
      />

      {/* ── 9. Execute Action ────────────────────────────────────────────── */}
      <H2 id="execute-action">Execute Action</H2>
      <Callout type="important">
        Identity (role, user) is read from <IC>X-Test-Role</IC> / <IC>X-Test-User-Id</IC> headers or a
        Bearer JWT — not from the request body. Send <IC>recordId</IC> alongside <IC>taskId</IC> so the
        engine can verify the task actually belongs to that record.
      </Callout>
      <EndpointCard
        method="POST"
        path="/workflow-engine-api/workflow-runtime/action"
        title="Execute Action"
        description="Advances the workflow by executing an action on a pending task. Role and user identity come from request headers (X-Test-Role / X-Test-User-Id) or Bearer JWT. The recordId cross-check prevents acting on a task that belongs to a different record."
        requiredData={[
          "taskId (number) — ID of the pending task (from /actions)",
          "recordId (string) — record the task belongs to (e.g. LEAVE-2026-000001)",
          "action (string) — must match an availableActions entry from /actions",
        ]}
        request={`{
  "taskId":          2,
  "recordId":        "SILVER-2026-000002",
  "action":          "approve",
  "performedBy":     "Prince",
  "performedByName": "Jay",
  "role":            "jay"
}`}
        response={`{
  "success": true,
  "message": "Action 'approve' executed successfully",
  "data": {
    "id":                 2,
    "workflowInstanceId": 2,
    "recordId":           "SILVER-2026-000002",
    "nodeId":             "approval_1783932628966",
    "assignedRole":       "jay",
    "status":             "Approve",
    "createdAt":          "2026-07-13T09:55:38.862434Z",
    "actedAt":            "2026-07-13T10:30:29.503863776Z",
    "actionTaken":        true,
    "allowEdit":          true
  }
}`}
        errors={[
          { code: "400", cause: "taskId missing/invalid, action blank, recordId mismatch, task not pending, action not allowed at the node, or remarks missing for a remarksMandatory action." },
          { code: "401", cause: "X-Test-Role header (or JWT role claim) is missing." },
          { code: "403", cause: "The caller's role or userId does not match the task's assigned role/user." },
          { code: "404", cause: "Task or its workflow instance not found." },
          { code: "422", cause: "The task's node is missing from the definition or has no actions defined." },
        ]}
      >
        <H3>Request Fields</H3>
        <PropTable
          rows={[
            ["taskId",          "number", "Yes", "ID of the pending task to act on (returned by /actions)."],
            ["recordId",        "string", "Yes", "Human-readable record ID (e.g. SILVER-2026-000002). Cross-checked against the task — prevents acting on the wrong record."],
            ["action",          "string", "Yes", "Action key (e.g. approve, reject). Must match an availableActions entry from /actions."],
            ["performedBy",     "string", "No",  "User ID of the actor. Stored on the task and shown in history."],
            ["performedByName", "string", "No",  "Display name of the actor. Shown in history entries as the 'by' field."],
            ["role",            "string", "No",  "Role code performing the action. Stored on the task and shown in history."],
            ["remarks",         "string", "No",  "Free-text remarks. Required when remarksMandatory is true for the chosen action."],
          ]}
        />
        <H3>cURL</H3>
        <CodeBlock
          language="bash"
          code={`curl -X POST http://localhost:8080/workflow-engine-api/workflow-runtime/action \\
  -H "Content-Type: application/json" \\
  -H "X-Test-Role: MANAGER" \\
  -H "X-Test-User-Id: 10" \\
  -d '{
    "taskId":   1,
    "recordId": "LEAVE-2026-000001",
    "action":   "approve",
    "remarks":  "Approved"
  }'`}
        />
      </EndpointCard>

      {/* ── 11. Dashboard Stats ──────────────────────────────────────────── */}
      <H2 id="dashboard-stats">Dashboard Stats</H2>
      <P>Aggregate counts across all workflow instances. Use to populate a summary card on an admin dashboard.</P>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/dashboard-stats"
        title="Get Dashboard Statistics"
        description="Returns completed, in-process, and submitted counts across all instances and all process codes."
        response={`{
  "success": true,
  "message": "Stats retrieved",
  "data": {
    "completed": 42,
    "inProcess":  8,
    "submitted":  50
  }
}`}
      />

      {/* ── 12. History ─────────────────────────────────────────────────── */}
      <H2 id="history">Workflow History</H2>
      <P>
        Returns the full chronological audit trail for a record, oldest event first. Each entry is a discrete
        event — instance start, task assignment, user action, SLA breach, or workflow completion.
        Only fields with values are included — null fields are omitted from the response.
      </P>
      <Callout type="note">
        <strong>Who takes the application after SLA breach?</strong> When an SLA is breached and the escalation
        type is <IC>escalate_to_role</IC>, the engine reassigns the task to the escalation role and writes an{" "}
        <IC>Escalated (SLA)</IC> event. The <IC>escalatedTo</IC> field on that entry names the new assignee
        (role or user). The original assignee can no longer act on the task.
      </Callout>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/history?recordId=LEAVE-2026-000001"
        title="Get Workflow History"
        description="Returns the full chronological audit trail (oldest first) for the given recordId. Null fields are omitted. SLA events include deadline and breach timestamps. User action events include role and duration."
        responses={[
          {
            label: "200 OK — Normal flow (user action)",
            body: `{
  "success": true,
  "message": "Application history retrieved successfully",
  "data": [
    {
      "title":   "Application Submitted",
      "by":      "Prince",
      "actorId": "Harsh01",
      "date":    "2026-07-13T09:55:38.845019Z",
      "status":  "Submitted"
    },
    {
      "title":   "Sent for Review",
      "step":    "Approval 1",
      "by":      "Prince",
      "actorId": "Harsh01",
      "date":    "2026-07-13T09:55:38.867805Z",
      "status":  "Awaiting Approval"
    },
    {
      "title":           "Approve",
      "step":            "Approval 1",
      "action":          "Approve",
      "by":              "System",
      "role":            "jay",
      "durationSeconds": 2090,
      "date":            "2026-07-13T10:30:29.52061Z",
      "status":          "Approved"
    },
    {
      "title":       "Sent for Review",
      "step":        "Approval 2",
      "by":          "System",
      "slaDeadline": "2026-07-13T10:31:29.532944645Z",
      "date":        "2026-07-13T10:30:29.541818Z",
      "status":      "Awaiting Approval"
    }
  ]
}`,
          },
          {
            label: "200 OK — SLA breach + auto-progress",
            body: `{
  "success": true,
  "message": "Application history retrieved successfully",
  "data": [
    {
      "title":   "Application Submitted",
      "by":      "Prince",
      "actorId": "Harsh01",
      "date":    "2026-07-13T09:55:38.845019Z",
      "status":  "Submitted"
    },
    {
      "title":   "Sent for Review",
      "step":    "Approval 1",
      "by":      "Prince",
      "actorId": "Harsh01",
      "date":    "2026-07-13T09:55:38.867805Z",
      "status":  "Awaiting Approval"
    },
    {
      "title":           "Approve",
      "step":            "Approval 1",
      "action":          "Approve",
      "by":              "System",
      "role":            "jay",
      "durationSeconds": 2090,
      "date":            "2026-07-13T10:30:29.52061Z",
      "status":          "Approved"
    },
    {
      "title":       "Sent for Review",
      "step":        "Approval 2",
      "by":          "System",
      "slaDeadline": "2026-07-13T10:31:29.532944645Z",
      "date":        "2026-07-13T10:30:29.541818Z",
      "status":      "Awaiting Approval"
    },
    {
      "title":           "Reject",
      "step":            "Approval 2",
      "action":          "Reject",
      "by":              "SYSTEM",
      "actorId":         "SYSTEM",
      "role":            "harsh",
      "durationSeconds": 139,
      "remarks":         "Auto-progressed by SYSTEM due to SLA breach",
      "date":            "2026-07-13T10:32:48.951581Z",
      "status":          "Rejected"
    },
    {
      "title":   "Application Completed",
      "by":      "SYSTEM",
      "actorId": "SYSTEM",
      "date":    "2026-07-13T10:32:48.956586Z",
      "status":  "Completed"
    }
  ]
}`,
          },
        ]}
        errors={[
          { code: "400", cause: "recordId query parameter is missing." },
          { code: "404", cause: "No workflow instance exists for the given recordId." },
        ]}
      >
        <H3>Response Fields</H3>
        <PropTable
          rows={[
            ["title",           "string",           "Yes", "Human-readable event label: Workflow Started, Task Assigned, Approved, Rejected, SLA Breach, Escalated (SLA), Auto Returned (SLA), Workflow Completed."],
            ["step",            "string",            "No",  "Node label where the event occurred (e.g. Manager Approval). Omitted for instance-level events (start, completion)."],
            ["action",          "string",            "No",  "The action the user chose (Approved, Rejected, etc.). Only present on user-triggered task events."],
            ["by",      "string", "Yes", "Display name of the actor. Uses the stored display name; falls back to the raw ID, then System."],
            ["actorId", "string", "No",  "Raw user ID of the actor. Use this to link back to your own user records."],
            ["role",            "string",            "No",  "Role code that performed the action (e.g. MANAGER). Only on user-triggered task events."],
            ["fromNode",        "string",            "No",  "Source node ID for transition events (node_transition, conditional_evaluated)."],
            ["toNode",          "string",            "No",  "Target node ID for transition events."],
            ["durationSeconds", "number",            "No",  "Seconds the task sat unactioned from assignment to action. Only on user-triggered task events."],
            ["slaDeadline",     "string (ISO 8601)", "No",  "The SLA deadline set when the task was created. Present on task_created and all SLA events."],
            ["slaBreachedAt",   "string (ISO 8601)", "No",  "When the SLA was marked breached. Only on sla_breached events."],
            ["escalatedTo",     "string",            "No",  "Role or user ID the task was re-assigned to after SLA breach. Only on Escalated (SLA) events."],
            ["remarks",         "string",            "No",  "Free-text remarks from the actor. Omitted for system-generated noise (auto-progress messages, etc.)."],
            ["date",            "string (ISO 8601)", "Yes", "UTC timestamp of the event. Events are ordered oldest first."],
            ["status",          "string",            "Yes", "Human-readable state after this event: Running, Pending Review, Approved, Rejected, SLA Breached, Escalated, Completed, etc."],
          ]}
        />
      </EndpointCard>

      {/* ── 13. Recent Activities ────────────────────────────────────────── */}
      <H2 id="recent-activities">Recent Activities</H2>
      <P>
        Same shape as <IC>/history</IC> but returns the last 10 events across <em>all</em> workflow instances.
        Useful for a global activity feed on the admin dashboard.
      </P>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/recent-activities"
        title="Get Recent Activities (All Instances)"
        description="Returns the 10 most recent audit events across all workflow instances, newest first. Response shape is identical to /history — each entry has title, step, action, by, remarks, date, status."
        response={`{
  "success": true,
  "message": "Recent activities retrieved",
  "data": [
    {
      "title":   "Approved",
      "step":    "Manager Approval",
      "action":  "Approve",
      "by":      "John Manager",
      "remarks": "Approved — looks good",
      "date":    "2026-06-30T11:00:00Z",
      "status":  "completed"
    },
    {
      "title":   "Workflow Started",
      "step":    "Initiation",
      "action":  "workflow_started",
      "by":      "Admin User",
      "remarks": "Workflow started",
      "date":    "2026-06-30T10:00:00Z",
      "status":  "completed"
    }
  ]
}`}
      />

      {/* ── 14. My Submissions ──────────────────────────────────────────── */}
      <H2 id="my-submissions">My Submissions</H2>
      <P>
        Returns all workflow instances initiated by the authenticated user. Identity is read from the JWT
        (or <IC>X-Test-User-Id</IC> header in development). Use to build an applicant&apos;s &quot;My
        Requests&quot; view.
      </P>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/my-submissions"
        title="Get My Submissions (JWT)"
        description="Returns all workflow instances where initiatedBy matches the authenticated user's ID, ordered by creation date (newest first)."
        response={`{
  "success": true,
  "message": "Submissions retrieved",
  "data": [
    {
      "id":          1,
      "recordId":    "LEAVE-2026-000001",
      "processCode": "LEAVE",
      "status":      "running",
      "createdAt":   "2026-06-30T10:00:00Z"
    }
  ]
}`}
      />

      {/* ── 15. Diagnostic ──────────────────────────────────────────────── */}
      <H2 id="diagnostic">Diagnostic</H2>
      <Callout type="warning">
        Development and debugging tool only. Do not expose in production without admin-level auth gating.
        Returns raw instance internals: current status, all pending tasks, and per-user assignment analysis.
        The <IC>issue</IC> field is <IC>null</IC> when everything is healthy.
      </Callout>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/workflow-runtime/diagnostic?recordId=LEAVE-2026-000001"
        title="Diagnostic Check"
        description="Returns a snapshot of instance state, all pending tasks, and an assignment diagnosis for the queried user/role. The issue field names a known problem (e.g. NO_TASK_FOR_USER) or is null when the instance looks healthy from the caller's perspective."
        responses={[
          {
            label: "200 OK — Issue Detected",
            body: `{
  "recordId":      "LEAVE-2026-000001",
  "status":        "running",
  "currentNodeId": "manager_approval",
  "pendingTasks": [
    {
      "taskId":       1,
      "nodeId":       "manager_approval",
      "assignedTo":   null,
      "assignedRole": "MANAGER"
    }
  ],
  "queriedAs": {
    "userId": "10",
    "role":   "STAFF"
  },
  "issue":  "NO_TASK_FOR_USER",
  "detail": "There are pending tasks but none are assigned to userId=10 or role=STAFF"
}`,
          },
          {
            label: "200 OK — All Good",
            body: `{
  "recordId":      "LEAVE-2026-000001",
  "status":        "running",
  "currentNodeId": "manager_approval",
  "pendingTasks": [
    {
      "taskId":       1,
      "nodeId":       "manager_approval",
      "assignedTo":   "10",
      "assignedRole": "MANAGER"
    }
  ],
  "queriedAs": {
    "userId": "10",
    "role":   "MANAGER"
  },
  "issue":  null,
  "detail": "Task 1 is assigned to this user/role"
}`,
          },
        ]}
      />
    </>
  );
}
