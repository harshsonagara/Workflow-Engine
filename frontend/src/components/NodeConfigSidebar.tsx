import React, { useState, useRef, useCallback } from "react";

// Colors match white_workflow_editor.html exactly
const C = {
  key:     "#F27823",
  str:     "#B45309",
  num:     "#059669",
  bool:    "#7C3AED",
  nil:     "#DC2626",
  bracket: "#64748B",
  punct:   "#94A3B8",
  text:    "#334155",
};

function highlightJson(raw: string): string {
  const esc = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Order matters: key strings (followed by :) before plain strings
  return esc.replace(
    /("(?:\\.|[^"\\])*")(\s*:)|("(?:\\.|[^"\\])*")|\b(true|false)\b|\b(null)\b|(-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)|([\{\}\[\]])|([,:])/g,
    (_m, keyStr, colon, valStr, bool, nil, num, bracket, punct) => {
      if (keyStr !== undefined) return `<span style="color:${C.key};font-weight:600">${keyStr}</span><span style="color:${C.punct}">${colon}</span>`;
      if (valStr !== undefined) return `<span style="color:${C.str}">${valStr}</span>`;
      if (bool    !== undefined) return `<span style="color:${C.bool}">${bool}</span>`;
      if (nil     !== undefined) return `<span style="color:${C.nil}">${nil}</span>`;
      if (num     !== undefined) return `<span style="color:${C.num}">${num}</span>`;
      if (bracket !== undefined) return `<span style="color:${C.bracket}">${bracket}</span>`;
      if (punct   !== undefined) return `<span style="color:${C.punct}">${punct}</span>`;
      return _m;
    }
  );
}
import { Node, Edge } from "@xyflow/react";
import { Trash2, XCircle, Lock } from "lucide-react";
import { workflowApi, ActionDefinition } from "../lib/api";
import { CustomNodeData } from "../lib/workflow-types";

interface RoleOption {
  id: string;
  label: string;
  type: string;
}


interface NodeConfigSidebarProps {
  selectedNode: Node<CustomNodeData> | null;
  selectedEdge: Edge | null;
  deleteSelectedNode: () => void;
  deleteSelectedEdge: () => void;
  updateNodeName: (id: string, label: string) => void;
  updateNodeConfigField: (id: string, field: string, value: any) => void;
  nodes: Node<CustomNodeData>[];
  setNodes: React.Dispatch<React.SetStateAction<Node<CustomNodeData>[]>>;
  setSelectedNode: React.Dispatch<React.SetStateAction<Node<CustomNodeData> | null>>;
  edges: Edge[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  setSelectedEdge: React.Dispatch<React.SetStateAction<Edge | null>>;
  handleAddAction: () => void;
  handleRemoveAction: (index: number) => void;
  triggerToast?: (msg: string, type: "success" | "error" | "info" | "warning") => void;
  editableJson: string;
  setEditableJson: (val: string) => void;
  jsonError: string | null;
  handleApplyJson: () => void;

  // Workflow level metadata
  workflowName: string;
  setWorkflowName: (val: string) => void;
  versionName: string;
  setVersionName: (val: string) => void;
  tenantId: string;
  setTenantId: (val: string) => void;
  isVersionActive?: boolean;
  currentMasterId?: number | null;
  currentVersionId?: number | null;
  handleCreateNewWorkflow?: () => void;
  onClose?: () => void;
}

export const NodeConfigSidebar: React.FC<NodeConfigSidebarProps> = ({
  selectedNode,
  selectedEdge,
  deleteSelectedNode,
  deleteSelectedEdge,
  updateNodeName,
  updateNodeConfigField,
  nodes,
  setNodes,
  setSelectedNode,
  edges,
  setEdges,
  setSelectedEdge,
  handleAddAction,
  handleRemoveAction,
  triggerToast,
  editableJson,
  setEditableJson,
  jsonError,
  handleApplyJson,

  workflowName,
  setWorkflowName,
  versionName,
  setVersionName,
  tenantId,
  setTenantId,
  isVersionActive = false,
  currentMasterId = null,
  currentVersionId = null,
  handleCreateNewWorkflow,
  onClose,
}) => {
  const updateSingleAction = (index: number, fields: Record<string, any> | string, val?: any) => {
    if (!selectedNode) return;
    const patch = typeof fields === "string" ? { [fields]: val } : fields;
    const currentActions = [...((selectedNode.data.config?.actions) || [])];
    currentActions[index] = { ...currentActions[index], ...patch };
    updateNodeConfigField(selectedNode.id, "actions", currentActions);
  };

  const [showJsonModal, setShowJsonModal] = useState(false);
  const [rolesList, setRolesList] = useState<RoleOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const uniqueRolesList = React.useMemo(() => {
    const seen = new Set<string>();
    return rolesList.filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
  }, [rolesList]);
  const [copied, setCopied] = useState(false);
  const [activeLine, setActiveLine] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef   = useRef<HTMLDivElement>(null);
  const preRef      = useRef<HTMLPreElement>(null);

  const handleJsonScroll = useCallback(() => {
    const top = textareaRef.current?.scrollTop ?? 0;
    if (gutterRef.current)  gutterRef.current.scrollTop = top;
    if (preRef.current)     preRef.current.scrollTop    = top;
  }, []);

  const updateActiveLine = useCallback(() => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    setActiveLine(textareaRef.current.value.substring(0, pos).split("\n").length - 1);
  }, []);

  // Fetch roles from backend on mount — pulls from role_registry + process mappings + workflow definitions
  React.useEffect(() => {
    setRolesLoading(true);
    workflowApi
      .getRoles()
      .then((data) => setRolesList(data))
      .catch(() => {
        // silently fail — user can still type a custom value in the text input below the select
      })
      .finally(() => setRolesLoading(false));
  }, []);

  const [actionPresets, setActionPresets] = useState<ActionDefinition[]>([]);
  React.useEffect(() => {
    workflowApi.getActionPresets().then(setActionPresets).catch(() => {});
  }, []);

