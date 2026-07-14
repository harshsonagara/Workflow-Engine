import {
  CodeBlock, Callout, Step, IC, H2, P,
} from "../../../../components/docs/DocComponents";

const errors = [
  { symptom: "POST /start → 400 'workflowCode not found'",
    cause:   "workflowCode doesn't match any master, or master is inactive.",
    fix:     "Call GET /workflow-runtime/dropdown to see valid codes. Check isActive on the master via GET /workflow-definitions/masters/{masterId}." },
  { symptom: "POST /start → 409 'businessKey already has running instance'",
    cause:   "A previous instance is still open for this record.",
    fix:     "Call GET /instance/by-record/{recordId} to check status. Complete or cancel the existing instance first." },
  { symptom: "User sees no tasks in GET /pending-tasks",
    cause:   "Task assigned to a role the user doesn't hold, or roles not synced.",
    fix:     "Call POST /mappings/roles/sync with the correct role list. Verify the user's JWT claims include the expected roleCode." },
  { symptom: "POST /action → 400 'Invalid task ID' or 'Action is required'",
    cause:   "taskId is null/0 or action string is empty.",
    fix:     "Validate taskId > 0 and action is non-blank before sending the request." },
  { symptom: "POST /action → 403 Forbidden",
    cause:   "Authenticated user is not the task's resolvedAssignedTo or resolvedAssignedRole.",
    fix:     "Compare task.assignedRole with the user's JWT role claims. Use GET /diagnostic for task details." },
  { symptom: "POST /action → 409 'already actioned'",
    cause:   "Task was completed by SLA auto-progress or another user in a parallel session.",
    fix:     "Call GET /instance/by-record/{recordId} to see current state. No action needed — workflow has already advanced." },
  { symptom: "Workflow stuck at conditional node",
    cause:   "context.variables is missing the conditional key, or no rule condition evaluates to true.",
    fix:     "Call GET /conditional-keys to see required keys. Call GET /diagnostic for rule evaluation details." },
  { symptom: "SLA not triggering escalation",
    cause:   "Scheduler interval too long, or sla.escalation block missing in definitionJson.",
    fix:     "Check SLA check interval in engine config. Validate the sla.escalation block in your definition." },
  { symptom: "External webhook not called on action",
    cause:   "externalAPICall not set to 'true', or URL misconfigured in action config.",
    fix:     "Re-validate the action config in definitionJson. Test URL reachability from the engine host network." },
];

export default function TroubleshootingPage() {
  return (
    <>
      <H2 id="errors">Common Errors</H2>
      <div className="space-y-3 my-5">
        {errors.map((r, i) => (
          <div key={i} className="rounded-xl border border-zinc-200 overflow-hidden">
            <div className="flex gap-2.5 items-start px-4 py-3 bg-zinc-900">
              <span className="text-amber-400 mt-0.5 shrink-0 text-sm">⚠</span>
              <code className="text-sm text-amber-200 font-mono leading-relaxed">{r.symptom}</code>
            </div>
            <div className="px-4 py-3.5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Cause</p>
                <p className="text-sm text-zinc-600 leading-relaxed">{r.cause}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Fix</p>
                <p className="text-sm text-zinc-700 leading-relaxed">{r.fix}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <H2 id="debug">Debugging Guide</H2>
      <P>The <IC>/diagnostic</IC> endpoint is your first stop for any stuck or unexpected workflow:</P>
      <CodeBlock language="http" code={`GET /workflow-engine-api/workflow-runtime/diagnostic?recordId=LR-2025-001

Returns:
  - instance.status and currentNodeId
  - Full config of the current node from definitionJson
  - All pending tasks with assignees and SLA state
  - Last 10 transition_history entries
  - Last 10 audit_log entries`} />
      <Callout type="tip">Use <IC>recordId</IC> as your correlation key in all logs across your application and the engine. Share the full diagnostic response when opening engine support tickets.</Callout>

      <Step n={1} title="Check the instance status">
        Call <IC>GET /instance/by-record/{`{recordId}`}</IC>. Note <IC>status</IC>, <IC>currentNodeId</IC>, and all tasks. Is there a pending task? Who is it assigned to?
      </Step>
      <Step n={2} title="Check the user's roles">
        The engine reads roleCode from the JWT. Verify the user&apos;s token contains the expected role that matches <IC>task.assignedRole</IC>.
      </Step>
      <Step n={3} title="Check conditional keys">
        Call <IC>GET /conditional-keys?workflowName=&version=</IC>. Compare with the variables that were passed in the original <IC>/start</IC> call.
      </Step>
      <Step n={4} title="Run diagnostic">
        Call <IC>GET /diagnostic?recordId=</IC> and review the rule evaluation trace and transition history.
      </Step>
    </>
  );
}
