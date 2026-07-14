import { getToken, getUser } from "./auth";

const BASE_URL = "/workflow-engine-api";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ProcessMapping {
  id: number;
  processCode: string;
  processName: string;
  description?: string;
  workflowMasterId: number;
  workflowName?: string;
  entityType?: string;
  businessKeyPrefix?: string;
  isActive: boolean;
}

export interface ProcessMappingCreateDto {
  processCode: string;
  processName: string;
  description?: string;
  workflowMasterId: number;
  entityType?: string;
  businessKeyPrefix?: string;
  isActive?: boolean;
}

export interface SlaStatus {
  deadline: string | null;
  isBreached: boolean;
  breachedAt: string | null;
  breachedDuration: string | null;
  escalationType: string | null;
  isEscalated: boolean;
  warningMessage: string | null;
  canTakeAction: boolean;
  originalAssignee: string | null;
}

export interface PendingTask {
  taskId: number;
  instanceId: number;
  recordId: string;
  workflowName: string;
  createdAt: string;
  nodeLabel: string;
  slaStatus: SlaStatus | null;
  allowEdit: boolean;
}

export interface WorkflowHistory {
  title: string | null;
  step: string | null;
  action: string | null;
  by: string | null;
  actorId: string | null;
  role: string | null;
  fromNode: string | null;
  toNode: string | null;
  durationSeconds: number | null;
  remarks: string | null;
  date: string | null;
  status: string | null;
}

export interface MySubmission {
  instanceId: number;
  recordId: string;
  workflowName: string;
  status: string;
  currentNodeId: string | null;
  submittedAt: string;
  completedAt: string | null;
}

export interface ActionDefinition {
  action: string;
  label: string;
  resultStatus: string | null;
  requiresRemarks: boolean;
  remarksMandatory: boolean;
  predefinedReasons: string[];
}

export interface ActionPresetAdmin {
  id: number;
  action: string;
  label: string;
  resultStatus: string | null;
  requiresRemarks: boolean;
  remarksMandatory: boolean;
  sortOrder: number;
  active: boolean;
}

export interface ActionResolverResponse {
  taskId: number;
  instanceId: number;
  recordId: string;
  workflowName: string;
  currentNodeId: string;
  currentNodeLabel: string;
  availableActions: ActionDefinition[];
  status: string;
  slaStatus: SlaStatus | null;
  allowEdit: boolean;
}

export interface StartWorkflowRequest {
  workflowCode?: string;
  processCode?: string;
  initiatedBy: string;
  initiatedByName?: string;
  context?: {
    businessKey?: string;
    payload?: Record<string, any>;
    [key: string]: any;
  };
}

// ── Offline state ────────────────────────────────────────────────────────────
type OfflineListener = (isOffline: boolean) => void;
const listeners = new Set<OfflineListener>();
let _isOffline = false;

function setOffline(status: boolean) {
  if (_isOffline !== status) {
    _isOffline = status;
    listeners.forEach((l) => l(status));
  }
}

// Custom error class for API errors
class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isNetworkError: boolean
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Generic error messages by status code
function getGenericErrorMessage(status: number): string {
  const messages: { [key: number]: string } = {
    400: "Invalid request. Please check your input.",
    401: "Authentication required. Please log in.",
    403: "You don't have permission to perform this action.",
    404: "The requested resource was not found.",
    409: "This resource already exists or is in conflict.",
    422: "Invalid workflow definition. Please review the errors.",
    500: "Server error occurred. Please try again later.",
    503: "Service is temporarily unavailable.",
  };
  return messages[status] || "An error occurred. Please try again.";
}

