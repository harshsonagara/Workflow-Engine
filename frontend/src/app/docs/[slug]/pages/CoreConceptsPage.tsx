import { ArrowRight } from "lucide-react";

const concepts = [
  {
    id: "master", term: "Workflow Master", color: "bg-brand-500",
    desc: "The top-level named container for a workflow process. Holds a unique machine-readable code and owns one or more versions. Think of it as a named workflow template family.",
    keyPoints: [
      "Has a unique code used programmatically (e.g. LEAVE_APPROVAL)",
      "Supports soft-delete and active/inactive toggle",
      "One master can have many versions but only ONE active version at a time",
    ],
  },
  {
    id: "version", term: "Workflow Version", color: "bg-violet-500",
    desc: "Holds the immutable definitionJson — the complete graph of nodes, transitions, SLA rules, and notification config. Once instances run on a version it cannot be deleted.",
    keyPoints: [
      "Immutable snapshot — edit by creating a new version",
      "Activating a version auto-deactivates all others on the same master",
      "Running instances continue on the version they started with",
    ],
  },
  {
    id: "instance", term: "Workflow Instance", color: "bg-blue-500",
    desc: "A single execution of a workflow version for one business record. Tracks current position (currentNodeId), status, variables, and links to all tasks and audit logs.",
    keyPoints: [
      "Status: running · completed · rejected · paused · cancelled",
      "Identified by businessKey (your record's ID)",
      "Only one active instance per businessKey at a time",
    ],
  },
  {
    id: "task", term: "Workflow Task", color: "bg-emerald-500",
    desc: "The actionable unit assigned to a user or role at a specific node. Carries allowed actions, SLA deadline, remarks, and escalation state.",
    keyPoints: [
      "Created each time the instance enters an approval/task node",
      "Call GET /actions?recordId= to retrieve allowed actions before rendering buttons",
      "SLA deadline computed at creation from node config",
    ],
  },
  {
    id: "businesskey", term: "Business Key (recordId)", color: "bg-amber-500",
    desc: "The foreign key that links the workflow instance back to your business record (e.g. leave-request ID). Set at start-time; must be globally unique among active instances.",
    keyPoints: [
      "Store this in your domain record for fast lookup",
      "Primary query key for all runtime lookups",
      "Used in GET /instance/by-record/{recordId}",
    ],
  },
  {
    id: "processmapping", term: "Process Mapping", color: "bg-orange-500",
    desc: "A decoupling layer: maps your app's processCode to the engine's workflowCode. Your app always refers to its own stable domain name even if the underlying workflow changes.",
    keyPoints: [
      "Register once via POST /mappings/processes",
      "Change the mapping without redeploying your app",
      "Use processCode in /start instead of workflowCode",
    ],
  },
  {
    id: "roleregistry", term: "Role Registry", color: "bg-pink-500",
    desc: "The engine does not manage users natively. You push user/role data from your IAM system via POST /mappings/roles/sync. The engine stores these for assignment and escalation.",
    keyPoints: [
      "Always sync before starting workflows",
      "Missing roles cause assignment failures at start-time",
      "Full replace per source — always send the complete list",
    ],
  },
];

export default function CoreConceptsPage() {
  return (
    <div className="space-y-8">
      {concepts.map(c => (
        <div key={c.id} id={c.id} className="scroll-mt-24">
          <div className="flex items-start gap-4 p-5 rounded-xl border border-zinc-200 hover:border-zinc-300 transition-colors">
            <div className={`w-2.5 rounded-full ${c.color} mt-1 shrink-0 self-stretch`} />
            <div className="flex-1">
              <h3 className="text-[16px] font-bold text-zinc-900 mb-2">{c.term}</h3>
              <p className="text-sm text-zinc-600 leading-relaxed mb-4">{c.desc}</p>
              <ul className="space-y-1.5">
                {c.keyPoints.map(kp => (
                  <li key={kp} className="flex items-start gap-2 text-xs text-zinc-500">
                    <ArrowRight size={12} className="text-zinc-300 mt-0.5 shrink-0" />
                    {kp}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
