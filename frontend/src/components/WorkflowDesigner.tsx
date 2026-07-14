import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Node,
  Edge,
  Connection,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Settings, Play, Users, Layers, Workflow, XCircle, Copy, Zap, Activity } from "lucide-react";
import { workflowApi } from "../lib/api";
import { getGridLayoutedElements } from "../lib/layoutUtils";
import Navbar from "./Navbar";
import { NodeConfigSidebar } from "./NodeConfigSidebar";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "../context/ToastContext";
import { CustomNodeData } from "../lib/workflow-types";

// --- Custom Flow Node Component ---
const WorkflowNodeComponent = ({ data, selected }: any) => {
  const isStart = data.type === "start";
  const isEnd = data.type === "end";
  const isApproval = data.type === "approval";
  const isConditional = data.type === "conditional";
  const isSub = data.type === "subworkflow";

  return (
    <div className={`relative px-4 py-3 rounded-xl border text-zinc-900 dark:text-zinc-100 transition-all duration-300 min-w-[200px] text-left cursor-pointer ${
      selected
        ? "border-brand-500 ring-2 ring-brand-500/30 shadow-lg shadow-brand-500/20 bg-white dark:bg-slate-900"
        : isStart
        ? "border-emerald-400/60 dark:border-emerald-600/40 shadow-lg shadow-emerald-500/20 dark:shadow-emerald-950/30 bg-white dark:bg-slate-900"
        : isEnd
        ? "border-rose-400/60 dark:border-rose-600/40 shadow-lg shadow-rose-500/20 dark:shadow-rose-950/30 bg-white dark:bg-slate-900"
        : "border-zinc-200 dark:border-zinc-700/50 shadow-sm hover:shadow-md bg-white dark:bg-slate-900"
    }`}>
      {/* Input Handle — always rendered so return-to-start edges work without ReactFlow warnings */}
      <Handle
        type="target"
        position={Position.Left}
        className={`w-3.5 h-3.5 !bg-gradient-to-r !from-brand-500 !to-brand-600 !border-3 !border-white dark:!border-slate-900 shadow-lg shadow-brand-500/40 dark:shadow-brand-950/30 hover:!scale-110 transition-transform ${isStart ? "!opacity-0 !pointer-events-none" : ""}`}
      />

      {isStart ? (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-sm shadow-emerald-500/20">
            <Settings size={18} />
          </div>
          <div>
            <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 block">WORKFLOW START:</span>
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-200 leading-tight">{data.label || "Initiate Submit"}</h4>
          </div>
        </div>
      ) : isEnd ? (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white shadow-sm shadow-rose-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
              <line x1="4" y1="22" x2="4" y2="15" />
            </svg>
          </div>
          <div>
            <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-400 block">END WORKFLOW:</span>
            <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-200 leading-tight">{data.label || "Completed"}</h4>
          </div>
        </div>
      ) : isSub ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="text-purple-600 dark:text-purple-400" size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Sub Workflow</span>
            </div>
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-950/40 p-2 rounded-lg border border-zinc-100 dark:border-zinc-855 text-xs">
            <p className="text-[10px] text-zinc-400 font-semibold leading-none">Target Workflow:</p>
            <p className="font-bold text-zinc-700 dark:text-zinc-300 mt-1 truncate">
              {data.config?.subWorkflowName || "Unlinked Workflow"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate max-w-[150px]">
              {data.label}
            </span>
            <span className={`h-2.5 w-2.5 rounded-full ${
              isApproval ? "bg-blue-500 shadow-sm shadow-blue-500/50" : "bg-amber-500 shadow-sm shadow-amber-500/50"
            }`} />
          </div>
          
          {isApproval && (
            <div className="space-y-2">
              <div className="bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 px-2.5 py-1.5 rounded-lg border border-blue-200/50 dark:border-blue-800/30 text-[10px] text-blue-700 dark:text-blue-300 leading-tight">
                <span className="text-[8px] uppercase tracking-wider font-bold text-blue-600 dark:text-blue-400 block mb-0.5">
                  {data.config?.assignees?.length ? "Assigned Recipients:" : "Assigned Recipient:"}
                </span>
                <span className="font-bold text-blue-900 dark:text-blue-200 line-clamp-2">
                  {data.config?.assignees?.length
                    ? data.config.assignees.map((a: any) => a.value).join(", ")
                    : (data.config?.assignee?.value || "Unassigned")}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {(data.config?.actions || [{ id: "approve", label: "Approve" }, { id: "reject", label: "Reject" }]).map((act: any, i: number) => (
                  <span key={i} className="text-[8px] bg-gradient-to-r from-brand-100 to-brand-50 text-brand-700 dark:from-brand-950/40 dark:to-brand-950/20 dark:text-brand-300 px-2 py-0.5 rounded-md border border-brand-200/60 dark:border-brand-800/40 font-semibold font-mono shadow-sm">
                    {act.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isConditional && (
            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 font-semibold">
              <span className="text-[10px] font-bold">⚡ Condition</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">{data.config?.rules?.length || 0} rule(s)</span>
            </div>
          )}
        </div>
      )}

      {/* Output Handle */}
      {!isEnd && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3.5 h-3.5 !bg-gradient-to-r !from-brand-500 !to-brand-600 !border-3 !border-white dark:!border-slate-900 shadow-lg shadow-brand-500/40 dark:shadow-brand-950/30 hover:!scale-110 transition-transform"
        />
      )}
    </div>
  );
};

// --- NodeTypes Configuration (memoized inside the component to avoid warning on fast refresh) ---

// Canvas Flow state default nodes
const defaultNodes: Node<CustomNodeData>[] = [
  {
    id: "startNode",
    type: "workflowNode",
    data: { label: "Initiate Submit", type: "start", config: {} },
    position: { x: 80, y: 150 }
  },
  {
    id: "endNode",
    type: "workflowNode",
    data: { label: "Completed", type: "end", config: {} },
    position: { x: 500, y: 150 }
  }
];

function parseValidationMessage(msg: string) {
  const lines = msg.split('\n').map(l => l.trim()).filter(Boolean);
  const result = { title: '', location: '', problem: '', note: '', steps: [] as string[], tip: '' };
  let inSteps = false;

  for (const line of lines) {
    if (!result.title) {
      result.title = line;
      continue;
    }
    if (/^Location:\s*/i.test(line)) {
      result.location = line.replace(/^Location:\s*/i, '').trim();
      inSteps = false;
    } else if (/^Problem:\s*/i.test(line)) {
      result.problem = line.replace(/^Problem:\s*/i, '').trim();
      inSteps = false;
    } else if (/^Note:\s*/i.test(line)) {
      result.note = line.replace(/^Note:\s*/i, '').trim();
      inSteps = false;
    } else if (/^(How to Fix:|Things to Review:)/i.test(line)) {
      inSteps = true;
    } else if (/^(Tip:|Example:|What This Means:)/i.test(line)) {
      result.tip = line.replace(/^(Tip:|Example:|What This Means:)\s*/i, '').trim();
      inSteps = false;
    } else if (inSteps && /^\d+\./.test(line)) {
      result.steps.push(line.replace(/^\d+\.\s*/, '').trim());
    } else if (!inSteps && !result.problem && !result.note && result.title) {
      // continuation of note/problem on next line
    }
  }

  if (!result.title) result.title = lines[0] || msg;
  return result;
}

// Definition connection → styled flow edge. Shared by the JSON-apply and both load paths.
function toFlowEdge(c: any, idx: number, flowNodes: Node<CustomNodeData>[]): Edge {
  const sourceNode = flowNodes.find((n) => n.id === c.from);
  const edgeLabel = c.onAction || c.on || undefined;
  let edgeColor = "#64748b";

  if (sourceNode) {
    const type = (sourceNode.data as CustomNodeData).type;
    if (type === "conditional") {
      const cfg = (sourceNode.data as CustomNodeData).config;
      edgeColor = String(edgeLabel) === String(cfg?.defaultAction) ? "#ef4444" : "#10b981";
    } else if (type === "approval") {
      edgeColor = "#3b82f6";
    } else if (type === "subworkflow") {
      edgeColor = "#a855f7";
    }
  }

  return {
    id: `e-${c.from}-${c.to}-${idx}`,
    source: c.from,
    target: c.to,
    label: edgeLabel,
    type: "smoothstep",
    animated: true,
    style: {
      stroke: edgeColor,
      strokeWidth: 2,
      opacity: 0.8
    },
    markerEnd: { type: MarkerType.Arrow, color: edgeColor },
  };
}

const nodeTypes = { workflowNode: WorkflowNodeComponent };

export default function WorkflowDesigner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loadId = searchParams.get("loadId");
  const { toast } = useToast();
const [workflowName, setWorkflowName] = useState("");
  const [versionName, setVersionName] = useState("");
  const [tenantId, setTenantId] = useState("");

  const [modalForm, setModalForm] = useState({ name: "", version: "" });

  // Load via query parameter on mount/change
  useEffect(() => {
    if (loadId) {
      handleLoadExisting(Number(loadId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadId, searchParams]);

  // Validation result panel
  interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  const [currentMasterId, setCurrentMasterId] = useState<number | null>(null);
  const [currentVersionId, setCurrentVersionId] = useState<number | null>(null);
  const [isVersionActive, setIsVersionActive] = useState(false);
  const [isMasterActive, setIsMasterActive] = useState(true);
  const [allVersions, setAllVersions] = useState<Array<{ id: number; versionName: string; isActive: boolean }>>([]);

  // Inline confirm dialog (replaces browser confirm())
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Custom modal prompt states
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptTitle, setPromptTitle] = useState("");
  const [promptDesc, setPromptDesc] = useState("");
  const [promptMode, setPromptMode] = useState<"save" | "new_version" | "create_new" | null>(null);

  // Edge & Connection Configuration States
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean; edgeId?: string }>({
    x: 0,
    y: 0,
    visible: false
  });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<Node<CustomNodeData> | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editableJson, setEditableJson] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Stable ref holds the latest shortcut handler — listener registered only once
  const shortcutHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  shortcutHandlerRef.current = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "d") {
      event.preventDefault();
      duplicateSelectedNode();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "l") {
      event.preventDefault();
      autoLayoutNodes();
    }
  };

  // Keyboard shortcuts — empty deps so listener is registered exactly once
  useEffect(() => {
    const handler = (e: KeyboardEvent) => shortcutHandlerRef.current?.(e);
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Handle action parameter to automatically trigger new version prompt
  useEffect(() => {
    if (currentMasterId && currentVersionId && searchParams.get("action") === "newVersion") {
      setModalForm(f => ({ ...f, version: "" }));
      setPromptTitle("New Version Duplication");
      setPromptDesc("Enter name for the new duplicate version:");
      setPromptMode("new_version");
      setIsPromptOpen(true);
      
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("action");
      router.replace(`/designer?${newParams.toString()}`, { scroll: false });
    }
  }, [currentMasterId, currentVersionId, searchParams, router]);

  // Workflows are only loaded on demand via loadId query param.

  // Sync state nodes/edges into editable JSON string
  const definitionStructure = useMemo(() => {
    return {
      workflowId: workflowName,
      version: 1,
      isActive: true,
      nodes: nodes.map((n) => {
        const data = n.data as CustomNodeData;
        const config = { ...data.config };
        if (data.type === "approval" && !config.label) {
          config.label = data.label;
        }
        if (data.type === "end" && !config.finalStatus) {
          config.finalStatus = config.defaultStatus || "Completed";
        }
        return {
          id: n.id,
          name: data.label,
          type: data.type,
          config,
          position: n.position
        };
      }),
      connections: (() => {
        const nodeIds = new Set(nodes.map((n) => n.id));
        const startNodeIds = new Set(
          nodes.filter((n) => (n.data as CustomNodeData).type === "start").map((n) => n.id)
        );
        return edges
          .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
          .map((e) => ({
            from: e.source,
            to: e.target,
            onAction: !startNodeIds.has(e.source) && e.label && !["true", "false"].includes(e.label as string) ? e.label : undefined,
            on: e.label && ["true", "false"].includes(e.label as string) ? e.label : undefined
          }));
      })()
    };
  }, [nodes, edges, workflowName]);

  const serializedDefStr = useMemo(() => {
    return JSON.stringify(definitionStructure, null, 2);
  }, [definitionStructure]);

  useEffect(() => {
    setEditableJson(serializedDefStr);
  }, [serializedDefStr]);

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      if (edges.some((e) => e.source === connection.source && e.target === connection.target)) return false;
      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (sourceNode) {
        const type = (sourceNode.data as CustomNodeData).type;
        const usedLabels = new Set(edges.filter((e) => e.source === connection.source).map((e) => e.label as string));
        if (type === "approval") {
          const actions: any[] = (sourceNode.data as CustomNodeData).config?.actions || [];
          if (actions.length > 0 && actions.every((a: any) => usedLabels.has(a.id))) return false;
        } else if (type === "conditional") {
          const cfg = (sourceNode.data as CustomNodeData).config;
          const rules: any[] = cfg?.rules || [];
          const allLabels = [...rules.map((r: any) => r.nextAction).filter(Boolean), cfg?.defaultAction].filter(Boolean);
          if (allLabels.length > 0 && allLabels.every((l) => usedLabels.has(l as string))) return false;
        }
      }
      return true;
    },
    [edges, nodes]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      // Setup a new edge
      const sourceNode = nodes.find((n) => n.id === params.source);
      let defaultLabel = "approve";
      let edgeColor = "#64748b";

      if (sourceNode) {
        const type = (sourceNode.data as CustomNodeData).type;
        if (params.source === "startNode") {
          defaultLabel = "initial submit";
          edgeColor = "#10b981";
        } else if (type === "conditional") {
          const cfg = (sourceNode.data as CustomNodeData).config;
          const rules: any[] = cfg?.rules || [];
          const usedLabels = new Set(edges.filter(e => e.source === params.source).map(e => e.label as string));
          const unusedRule = rules.find((r: any) => r.nextAction && !usedLabels.has(r.nextAction));
          if (unusedRule) {
            defaultLabel = unusedRule.nextAction;
            edgeColor = "#10b981";
          } else if (cfg?.defaultAction && !usedLabels.has(cfg.defaultAction)) {
            defaultLabel = cfg.defaultAction;
            edgeColor = "#ef4444";
          } else {
            defaultLabel = "true";
            edgeColor = "#10b981";
          }
        } else if (type === "approval") {
          const actions: any[] = (sourceNode.data as CustomNodeData).config?.actions || [];
          const usedLabels = new Set(edges.filter((e) => e.source === params.source).map((e) => e.label as string));
          const firstUnused = actions.find((a: any) => !usedLabels.has(a.id));
          defaultLabel = firstUnused ? firstUnused.id : (actions[0]?.id || "approve");
          edgeColor = "#3b82f6";
        } else if (type === "subworkflow") {
          edgeColor = "#a855f7";
        }
      }

      const newEdgeId = `e-${params.source}-${params.target}-${Date.now()}`;
      const newEdge: Edge = {
        id: newEdgeId,
        source: params.source || "",
        target: params.target || "",
        label: defaultLabel,
        type: "smoothstep",
        animated: true,
        style: {
          stroke: edgeColor,
          strokeWidth: 2,
          opacity: 0.8
        },
        markerEnd: { type: MarkerType.Arrow, color: edgeColor }
      };

      setEdges((eds) => addEdge(newEdge, eds));
      setSelectedEdge(newEdge);
      setSelectedNode(null);
    },
    [nodes, edges, setEdges]
  );

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    if (selectedNode.id === "startNode" || selectedNode.id === "endNode") {
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  const getEdgeStyle = (edge: Edge) => {
    let color = "#64748b";
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (sourceNode) {
      const type = (sourceNode.data as CustomNodeData).type;
      if (type === "conditional") {
        const cfg = (sourceNode.data as CustomNodeData).config;
        color = String(edge.label) === String(cfg?.defaultAction) ? "#ef4444" : "#10b981";
      } else if (type === "approval") {
        color = "#3b82f6";
      } else if (type === "subworkflow") {
        color = "#a855f7";
      }
    }
    return {
      stroke: color,
      strokeWidth: 2,
      opacity: 0.8
    };
  };

  const deleteSelectedEdge = (edgeIdToDelete?: string) => {
    const idToDel = edgeIdToDelete || selectedEdge?.id;
    if (!idToDel) return;
    setEdges((eds) => eds.filter((e) => e.id !== idToDel));
    if (selectedEdge?.id === idToDel) {
      setSelectedEdge(null);
    }
  };

  const duplicateSelectedNode = () => {
    if (!selectedNode) return;
    if (selectedNode.id === "startNode" || selectedNode.id === "endNode") {
      toast("Cannot duplicate start/end nodes.", "warning");
      return;
    }

    const sourceData = selectedNode.data as CustomNodeData;
    const newId = `${selectedNode.id}_copy_${Date.now()}`;

    const newNode: Node<CustomNodeData> = {
      id: newId,
      type: "workflowNode",
      data: {
        label: `${sourceData.label} (Copy)`,
        type: sourceData.type,
        config: JSON.parse(JSON.stringify(sourceData.config))
      },
      position: {
        x: selectedNode.position.x + 250,
        y: selectedNode.position.y + 80
      }
    };

    setNodes((nds) => nds.concat(newNode));
    setSelectedNode(newNode);
    toast("Node duplicated successfully!", "success");
  };

  const autoLayoutNodes = () => {
    if (nodes.length === 0) return;
    const layoutedNodes = getGridLayoutedElements(nodes, edges);
    setNodes(layoutedNodes);
    toast("Nodes auto-arranged!", "success");
  };

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<CustomNodeData>) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setIsSidebarOpen(true);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
    setIsSidebarOpen(true);
  }, []);

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        visible: true,
        edgeId: edge.id
      });
      setSelectedEdge(edge);
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setContextMenu({ ...contextMenu, visible: false });
  }, [contextMenu]);

  // Visual Adds overlay button handlers
  const handleAddNodeFromList = (type: "start" | "approval" | "conditional" | "subworkflow" | "end") => {
    const id = `${type}_${Date.now()}`;
    let label = "";
    let config: any = {};

    switch(type) {
      case "start": label = "Start"; break;
      case "end": label = "End"; break;
      case "approval":
        label = "Approval " + (nodes.filter(n => (n.data as CustomNodeData).type === "approval").length + 1);
        config = { 
          approvalMode: "single", 
          assignee: { type: "role", value: "" }, 
          allowCorrections: false,
          actions: [
            { id: "approve", label: "Approve" },
            { id: "reject", label: "Reject" }
          ]
        };
        break;
      case "conditional":
        label = "Check Logic";
        config = {
          rules: [{ conditions: [{ key: "", operator: "=", value: "", valueType: "literal" }], operators: [], nextAction: "true" }],
          defaultAction: "false"
        };
        break;
      case "subworkflow":
        label = "Sub Workflow";
        break;
    }

    const newNode: Node<CustomNodeData> = {
      id,
      type: "workflowNode",
      data: { label, type, config },
      position: { x: 300 + Math.random() * 80, y: 150 + Math.random() * 80 }
    };

    setNodes((nds) => nds.concat(newNode));
    setSelectedNode(newNode);
  };

  // Editable JSON text change trigger
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(editableJson);
      if (!parsed || !parsed.nodes) {
        throw new Error("Missing 'nodes' array root field.");
      }

      const flowNodes = parsed.nodes.map((n: any, idx: number) => ({
        id: n.id,
        type: "workflowNode",
        data: { label: n.name, type: n.type, config: n.config },
        position: n.position || { x: 150 + idx * 150, y: 150 }
      }));

      const parsedNodeIds = new Set(parsed.nodes.map((n: any) => n.id));
      const allEdges = (parsed.connections || []).map((c: any, idx: number) => toFlowEdge(c, idx, flowNodes));
      const staleCount = (parsed.connections || []).filter((c: any) => !parsedNodeIds.has(c.from) || !parsedNodeIds.has(c.to)).length;
      const flowEdges = allEdges.filter((e: any) => parsedNodeIds.has(e.source) && parsedNodeIds.has(e.target));

      setNodes(flowNodes);
      setEdges(flowEdges);
      setSelectedNode(null);
      setJsonError(null);
      if (staleCount > 0) {
        toast(`JSON applied — ${staleCount} stale connection(s) referencing missing nodes were removed.`, "warning");
      } else {
        toast("Definition updated from JSON.", "success");
      }
    } catch (err: any) {
      setJsonError(err.message || "Invalid JSON syntax");
      toast(`Invalid JSON: ${err.message || "check syntax"}.`, "error");
    }
  };

  const updateNodeName = (id: string, label: string) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          const config = node.data.config || {};
          return {
            ...node,
            data: {
              ...node.data,
              label,
              config: { ...config, label }
            }
          };
        }
        return node;
      })
    );
    if (selectedNode?.id === id) {
      setSelectedNode((prev) => {
        if (!prev) return null;
        const config = prev.data.config || {};
        return {
          ...prev,
          data: {
            ...prev.data,
            label,
            config: { ...config, label }
          }
        };
      });
    }
  };

  const updateNodeConfigField = (id: string, field: string, value: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          const data = node.data as CustomNodeData;
          return { ...node, data: { ...data, config: { ...data.config, [field]: value } } };
        }
        return node;
      })
    );
    if (selectedNode?.id === id) {
      setSelectedNode((prev) => {
        if (!prev) return null;
        const data = prev.data as CustomNodeData;
        return { ...prev, data: { ...data, config: { ...data.config, [field]: value } } };
      });
    }
  };

  // Add Action configuration to selected node actions array
  const handleAddAction = () => {
    if (!selectedNode) return;
    const currentActions = (selectedNode.data as CustomNodeData).config?.actions || [];
    const newAction = { id: `action_${Date.now()}`, label: "New Action" };
    updateNodeConfigField(selectedNode.id, "actions", [...currentActions, newAction]);
  };

  const handleUpdateAction = (index: number, key: "id" | "label", val: string) => {
    if (!selectedNode) return;
    const currentActions = [...((selectedNode.data as CustomNodeData).config?.actions || [])];
    currentActions[index] = { ...currentActions[index], [key]: val };
    updateNodeConfigField(selectedNode.id, "actions", currentActions);
  };

  const handleRemoveAction = (index: number) => {
    if (!selectedNode) return;
    const currentActions = ((selectedNode.data as CustomNodeData).config?.actions || []).filter((_, i) => i !== index);
    updateNodeConfigField(selectedNode.id, "actions", currentActions);
  };

  // Load Existing — uses by-ID endpoint only
  const handleLoadExisting = useCallback(async (masterId: number) => {
    if (!masterId) return;
    toast("Loading workflow from database...", "info");
    try {
      const master = await workflowApi.getWorkflowMasterById(masterId);

      if (!master) {
        toast("Workflow not found.", "error");
        return;
      }

      setWorkflowName(master.workflowName ?? "");
      setCurrentMasterId(master.id);
      setIsMasterActive(master.isActive ?? master.active ?? true);

      const versions: any[] = master.workflowVersions || [];
      if (versions.length === 0) {
        toast("No versions found for this workflow.", "error");
        return;
      }

      setAllVersions(versions.map((v: any) => ({
        id: v.id,
        versionName: v.versionName,
        isActive: v.isActive ?? v.active ?? false
      })));

      // Find requested version, fallback to active version, fallback to first version
      const requestedVersionIdStr = searchParams.get("versionId");
      const activeVer =
        (requestedVersionIdStr ? versions.find((v: any) => v.id === Number(requestedVersionIdStr)) : null) ??
        versions.find((v: any) => v.isActive === true || v.active === true) ??
        versions[0];

      setVersionName(activeVer.versionName || "v1");
      setCurrentVersionId(activeVer.id ?? null);
      setIsVersionActive(activeVer.isActive ?? activeVer.active ?? false);

      if (!activeVer.definitionJson) {
        toast("No definition found for the active version.", "error");
        return;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(activeVer.definitionJson);
      } catch (parseErr) {
        toast("Failed to parse workflow definition. Please contact support.", "error");
        return;
      }

      if (!parsed?.nodes) {
        toast("Invalid workflow definition — no nodes found.", "error");
        return;
      }

      const flowNodes = parsed.nodes.map((n: any, idx: number) => ({
        id: n.id,
        type: "workflowNode",
        data: { label: n.name, type: n.type, config: n.config },
        position: n.position || { x: 100 + idx * 220, y: 150 },
      }));

      const nodeIds = new Set(parsed.nodes.map((n: any) => n.id));
      const flowEdges = (parsed.connections || [])
        .filter((c: any) => nodeIds.has(c.from) && nodeIds.has(c.to))
        .map((c: any, idx: number) => toFlowEdge(c, idx, flowNodes));

      setNodes(flowNodes);
      setEdges(flowEdges);

      // Auto-arrange nodes after React commits the initial render
      requestAnimationFrame(() => {
        const layoutedNodes = getGridLayoutedElements(flowNodes, flowEdges) as Node<CustomNodeData>[];
        setNodes(layoutedNodes);
      });

      toast(`"${master.workflowName}" loaded successfully.`, "success");
    } catch (err: any) {
      toast("Unable to load workflow. Please try again.", "error");
    }
  }, [setNodes, setEdges, toast, searchParams]);

  const handleLoadVersion = useCallback((version: any) => {
    if (!version) return;
    setVersionName(version.versionName || "v1");
    setCurrentVersionId(version.id ?? null);
    setIsVersionActive(version.isActive ?? version.active ?? false);

    if (!version.definitionJson) return;
    try {
      const parsed = JSON.parse(version.definitionJson);
      if (!parsed?.nodes) return;

      const flowNodes = parsed.nodes.map((n: any, idx: number) => ({
        id: n.id,
        type: "workflowNode",
        data: { label: n.name, type: n.type, config: n.config },
        position: n.position || { x: 100 + idx * 220, y: 150 },
      }));
      const nodeIds = new Set(parsed.nodes.map((n: any) => n.id));
      const flowEdges = (parsed.connections || [])
        .filter((c: any) => nodeIds.has(c.from) && nodeIds.has(c.to))
        .map((c: any, idx: number) => toFlowEdge(c, idx, flowNodes));
      setNodes(flowNodes);
      setEdges(flowEdges);

      // Auto-arrange nodes after React commits the initial render
      requestAnimationFrame(() => {
        const layoutedNodes = getGridLayoutedElements(flowNodes, flowEdges) as Node<CustomNodeData>[];
        setNodes(layoutedNodes);
      });

      toast(`Version "${version.versionName}" loaded.`, "success");
    } catch {
      toast("Failed to parse version definition JSON.", "error");
    }
  }, [setNodes, setEdges, toast]);

  const proceedWithSave = async (vName: string) => {
    if (!currentMasterId) {
      if (!workflowName?.trim()) {
        toast("Workflow name is required.", "error");
        return;
      }
      if (!vName?.trim()) {
        toast("Version name is required.", "error");
        return;
      }
    }

    toast("Publishing workflow...", "info");
    try {
      const valRes = await workflowApi.validateDefinition(editableJson);
      if (!valRes.isValid) {
        setValidationResult({ isValid: false, errors: valRes.errors, warnings: valRes.warnings || [] });
        toast(`Validation failed — ${valRes.errors.length} error(s). See the panel for details.`, "error");
        return;
      }

      let res;
      if (currentMasterId) {
        // No update endpoint exists — create a new version for the existing master
        res = await workflowApi.createWorkflowVersion(workflowName, editableJson, true, versionName || undefined);
      } else {
        res = await workflowApi.createWorkflowDefinition(workflowName, vName, editableJson, tenantId);
      }

      if (res) {
        if (!currentMasterId) {
          setCurrentMasterId(res.workflowMasterId || res.id || null);
          setCurrentVersionId(res.workflowVersionId || null);
        }
      }
      toast("Workflow published successfully!", "success");
      router.push("/");
    } catch (err: any) {
      const errorMessage = err?.message || "Unable to save workflow. Please try again.";
      toast(errorMessage, "error");
    }
  };

  const handleSaveToDatabase = async () => {
    await proceedWithSave(versionName);
  };

  const handleNewVersion = async () => {
    if (!currentMasterId || !currentVersionId) {
      toast("No workflow is loaded. Please load an existing workflow first.", "error");
      return;
    }
    setModalForm(f => ({ ...f, version: "" }));
    setPromptTitle("New Version Duplication");
    setPromptDesc("Enter name for the new duplicate version:");
    setPromptMode("new_version");
    setIsPromptOpen(true);
  };

  const handlePromptConfirm = async () => {
    if (promptMode === "create_new") {
      const wName = modalForm.name.trim();
      const vName = modalForm.version.trim();

      if (!wName) {
        toast("Workflow name cannot be empty.", "error");
        return;
      }
      if (!vName) {
        toast("Version name cannot be empty.", "error");
        return;
      }

      setIsPromptOpen(false);

      setCurrentMasterId(null);
      setCurrentVersionId(null);
      setIsVersionActive(false);
      setWorkflowName(wName);
      setVersionName(vName);
      setTenantId("");
      setNodes(defaultNodes);
      setEdges([]);
      setSelectedNode(null);
      setSelectedEdge(null);
      setValidationResult(null);
      setJsonError(null);
      
      // Clear query parameter if loaded via loadId
      if (searchParams.get("loadId")) {
        router.push("/designer");
      }
      toast(`New workflow "${wName}" created. Start building your flow.`, "success");
    } else if (promptMode === "new_version") {
      const val = modalForm.version.trim();
      if (!val) {
        toast("Version name cannot be empty.", "error");
        return;
      }
      setIsPromptOpen(false);
      // ponytail: don't pre-create a draft; just unlock the canvas. Save will create the single active version.
      setVersionName(val);
      setCurrentVersionId(null);
      setIsVersionActive(false);
      toast(`Editing new version "${val}". Click Save to publish.`, "info");
    }
    setPromptMode(null);
  };

  const handleReset = () => {
    setNodes(defaultNodes);
    setEdges([]);
    setSelectedNode(null);
    setSelectedEdge(null);
    setIsVersionActive(false);
    setValidationResult(null);
    setJsonError(null);
    toast("Canvas reset.", "info");
  };

  const handleCreateNewWorkflow = () => {
    setModalForm({ name: "", version: "v1_initial" });
    setPromptTitle("Create New Workflow");
    setPromptDesc("Enter details for the new workflow:");
    setPromptMode("create_new");
    setIsPromptOpen(true);
  };

  const handleDeleteWorkflow = async () => {
    if (!currentMasterId) {
      toast("No workflow is loaded.", "error");
      return;
    }
    setConfirmAction({
      message: `Are you sure you want to delete the workflow "${workflowName}"? This action cannot be undone.`,
      onConfirm: async () => {
        toast("Deleting workflow...", "info");
        try {
          await workflowApi.deleteWorkflowMaster(currentMasterId!);
          toast(`Workflow "${workflowName}" deleted successfully.`, "success");
          router.push("/");
        } catch (err: any) {
          toast(err?.message || "Unable to delete workflow. Please try again.", "error");
        }
      },
    });
  };

  const handleDeleteVersion = async () => {
    if (!currentVersionId) {
      toast("No version is loaded.", "error");
      return;
    }
    setConfirmAction({
      message: `Are you sure you want to delete the version "${versionName}"? This action cannot be undone.`,
      onConfirm: async () => {
        toast("Deleting version...", "info");
        try {
          await workflowApi.deleteWorkflowVersion(currentVersionId!);
          toast(`Version "${versionName}" deleted successfully.`, "success");
          router.push("/");
        } catch (err: any) {
          toast(err?.message || "Unable to delete version. Please try again.", "error");
        }
      },
    });
  };

  const handleToggleMasterStatus = async () => {
    if (!currentMasterId) {
      toast("No workflow is loaded.", "error");
      return;
    }
    toast("Toggling workflow status...", "info");
    try {
      await workflowApi.toggleWorkflowMasterStatus(currentMasterId);

      const master = await workflowApi.getWorkflowMasterById(currentMasterId);
      if (master) {
        const newStatus = master.isActive ?? master.active ?? true;
        setIsMasterActive(newStatus);
        toast(`Workflow ${newStatus ? "activated" : "deactivated"} successfully.`, "success");
      }
    } catch (err: any) {
      toast("Unable to toggle workflow status. Please try again.", "error");
    }
  };

  const handleActivateVersion = async (versionId: number) => {
    if (!currentMasterId) {
      toast("No workflow is loaded.", "error");
      return;
    }

    const versionExists = allVersions.some(v => v.id === versionId);
    if (!versionExists) {
      toast("Selected version not found.", "error");
      return;
    }

    toast("Activating version...", "info");
    try {
      await workflowApi.activateWorkflowVersion(versionId);

      // Reload master to get fresh version states
      const master = await workflowApi.getWorkflowMasterById(currentMasterId);
      if (master && master.workflowVersions) {
        const versions = master.workflowVersions;
        setAllVersions(versions.map((v: any) => ({
          id: v.id,
          versionName: v.versionName,
          isActive: v.isActive ?? v.active ?? false
        })));

        const activeVersion = versions.find((v: any) => v.isActive === true || v.active === true);
        if (activeVersion) {
          setVersionName(activeVersion.versionName || "v1");
          setCurrentVersionId(activeVersion.id ?? null);
          setIsVersionActive(true);
          toast("Version activated successfully.", "success");
        }
      }
    } catch (err: any) {
      const errorMessage = err?.message || "Unable to activate version. Please try again.";
      toast(errorMessage, "error");
    }
  };

  return (
    <div className="flex flex-col h-screen w-full text-zinc-900 dark:text-zinc-100 relative overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Validation Result Panel */}
      {validationResult && (!validationResult.isValid || validationResult.warnings.length > 0) && (
        <div className={`fixed z-50 top-20 left-1/2 -translate-x-1/2 w-[540px] max-w-[95vw] rounded-2xl border shadow-2xl animate-fade-in ${
          validationResult.isValid
            ? "bg-emerald-50 border-emerald-300"
            : "bg-rose-50 border-rose-300"
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 rounded-t-2xl ${
            validationResult.isValid ? "bg-emerald-100" : "bg-rose-100"
          }`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black ${validationResult.isValid ? "text-emerald-800" : "text-rose-800"}`}>
                {validationResult.isValid ? "✓ Workflow Valid" : `✗ Validation Failed — ${validationResult.errors.length} error${validationResult.errors.length !== 1 ? "s" : ""}`}
              </span>
              {validationResult.warnings.length > 0 && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                  {validationResult.warnings.length} warning{validationResult.warnings.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <button
              onClick={() => setValidationResult(null)}
              className="text-zinc-400 hover:text-zinc-700 text-sm font-bold leading-none px-1"
            >
              ✕
            </button>
          </div>

          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div className="px-4 pt-3 pb-2 max-h-80 overflow-y-auto">
              <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider mb-2">Errors</p>
              <ul className="space-y-2">
                {validationResult.errors.map((err, i) => {
                  const p = parseValidationMessage(err);
                  return (
                    <li key={i} className="rounded-lg bg-white border border-rose-200 p-2.5">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-rose-200 flex items-center justify-center text-[9px] font-black text-rose-700">{i + 1}</span>
                        <span className="text-xs font-bold text-rose-900">{p.title}</span>
                      </div>
                      {p.location && (
                        <p className="text-[10px] text-rose-500 pl-6 mb-0.5">Location: {p.location}</p>
                      )}
                      {p.problem && (
                        <p className="text-[10px] text-rose-700 pl-6 mb-1">{p.problem}</p>
                      )}
                      {p.steps.length > 0 && (
                        <div className="pl-6 space-y-0.5 mb-1">
                          {p.steps.map((step, si) => (
                            <p key={si} className="text-[10px] text-rose-600">{si + 1}. {step}</p>
                          ))}
                        </div>
                      )}
                      {p.tip && (
                        <p className="text-[10px] text-rose-400 italic pl-6">Tip: {p.tip}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <div className="px-4 pt-3 pb-2 max-h-60 overflow-y-auto border-t border-amber-200">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-2">Warnings</p>
              <ul className="space-y-2">
                {validationResult.warnings.map((w, i) => {
                  const p = parseValidationMessage(w);
                  return (
                    <li key={i} className="rounded-lg bg-white border border-amber-200 p-2.5">
                      <div className="flex items-start gap-2 mb-1">
                        <span className="mt-0.5 shrink-0 h-4 w-4 rounded-full bg-amber-200 flex items-center justify-center text-[9px] font-black text-amber-700">!</span>
                        <span className="text-xs font-bold text-amber-900">{p.title}</span>
                      </div>
                      {p.location && (
                        <p className="text-[10px] text-amber-600 pl-6 mb-0.5">Location: {p.location}</p>
                      )}
                      {p.problem && (
                        <p className="text-[10px] text-amber-700 pl-6 mb-1">{p.problem}</p>
                      )}
                      {p.steps.length > 0 && (
                        <div className="pl-6 space-y-0.5 mb-1">
                          {p.steps.map((step, si) => (
                            <p key={si} className="text-[10px] text-amber-600">{si + 1}. {step}</p>
                          ))}
                        </div>
                      )}
                      {p.tip && (
                        <p className="text-[10px] text-amber-400 italic pl-6">Tip: {p.tip}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {/* <div className="px-4 py-2.5 mt-2" /> */}
        </div>
      )}

      <Navbar
        designerActions={{
          workflowName: workflowName,
          versionName: versionName,
          currentMasterId: currentMasterId,
          currentVersionId: currentVersionId,
          isMasterActive: isMasterActive,
          allVersions: allVersions,
          handleSaveToDatabase: handleSaveToDatabase,
          handleReset: handleReset,
          handleNewVersion: handleNewVersion,
          handleCreateNewWorkflow: handleCreateNewWorkflow,
          handleDeleteWorkflow: handleDeleteWorkflow,
          handleDeleteVersion: handleDeleteVersion,
          handleToggleMasterStatus: handleToggleMasterStatus,
          handleActivateVersion: handleActivateVersion,
          handleValidate: async () => {
            try {
              const val = await workflowApi.validateDefinition(editableJson);
              setValidationResult({ isValid: val.isValid, errors: val.errors || [], warnings: val.warnings || [] });
              if (val.isValid) {
                toast(
                  val.warnings?.length
                    ? `Valid — ${val.warnings.length} warning(s). Check the panel.`
                    : "Workflow schema is valid. No errors or warnings.",
                  val.warnings?.length ? "warning" : "success"
                );
              } else {
                toast(`Validation failed — ${val.errors.length} error(s). Check the panel.`, "error");
              }
            } catch (error) {
              setValidationResult({
                isValid: false,
                errors: ["An unexpected error occurred during validation. Please try again."],
                warnings: [],
              });
              toast("Validation error. Please check your workflow and try again.", "error");
            }
          }
        }}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Visual Flow Canvas Area */}
        <div className="flex-1 relative bg-gradient-to-br from-slate-50 via-slate-50/50 to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 flex flex-col h-full">

          {/* Floating Add Nodes panel */}
          <div className="absolute top-4 left-4 z-10 w-48 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl p-4 shadow-lg hover:shadow-xl transition-all dark:shadow-none">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest px-0.5">+ Add Nodes</span>
              <div className="flex gap-1">
                <button
                  onClick={autoLayoutNodes}
                  title="Auto-arrange nodes (Ctrl+L)"
                  className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all"
                >
                  <Zap size={12} className="text-purple-600 dark:text-purple-400" />
                </button>
                {selectedNode && selectedNode.id !== "startNode" && selectedNode.id !== "endNode" && (
                  <button
                    onClick={duplicateSelectedNode}
                    title="Duplicate selected node (Ctrl+D)"
                    className="p-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-800/30 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-all"
                  >
                    <Copy size={12} className="text-brand-600 dark:text-brand-400" />
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleAddNodeFromList("start")}
                className="flex items-center gap-3 w-full text-left rounded-lg border border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 active:scale-95 transition-all shadow-sm hover:shadow-md"
              >
                <Play size={14} className="text-emerald-600 dark:text-emerald-400" />
                Start Node
              </button>
              <button
                onClick={() => handleAddNodeFromList("approval")}
                className="flex items-center gap-3 w-full text-left rounded-lg border border-blue-200/50 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 active:scale-95 transition-all shadow-sm hover:shadow-md"
              >
                <Users size={14} className="text-blue-600 dark:text-blue-400" />
                Approval Node
              </button>
              <button 
                onClick={() => handleAddNodeFromList("conditional")}
                className="flex items-center gap-3 w-full text-left rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-705 hover:bg-zinc-50 active:scale-[0.98] transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <Layers size={14} className="text-zinc-400" />
                Conditional Node
              </button>
              <button 
                onClick={() => handleAddNodeFromList("subworkflow")}
                className="flex items-center gap-3 w-full text-left rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-705 hover:bg-zinc-50 active:scale-[0.98] transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <Workflow size={14} className="text-zinc-400" />
                Sub Workflow
              </button>
              <button 
                onClick={() => handleAddNodeFromList("end")}
                className="flex items-center gap-3 w-full text-left rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-705 hover:bg-zinc-50 active:scale-[0.98] transition-all dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              >
                <XCircle size={14} className="text-zinc-400" />
                End Node
              </button>
            </div>
          </div>

          {/* Floating settings toggle button when sidebar collapsed */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/95 backdrop-blur-sm px-4 py-2 text-xs font-bold text-zinc-700 shadow-xl hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-200 transition-all active:scale-[0.98]"
              title="Open Configs Sidebar"
            >
              <Settings size={14} className="text-zinc-500" />
              Settings
            </button>
          )}

          <div className="flex-1 w-full relative min-h-[450px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onEdgeContextMenu={onEdgeContextMenu}
              onPaneClick={onPaneClick}
              fitView
            >
              <Controls />
              <MiniMap />
              <Background color="#ccc" gap={16} />
            </ReactFlow>
          </div>
        </div>

        {/* Configurations Sidebar & Editable JSON Area */}
        {isSidebarOpen && (
          <NodeConfigSidebar
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            deleteSelectedNode={deleteSelectedNode}
            deleteSelectedEdge={deleteSelectedEdge}
            updateNodeName={updateNodeName}
            updateNodeConfigField={updateNodeConfigField}
            nodes={nodes}
            setNodes={setNodes}
            setSelectedNode={setSelectedNode}
            edges={edges}
            setEdges={setEdges}
            setSelectedEdge={setSelectedEdge}
            handleAddAction={handleAddAction}
            handleRemoveAction={handleRemoveAction}
            editableJson={editableJson}
            setEditableJson={setEditableJson}
            jsonError={jsonError}
            handleApplyJson={handleApplyJson}
            workflowName={workflowName}
            setWorkflowName={setWorkflowName}
            versionName={versionName}
            setVersionName={setVersionName}
            tenantId={tenantId}
            setTenantId={setTenantId}
            isVersionActive={isVersionActive}
            currentMasterId={currentMasterId}
            currentVersionId={currentVersionId}
            handleCreateNewWorkflow={handleCreateNewWorkflow}
            onClose={() => setIsSidebarOpen(false)}
          />
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-zinc-200/60 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-6 py-3 dark:border-zinc-800/60 z-20 shrink-0 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Active Project</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{workflowName || "Untitled"}</span>
          </div>
          <div className="h-6 w-px bg-gradient-to-b from-zinc-200 to-transparent dark:from-zinc-700 dark:to-transparent" />
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
            <Activity size={12} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400">Status:</span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Synchronized</span>
          </div>
        </div>
        <div className="flex items-center gap-6 font-mono text-[10px]">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-50/50 dark:bg-brand-950/30 border border-brand-200/50 dark:border-brand-800/30">
            <span className="text-zinc-600 dark:text-zinc-400">Nodes:</span>
            <span className="font-bold text-brand-700 dark:text-brand-300">{nodes.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/30">
            <span className="text-zinc-600 dark:text-zinc-400">Connections:</span>
            <span className="font-bold text-purple-700 dark:text-purple-300">{edges.length}</span>
          </div>
        </div>
      </footer>

      {/* Edge Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg overflow-hidden animate-fade-in"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`
          }}
        >
          <button
            onClick={() => {
              deleteSelectedEdge(contextMenu.edgeId);
              setContextMenu({ ...contextMenu, visible: false });
              toast("Edge deleted.", "success");
            }}
            className="w-full px-4 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <XCircle size={14} />
            Delete Edge
          </button>
        </div>
      )}

      {/* Click outside to close context menu */}
      {contextMenu.visible && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setContextMenu({ ...contextMenu, visible: false })}
        />
      )}

      {/* Inline Confirm Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{confirmAction.message}</p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-xl border border-zinc-350 dark:border-zinc-700 px-4 py-1.5 text-xs font-semibold text-zinc-655 dark:text-zinc-455 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => { confirmAction.onConfirm(); setConfirmAction(null); }}
                className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Styled Prompt Modal */}
      {isPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-in">
            <div>
              <h3 className="text-sm font-bold text-zinc-905 dark:text-zinc-50 uppercase tracking-wider">{promptTitle}</h3>
              <p className="text-xs text-zinc-500 mt-1">{promptDesc}</p>
            </div>
            
            <div className="space-y-4">
              {promptMode === "create_new" ? (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Workflow Name *</label>
                    <input
                      type="text"
                      value={modalForm.name}
                      onChange={(e) => setModalForm(f => ({ ...f, name: e.target.value }))}
                      placeholder=""
                      className="w-full rounded-xl border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-150"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Version Name *</label>
                    <input
                      type="text"
                      value={modalForm.version}
                      onChange={(e) => setModalForm(f => ({ ...f, version: e.target.value }))}
                      placeholder=""
                      className="w-full rounded-xl border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-150"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handlePromptConfirm();
                        }
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Version Name *</label>
                  <input
                    type="text"
                    value={modalForm.version}
                    onChange={(e) => setModalForm(f => ({ ...f, version: e.target.value }))}
                    placeholder="e.g. v2_approval_flow"
                    className="w-full rounded-xl border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-150"
                    onKeyDown={(e) => { if (e.key === "Enter") handlePromptConfirm(); }}
                    autoFocus
                  />
                </div>
              )}
              <div className="flex justify-end gap-2.5">
                <button
                  onClick={() => {
                    setIsPromptOpen(false);
                    setPromptMode(null);
                  }}
                  className="rounded-xl border border-zinc-350 dark:border-zinc-700 px-4 py-1.5 text-xs font-semibold text-zinc-655 dark:text-zinc-455 hover:bg-zinc-50 dark:hover:bg-zinc-850 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePromptConfirm}
                  className="rounded-xl bg-orange-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-orange-500 transition-all active:scale-[0.98]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