// ── Central fetch helper ─────────────────────────────────────────────────────
// Handles error extraction, JSON parsing, and offline tracking in one place.
async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  // Attach the JWT when logged in — backend parses it but does not require it
  const token = getToken();
  if (token) {
    init = { ...init, headers: { ...init?.headers, Authorization: `Bearer ${token}` } };
  }

  // Step 1: network-level fetch — only this can set us offline
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (networkErr: any) {
    setOffline(true);
    const errorMsg = networkErr?.message ?? "Unable to reach the server";
    throw new ApiError(errorMsg, 0, true);
  }

  // Step 2: HTTP error — extract message from response body
  if (!res.ok) {
    try {
      const body = await res.json().catch(() => ({})) as any;
      // 503 = proxy couldn't reach backend → mark offline
      if (res.status === 503) {
        setOffline(true);
        throw new ApiError("Server is temporarily unavailable", res.status, true);
      }
      // Extract actual backend error message
      const errorMsg = body?.message || body?.data?.message || getGenericErrorMessage(res.status);
      throw new ApiError(errorMsg, res.status, false);
    } catch (parseErr) {
      if (parseErr instanceof ApiError) throw parseErr;
      throw new ApiError(getGenericErrorMessage(res.status), res.status, false);
    }
  }

  // Step 3: successful response
  try {
    const json: ApiResponse<T> = await res.json();
    setOffline(false);
    return json.data;
  } catch (parseErr) {
    setOffline(false);
    throw new ApiError("Invalid server response format", 500, false);
  }
}

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  fullName: string;
  role: string;
}

