import {
  CodeBlock, PropTable, IC, H2, P,
} from "../../../../components/docs/DocComponents";

export default function SchemaPage() {
  return (
    <>
      <H2 id="top-level">Top-Level Structure</H2>
      <P>The <IC>definitionJson</IC> is a serialized JSON string (stored as JSONB in PostgreSQL) with two top-level arrays:</P>
      <CodeBlock language="json" code={`{
  "nodes":       [ /* array of node objects */ ],
  "connections": [ /* array of connection objects */ ]
}`} />

      <H2 id="node-types">Node Types</H2>
      <PropTable rows={[
        ["start",       "–",      "Yes", "Entry point. Exactly one per graph. No config required beyond label."],
        ["approval",    "config", "Yes", "Human task node. Generates a WorkflowTask for a user/role with actions and SLA."],
        ["conditional", "config", "No",  "Router. Evaluates rules against instance variables to choose the next path."],
        ["task",        "config", "No",  "Automated/system step. No human action. Can call external APIs."],
        ["end",         "config", "Yes", "Terminal node. One or more. Sets finalStatus and outcome on the instance."],
      ]} />

      <H2 id="node-schema">Full Node Object Schema</H2>
      <CodeBlock language="json" code={`{
  "id":   "approval_manager",     // required — unique within the graph
  "type": "approval",             // start | end | approval | task | conditional
  "config": {
    "label":        "Manager Review",
    "approvalMode": "single",     // single | multiple (parallel approval)

    // ASSIGNMENT (required for approval/task nodes)
    "assignee":  { "type": "role", "value": "MANAGER" },
    "assignees": [                // for multi-approver nodes (approvalMode=multiple)
      { "type": "role", "value": "MANAGER" },
      { "type": "user", "value": "user_alice" }
    ],

    // ACTIONS array (required for approval nodes)
    "actions": [{
      "action":            "approve",        // machine key used in /action call
      "label":             "Approve",        // display label in UI
      "resultStatus":      "Approved",       // stored as outcome
      "requiresRemarks":   false,
      "remarksMandatory":  false,
      "predefinedReasons": [],               // dropdown options for reject
      // Initiator Notifications:
      "requiresInitiatorNotification":          true,
      "initiatorEmailTemplate":                 "tmpl_leave_approved",
      "initiatorEmailCC":                       ["hr@company.com"],
      "initiatorSMSTextTemplate":               "tmpl_sms_approved",
      "initiatorSystemNotificationTemplate":    null,
      // Follow-Up Notifications:
      "requiresFollowUpNotification":           null,
      "followUpEmailTemplate":                  null,
      "followUpEmailCC":                        [],
      "followUpSMSTextTemplate":                null,
      "followUpSystemNotificationTemplate":     null,
      // External webhook on this action:
      "externalAPICall":        "true",
      "externalAPICallBaseUrl": "https://hrapi.company.com",
      "externalAPICallPath":    "/leave/approve"
    }],

    // SLA (optional, strongly recommended for approval nodes)
    "sla": {
      "duration":       24,
      "unit":           "hours",            // minutes | hours | days
      "escalationType": "escalate_to_role", // escalate_to_role | move_to_next_node | keep_with_warning
      "escalation":     { "type": "role", "value": "HR_ADMIN" },
      "autoProgressAction": "approve"       // used when escalationType=move_to_next_node
    },

    // CONDITIONAL NODE rules
    "rules": [{
      "conditions": [{
        "key":       "leaveDays",
        "operator":  ">=",         // == | != | > | < | >= | <= | contains
        "value":     10,
        "valueType": "number"      // string | number | boolean
      }],
      "operators":  ["AND"],
      "nextAction": "needs_hr"    // must match a connection's 'on' field
    }],

    // END NODE config
    "finalStatus":   "Completed",
    "defaultStatus": "In Progress",

    // PERMISSIONS
    "allowReject":            true,
    "requireRemarksOnReject": true,
    "allow_edit":             false,
    "allowedInitiators":      { "type": "all", "values": [] }
  }
}`} />

      <H2 id="connections">Connection Object Schema</H2>
      <CodeBlock language="json" code={`{
  "from":     "approval_manager",  // required — source node id
  "to":       "days_check",        // required — target node id
  "onAction": "approve",           // fires when this action is taken on source
  "on":       "needs_hr",          // for conditional nodes: rule nextAction value
  "notification": "tmpl_id",       // optional: notification on this transition
  "api_call_on_action": "false"    // optional: trigger external API on transition
}`} />

      <H2 id="minimal">Minimal Valid Definition</H2>
      <P>The smallest valid definition — one approval node, both approve and reject paths:</P>
      <CodeBlock language="json" code={`{
  "nodes": [
    { "id": "start", "type": "start", "config": { "label": "Start" } },
    {
      "id": "approval_manager", "type": "approval",
      "config": {
        "label": "Manager Review",
        "assignee": { "type": "role", "value": "MANAGER" },
        "actions": [
          { "action": "approve", "label": "Approve", "resultStatus": "Approved",
            "requiresRemarks": false },
          { "action": "reject",  "label": "Reject",  "resultStatus": "Rejected",
            "requiresRemarks": true, "remarksMandatory": true }
        ],
        "sla": { "duration": 24, "unit": "hours",
                 "escalationType": "keep_with_warning" }
      }
    },
    { "id": "end", "type": "end",
      "config": { "label": "End", "finalStatus": "Completed" } }
  ],
  "connections": [
    { "from": "start",            "to": "approval_manager" },
    { "from": "approval_manager", "to": "end", "onAction": "approve" },
    { "from": "approval_manager", "to": "end", "onAction": "reject"  }
  ]
}`} />
    </>
  );
}
