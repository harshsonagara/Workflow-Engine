import {
  CodeBlock, Step, IC, H2,
} from "../../../../components/docs/DocComponents";
import { ArrowRight } from "lucide-react";

const phases = [
  { n: 1, label: "Design",    desc: "Build definitionJson",      who: "Admin",    color: "bg-brand-500" },
  { n: 2, label: "Validate",  desc: "Check structural integrity", who: "Admin",    color: "bg-violet-500" },
  { n: 3, label: "Activate",  desc: "Set version as live",        who: "Admin",    color: "bg-blue-500"   },
  { n: 4, label: "Start",     desc: "User submits record",        who: "Your App", color: "bg-emerald-500"},
  { n: 5, label: "Act",       desc: "Approvers take actions",     who: "End User", color: "bg-amber-500"  },
  { n: 6, label: "Complete",  desc: "End node reached",           who: "Engine",   color: "bg-orange-500" },
];

export default function LifecyclePage() {
  return (
    <>
      <H2 id="phases">Phase Overview</H2>
      <div className="my-6 p-5 rounded-xl border border-zinc-200 bg-zinc-50 overflow-x-auto">
        <div className="flex items-start gap-0 min-w-[540px]">
          {phases.map((s, i, a) => (
            <div key={s.n} className="flex items-center">
              <div className="flex flex-col items-center w-[88px]">
                <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                  {s.n}
                </div>
                <p className="text-xs font-bold text-zinc-800 mt-2 text-center">{s.label}</p>
                <p className="text-[10px] text-zinc-500 text-center mt-0.5 leading-tight px-1">{s.desc}</p>
                <span className="mt-1.5 text-[9px] font-bold text-brand-600 bg-brand-100 px-2 py-0.5 rounded-full">{s.who}</span>
              </div>
              {i < a.length - 1 && (
                <ArrowRight size={14} className="text-zinc-300 mx-0.5 mt-[-28px] shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>

      <H2 id="steps">Step by Step</H2>
      <Step n={1} title="Design the definition JSON">
        Build the node graph: one <IC>start</IC> node, one or more <IC>approval</IC> / <IC>conditional</IC> nodes,
        one <IC>end</IC> node, and <IC>connections</IC> array. Include SLA config and action definitions on every approval node.
      </Step>
      <Step n={2} title="Validate before saving">
        POST to <IC>/workflow-definitions/validate</IC>. The engine checks: start/end node presence, no orphan nodes,
        valid SLA unit values, valid assignee config. Fix all errors — validation prevents corrupt graphs from running.
      </Step>
      <Step n={3} title="Save the master and activate">
        POST to <IC>/workflow-definitions/create-workflow-master</IC>, then POST to
        <IC>{`/{versionId}/activate`}</IC>. Activation auto-deactivates all other versions on the same master.
      </Step>
      <Step n={4} title="Start an instance when a record is created">
        Your app POSTs to <IC>/workflow-runtime/start</IC> with the <IC>workflowCode</IC>,
        a unique <IC>businessKey</IC>, routing <IC>variables</IC>, and the <IC>initiatedBy</IC> user ID.
        The engine creates an instance and the first task.
      </Step>
      <Step n={5} title="Assignees act on their tasks">
        Assignees call <IC>GET /workflow-runtime/pending-tasks</IC> to see their queue,
        <IC>GET /workflow-runtime/actions?recordId=</IC> for per-record action config,
        then <IC>POST /workflow-runtime/action</IC> to act.
      </Step>
      <Step n={6} title="Engine advances automatically">
        After each action, the engine evaluates outgoing transitions, applies conditional rules,
        creates the next task(s), and writes to audit_log and transition_history.
        Your app needs no polling — just query on demand.
      </Step>
      <Step n={7} title="Instance reaches end node">
        When a transition targets the end node, the engine marks the instance
        <IC>status=completed</IC> with the configured <IC>outcome</IC>.
        Check via <IC>GET /instance/by-record/{`{recordId}`}</IC>.
      </Step>

      <H2 id="sequence">Sequence Diagram</H2>
      <CodeBlock language="plaintext" code={`App ──POST /start──────────────────────────────► Engine
                                                  creates instance + task 201 (MANAGER role)
App ◄──{ instanceId:101, taskId:201 }────────────

Manager GET /pending-tasks ──────────────────────► Engine
        ◄── [{ taskId:201, recordId:"LR-001", nodeLabel:"Manager Approval" }]

Manager GET /actions?recordId=LR-001 ────────────► Engine
        ◄── { taskId:201, availableActions:[{action:"approve",...},{action:"reject",...}] }

Manager POST /action { taskId:201, recordId:"LR-001", action:"approve" } ► Engine
                                                       marks task 201 completed
                                                       evaluates transitions
                                                       creates task 202 (HR role)
        ◄── { status:running, currentNodeId:hr_review }

HR      GET /pending-tasks ──────────────────────► Engine
        ◄── [{ taskId:202, recordId:"LR-001", nodeLabel:"HR Approval" }]

HR      POST /action { taskId:202, action:approve } ► Engine
                                                       marks instance completed
        ◄── { status:completed, outcome:Approved }

App     GET /instance/by-record/LR-001 ──────────► Engine
        ◄── { status:completed, completedAt:... }`} />
    </>
  );
}
