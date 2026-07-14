"use client";

import {
  EndpointCard, Callout, IC, H2, H3, P, PropTable, CodeBlock,
} from "../../../../components/docs/DocComponents";

export default function ApiDefinitionPage() {
  return (
    <>
      <P>
        Base path: <IC>/workflow-engine-api/workflow-definitions</IC>
      </P>
      <Callout type="note">
        All endpoints require <IC>Authorization: Bearer &lt;token&gt;</IC>. The
        engine reads <IC>userId</IC> and <IC>roleCode</IC> from the JWT to
        enforce permissions.
      </Callout>

      {/* ── 1. Create Workflow Master ──────────────────────────────────── */}
      <H2 id="create-master">Create Workflow Master</H2>
      <P>
        Creates a new <IC>WorkflowMaster</IC> and its first{" "}
        <IC>WorkflowVersion</IC> in a single call. The{" "}
        <IC>workflowName</IC> must be unique. If <IC>code</IC> is omitted it is
        auto-generated from the name.
      </P>

      <H3>Request body</H3>
      <PropTable
        rows={[
          ["workflowName", "string", "Yes", "Unique display name for the workflow master."],
          ["code",         "string", "No",  "Stable identifier (UPPER_SNAKE_CASE). Auto-derived from name if omitted."],
          ["versionName",  "string", "Yes", "Label for the first version, e.g. v1."],
          ["active",       "boolean","No",  "Whether the new version should be immediately activated. Defaults to true."],
          ["definitionJson","string","Yes", "Serialised JSON string containing nodes and connections."],
        ]}
      />

      <EndpointCard
        method="POST"
        path="/workflow-definitions/create-workflow-master"
        title="Create Workflow Master"
        description="Creates a WorkflowMaster and its first WorkflowVersion in one call."
        request={`{
  "workflowName": "Leave Approval",
  "code": "LEAVE_APPROVAL",
  "versionName": "v1",
  "active": true,
  "definitionJson": "<JSON string>"
}`}
        response={`{
  "success": true,
  "message": "Workflow master created",
  "data": {
    "workflowMasterId": 1,
    "workflowVersionId": 1
  }
}`}
        errors={[
          { code: "409", cause: "A workflow with the same name (or generated code) already exists in your tenant." },
          { code: "422", cause: "definitionJson fails validation, or a valid code could not be generated from the workflow name." },
        ]}
      />

      {/* ── 2. Create Version ─────────────────────────────────────────── */}
      <H2 id="create-definition">Create New Version</H2>
      <P>
        Adds a new version to an existing master without changing the currently
        active one. Use this to draft and test a revised definition while live
        instances continue on the old version.
      </P>

      <H3>Request body</H3>
      <PropTable
        rows={[
          ["workflowName",  "string", "Yes", "Resolves the target WorkflowMaster by name."],
          ["versionName",   "string", "Yes", "Must be unique per master, e.g. v2."],
          ["active",        "boolean","No",  "Set true to immediately activate this version. Defaults to false."],
          ["definitionJson","string", "Yes", "Serialised JSON string containing nodes and connections."],
        ]}
      />

      <EndpointCard
        method="POST"
        path="/workflow-definitions/create-version"
        title="Create New Version"
        description="Creates a new version for an existing workflow master. The currently active version remains unchanged unless active is set to true."
        request={`{
  "workflowName": "Leave Approval",
  "versionName": "v2",
  "active": false,
  "definitionJson": "<JSON string>"
}`}
        response={`{
  "success": true,
  "message": "Version created",
  "data": {
    "id": 2,
    "workflowMasterId": 1,
    "versionName": "v2",
    "isActive": false
  }
}`}
        errors={[
          { code: "404", cause: "No workflow master matches the given workflowName." },
          { code: "409", cause: "The versionName already exists for this workflow master." },
          { code: "422", cause: "versionName is missing or definitionJson fails validation." },
        ]}
      />

      {/* ── 3. Get Definition by ID ───────────────────────────────────── */}
      <H2 id="get-definition">Get Workflow Definition by ID</H2>
      <P>
        Retrieves a single workflow version by its numeric ID. Returns the full{" "}
        <IC>definitionJson</IC> along with metadata.
      </P>

      <EndpointCard
        method="GET"
        path="/workflow-definitions/{id}"
        title="Get Definition by ID"
        description="Fetches a workflow version record including the full definitionJson, active status, and parent master reference."
        requiredData={["id (path param) — WorkflowVersion ID"]}
        response={`{
  "success": true,
  "message": "Definition retrieved",
  "data": {
    "id": 1,
    "workflowMasterId": 1,
    "versionName": "v1",
    "definitionJson": "<JSON string>",
    "isActive": true
  }
}`}
      />

      {/* ── 4. Validate ───────────────────────────────────────────────── */}
      <H2 id="validate">Validate Definition</H2>
      <P>
        Validates structural integrity of a <IC>definitionJson</IC> without
        persisting anything. Checks start/end node presence, no orphan nodes,
        valid transition targets, SLA unit values, and assignee config. Always
        call this before <IC>/activate</IC> in CI/CD pipelines.
      </P>

      <EndpointCard
        method="POST"
        path="/workflow-definitions/validate"
        title="Validate Definition JSON"
        description="Dry-run validation of a definitionJson. Returns valid: true with an empty errors array on success, or valid: false with a list of blocking errors."
        requiredData={["definitionJson (string) — the JSON string to validate"]}
        request={`{
  "definitionJson": "<JSON string>"
}`}
        responses={[
          {
            label: "200 OK — Valid",
            body: `{
  "success": true,
  "message": "Validation complete",
  "data": {
    "valid": true,
    "errors": [],
    "warnings": [],
    "summary": "Valid workflow: 3 nodes, 2 connections"
  }
}`,
          },
          {
            label: "200 OK — Invalid",
            body: `{
  "success": true,
  "message": "Validation complete",
  "data": {
    "valid": false,
    "errors": [
      "No start node found",
      "End node missing"
    ],
    "warnings": []
  }
}`,
          },
        ]}
      >
        <Callout type="important">
          Supply ALL keys listed in <IC>allUniqueKeys</IC> (see{" "}
          <IC>GET /conditional-keys</IC>) inside <IC>context.variables</IC> when
          starting a workflow. Missing keys cause conditional routing to fail
          silently.
        </Callout>
      </EndpointCard>

      {/* ── 5. Activate Version ───────────────────────────────────────── */}
      <H2 id="activate">Activate Version</H2>
      <P>
        Makes the given version the active one for its master. All other
        versions of the same master are automatically deactivated. Existing
        running instances on older versions are not affected.
      </P>

      <EndpointCard
        method="POST"
        path="/workflow-definitions/{versionId}/activate"
        title="Activate Version"
        description="Promotes a version to active. Deactivates all sibling versions of the same master atomically."
        requiredData={["versionId (path param) — WorkflowVersion ID"]}
        response={`{
  "success": true,
  "message": "Version activated",
  "data": {
    "versionId": 1
  }
}`}
        errors={[
          { code: "404", cause: "Version not found or has been deleted." },
        ]}
      />

      {/* ── 6. List All Masters ───────────────────────────────────────── */}
      <H2 id="list-masters">List All Masters</H2>
      <P>
        Returns all non-deleted workflow masters, each with their currently
        active version. Use to populate admin screens or selectors.
      </P>

      <EndpointCard
        method="GET"
        path="/workflow-definitions/get-all-workflow-masters"
        title="List All Masters"
        description="Returns every non-deleted WorkflowMaster together with its active version summary."
        response={`{
  "success": true,
  "message": "Masters retrieved",
  "data": [
    {
      "id": 1,
      "workflowName": "Leave Approval",
      "code": "LEAVE_APPROVAL",
      "isActive": true,
      "activeVersion": {
        "id": 1,
        "versionName": "v1"
      }
    }
  ]
}`}
      />

      {/* ── 7. Get Master with All Versions ──────────────────────────── */}
      <H2 id="get-master">Get Master with All Versions</H2>
      <P>
        Returns a single workflow master along with ALL its versions (active and
        inactive). Use for version management admin screens.
      </P>

      <EndpointCard
        method="GET"
        path="/workflow-definitions/masters/{masterId}"
        title="Get Master with All Versions"
        description="Fetches the master record and the full list of its versions so you can compare, activate, or delete individual versions."
        requiredData={["masterId (path param) — WorkflowMaster ID"]}
        response={`{
  "success": true,
  "message": "Master retrieved",
  "data": {
    "id": 1,
    "workflowName": "Leave Approval",
    "workflowVersions": [
      { "id": 1, "versionName": "v1", "isActive": true },
      { "id": 2, "versionName": "v2", "isActive": false }
    ]
  }
}`}
      />

      {/* ── 8. Available Actions ──────────────────────────────────────── */}
      <H2 id="available-actions">Get Available Actions from Definition</H2>
      <P>
        Returns all possible action values defined in the end node&apos;s
        incoming edges for a given workflow version. Useful for understanding
        what outcomes a workflow can produce before starting an instance.
      </P>

      <EndpointCard
        method="GET"
        path="/workflow-definitions/{versionId}/available-actions"
        title="Available Actions"
        description="Resolves the set of terminal actions reachable from the end node of the specified version."
        requiredData={["versionId (path param) — WorkflowVersion ID"]}
        response={`{
  "success": true,
  "message": "Available actions resolved",
  "data": {
    "actions": ["approve", "reject"]
  }
}`}
      />

      {/* ── 9. Conditional Keys ───────────────────────────────────────── */}
      <H2 id="conditional-keys">Get Conditional Keys</H2>
      <P>
        Returns all variable keys used in conditional nodes for a given version.
        Use this to discover which variables your application must supply in{" "}
        <IC>context.variables</IC> at start-time.
      </P>

      <EndpointCard
        method="GET"
        path="/workflow-definitions/conditional-keys?workflowName=LEAVE_APPROVAL&version=1"
        title="Get Conditional Keys"
        description="Extracts every unique condition key from all conditional nodes in the specified version so integrators know exactly what to pass in context.variables."
        requiredData={[
          "workflowName (query param) — UPPER_SNAKE_CASE workflow name",
          "version (query param) — integer version number (1-based, must be > 0)",
        ]}
        response={`{
  "success": true,
  "message": "Keys retrieved",
  "data": {
    "workflowName": "LEAVE_APPROVAL",
    "version": 1,
    "allUniqueKeys": ["leaveDays", "amount"],
    "conditionalNodes": [
      {
        "nodeId": "cond_1",
        "label": "Amount Check",
        "keys": [
          {
            "key": "leaveDays",
            "operator": ">=",
            "value": "5",
            "nextAction": "hr_review"
          }
        ]
      }
    ]
  }
}`}
      >
        <Callout type="important">
          Every key listed in <IC>allUniqueKeys</IC> must be present in{" "}
          <IC>context.variables</IC> when calling <IC>/start</IC>. A missing key
          causes conditional routing to evaluate incorrectly without throwing an
          error.
        </Callout>
      </EndpointCard>

      {/* ── 10. Create Version (link) ─────────────────────────────────── */}
      <H2 id="create-version">Create New Version</H2>
      <P>
        This endpoint is documented above under{" "}
        <a href="#create-definition" className="text-brand-600 underline hover:text-brand-800 font-medium">
          Create New Version
        </a>
        . See that section for the full request body schema and response.
      </P>

      {/* ── 11. Toggle Master Status ──────────────────────────────────── */}
      <H2 id="toggle-status">Toggle Master Status</H2>
      <P>
        Toggles a workflow master between active and inactive states. An
        inactive master cannot have new instances started against it, but
        running instances on its versions are unaffected.
      </P>

      <EndpointCard
        method="POST"
        path="/workflow-definitions/masters/{masterId}/toggle-status"
        title="Toggle Master Status"
        description="Flips the isActive flag on the WorkflowMaster. Use to suspend a workflow from accepting new submissions without deleting it."
        requiredData={["masterId (path param) — WorkflowMaster ID"]}
        response={`{
  "success": true,
  "message": "Status toggled",
  "data": {
    "masterId": 1
  }
}`}
        errors={[
          { code: "404", cause: "Workflow master not found." },
          { code: "409", cause: "Cannot toggle status of a deleted workflow." },
        ]}
      />

      {/* ── 12. Active Instance Counts ────────────────────────────────── */}
      <H2 id="active-instance-counts">Active Instance Counts</H2>
      <P>
        Returns a map of workflow master ID to active (running) instance count.
        If <IC>workflowId</IC> is supplied only that workflow&apos;s count is
        returned; otherwise all workflows are included.
      </P>

      <EndpointCard
        method="GET"
        path="/workflow-definitions/active-instance-counts?workflowId=1"
        title="Get Active Instance Counts"
        description="Returns a workflowMasterId → runningCount map. workflowId query param is optional — omit to get counts for all masters."
        response={`{
  "success": true,
  "message": "Counts retrieved",
  "data": {
    "1": 3,
    "2": 0
  }
}`}
      />

      {/* ── 13. Pending Instances ─────────────────────────────────────── */}
      <H2 id="pending-instances">Check Pending Instances</H2>
      <P>
        Returns whether any instances are still running for this master. Call
        this before deactivating or deleting a master to avoid disrupting
        in-flight workflows.
      </P>

      <EndpointCard
        method="GET"
        path="/workflow-definitions/{workflowId}/pending-instances"
        title="Check Pending Instances"
        description="Lightweight check — returns hasPending: true/false and a count. Use as a safety gate before delete or deactivate operations."
        requiredData={["workflowId (path param) — WorkflowMaster ID"]}
        response={`{
  "success": true,
  "message": "Pending instances checked",
  "data": {
    "hasPending": true,
    "count": 3
  }
}`}
      />

      {/* ── 14. Delete Workflow Master ────────────────────────────────── */}
      <H2 id="delete-master">Delete Workflow Master</H2>
      <P>
        Soft-deletes the master and all its versions. The operation is blocked
        if any active running instances exist on any version of this master.
      </P>

      <Callout type="warning">
        Cannot delete a workflow master if active instances exist. Call{" "}
        <IC>GET /pending-instances</IC> first and ensure{" "}
        <IC>hasPending</IC> is <IC>false</IC> before proceeding.
      </Callout>

      <EndpointCard
        method="DELETE"
        path="/workflow-definitions/masters/{masterId}"
        title="Delete Workflow Master"
        description="Soft-deletes the WorkflowMaster and all associated versions. Blocked when running instances exist."
        requiredData={["masterId (path param) — WorkflowMaster ID"]}
        response={`{
  "success": true,
  "message": "Master soft-deleted",
  "data": {
    "masterId": 1
  }
}`}
        errors={[
          { code: "409", cause: "Active running instances exist — complete or cancel them first" },
          { code: "404", cause: "Master not found or already deleted" },
        ]}
      />

      {/* ── 15. Delete Version ────────────────────────────────────────── */}
      <H2 id="delete-version">Delete Version</H2>
      <P>
        Soft-deletes a single workflow version. Blocked when the version has
        active running instances, or when it is the currently active version and
        instances depend on it.
      </P>

      <Callout type="warning">
        Cannot delete the currently active version if instances exist on it.
        Activate a different version first, or wait for all running instances to
        complete.
      </Callout>

      <EndpointCard
        method="DELETE"
        path="/workflow-definitions/versions/{versionId}"
        title="Delete Version"
        description="Soft-deletes a single WorkflowVersion. Blocked when the version is active and has running instances."
        requiredData={["versionId (path param) — WorkflowVersion ID"]}
        response={`{
  "success": true,
  "message": "Version soft-deleted",
  "data": {
    "versionId": 2
  }
}`}
        errors={[
          { code: "409", cause: "Active running instances exist on this version — wait for completion or cancel them" },
          { code: "404", cause: "Version not found or already deleted" },
        ]}
      />
    </>
  );
}