  // Merge roles that are already used in the current canvas (fallback for offline / new roles)
  React.useEffect(() => {
    const canvasRoles: RoleOption[] = [];
    nodes.forEach((node) => {
      const assigneeVal = node.data.config?.assignee?.value;
      if (assigneeVal && typeof assigneeVal === "string") {
        canvasRoles.push({ id: assigneeVal, label: assigneeVal, type: "role" });
      }
      const assignees = node.data.config?.assignees;
      if (Array.isArray(assignees)) {
        assignees.forEach((assignee: any) => {
          if (assignee?.value && typeof assignee.value === "string") {
            canvasRoles.push({ id: assignee.value, label: assignee.value, type: "role" });
          }
        });
      }
    });
    if (canvasRoles.length > 0) {
      setRolesList((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newOnes = canvasRoles.filter((r) => !existingIds.has(r.id));
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
    }
  }, [nodes]);

  const FONT     = "'JetBrains Mono','Fira Code','SF Mono',Consolas,monospace";
  const LH       = "1.7";
  const FS       = "13px";
  const jsonLines = editableJson.split("\n");
  const byteSize  = new Blob([editableJson]).size;

  return (
    <>
    {/* ── JSON Edit Modal ─────────────────────────────────────── */}
    {showJsonModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-slate-800/50 backdrop-blur-sm" onClick={() => setShowJsonModal(false)} />

        <div
          className="relative z-10 w-full max-w-3xl flex flex-col overflow-hidden"
          style={{ height: "min(85vh, 720px)", background: "#FFFFFF", borderRadius: "12px", border: "1px solid #E2E8F0", boxShadow: "0 25px 60px -10px rgba(30,58,95,0.18)" }}
        >
          {/* ── Header (matches reference exactly) ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: "28px", height: "28px", background: "#F27823", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4l5-2.5L12 4v6l-5 2.5L2 10V4z" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/><path d="M7 6.5V12.5M2 4l5 2.5 5-2.5" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <div style={{ color: "#334155", fontSize: "13px", fontWeight: 500, letterSpacing: "0.3px", fontFamily: "inherit" }}>Edit Workflow JSON</div>
                <div style={{ color: "#94A3B8", fontSize: "11px", fontFamily: FONT, marginTop: "1px" }}>workflow_definition.json</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={() => { navigator.clipboard.writeText(editableJson); setCopied(true); setTimeout(() => setCopied(false), 2000); triggerToast?.("Copied!", "success"); }}
                style={{ padding: "5px 12px", background: copied ? "#ECFDF5" : "#F1F5F9", border: `1px solid ${copied ? "#6EE7B7" : "#E2E8F0"}`, borderRadius: "6px", color: copied ? "#059669" : "#475569", fontSize: "11px", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}
              >
                {copied
                  ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Copied!</>
                  : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>}
              </button>
              <button
                onClick={() => setShowJsonModal(false)}
                style={{ padding: "5px 8px", background: "transparent", border: "none", color: "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center", borderRadius: "6px" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#F1F5F9")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* ── Error banner ── */}
          {jsonError && (
            <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "8px", padding: "8px 20px", background: "#FFF1F2", borderBottom: "1px solid #FECDD3" }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span style={{ fontSize: "11px", color: "#E11D48", fontFamily: FONT, fontWeight: 600 }}>{jsonError}</span>
            </div>
          )}

          {/* ── Editor body ── */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden", background: "#FFFFFF" }}>

            {/* Gutter — white bg, light line numbers, active line highlighted, synced scroll */}
            <div
              ref={gutterRef}
              style={{ flexShrink: 0, width: "52px", overflowY: "hidden", overflowX: "hidden", background: "#FFFFFF", borderRight: "1px solid #E2E8F0", userSelect: "none" }}
              aria-hidden
            >
              <div style={{ paddingTop: "16px", paddingBottom: "16px" }}>
                {jsonLines.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: FONT, fontSize: "12px", lineHeight: LH,
                      textAlign: "right", paddingRight: "14px", paddingLeft: "8px",
                      color: i === activeLine ? "#F27823" : "#CBD5E1",
                      fontWeight: i === activeLine ? 600 : 400,
                      background: i === activeLine ? "#F0F5FF" : "transparent",
                      borderLeft: i === activeLine ? "2px solid #F27823" : "2px solid transparent",
                    }}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Code area — pre highlight layer + transparent textarea on top */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              {/* Active line highlight bar — behind everything */}
              <div
                aria-hidden
                style={{
                  position: "absolute", left: 0, right: 0, pointerEvents: "none", zIndex: 0,
                  top: `calc(16px + ${activeLine} * ${LH} * ${FS})`,
                  height: `calc(${LH} * ${FS})`,
                  background: "#F0F5FF",
                }}
              />
              {/* Highlighted pre */}
              <pre
                ref={preRef}
                dangerouslySetInnerHTML={{ __html: highlightJson(editableJson) + "\n" }}
                aria-hidden
                style={{
                  position: "absolute", inset: 0, margin: 0,
                  padding: "16px 20px", overflowY: "scroll", overflowX: "auto",
                  fontFamily: FONT, fontSize: FS, lineHeight: LH,
                  color: C.text, background: "transparent",
                  whiteSpace: "pre", pointerEvents: "none", zIndex: 1,
                  scrollbarWidth: "none",
                }}
              />
              {/* Editable textarea */}
              <textarea
                ref={textareaRef}
                value={editableJson}
                onChange={(e) => { setEditableJson(e.target.value); updateActiveLine(); }}
                onScroll={handleJsonScroll}
                onClick={updateActiveLine}
                onKeyUp={updateActiveLine}
                spellCheck={false}
                autoComplete="off"
                style={{
                  position: "absolute", inset: 0, margin: 0,
                  padding: "16px 20px", width: "100%", height: "100%",
                  fontFamily: FONT, fontSize: FS, lineHeight: LH,
                  background: "transparent", color: "transparent",
                  caretColor: "#F27823", resize: "none", border: "none", outline: "none",
                  overflowY: "scroll", overflowX: "auto", whiteSpace: "pre", zIndex: 2,
                }}
                placeholder='{ "nodes": [], "edges": [] }'
              />
            </div>
          </div>

          {/* ── Footer (matches reference exactly) ── */}
          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px", fontFamily: FONT, fontSize: "11px", color: "#94A3B8" }}>
              <span>JSON</span>
              <span>{jsonLines.length} lines</span>
              <span>{byteSize} B</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {/* Valid/Invalid indicator */}
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: jsonError ? "#E11D48" : "#059669" }} />
                <span style={{ fontSize: "11px", fontFamily: FONT, color: jsonError ? "#E11D48" : "#059669" }}>{jsonError ? "Invalid" : "Valid"}</span>
              </div>
              <div style={{ width: "1px", height: "14px", background: "#E2E8F0", margin: "0 4px" }} />
              <button
                onClick={() => setShowJsonModal(false)}
                style={{ padding: "6px 14px", background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: "6px", color: "#475569", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { handleApplyJson(); if (!jsonError) setShowJsonModal(false); }}
                style={{ padding: "6px 16px", background: "#F27823", border: "none", borderRadius: "6px", color: "#FFFFFF", fontSize: "12px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(242,120,35,0.3)" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#E35F16")}
                onMouseLeave={e => (e.currentTarget.style.background = "#F27823")}
              >
                Apply JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <div className="border-l border-slate-200 bg-white flex flex-col h-full z-10 shrink-0 w-80 lg:w-[22rem] overflow-hidden shadow-xl shadow-slate-900/5">
      {/* Sidebar Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3" style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all" title="Close panel">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          )}
          <div>
            <p className="text-xs font-bold text-slate-800">Properties</p>
            <p className="text-[10px] text-slate-400">
              {selectedNode ? `${selectedNode.data.type} node` : selectedEdge ? "edge transition" : "workflow settings"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowJsonModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", background: "#F27823", border: "none", borderRadius: "6px", color: "#FFFFFF", fontSize: "11px", fontWeight: 500, cursor: "pointer" }}
          onMouseEnter={e => (e.currentTarget.style.background = "#E35F16")}
          onMouseLeave={e => (e.currentTarget.style.background = "#F27823")}
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 4l5-2.5L12 4v6l-5 2.5L2 10V4z" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round"/><path d="M7 6.5V12.5M2 4l5 2.5 5-2.5" stroke="#fff" strokeWidth="1.3" strokeLinejoin="round"/></svg>
          Edit JSON
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-5 gap-5">
        {selectedNode ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Node Properties</p>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 mt-0.5 capitalize">{selectedNode.data.type} Node</p>
                </div>
                {selectedNode.id !== "startNode" && selectedNode.id !== "endNode" && (
                  <button onClick={deleteSelectedNode} className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all active:scale-95">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 truncate">{selectedNode.id}</p>
                <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/50 capitalize">{selectedNode.data.type}</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Node Label/Title *</label>
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => updateNodeName(selectedNode.id, e.target.value)}
                    className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900"
                  />
                </div>                {/* --- START NODE CONFIGURATION --- */}
                {selectedNode.data.type === "start" && (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 space-y-2">
                    <p className="font-semibold text-zinc-700 dark:text-zinc-300">Start Step Info</p>
                    <p>This step marks the beginning of the workflow. The workflow is automatically initiated and progressed to the first action node when triggered. No initiator or action configurations are needed here.</p>
                  </div>
                )}

                {/* --- APPROVAL NODE CONFIGURATION --- */}
                {selectedNode.data.type === "approval" && (
                  <>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-500 mb-1">Approval Mode *</label>
                        <select
                          value={(selectedNode.data.config?.approvalMode || "single").toLowerCase()}
                          onChange={(e) => {
                            const newMode = e.target.value as "single" | "parallel_all" | "parallel_any";
                            if (newMode === "single") {
                              setNodes((nds) => nds.map((node) => {
                                if (node.id === selectedNode.id) {
                                  const config = { ...node.data.config };
                                  config.approvalMode = newMode;
                                  config.assignees = undefined;
                                  if (!config.assignee) {
                                    config.assignee = { type: "role", value: "Reporting Manager" };
                                  }
                                  return { ...node, data: { ...node.data, config } };
                                }
                                return node;
                              }));
                              setSelectedNode((prev) => {
                                if (!prev) return null;
                                const config = { ...prev.data.config };
                                config.approvalMode = newMode;
                                config.assignees = undefined;
                                if (!config.assignee) {
                                  config.assignee = { type: "role", value: "Reporting Manager" };
                                }
                                return { ...prev, data: { ...prev.data, config } };
                              });
                            } else {
                              setNodes((nds) => nds.map((node) => {
                                if (node.id === selectedNode.id) {
                                  const config = { ...node.data.config };
                                  config.approvalMode = newMode;
                                  config.assignee = undefined;
                                  if (!config.assignees || config.assignees.length < 2) {
                                    config.assignees = [
                                      { type: "role", value: "Reporting Manager" },
                                      { type: "role", value: "HR Manager" }
                                    ];
                                  }
                                  return { ...node, data: { ...node.data, config } };
                                }
                                return node;
                              }));
                              setSelectedNode((prev) => {
                                if (!prev) return null;
                                const config = { ...prev.data.config };
                                config.approvalMode = newMode;
                                config.assignee = undefined;
                                if (!config.assignees || config.assignees.length < 2) {
                                  config.assignees = [
                                    { type: "role", value: "Reporting Manager" },
                                    { type: "role", value: "HR Manager" }
                                  ];
                                }
                                return { ...prev, data: { ...prev.data, config } };
                              });
                            }
                          }}
                          className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                        >
                          <option value="single">Single (One assignee)</option>
                          <option value="parallel_all">Parallel (ALL assignees must approve)</option>
                          <option value="parallel_any">Parallel (ANY assignee can approve)</option>
                        </select>
                      </div>

                      {/* Single Mode Assignment */}
                      {(!selectedNode.data.config?.approvalMode || selectedNode.data.config?.approvalMode?.toLowerCase() === "single") && (
                        <div className="space-y-2.5 bg-zinc-50/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80">
                          <div>
                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Assignee Type</label>
                            <select
                              value={selectedNode.data.config?.assignee?.type || "role"}
                              onChange={(e) => {
                                const currentAssignee = selectedNode.data.config?.assignee || { type: "role", value: "Reporting Manager" };
                                updateNodeConfigField(selectedNode.id, "assignee", { ...currentAssignee, type: e.target.value });
                              }}
                              className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                            >
                              <option value="role">Role</option>
                              <option value="user">User</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-zinc-500 mb-1">Assigned Role/User *</label>
                            <select
                              value={selectedNode.data.config?.assignee?.value || ""}
                              onChange={(e) => {
                                const currentAssignee = selectedNode.data.config?.assignee || { type: "role", value: "" };
                                updateNodeConfigField(selectedNode.id, "assignee", { ...currentAssignee, value: e.target.value });
                              }}
                              className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 font-semibold"
                            >
                              <option value="" disabled>{rolesLoading ? "Loading roles..." : uniqueRolesList.length === 0 ? "No roles found — type below" : "Select a role / user"}</option>
                              {uniqueRolesList.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.label}{r.id !== r.label ? ` (${r.id})` : ""}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Or enter custom value..."
                              value={selectedNode.data.config?.assignee?.value || ""}
                              onChange={(e) => {
                                const currentAssignee = selectedNode.data.config?.assignee || { type: "role", value: "" };
                                updateNodeConfigField(selectedNode.id, "assignee", { ...currentAssignee, value: e.target.value });
                              }}
                              className="mt-1.5 w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                            />
                          </div>
                        </div>
                      )}

                      {/* Parallel Mode Assignment */}
                      {(selectedNode.data.config?.approvalMode?.toLowerCase() === "parallel_all" || selectedNode.data.config?.approvalMode?.toLowerCase() === "parallel_any") && (
                        <div className="space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold text-zinc-500">Assignees (At least 2) *</label>
                            <button
                              type="button"
                              onClick={() => {
                                const currentAssignees = selectedNode.data.config?.assignees || [];
                                updateNodeConfigField(selectedNode.id, "assignees", [...currentAssignees, { type: "role", value: "HR Manager" }]);
                              }}
                              className="bg-orange-600 text-white rounded px-2 py-0.5 text-[9px] font-bold hover:bg-orange-500 transition-colors"
                            >
                              + Add Assignee
                            </button>
                          </div>
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {(selectedNode.data.config?.assignees || []).map((assignee: any, idx: number) => {
                              const updateAssignee = (field: string, val: any) => {
                                const currentAssignees = [...(selectedNode.data.config?.assignees || [])];
                                currentAssignees[idx] = { ...currentAssignees[idx], [field]: val };
                                updateNodeConfigField(selectedNode.id, "assignees", currentAssignees);
                              };
                              const removeAssignee = () => {
                                const currentAssignees = (selectedNode.data.config?.assignees || []).filter((_: any, i: number) => i !== idx);
                                updateNodeConfigField(selectedNode.id, "assignees", currentAssignees);
                              };
                              return (
                                <div key={idx} className="bg-white dark:bg-zinc-950 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 relative space-y-2">
                                  <button
                                    type="button"
                                    onClick={removeAssignee}
                                    className="absolute top-1.5 right-1.5 text-zinc-400 hover:text-rose-500"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                  <div className="grid grid-cols-2 gap-1.5 pr-4">
                                    <div>
                                      <label className="block text-[8px] text-zinc-400 font-bold uppercase">Type</label>
                                      <select
                                        value={assignee.type || "role"}
                                        onChange={(e) => updateAssignee("type", e.target.value)}
                                        className="w-full text-[10px] rounded border border-zinc-200 bg-white px-2 py-1 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                                      >
                                        <option value="role">Role</option>
                                        <option value="user">User</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-[8px] text-zinc-400 font-bold uppercase">Role/User</label>
                                      <select
                                        value={assignee.value || ""}
                                        onChange={(e) => updateAssignee("value", e.target.value)}
                                        className="w-full text-[10px] rounded border border-zinc-200 bg-white px-2 py-1 focus:outline-none dark:border-zinc-800 dark:bg-zinc-955 font-semibold"
                                      >
                                        <option value="" disabled>{rolesLoading ? "Loading..." : "Select role / user"}</option>
                                        {uniqueRolesList.map((r) => (
                                          <option key={r.id} value={r.id}>
                                            {r.label}{r.id !== r.label ? ` (${r.id})` : ""}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Or enter custom value..."
                                    value={assignee.value || ""}
                                    onChange={(e) => updateAssignee("value", e.target.value)}
                                    className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          id="allow_edit"
                          checked={selectedNode.data.config?.allow_edit !== false}
                          onChange={(e) => updateNodeConfigField(selectedNode.id, "allow_edit", e.target.checked)}
                          className="rounded accent-orange-655"
                        />
                        <label htmlFor="allow_edit" className="text-xs text-zinc-655 font-semibold">Allow Assignee to Edit Data Form</label>
                      </div>
                    </div>

                    {/* --- SLA POLICY SETTINGS --- */}
                    <div className="space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-655">SLA Policy Limits</span>
                        <input
                          type="checkbox"
                          id="slaEnabled"
                          checked={!!selectedNode.data.config?.sla}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateNodeConfigField(selectedNode.id, "sla", { duration: 24, unit: "hours", escalationType: "keep_with_warning" });
                            } else {
                              updateNodeConfigField(selectedNode.id, "sla", undefined);
                            }
                          }}
                          className="rounded accent-orange-655"
                        />
                      </div>

                      {(() => {
                        const sla = selectedNode.data.config?.sla;
                        if (!sla) return null;

                        const updateSlaField = (field: string, val: any) => {
                          updateNodeConfigField(selectedNode.id, "sla", { ...sla, [field]: val });
                        };

                        return (
                          <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] text-zinc-400 uppercase font-bold">Duration</label>
                                <input
                                  type="number"
                                  value={sla.duration ?? ""}
                                  onChange={(e) => updateSlaField("duration", e.target.value === "" ? null : +e.target.value)}
                                  className="w-full text-xs rounded border border-zinc-200 bg-white px-2 py-1 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] text-zinc-400 uppercase font-bold">Unit</label>
                                <select
                                  value={sla.unit ?? "hours"}
                                  onChange={(e) => updateSlaField("unit", e.target.value)}
                                  className="w-full text-xs rounded border border-zinc-200 bg-white px-2 py-1 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                                >
                                  <option value="minutes">Minutes</option>
                                  <option value="hours">Hours</option>
                                  <option value="days">Days</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[9px] text-zinc-400 uppercase font-bold">Breach Escalation Action</label>
                              <select
                                value={sla.escalationType ?? "keep_with_warning"}
                                onChange={(e) => updateSlaField("escalationType", e.target.value)}
                                className="w-full text-xs rounded border border-zinc-200 bg-white px-2 py-1 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                              >
                                <option value="keep_with_warning">Keep with Warning Alert</option>
                                <option value="escalate_to_role">Reassign to Another Role</option>
                                <option value="return_to_previous">Return to Previous Step</option>
                                <option value="move_to_next_node">Auto-progress to next step</option>
                              </select>
                            </div>

                            {sla.escalationType === "escalate_to_role" && (
                              <div>
                                <label className="block text-[9px] text-zinc-400 uppercase font-bold">Escalate to Role *</label>
                                <select
                                  value={sla.escalation?.value || ""}
                                  onChange={(e) => updateSlaField("escalation", { type: "role", value: e.target.value })}
                                  className="w-full text-xs rounded border border-zinc-200 bg-white px-2 py-1 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                                >
                                  <option value="">— Select a role —</option>
                                  {uniqueRolesList.map((r) => (
                                    <option key={r.id} value={r.id}>{r.label}</option>
                                  ))}
                                </select>
                                {rolesLoading && <p className="text-[9px] text-zinc-400 mt-1">Loading roles…</p>}
                              </div>
                            )}

                            {sla.escalationType === "return_to_previous" && (
                              <p className="text-[10px] text-zinc-400 leading-snug">
                                On breach, the task is automatically sent back to the previous step using the <span className="font-mono font-semibold text-zinc-500">send_back</span> action. Ensure that action exists on this node&apos;s connections.
                              </p>
                            )}

                            {sla.escalationType === "move_to_next_node" && (() => {
                              const nodeActions: any[] = selectedNode.data.config?.actions || [];
                              return (
                                <div>
                                  <label className="block text-[9px] text-zinc-400 uppercase font-bold">Auto Action Trigger</label>
                                  {nodeActions.length > 0 ? (
                                    <select
                                      value={sla.autoProgressAction ?? ""}
                                      onChange={(e) => updateSlaField("autoProgressAction", e.target.value)}
                                      className="w-full text-xs rounded border border-zinc-200 bg-white px-2 py-1 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950"
                                    >
                                      <option value="">— Select action —</option>
                                      {nodeActions.map((a: any) => {
                                        const id = a.id || a.action;
                                        return <option key={id} value={id}>{a.label || id}</option>;
                                      })}
                                    </select>
                                  ) : (
                                    <p className="text-[10px] text-zinc-400 mt-1">Add actions to this node first — they will appear here.</p>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      })()}
                    </div>

                    {/* --- ACTIONS CONFIGURATION LIST --- */}
                    <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="space-y-2">
                        <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Allowed Actions</span>
                        {/* Quick-add preset chips — loaded from /action-presets, fallback to built-ins */}
                        <div className="flex flex-wrap gap-1.5">
                          {actionPresets.map((preset) => {
                            const already = (selectedNode.data.config?.actions || []).some((a: any) => a.id === preset.action || a.action === preset.action);
                            return (
                              <button
                                key={preset.action}
                                type="button"
                                disabled={already}
                                title={already ? `"${preset.label}" already added` : `Add "${preset.label}" action`}
                                onClick={() => {
                                  if (!selectedNode || already) return;
                                  const current = [...((selectedNode.data.config?.actions) || [])];
                                  current.push({
                                    id: preset.action,
                                    action: preset.action,
                                    label: preset.label,
                                    resultStatus: preset.resultStatus,
                                    remarksMandatory: preset.remarksMandatory,
                                    requiresRemarks: preset.requiresRemarks,
                                    predefinedReasons: preset.predefinedReasons ?? [],
                                  });
                                  updateNodeConfigField(selectedNode.id, "actions", current);
                                }}
                                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors
                                  ${already
                                    ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-500 line-through"
                                    : "bg-white text-zinc-600 border-zinc-300 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 cursor-pointer dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-brand-500 dark:hover:text-brand-400"
                                  }`}
                              >
                                + {preset.label}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={handleAddAction}
                            title="Add a blank custom action"
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-full border border-dashed border-zinc-300 text-zinc-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 transition-colors dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-brand-500"
                          >
                            + Custom
                          </button>
                        </div>
                      </div>

                      {(selectedNode.data.config?.actions || []).map((action, index) => {
                        return (
                          <div key={action.id ?? index} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative group space-y-4">
                            {/* Delete Button */}
                            <button
                              onClick={() => handleRemoveAction(index)}
                              className="absolute top-3 right-3 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 p-1.5 rounded-md transition-colors"
                              title="Remove Action"
                            >
                              <Trash2 size={14} />
                            </button>

                            <div className="grid grid-cols-2 gap-4 pr-6">
                              {/* Action ID */}
                              <div>
                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Action ID *</label>
                                <input
                                  type="text"
                                  value={action.id}
                                  onChange={(e) => updateSingleAction(index, "id", e.target.value)}
                                  placeholder=""
                                  className="w-full text-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-800 placeholder-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-brand-500 font-mono transition-colors outline-none"
                                />
                              </div>

                              {/* Label */}
                              <div>
                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Button Label *</label>
                                <input
                                  type="text"
                                  value={action.label}
                                  onChange={(e) => updateSingleAction(index, "label", e.target.value)}
                                  placeholder=""
                                  className="w-full text-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-800 placeholder-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white transition-colors outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 items-center">
                              {/* Result Status */}
                              <div>
                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5">Result Status (Optional)</label>
                                <input
                                  type="text"
                                  value={action.resultStatus || ""}
                                  onChange={(e) => updateSingleAction(index, "resultStatus", e.target.value)}
                                  placeholder=""
                                  className="w-full text-sm rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-800 placeholder-zinc-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white transition-colors outline-none"
                                />
                              </div>

                              {/* Remarks Mandatory */}
                              <div className="flex items-center pt-5 pl-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={action.remarksMandatory || false}
                                    onChange={(e) => updateSingleAction(index, { remarksMandatory: e.target.checked, requiresRemarks: e.target.checked })}
                                    className="w-4 h-4 text-brand-600 border-zinc-300 rounded focus:ring-brand-500 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-brand-600 cursor-pointer"
                                  />
                                  <span className="text-sm font-medium text-zinc-700 group-hover:text-zinc-900 dark:text-zinc-300 dark:group-hover:text-white transition-colors">
                                    Remarks Mandatory
                                  </span>
                                </label>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* --- CONDITIONAL NODE CONFIGURATION --- */}
                {selectedNode.data.type === "conditional" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-655 mb-2">Condition Rules</label>

                      {(() => {
                        const config = selectedNode.data.config || {};
                        // Migrate legacy `rule` (singular) to `rules` array on the fly
                        const rules: any[] = config.rules && config.rules.length > 0
                          ? config.rules
                          : (config as any).rule
                            ? [{ ...((config as any).rule), nextAction: (config as any).rule.nextAction || "true" }]
                            : [{ conditions: [{ key: "", operator: "=", value: "", valueType: "literal" }], operators: [], nextAction: "true" }];

                        const updateRules = (updated: any[]) => {
                          updateNodeConfigField(selectedNode.id, "rules", updated);
                        };

                        const addRule = () => {
                          updateRules([...rules, { conditions: [{ key: "", operator: "=", value: "", valueType: "literal" }], operators: [], nextAction: "true" }]);
                        };

                        const removeRule = (ruleIdx: number) => {
                          updateRules(rules.filter((_: any, i: number) => i !== ruleIdx));
                        };

                        const updateRuleField = (ruleIdx: number, field: string, val: any) => {
                          updateRules(rules.map((r: any, i: number) => i === ruleIdx ? { ...r, [field]: val } : r));
                        };

                        const addCondition = (ruleIdx: number) => {
                          const rule = rules[ruleIdx];
                          const newConditions = [...rule.conditions, { key: "", operator: "=", value: "", valueType: "literal" }];
                          const newOperators = [...(rule.operators || []), "AND"];
                          updateRules(rules.map((r: any, i: number) => i === ruleIdx ? { ...r, conditions: newConditions, operators: newOperators } : r));
                        };

                        const removeCondition = (ruleIdx: number, condIdx: number) => {
                          const rule = rules[ruleIdx];
                          const newConditions = rule.conditions.filter((_: any, i: number) => i !== condIdx);
                          const newOperators = (rule.operators || []).filter((_: any, i: number) => i !== condIdx && i !== condIdx - 1);
                          updateRules(rules.map((r: any, i: number) => i === ruleIdx ? { ...r, conditions: newConditions, operators: newOperators } : r));
                        };

                        const updateCondition = (ruleIdx: number, condIdx: number, field: string, val: any) => {
                          const rule = rules[ruleIdx];
                          const newConditions = rule.conditions.map((c: any, i: number) => i === condIdx ? { ...c, [field]: val } : c);
                          updateRules(rules.map((r: any, i: number) => i === ruleIdx ? { ...r, conditions: newConditions } : r));
                        };

                        const updateOperator = (ruleIdx: number, operIdx: number, val: string) => {
                          const rule = rules[ruleIdx];
                          const newOperators = (rule.operators || []).map((op: string, i: number) => i === operIdx ? val : op);
                          updateRules(rules.map((r: any, i: number) => i === ruleIdx ? { ...r, operators: newOperators } : r));
                        };

                        return (
                          <div className="space-y-3">
                            {rules.map((rule: any, ruleIdx: number) => (
                              <div key={ruleIdx} className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Rule {ruleIdx + 1}</span>
                                  {rules.length > 1 && (
                                    <button onClick={() => removeRule(ruleIdx)} className="text-zinc-400 hover:text-rose-500">
                                      <XCircle size={12} />
                                    </button>
                                  )}
                                </div>

                                {/* Conditions */}
                                <div className="space-y-1.5 mb-2">
                                  {rule.conditions.map((cond: any, condIdx: number) => (
                                    <div key={condIdx}>
                                      {condIdx > 0 && (
                                        <div className="flex items-center gap-1.5 my-1.5">
                                          <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700"></div>
                                          <select
                                            value={(rule.operators && rule.operators[condIdx - 1]) || "AND"}
                                            onChange={(e) => updateOperator(ruleIdx, condIdx - 1, e.target.value)}
                                            className="text-[8px] rounded border border-brand-200 bg-white px-1.5 py-0.5 focus:outline-none dark:border-brand-900 dark:bg-zinc-950 font-bold text-brand-600 dark:text-brand-400 shrink-0"
                                          >
                                            <option value="AND">AND</option>
                                            <option value="OR">OR</option>
                                          </select>
                                          <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-700"></div>
                                        </div>
                                      )}
                                      <div className="flex gap-1 items-center">
                                        <input
                                          type="text"
                                          value={cond.key || ""}
                                          onChange={(e) => updateCondition(ruleIdx, condIdx, "key", e.target.value)}
                                          placeholder="field"
                                          className="flex-1 min-w-0 text-[10px] rounded border border-zinc-200 bg-white p-1 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 font-mono"
                                        />
                                        <select
                                          value={cond.operator || "="}
                                          onChange={(e) => updateCondition(ruleIdx, condIdx, "operator", e.target.value)}
                                          className="w-16 shrink-0 text-[10px] rounded border border-zinc-200 bg-white p-1 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 font-bold"
                                        >
                                          <option value="=">=</option>
                                          <option value="!=">!=</option>
                                          <option value=">">&gt;</option>
                                          <option value="<">&lt;</option>
                                          <option value=">=">&gt;=</option>
                                          <option value="<=">&lt;=</option>
                                          <option value="contains">contains</option>
                                          <option value="not_contains">not contains</option>
                                          <option value="in">in</option>
                                          <option value="not_in">not in</option>
                                          <option value="is_empty">is_empty</option>
                                          <option value="is_not_empty">is_not_empty</option>
                                        </select>
                                        <div className="flex-1 min-w-0 relative">
                                          <input
                                            type="text"
                                            value={cond.value || ""}
                                            onChange={(e) => updateCondition(ruleIdx, condIdx, "value", e.target.value)}
                                            placeholder={cond.valueType === "field" ? "field" : "value"}
                                            className={`w-full text-[10px] rounded border p-1 pr-8 focus:outline-none dark:bg-zinc-950 font-mono ${cond.valueType === "field"
                                              ? "border-brand-300 bg-brand-50 dark:border-brand-800 dark:bg-brand-950/30"
                                              : "border-zinc-200 bg-white dark:border-zinc-800"
                                              }`}
                                          />
                                          <button
                                            type="button"
                                            title={cond.valueType === "field" ? "Field comparison" : "Literal value"}
                                            onClick={() => updateCondition(ruleIdx, condIdx, "valueType", cond.valueType === "field" ? "literal" : "field")}
                                            className={`absolute right-0.5 top-0.5 bottom-0.5 text-[7px] font-bold px-1 rounded transition-colors ${cond.valueType === "field"
                                              ? "bg-brand-600 text-white"
                                              : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                                              }`}
                                          >
                                            {cond.valueType === "field" ? "f" : "v"}
                                          </button>
                                        </div>
                                        {rule.conditions.length > 1 && (
                                          <button
                                            onClick={() => removeCondition(ruleIdx, condIdx)}
                                            className="shrink-0 text-zinc-400 hover:text-rose-500"
                                          >
                                            <XCircle size={12} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => addCondition(ruleIdx)}
                                  className="w-full text-[9px] font-bold text-brand-600 hover:text-brand-800 py-1 rounded border border-brand-200 hover:border-brand-400 dark:border-brand-900 dark:hover:border-brand-600 transition-colors bg-white dark:bg-zinc-900 mb-2.5"
                                >
                                  + Add Condition
                                </button>

                                {/* Next Action — must match an outgoing edge label */}
                                <div>
                                  <label className="block text-[9px] font-bold text-zinc-400 uppercase mb-1">If Rule Matches → Action</label>
                                  <input
                                    type="text"
                                    value={rule.nextAction || "true"}
                                    onChange={(e) => updateRuleField(ruleIdx, "nextAction", e.target.value)}
                                    placeholder='e.g. "true"'
                                    className="w-full text-[10px] rounded border border-zinc-200 bg-white p-1 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 font-mono"
                                  />
                                  <p className="text-[8px] text-zinc-400 mt-0.5">Must match a connection label from this node</p>
                                </div>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={addRule}
                              className="w-full text-[9px] font-bold text-amber-600 hover:text-amber-800 py-1.5 rounded border border-amber-200 hover:border-amber-400 dark:border-amber-900 dark:hover:border-amber-600 transition-colors bg-white dark:bg-zinc-900"
                            >
                              + Add Rule
                            </button>

                            {/* Default Action */}
                            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                              <label className="block text-xs font-semibold text-zinc-500 mb-1">Default Action (when no rules match) *</label>
                              <input
                                type="text"
                                value={config.defaultAction || "false"}
                                onChange={(e) => updateNodeConfigField(selectedNode.id, "defaultAction", e.target.value)}
                                placeholder='e.g. "false"'
                                className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 font-mono"
                              />
                              <p className="text-[9px] text-zinc-400 mt-1">Fallback when no rule matches. Must match a connection label (e.g. "false")</p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* --- SUB WORKFLOW NODE CONFIGURATION --- */}
                {selectedNode.data.type === "subworkflow" && (
                  <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800 space-y-4">
                    <span className="text-xs font-bold text-zinc-655 block">Sub Workflow Configuration</span>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Sub-Workflow Name *</label>
                      <input
                        type="text"
                        value={selectedNode.data.config?.subWorkflowName || ""}
                        onChange={(e) => {
                          const name = e.target.value;
                          updateNodeConfigField(selectedNode.id, "subWorkflowName", name);
                        }}
                        placeholder=""
                        className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Workflow Master ID</label>
                      <input
                        type="number"
                        value={selectedNode.data.config?.workflowDefinitionId || ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : undefined;
                          updateNodeConfigField(selectedNode.id, "workflowDefinitionId", val);
                        }}
                        placeholder=""
                        className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Workflow Version ID</label>
                      <input
                        type="number"
                        value={selectedNode.data.config?.workflowVersionId || ""}
                        onChange={(e) => {
                          const val = e.target.value ? Number(e.target.value) : undefined;
                          updateNodeConfigField(selectedNode.id, "workflowVersionId", val);
                        }}
                        placeholder=""
                        className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div>
                        <label className="block text-[9px] text-zinc-400 uppercase font-bold">Success Action Trigger</label>
                        <input
                          type="text"
                          value={selectedNode.data.config?.successAction || "approve"}
                          onChange={(e) => updateNodeConfigField(selectedNode.id, "successAction", e.target.value)}
                          placeholder=""
                          className="w-full text-xs rounded border border-zinc-250 bg-white px-2.5 py-1.5 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] text-zinc-400 uppercase font-bold">Failure Action Trigger</label>
                        <input
                          type="text"
                          value={selectedNode.data.config?.failureAction || "reject"}
                          onChange={(e) => updateNodeConfigField(selectedNode.id, "failureAction", e.target.value)}
                          placeholder=""
                          className="w-full text-xs rounded border border-zinc-250 bg-white px-2.5 py-1.5 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* --- END NODE CONFIGURATION --- */}
                {selectedNode.data.type === "end" && (
                  <div className="space-y-4">
                    <div className="p-3 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/50 rounded-xl text-[11px] text-rose-800 dark:text-rose-400 space-y-1">
                      <p className="font-semibold">End Node Status mappings</p>
                      <p>Configures the final status code of the workflow run once this step is reached.</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-500 mb-1">Default Final Status Code *</label>
                      <input
                        type="text"
                        value={selectedNode.data.config?.finalStatus || selectedNode.data.config?.defaultStatus || "Completed"}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateNodeConfigField(selectedNode.id, "finalStatus", val);
                          updateNodeConfigField(selectedNode.id, "defaultStatus", val);
                        }}
                        placeholder=""
                        className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : selectedEdge ? (
            <div className="space-y-5">
              {/* Edge header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Edge Properties</p>
                  <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 mt-0.5">Transition Config</p>
                </div>
                <button
                  onClick={() => deleteSelectedEdge()}
                  title="Delete this edge"
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all active:scale-95"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Edge ID + connection pill */}
              <div className="rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 divide-y divide-zinc-100 dark:divide-zinc-800">
                <div className="px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Edge ID</p>
                  <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">{selectedEdge.id}</p>
                </div>
                <div className="px-3 py-2">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1">Connection</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-950/40 text-[10px] font-mono font-semibold text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/50">{selectedEdge.source}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 shrink-0"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">{selectedEdge.target}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold text-zinc-650 block">Transition Config</span>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Trigger Action / Condition *</label>
                  {(() => {
                    const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
                    const sourceType = sourceNode ? sourceNode.data.type : "";

                    const updateEdgeLabel = (edgeId: string, label: string) => {
                      setEdges((eds) => eds.map((e) => e.id === edgeId ? { ...e, label: label || undefined } : e));
                      if (selectedEdge?.id === edgeId) {
                        setSelectedEdge({ ...selectedEdge, label: label || undefined });
                      }
                    };

                    const isDuplicateLabel = (newLabel: string) =>
                      !!newLabel &&
                      edges.some(
                        (e) => e.id !== selectedEdge.id && e.source === selectedEdge.source && e.label === newLabel
                      );

                    if (sourceType === "approval") {
                      const actions = sourceNode?.data.config?.actions || [
                        { id: "approve", label: "Approve" },
                        { id: "reject", label: "Reject" }
                      ];
                      const uniqueActions = actions.reduce((acc: any[], act) => {
                        if (!acc.find(a => a.id === act.id)) {
                          acc.push(act);
                        }
                        return acc;
                      }, []);
                      const currentLabel = selectedEdge.label as string || "";
                      const isDup = isDuplicateLabel(currentLabel);
                      return (
                        <div className="space-y-2">
                          <select
                            value={currentLabel}
                            onChange={(e) => updateEdgeLabel(selectedEdge.id, e.target.value)}
                            className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none dark:bg-zinc-900 ${isDup ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-zinc-250 bg-white dark:border-zinc-800"}`}
                          >
                            <option value="">Choose action trigger...</option>
                            {uniqueActions.map((act) => (
                              <option key={act.id} value={act.id} disabled={isDuplicateLabel(act.id)}>
                                {act.label} ({act.id}){isDuplicateLabel(act.id) ? " — already used" : ""}
                              </option>
                            ))}
                            <option value="custom_value">-- Custom Trigger Name --</option>
                          </select>
                          {isDup && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              ⚠ Another edge from this node already uses "{currentLabel}". Each outgoing edge should have a unique trigger.
                            </p>
                          )}
                          {(!uniqueActions.some(a => a.id === currentLabel) || currentLabel === "custom_value") && (
                            <input
                              type="text"
                              value={currentLabel}
                              onChange={(e) => updateEdgeLabel(selectedEdge.id, e.target.value)}
                              placeholder="Enter custom action trigger label"
                              className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 font-mono"
                            />
                          )}
                        </div>
                      );
                    } else if (sourceType === "conditional") {
                      const cCfg = sourceNode?.data?.config || {};
                      const cRules: any[] = (cCfg as any).rules || [];
                      const defaultAction: string = (cCfg as any).defaultAction || "";

                      // Build options: one per rule's nextAction + one for defaultAction
                      const seen = new Set<string>();
                      const branchOptions: { value: string; label: string; isDefault: boolean }[] = [];
                      cRules.forEach((r: any, i: number) => {
                        const val = (r.nextAction || "").trim();
                        if (val && !seen.has(val)) {
                          seen.add(val);
                          branchOptions.push({ value: val, label: `Rule ${i + 1} match → "${val}"`, isDefault: false });
                        }
                      });
                      if (defaultAction && !seen.has(defaultAction)) {
                        seen.add(defaultAction);
                        branchOptions.push({ value: defaultAction, label: `Default (no match) → "${defaultAction}"`, isDefault: true });
                      }
                      // Fallback if node has no rules configured yet
                      if (branchOptions.length === 0) {
                        branchOptions.push(
                          { value: "true", label: "✓ True Branch", isDefault: false },
                          { value: "false", label: "✗ False Branch", isDefault: true }
                        );
                      }

                      const currentLabel = selectedEdge.label as string || "";
                      const isCustom = currentLabel !== "" && !seen.has(currentLabel);
                      const isDupCond = isDuplicateLabel(currentLabel);

                      return (
                        <div className="space-y-2">
                          <select
                            value={isCustom ? "__custom__" : currentLabel}
                            onChange={(e) => {
                              if (e.target.value !== "__custom__") updateEdgeLabel(selectedEdge.id, e.target.value);
                            }}
                            className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none dark:bg-zinc-900 font-semibold ${isDupCond ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20" : "border-zinc-250 bg-white dark:border-zinc-800"}`}
                          >
                            <option value="">Choose branch…</option>
                            {branchOptions.map((opt) => (
                              <option key={opt.value} value={opt.value} disabled={isDuplicateLabel(opt.value)}>
                                {opt.label}{isDuplicateLabel(opt.value) ? " — already used" : ""}
                              </option>
                            ))}
                            <option value="__custom__">— Custom label —</option>
                          </select>
                          {isDupCond && (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                              ⚠ Another edge from this node already uses "{currentLabel}". Each branch should have a unique label.
                            </p>
                          )}
                          {isCustom && (
                            <input
                              type="text"
                              value={currentLabel}
                              onChange={(e) => updateEdgeLabel(selectedEdge.id, e.target.value)}
                              placeholder="Custom branch label"
                              className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 font-mono"
                            />
                          )}
                          <div className="text-[9px] text-zinc-500 dark:text-zinc-400 italic">
                            Label must match a rule's "If Rule Matches → Action" or the node's "Default Action"
                          </div>
                        </div>
                      );
                    } else {
                      const isStart = selectedEdge.source === "startNode";
                      return (
                        <input
                          type="text"
                          value={selectedEdge.label as string || (isStart ? "initial submit" : "")}
                          readOnly={isStart}
                          onChange={isStart ? undefined : (e) => updateEdgeLabel(selectedEdge.id, e.target.value)}
                          className={`w-full rounded-lg border px-3 py-2 text-xs focus:outline-none dark:bg-zinc-900 font-mono ${isStart ? "border-zinc-200 bg-zinc-50 text-zinc-500 cursor-not-allowed dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" : "border-zinc-250 bg-white dark:border-zinc-800"}`}
                          placeholder=""
                        />
                      );
                    }
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edgeAnimated"
                    checked={selectedEdge.animated || false}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setEdges((eds) => eds.map((edge) => edge.id === selectedEdge.id ? { ...edge, animated: val } : edge));
                      setSelectedEdge({ ...selectedEdge, animated: val });
                    }}
                    className="rounded accent-orange-655"
                  />
                  <label htmlFor="edgeAnimated" className="text-xs text-zinc-655">Animated Connection line</label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">Line Color Style</label>
                  <select
                    value={selectedEdge.style?.stroke || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const style = val ? { stroke: val, strokeWidth: 2 } : undefined;
                      setEdges((eds) => eds.map((edge) => edge.id === selectedEdge.id ? { ...edge, style } : edge));
                      setSelectedEdge({ ...selectedEdge, style });
                    }}
                    className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <option value="">Default (Zinc / Slate)</option>
                    <option value="#10b981">Success (Emerald Green)</option>
                    <option value="#f43f5e">Danger (Rose Red)</option>
                    <option value="#3b82f6">Primary (Royal Blue)</option>
                    <option value="#f59e0b">Warning (Amber Gold)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Workflow Settings</p>
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 mt-0.5">Global Parameters</p>
              </div>

              {isVersionActive && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-800 dark:text-amber-350 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Lock size={14} className="text-amber-500" />
                    <span>Active Version Locked</span>
                  </div>
                  <p className="text-[11px] leading-normal">
                    This version is currently active and locked. To change the workflow name, version name, or flow steps, please click the <strong>New Version</strong> button in the header first to duplicate it into an editable draft.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Workflow Name *
                    {!!currentMasterId && <span className="ml-1 text-[10px] text-zinc-400">(locked)</span>}
                  </label>
                  <input
                    type="text"
                    value={workflowName}
                    onChange={(e) => setWorkflowName(e.target.value)}
                    disabled={!!currentMasterId}
                    className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500 disabled:cursor-not-allowed"
                    placeholder=""
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Version Name
                    {!!currentMasterId && <span className="ml-1 text-[10px] text-zinc-400">(locked)</span>}
                  </label>
                  <input
                    type="text"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    disabled={!!currentMasterId}
                    className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500 disabled:cursor-not-allowed"
                    placeholder=""
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1">
                    Tenant ID
                    {!!currentMasterId && <span className="ml-1 text-[10px] text-zinc-400">(locked)</span>}
                  </label>
                  <input
                    type="text"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    disabled={!!currentMasterId}
                    className="w-full rounded-lg border border-zinc-250 bg-white px-3 py-2 text-xs focus:outline-none focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-900 disabled:bg-zinc-50 disabled:text-zinc-400 dark:disabled:bg-zinc-900 dark:disabled:text-zinc-500 disabled:cursor-not-allowed"
                    placeholder=""
                  />
                </div>

              </div>
            </div>
          )}
      </div>
    </div>
    </>
  );
};