// ── Public API object ────────────────────────────────────────────────────────
export const workflowApi = {
  get isOffline() {
    return _isOffline;
  },

  // --- Auth (available but not enforced — see /login and /signup pages) ---

  login(email: string, password: string) {
    return request<AuthResponse>(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, password }),
    });
  },

  signup(email: string, fullName: string, password: string) {
    return request<AuthResponse>(`${BASE_URL}/auth/signup`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ email, fullName, password }),
    });
  },

  subscribeOffline(listener: OfflineListener) {
    listeners.add(listener);
    listener(_isOffline);
    return () => {
      listeners.delete(listener);
    };
  },

  // --- Workflow Definitions ---
  createWorkflowDefinition(
    name: string,
    versionName: string,
    definitionJson: string,
    tenantId?: string
  ) {
    return request<any>(`${BASE_URL}/workflow-definitions/create-workflow-master`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ workflowName: name, versionName, active: true, definitionJson, tenantId }),
    });
  },

  createWorkflowVersion(workflowName: string, definitionJson: string, isActive = true, versionName?: string) {
    return request<any>(`${BASE_URL}/workflow-definitions/create-version`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ workflowName, versionName, active: isActive, definitionJson }),
    });
  },

  async validateDefinition(definitionJson: string): Promise<{ isValid: boolean; errors: string[]; warnings: string[] }> {
    // Always returns a valid structure, never throws.
    const invalid = (message: string) => ({ isValid: false, errors: [message], warnings: [] });

    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/workflow-definitions/validate`, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ definitionJson }),
      });
    } catch {
      setOffline(true);
      return invalid("Unable to reach validation server. Please check your connection.");
    }

    if (res.status === 503) {
      setOffline(true);
      return invalid("Validation service is temporarily unavailable. Please try again later.");
    }
    if (![200, 422].includes(res.status)) {
      return invalid(`Validation service error: ${getGenericErrorMessage(res.status)}`);
    }

    setOffline(false);

    let json: any;
    try {
      json = await res.json();
    } catch {
      return invalid("Invalid response from validation service.");
    }

    const data = json?.data;
    return {
      isValid: data?.valid ?? false,
      errors: data?.errors ?? [],
      warnings: data?.warnings ?? [],
    };
  },

  // --- Runtime & Dashboard ---
  getDashboardStats: () =>
    request<any>(`${BASE_URL}/workflow-runtime/dashboard-stats`),


  getAllWorkflowMastersWithVersions: () =>
    request<any>(`${BASE_URL}/workflow-definitions/get-all-workflow-masters`),

  getWorkflowMasterById: (id: number) =>
    request<any>(`${BASE_URL}/workflow-definitions/masters/${id}`),

  // --- Roles Registry ---

  /**
   * Fetches all assignable roles/users from three aggregated sources:
   * 1. role_registry table (roles pushed by external apps)
   * 2. Active process mappings' assignmentConfig
   * 3. Active workflow version definitions (scanned assignee values)
   *
   * Returns: Array of { id: string, label: string, type: "role" | "user" }
   */
  getRoles: () =>
    request<Array<{ id: string; label: string; type: string }>>(
      `${BASE_URL}/mappings/roles`
    ),

  /**
   * Called by third-party applications to register their roles/users
   * so the Workflow Designer shows them in assignment dropdowns.
   */
  syncRoles(roles: Array<{ id: string; label: string; type?: string }>) {
    return request<void>(`${BASE_URL}/mappings/roles/sync`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ roles }),
    });
  },

  deleteRole(roleId: string) {
    return request<void>(`${BASE_URL}/mappings/roles/entry/${encodeURIComponent(roleId)}`, {
      method: "DELETE",
    });
  },

  // --- Process Mappings ---

  getProcessMappings: () =>
    request<ProcessMapping[]>(`${BASE_URL}/mappings/processes`),

  createProcessMapping(dto: ProcessMappingCreateDto) {
    return request<ProcessMapping>(`${BASE_URL}/mappings/processes`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(dto),
    });
  },

  updateProcessMapping(id: number, patch: Partial<ProcessMappingCreateDto>) {
    return request<ProcessMapping>(`${BASE_URL}/mappings/processes/${id}/config`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(patch),
    });
  },

  deleteProcessMapping(id: number) {
    return request<void>(`${BASE_URL}/mappings/processes/${id}`, {
      method: "DELETE",
    });
  },

  deleteWorkflowMaster(workflowId: number) {
    return request<any>(`${BASE_URL}/workflow-definitions/masters/${workflowId}`, {
      method: "DELETE",
    });
  },

  deleteWorkflowVersion(workflowVersionId: number) {
    return request<any>(`${BASE_URL}/workflow-definitions/versions/${workflowVersionId}`, {
      method: "DELETE",
    });
  },

  toggleWorkflowMasterStatus(workflowId: number) {
    return request<any>(`${BASE_URL}/workflow-definitions/masters/${workflowId}/toggle-status`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
  },

  activateWorkflowVersion(workflowVersionId: number) {
    return request<any>(`${BASE_URL}/workflow-definitions/${workflowVersionId}/activate`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({}),
    });
  },

  // --- Workflow Runtime ---

  getPendingTasks: () =>
    request<PendingTask[]>(`${BASE_URL}/workflow-runtime/pending-tasks`),

  // Returns actions for a specific record including requiresRemarks / remarksMandatory per action.
  // Call this before showing action buttons so the UI can show/enforce the remarks field.
  getFormScopedActions: (recordId: string) =>
    request<ActionResolverResponse>(`${BASE_URL}/workflow-runtime/actions?recordId=${encodeURIComponent(recordId)}`),

  getActionPresets: () =>
    request<ActionDefinition[]>(`${BASE_URL}/workflow-runtime/action-presets`),

  getAllActionPresets: () =>
    request<ActionPresetAdmin[]>(`${BASE_URL}/workflow-runtime/action-presets/all`),

  createActionPreset: (dto: Omit<ActionPresetAdmin, "id" | "action">) =>
    request<ActionPresetAdmin>(`${BASE_URL}/workflow-runtime/action-presets`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(dto),
    }),

  updateActionPreset: (id: number, patch: Partial<ActionPresetAdmin>) =>
    request<ActionPresetAdmin>(`${BASE_URL}/workflow-runtime/action-presets/${id}`, {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(patch),
    }),

  executeAction(taskId: number, recordId: string, action: string, remarks?: string) {
    return request<any>(`${BASE_URL}/workflow-runtime/action`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ taskId, recordId, action, remarks: remarks ?? null }),
    });
  },

  startWorkflow(dto: StartWorkflowRequest) {
    // Auto-fill initiatedBy/initiatedByName from the logged-in user if not already set.
    // The JWT also carries these claims, but the /start endpoint reads them from the body
    // (it runs before task execution, so no ClaimsAccessor-based actor context exists yet).
    const user = getUser();
    const enriched: StartWorkflowRequest = {
      ...dto,
      initiatedBy: dto.initiatedBy ?? user?.userId?.toString() ?? "system",
      initiatedByName: dto.initiatedByName ?? user?.fullName ?? undefined,
    };
    return request<any>(`${BASE_URL}/workflow-runtime/start`, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify(enriched),
    });
  },

  getWorkflowInstanceByRecord: (recordId: string) =>
    request<any>(`${BASE_URL}/workflow-runtime/instance/by-record/${encodeURIComponent(recordId)}`),

  getWorkflowHistory: (recordId: string) =>
    request<WorkflowHistory[]>(`${BASE_URL}/workflow-runtime/history?recordId=${encodeURIComponent(recordId)}`),

  getMySubmissions: () =>
    request<MySubmission[]>(`${BASE_URL}/workflow-runtime/my-submissions`),
};

