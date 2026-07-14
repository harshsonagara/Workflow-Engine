// Shared workflow canvas types — imported by WorkflowDesigner and NodeConfigSidebar.

export interface CustomNodeData {
  [key: string]: any;
  label: string;
  type: "start" | "approval" | "conditional" | "subworkflow" | "end";
  config?: {
    approvalMode?: "Single" | "All" | "Any" | "single" | "parallel_all" | "parallel_any";
    assignee?: { type: string; value: string };
    assignees?: Array<{ type: string; value: string }>;
    allowCorrections?: boolean;
    requireRemarksOnReject?: boolean;
    conditionExpression?: string;
    sla?: {
      duration: number;
      unit: string;
      escalationType: string;
      escalation?: { type: string; value: string };
      autoProgressAction?: string;
    };
    actions?: Array<{
      id: string;
      label: string;
      resultStatus?: string;
      requiresRemarks?: boolean;
      remarksMandatory?: boolean;
      predefinedReasons?: string[];
      externalAPICall?: string;
      externalAPICallBaseUrl?: string;
      externalAPICallPath?: string;
      requiresInitiatorNotification?: boolean;
      requiresFollowUpNotification?: boolean;
      initiatorEmailTemplate?: string;
      initiatorSMSTextTemplate?: string;
      initiatorSystemNotificationTemplate?: string;
      followUpEmailTemplate?: string;
      followUpSMSTextTemplate?: string;
    }>;
    allowedInitiators?: { type: string; values: string[] };
    rules?: Array<{
      conditions: Array<{ key: string; operator: string; value: string; valueType?: "literal" | "field" }>;
      operators?: string[];
      nextAction?: string;
    }>;
    defaultAction?: string;
    workflowDefinitionId?: number;
    subWorkflowName?: string;
    workflowVersionId?: number;
    successAction?: string;
    failureAction?: string;
    defaultStatus?: string;
    finalStatus?: string;
    label?: string;
    allow_edit?: boolean;
  };
}
