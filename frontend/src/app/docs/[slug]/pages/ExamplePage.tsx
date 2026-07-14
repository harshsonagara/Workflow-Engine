import {
  CodeBlock, H2, P,
} from "../../../../components/docs/DocComponents";
import { ArrowRight } from "lucide-react";

export default function ExamplePage() {
  return (
    <>
      <H2 id="overview">Overview</H2>
      <P>This walkthrough models a 3-stage leave approval: Employee submits → Manager reviews → If more than 10 days, HR also reviews → Completed.</P>
      <div className="my-5 p-5 rounded-xl border border-brand-100 bg-brand-50">
        <p className="text-xs font-bold text-brand-700 uppercase tracking-wider mb-3">Flow</p>
        <div className="flex flex-wrap gap-2 items-center">
          {["Start", "Manager Review", "Conditional (days ≥ 10?)", "HR Review (if needed)", "End"].map((s, i, a) => (
            <span key={s} className="contents">
              <span className="px-3 py-1.5 bg-white border border-brand-200 rounded-lg text-brand-700 text-xs font-medium">{s}</span>
              {i < a.length - 1 && <ArrowRight size={13} className="text-brand-300" />}
            </span>
          ))}
        </div>
      </div>

      <H2 id="step-roles">Step 1 — Sync Roles</H2>
      <CodeBlock language="http" code={`POST /workflow-engine-api/mappings/roles/sync
{
  "source": "hr-portal",
  "roles": [
    { "id": "MANAGER",    "label": "Department Manager", "type": "role" },
    { "id": "HR_ADMIN",   "label": "HR Administrator",   "type": "role" },
    { "id": "user_alice", "label": "Alice Smith",        "type": "user" }
  ]
}
→ 200 OK  { "success": true, "message": "Roles synced successfully for source 'hr-portal'" }`} />

      <H2 id="step-create">Step 2 — Create and Activate Workflow</H2>
      <CodeBlock language="http" code={`POST /workflow-engine-api/workflow-definitions/create-workflow-master
{
  "workflowName": "Leave Approval", "code": "LEAVE_APPROVAL",
  "versionName": "v1.0", "active": false,
  "definitionJson": "{ nodes + connections JSON string }"
}
→ { "success": true, "data": { "workflowMasterId": 5, "workflowVersionId": 12 } }

POST /workflow-engine-api/workflow-definitions/12/activate
→ { "success": true, "data": { "versionId": 12 } }`} />

      <H2 id="step-start">Step 3 — Employee Submits (Your App Calls /start)</H2>
      <CodeBlock language="http" code={`POST /workflow-engine-api/workflow-runtime/start
{
  "workflowCode": "LEAVE_APPROVAL",
  "initiatedBy":  "user_alice",
  "context": {
    "application":  "hr-portal",
    "entityType":   "leave_request",
    "entityId":     "LR-2025-001",
    "businessKey":  "LR-2025-001",
    "variables":    { "leaveDays": 12, "leaveType": "annual" },
    "metadata":     { "employeeName": "Alice Smith" }
  }
}
→ {
  "success": true,
  "data": {
    "success": true,
    "workflowInstanceId": 101,
    "taskId": 201,
    "recordId": "LR-2025-001",
    "currentNodeId": "approval_manager",
    "status": "running"
  }
}`} />

      <H2 id="step-manager">Step 4 — Manager Acts</H2>
      <CodeBlock language="http" code={`GET /workflow-engine-api/workflow-runtime/pending-tasks
→ { "success": true, "data": [{
    "taskId": 201, "instanceId": 101, "recordId": "LR-2025-001",
    "workflowName": "Leave Approval",
    "nodeLabel": "Manager Review",
    "slaStatus": { "deadline": "2025-06-26T10:00:00Z", "isBreached": false, "canTakeAction": true }
  }] }

POST /workflow-engine-api/workflow-runtime/action
{ "taskId": 201, "action": "approve", "remarks": "Approved." }
→ { "success": true, "data": { "id": 201, "status": "completed", "actionTaken": true } }

// Engine evaluates conditional: leaveDays=12 >= 10 → routes to hr_review
// Automatically creates task 202 for HR_ADMIN role`} />

      <H2 id="step-hr">Step 5 — HR Acts</H2>
      <CodeBlock language="http" code={`POST /workflow-engine-api/workflow-runtime/action
{ "taskId": 202, "action": "approve" }
→ { "success": true, "data": { "id": 202, "status": "completed", "actionTaken": true } }

GET /workflow-engine-api/workflow-runtime/instance/by-record/LR-2025-001
→ { "success": true, "data": {
    "id": 101, "status": "completed", "outcome": "Approved",
    "completedAt": "2025-06-25T16:00:00Z"
  } }`} />

      <H2 id="step-history">Step 6 — Read Audit Trail</H2>
      <CodeBlock language="http" code={`GET /workflow-engine-api/workflow-runtime/history?recordId=LR-2025-001
→ { "success": true, "data": [
  { "title": "Workflow Started", "by": "Alice Smith",   "date": "2025-06-25T10:00:00Z", "status": "Running" },
  { "title": "Task Assigned",   "step": "Manager Review", "by": "System", "date": "2025-06-25T10:00:01Z", "status": "Pending Review" },
  { "title": "Approved", "step": "Manager Review", "by": "Bob Manager", "actorId": "manager_bob",
    "action": "Approved", "remarks": "Approved.", "date": "2025-06-25T11:00:00Z", "status": "Approved" },
  { "title": "Approved", "step": "HR Review",      "by": "HR Admin",    "actorId": "hr_user_1",
    "action": "Approved", "date": "2025-06-25T16:00:00Z", "status": "Approved" },
  { "title": "Workflow Completed", "by": "System", "date": "2025-06-25T16:00:01Z", "status": "Completed" }
] }`} />
    </>
  );
}
