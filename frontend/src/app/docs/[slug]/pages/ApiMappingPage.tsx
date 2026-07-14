"use client";

import {
  EndpointCard, Callout, IC, H2, P, PropTable, CodeBlock,
} from "../../../../components/docs/DocComponents";

export default function ApiMappingPage() {
  return (
    <>
      <P>
        The Mapping API lives under <IC>/workflow-engine-api/mappings</IC>. It has two
        responsibilities: <strong>Process Mappings</strong> connect your application&apos;s{" "}
        <IC>processCode</IC> to a workflow master so the engine knows which definition to run,
        and <strong>Role Registry</strong> syncs your organisation&apos;s users and roles into the
        engine so they can be used for task assignment and shown by name in audit history.
      </P>

      {/* ── List Processes ─────────────────────────────────────────────────── */}
      <H2 id="list-processes">List Process Mappings</H2>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/mappings/processes"
        title="List All Process Mappings"
        description="Returns every registered process mapping. Use this during integration setup to discover valid processCode values before calling the /start endpoint."
        response={`{
  "success": true,
  "message": "Processes retrieved",
  "data": [
    {
      "id": 1,
      "processCode": "LEAVE",
      "processName": "Leave Request",
      "description": "Approval process for employee leave requests",
      "workflowMasterId": 1605,
      "entityType": "leave_request",
      "businessKeyPrefix": "LEAVE",
      "assignmentConfig": {},
      "isActive": true
    }
  ]
}`}
      />

      {/* ── Create Process ─────────────────────────────────────────────────── */}
      <H2 id="create-process">Create Process Mapping</H2>
      <P>
        Register a new <IC>processCode</IC> → workflow master binding. Your application always
        uses <IC>processCode</IC> when starting a workflow; the engine resolves it to the currently
        active definition version at runtime.
      </P>

      <PropTable
        rows={[
          ["processCode", "string", "Yes", "Unique code your app passes to POST /workflow-runtime/start (e.g. LEAVE)."],
          ["processName", "string", "No", "Human-readable name for the process."],
          ["description", "string", "No", "Optional detailed description of the process."],
          ["workflowMasterId", "number", "No", "FK to the workflow master. Provide this OR workflowCode — one is required."],
          ["workflowCode", "string", "No", "Workflow master code. Provide this OR workflowMasterId — one is required."],
          ["entityType", "string", "No", "Entity type string used for form-scoped task filtering."],
          ["businessKeyPrefix", "string", "No", "Short prefix prepended to generated business keys (e.g. LEAVE → LEAVE-001)."],
          ["assignmentConfig", "object", "No", "Optional JSON configuration for task assignment rules."],
          ["isActive", "boolean", "No", "Whether the mapping is active. Defaults to true."],
        ]}
      />

      <EndpointCard
        method="POST"
        path="/workflow-engine-api/mappings/processes"
        title="Create Process Mapping"
        description="Creates a new processCode → workflow master mapping. Once registered, your app can immediately use this processCode in POST /workflow-runtime/start."
        requiredData={[
          "processCode (string) — unique stable identifier, stored uppercase",
          "workflowMasterId (number) — ID of an existing, non-deleted workflow master",
        ]}
        request={`{
  "processCode": "LEAVE",
  "processName": "Leave Request",
  "description": "Approval process for employee leave requests",
  "workflowMasterId": 1,
  "entityType": "leave_request",
  "businessKeyPrefix": "LEAVE",
  "assignmentConfig": {},
  "isActive": true
}`}
        response={`{
  "success": true,
  "message": "Process mapping created",
  "data": {
    "id": 1,
    "processCode": "LEAVE",
    "processName": "Leave Request",
    "description": "Approval process for employee leave requests",
    "workflowMasterId": 1,
    "entityType": "leave_request",
    "businessKeyPrefix": "LEAVE",
    "assignmentConfig": {},
    "isActive": true
  }
}`}
        errors={[
          { code: "400", cause: "workflowMasterId is missing." },
          { code: "404", cause: "No workflow master exists with the given workflowMasterId (or it has been deleted)." },
          { code: "409", cause: "A mapping with the same processCode already exists." },
        ]}
      >
        <Callout type="note">
          <IC>processCode</IC> is what you pass to <IC>POST /workflow-runtime/start</IC>. It must
          be registered here before your application can start any workflow instances using it.
        </Callout>
      </EndpointCard>

      {/* ── Update Process Config ──────────────────────────────────────────── */}
      <H2 id="update-process">Update Process Config</H2>
      <P>
        Partially update an existing process mapping. Send only the fields you want to change —
        all unspecified fields remain unchanged.
      </P>

      <EndpointCard
        method="PATCH"
        path="/workflow-engine-api/mappings/processes/{processId}/config"
        title="Update Process Config"
        description="Partial update — include only the fields you want to modify. Useful for toggling isActive without touching other configuration."
        requiredData={["processId (path param) — ID of the process mapping to update"]}
        request={`// Deactivate a process
{ "isActive": false }

// Or update multiple fields at once
{ "businessKeyPrefix": "LV", "entityType": "annual_leave" }`}
        response={`{
  "success": true,
  "message": "Process mapping updated",
  "data": {
    "id": 1,
    "processCode": "LEAVE",
    "processName": "Leave Request",
    "description": "Approval process for employee leave requests",
    "workflowMasterId": 1,
    "entityType": "annual_leave",
    "businessKeyPrefix": "LV",
    "assignmentConfig": {},
    "isActive": false
  }
}`}
        errors={[
          { code: "400", cause: "The new processCode is already in use by another active mapping." },
          { code: "404", cause: "Process mapping not found, or the new workflowMasterId does not resolve to an existing workflow." },
        ]}
      />

      {/* ── Delete Process ─────────────────────────────────────────────────── */}
      <H2 id="delete-process">Delete Process Mapping</H2>
      <EndpointCard
        method="DELETE"
        path="/workflow-engine-api/mappings/processes/{processId}"
        title="Delete Process Mapping"
        description="Permanently removes the process mapping. Already-running workflow instances are not affected — they resolved the workflow code at start time."
        requiredData={["processId (path param) — ID of the process mapping to delete"]}
        response={`{
  "success": true,
  "data": null
}`}
      />

      {/* ── Sync Roles ─────────────────────────────────────────────────────── */}
      <H2 id="sync-roles">Sync Roles / Users</H2>
      <P>
        Push your organisation&apos;s current users and roles into the engine&apos;s role registry.
        The engine uses these entries for task assignment and to display human-readable names in
        audit history.
      </P>

      <PropTable
        rows={[
          ["source", "string", "Yes", "Identifies the external system being synced (e.g. HRMS). Scopes the replace operation — only records for this source are touched."],
          ["roles", "array", "Yes", "Array of RoleEntry objects to register (see table below)."],
        ]}
      />

      <P>Each entry in the <IC>roles</IC> array must conform to the <strong>RoleEntry</strong> shape:</P>

      <PropTable
        rows={[
          ["id", "string", "Yes", "Machine-readable identifier — a user ID or role code (e.g. 10 or MANAGER)."],
          ["label", "string", "Yes", "Human-readable display name shown in task history (e.g. John Manager)."],
          ["type", '"user" | "role"', "Yes", 'Discriminates between an individual user ("user") and a group/role ("role").'],
        ]}
      />

      <EndpointCard
        method="POST"
        path="/workflow-engine-api/mappings/roles/sync"
        title="Sync Roles from HR System"
        description="Full replace for the given source — deletes all existing records for that source and inserts the supplied list. Call this whenever users or roles change in your HR system."
        request={`{
  "source": "HRMS",
  "roles": [
    { "id": "10",      "label": "John Manager", "type": "user" },
    { "id": "MANAGER", "label": "Manager",      "type": "role" }
  ]
}`}
        response={`{
  "success": true,
  "message": "Roles synced successfully for source 'HRMS'",
  "data": {}
}`}
        errors={[
          { code: "400", cause: "roles list is missing or empty — the sync is a full replace per source and refuses to wipe a source with an empty list." },
        ]}
      >
        <Callout type="tip">
          Call this sync endpoint whenever users or roles change in your HR system. The engine uses
          the <IC>label</IC> values in task assignment and history display — the{" "}
          <IC>by</IC> field in workflow history will show the label (e.g. &quot;John Manager&quot;)
          rather than just the raw ID.
        </Callout>
      </EndpointCard>

      {/* ── List Roles ─────────────────────────────────────────────────────── */}
      <H2 id="list-roles">List Roles &amp; Users</H2>
      <EndpointCard
        method="GET"
        path="/workflow-engine-api/mappings/roles"
        title="List All Roles and Users"
        description="Returns all entries currently in the role registry. Use this to verify a sync was applied correctly or to populate assignment dropdowns in the workflow designer."
        response={`{
  "success": true,
  "message": "Roles retrieved",
  "data": [
    { "id": "10",      "label": "John Manager", "type": "user" },
    { "id": "MANAGER", "label": "Manager",      "type": "role" }
  ]
}`}
      />

      {/* ── Integration Checklist ──────────────────────────────────────────── */}
      <H2 id="integration-checklist">Complete Integration Checklist</H2>
      <Callout type="tip">
        Follow these steps in order when integrating a new process with the workflow engine:
        <ol className="mt-2 space-y-1 list-decimal list-inside">
          <li>Sync roles and users from your HR system via <IC>POST /mappings/roles/sync</IC>.</li>
          <li>Create a workflow master and publish a definition version in the designer.</li>
          <li>Activate the definition version so the engine can resolve it at runtime.</li>
          <li>Register a <IC>processCode</IC> mapping via <IC>POST /mappings/processes</IC>.</li>
          <li>Call <IC>POST /workflow-runtime/start</IC> from your application using that <IC>processCode</IC>.</li>
        </ol>
      </Callout>
    </>
  );
}
