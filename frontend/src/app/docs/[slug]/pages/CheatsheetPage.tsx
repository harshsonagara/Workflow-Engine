import {
  Badge, PropTable, H2,
} from "../../../../components/docs/DocComponents";

const apis: [string, string, string][] = [
  // Definition APIs
  ["Get definition by ID",         "GET",    "/workflow-engine-api/workflow-definitions/{id}"],
  ["Create workflow master",       "POST",   "/workflow-engine-api/workflow-definitions/create-workflow-master"],
  ["List all masters",             "GET",    "/workflow-engine-api/workflow-definitions/get-all-workflow-masters"],
  ["Get master with versions",     "GET",    "/workflow-engine-api/workflow-definitions/masters/{masterId}"],
  ["Create new version",           "POST",   "/workflow-engine-api/workflow-definitions/create-version"],
  ["Validate definition",          "POST",   "/workflow-engine-api/workflow-definitions/validate"],
  ["Activate version",             "POST",   "/workflow-engine-api/workflow-definitions/{versionId}/activate"],
  ["Get available actions (def.)", "GET",    "/workflow-engine-api/workflow-definitions/{versionId}/available-actions"],
  ["Get conditional keys",         "GET",    "/workflow-engine-api/workflow-definitions/conditional-keys?workflowName=&version="],
  ["Toggle master status",         "POST",   "/workflow-engine-api/workflow-definitions/masters/{masterId}/toggle-status"],
  ["Active instance counts",       "GET",    "/workflow-engine-api/workflow-definitions/active-instance-counts?workflowId="],
  ["Check pending instances",      "GET",    "/workflow-engine-api/workflow-definitions/{workflowId}/pending-instances"],
  ["Delete master",                "DELETE", "/workflow-engine-api/workflow-definitions/masters/{masterId}"],
  ["Delete version",               "DELETE", "/workflow-engine-api/workflow-definitions/versions/{versionId}"],
  // Runtime APIs
  ["Workflow dropdown",            "GET",    "/workflow-engine-api/workflow-runtime/dropdown"],
  ["Start workflow",               "POST",   "/workflow-engine-api/workflow-runtime/start"],
  ["Get instance by ID",           "GET",    "/workflow-engine-api/workflow-runtime/instance/{id}"],
  ["Get all instances",            "GET",    "/workflow-engine-api/workflow-runtime/instances"],
  ["Get instance by record",       "GET",    "/workflow-engine-api/workflow-runtime/instance/by-record/{recordId}"],
  ["Get pending tasks (direct)",   "POST",   "/workflow-engine-api/workflow-runtime/tasks/pending"],
  ["Get my pending tasks (JWT)",   "GET",    "/workflow-engine-api/workflow-runtime/pending-tasks"],
  ["Get available actions",        "GET",    "/workflow-engine-api/workflow-runtime/actions?recordId="],
  ["Execute action (JWT)",         "POST",   "/workflow-engine-api/workflow-runtime/action"],
  ["Dashboard statistics",         "GET",    "/workflow-engine-api/workflow-runtime/dashboard-stats"],
  ["Workflow history",             "GET",    "/workflow-engine-api/workflow-runtime/history?recordId="],
  ["Recent activities",            "GET",    "/workflow-engine-api/workflow-runtime/recent-activities"],
  ["My submissions",               "GET",    "/workflow-engine-api/workflow-runtime/my-submissions"],
  ["Diagnostic",                   "GET",    "/workflow-engine-api/workflow-runtime/diagnostic?recordId="],
  // Mapping APIs
  ["List process mappings",        "GET",    "/workflow-engine-api/mappings/processes"],
  ["Create process mapping",       "POST",   "/workflow-engine-api/mappings/processes"],
  ["Update process config",        "PATCH",  "/workflow-engine-api/mappings/processes/{processId}/config"],
  ["Delete process mapping",       "DELETE", "/workflow-engine-api/mappings/processes/{processId}"],
  ["Sync roles from IAM",         "POST",   "/workflow-engine-api/mappings/roles/sync"],
  ["List all roles and users",     "GET",    "/workflow-engine-api/mappings/roles"],
];

const checklist = [
  "JWT Bearer token configured in ALL outbound requests to the engine",
  "Roles synced via POST /mappings/roles/sync before first workflow start",
  "processCode → workflowCode mapping registered via POST /mappings/processes",
  "All conditional keys present in context.variables at start-time",
  "businessKey is unique, stable, and stored in your domain record",
  "Action remarks supplied when remarksMandatory=true",
  "SLA configuration set on all approval nodes in production definitions",
  "HTTP 409 (already actioned) handled gracefully in your UI",
  "HTTP 403 (not authorized) handled with a clear user message",
  "Role sync job is scheduled and idempotent (full replace each run)",
  "/validate called before every /activate in CI/CD pipelines",
  "Sensitive PII NOT placed in context.metadata or context.variables",
  "/diagnostic endpoint protected behind admin-only permission",
  "Workflow history rendered in your app's record detail view",
];

export default function CheatsheetPage() {
  return (
    <>
      <H2 id="api-table">Quick API Reference</H2>
      <div className="rounded-xl border border-zinc-200 overflow-hidden text-sm my-5">
        <div className="grid grid-cols-12 bg-zinc-800 text-zinc-200 text-[10px] font-bold uppercase tracking-wider">
          <div className="col-span-4 px-4 py-3">Goal</div>
          <div className="col-span-2 px-4 py-3">Method</div>
          <div className="col-span-6 px-4 py-3">Endpoint</div>
        </div>
        {apis.map(([goal, method, path], i) => (
          <div key={i} className={`grid grid-cols-12 border-t border-zinc-100 ${i % 2 === 0 ? "bg-white" : "bg-zinc-50/60"}`}>
            <div className="col-span-4 px-4 py-2.5 text-xs text-zinc-700 font-medium">{goal}</div>
            <div className="col-span-2 px-4 py-2.5"><Badge method={method} /></div>
            <div className="col-span-6 px-4 py-2.5 font-mono text-[11px] text-zinc-500">{path}</div>
          </div>
        ))}
      </div>

      <H2 id="checklist">Integration Checklist</H2>
      <div className="space-y-2 my-5">
        {checklist.map((item, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-2.5 rounded-lg border border-zinc-100 bg-zinc-50 hover:bg-white hover:border-zinc-200 transition-colors">
            <div className="w-5 h-5 rounded border-2 border-zinc-200 shrink-0 mt-0.5 flex items-center justify-center">
              <span className="text-[9px] font-bold text-zinc-300">{i + 1}</span>
            </div>
            <p className="text-sm text-zinc-700 leading-relaxed">{item}</p>
          </div>
        ))}
      </div>

      <H2 id="status-codes">HTTP Status Codes</H2>
      <PropTable rows={[
        ["200", "OK",                    "Yes", "Request succeeded. Check data field for payload."],
        ["201", "Created",               "Yes", "Resource created (POST /workflow-definitions, POST /mappings/processes)."],
        ["400", "Bad Request",           "Yes", "Missing field, wrong type, invalid action name, or invalid task ID."],
        ["403", "Forbidden",             "Yes", "User is not the task's assignee."],
        ["404", "Not Found",             "Yes", "Instance, task, or definition ID doesn't exist."],
        ["409", "Conflict",              "Yes", "Duplicate businessKey; task already actioned; duplicate workflow name/code."],
        ["422", "Unprocessable Entity",  "Yes", "Definition fails structural validation."],
        ["500", "Internal Server Error", "Yes", "Engine fault — check engine logs with recordId."],
      ]} />
    </>
  );
}
