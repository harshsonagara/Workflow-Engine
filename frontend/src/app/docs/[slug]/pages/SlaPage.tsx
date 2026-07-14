import {
  CodeBlock, IC, H2, P,
} from "../../../../components/docs/DocComponents";

export default function SlaPage() {
  return (
    <>
      <H2 id="config">SLA Configuration</H2>
      <P>Configure SLA on any approval or task node in its <IC>config</IC> block. The engine computes <IC>slaDeadline = task.createdAt + duration × unit</IC> and checks periodically.</P>
      <CodeBlock language="json" code={`"sla": {
  "duration":       24,
  "unit":           "hours",           // minutes | hours | days
  "escalationType": "escalate_to_role",
  "escalation":     { "type": "role", "value": "HR_ADMIN" },
  "autoProgressAction": "approve"      // only for move_to_next_node type
}`} />

      <H2 id="types">Escalation Types</H2>
      <div className="space-y-4 my-5">
        {[
          {
            type: "escalate_to_role",
            badge: "bg-amber-100 text-amber-700 border-amber-200",
            desc: "Task is re-assigned to the escalation role. Original assignee stored in originalAssignee. isEscalated=true. The current task remains actionable for the new assignee.",
            when: "Use when you need a human escalation path with SLA accountability.",
          },
          {
            type: "move_to_next_node",
            badge: "bg-red-100 text-red-700 border-red-200",
            desc: "Engine automatically executes autoProgressAction as if the assignee had acted. Instance advances; old task is closed. canTakeAction becomes false.",
            when: "Use for workflows that must not block — e.g. auto-approve after deadline.",
          },
          {
            type: "keep_with_warning",
            badge: "bg-blue-100 text-blue-700 border-blue-200",
            desc: "Task stays with original assignee. isBreached=true, warningMessage populated. No reassignment.",
            when: "Use when you only need visibility, not automation. Good for low-stakes workflows.",
          },
        ].map(e => (
          <div key={e.type} className="rounded-xl border border-zinc-200 p-4">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold border font-mono mb-3 ${e.badge}`}>{e.type}</span>
            <p className="text-sm text-zinc-600 mb-2 leading-relaxed">{e.desc}</p>
            <p className="text-xs text-zinc-400"><span className="font-semibold">When to use:</span> {e.when}</p>
          </div>
        ))}
      </div>

      <H2 id="sla-response">SLA Status Response Shape</H2>
      <P>The <IC>slaStatus</IC> object is returned in <IC>GET /actions</IC> and <IC>GET /pending-tasks</IC> responses:</P>
      <CodeBlock language="json" code={`{
  "deadline":         "2025-06-26T10:00:00Z",
  "isBreached":       false,
  "breachedAt":       null,
  "breachedDuration": null,
  "escalationType":   null,
  "isEscalated":      false,
  "warningMessage":   "SLA expires in 22 hours",
  "canTakeAction":    true,
  "originalAssignee": null
}`} />

      <H2 id="ui">UI Integration</H2>
      <P>Use the <IC>slaStatus</IC> object to drive your UI:</P>
      <CodeBlock language="typescript" code={`const { slaStatus } = task;

if (!slaStatus.canTakeAction) {
  showBanner("This task has been auto-progressed. No action needed.");
  return;
}

if (slaStatus.isBreached) {
  showWarning(\`SLA breached \${slaStatus.breachedDuration} ago.\`);
} else if (slaStatus.deadline) {
  const hoursLeft =
    (new Date(slaStatus.deadline).getTime() - Date.now()) / 3_600_000;
  if (hoursLeft < 2) {
    showWarning(\`SLA expires in \${hoursLeft.toFixed(1)} hours\`);
  }
}

// If escalated, show who the original assignee was
if (slaStatus.isEscalated && slaStatus.originalAssignee) {
  showInfo(\`Task escalated from \${slaStatus.originalAssignee}\`);
}`} />
    </>
  );
}
