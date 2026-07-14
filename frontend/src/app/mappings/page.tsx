"use client";

import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../../components/Navbar";
import { workflowApi, ProcessMapping, ProcessMappingCreateDto } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Plus, Pencil, Trash2, RefreshCw, GitBranch, X } from "lucide-react";
import { N } from "../../lib/theme";

interface WorkflowMasterOption {
  id: number;
  workflowName: string;
  code?: string;
}

type FormMode = "create" | "edit" | null;

const EMPTY_FORM: ProcessMappingCreateDto = {
  processCode: "",
  processName: "",
  description: "",
  workflowMasterId: 0,
  entityType: "",
  businessKeyPrefix: "",
  isActive: true,
};

// ── Shared input style ────────────────────────────────────────────────────────
const inputBase: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "8px 12px", borderRadius: "8px",
  border: `1px solid ${N.border}`, background: N.white,
  color: N.text, fontSize: "13px", outline: "none",
  transition: "border-color 0.15s",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: 600,
  color: N.textSub, marginBottom: "5px",
};

export default function MappingsPage() {
  const { toast } = useToast();

  const [mappings,       setMappings]       = useState<ProcessMapping[]>([]);
  const [loadingMappings,setLoadingMappings] = useState(false);
  const [workflows,      setWorkflows]       = useState<WorkflowMasterOption[]>([]);
  const [formMode,       setFormMode]        = useState<FormMode>(null);
  const [editingId,      setEditingId]       = useState<number | null>(null);
  const [form,           setForm]            = useState<ProcessMappingCreateDto>(EMPTY_FORM);
  const [formErrors,     setFormErrors]      = useState<Partial<Record<keyof ProcessMappingCreateDto, string>>>({});
  const [submitting,     setSubmitting]      = useState(false);
  const [deletingId,     setDeletingId]      = useState<number | null>(null);
  const [confirmDeleteId,setConfirmDeleteId] = useState<number | null>(null);

  const fetchMappings = useCallback(async () => {
    setLoadingMappings(true);
    try {
      setMappings(await workflowApi.getProcessMappings());
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to load process mappings", "error");
    } finally {
      setLoadingMappings(false);
    }
  }, [toast]);

  const fetchWorkflows = useCallback(async () => {
    try {
      setWorkflows(await workflowApi.getAllWorkflowMastersWithVersions());
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchMappings(); fetchWorkflows(); }, [fetchMappings, fetchWorkflows]);

  function openCreate() { setForm(EMPTY_FORM); setFormErrors({}); setEditingId(null); setFormMode("create"); }
  function openEdit(m: ProcessMapping) {
    setForm({ processCode: m.processCode, processName: m.processName, description: m.description ?? "",
              workflowMasterId: m.workflowMasterId, entityType: m.entityType ?? "",
              businessKeyPrefix: m.businessKeyPrefix ?? "", isActive: m.isActive });
    setFormErrors({}); setEditingId(m.id); setFormMode("edit");
  }
  function closePanel() { setFormMode(null); setEditingId(null); }

  function setField<K extends keyof ProcessMappingCreateDto>(key: K, value: ProcessMappingCreateDto[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (formErrors[key]) setFormErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof ProcessMappingCreateDto, string>> = {};
    if (!form.processCode.trim()) e.processCode = "Required";
    else if (!/^[A-Z0-9_]+$/.test(form.processCode.trim())) e.processCode = "Uppercase letters, numbers, underscores only";
    if (!form.processName.trim()) e.processName = "Required";
    if (!form.workflowMasterId) e.workflowMasterId = "Select a workflow";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload: ProcessMappingCreateDto = {
        processCode: form.processCode.trim().toUpperCase(),
        processName: form.processName.trim(),
        description: form.description?.trim() || undefined,
        workflowMasterId: form.workflowMasterId,
        entityType: form.entityType?.trim() || undefined,
        businessKeyPrefix: form.businessKeyPrefix?.trim() || undefined,
        isActive: form.isActive,
      };
      if (formMode === "create") {
        const created = await workflowApi.createProcessMapping(payload);
        setMappings(prev => [...prev, created]);
        toast("Process mapping created", "success");
      } else if (formMode === "edit" && editingId !== null) {
        const updated = await workflowApi.updateProcessMapping(editingId, payload);
        setMappings(prev => prev.map(m => m.id === editingId ? updated : m));
        toast("Process mapping updated", "success");
      }
      closePanel();
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Operation failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      await workflowApi.deleteProcessMapping(id);
      setMappings(prev => prev.filter(m => m.id !== id));
      if (editingId === id) closePanel();
      toast("Process mapping deleted", "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Delete failed", "error");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: N.headerBg, display: "flex", flexDirection: "column", fontFamily: "inherit" }}>
      <Navbar />

      <main style={{ flex: 1, maxWidth: "1280px", width: "100%", margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Page Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ width: "42px", height: "42px", background: N.navy, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(30,58,95,0.2)" }}>
              <GitBranch size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: 700, color: N.navy, margin: 0 }}>Process Mappings</h1>
              <p style={{ fontSize: "13px", color: N.textMuted, margin: "3px 0 0" }}>Link process codes to their corresponding workflow definitions.</p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={fetchMappings}
              disabled={loadingMappings}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: N.white, border: `1px solid ${N.border}`, borderRadius: "8px", color: N.textSub, fontSize: "12px", fontWeight: 500, cursor: "pointer", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = N.headerBg)}
              onMouseLeave={e => (e.currentTarget.style.background = N.white)}
            >
              <RefreshCw size={13} style={{ animation: loadingMappings ? "spin 1s linear infinite" : "none" }} />
              Refresh
            </button>
            <button
              onClick={openCreate}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: N.navy, border: "none", borderRadius: "8px", color: N.white, fontSize: "12px", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px rgba(30,58,95,0.25)", transition: "background 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.background = N.navyHover)}
              onMouseLeave={e => (e.currentTarget.style.background = N.navy)}
            >
              <Plus size={14} />
              New Mapping
            </button>
          </div>
        </div>

        {/* ── Table Card ── */}
        <div style={{ background: N.white, borderRadius: "12px", border: `1px solid ${N.border}`, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>

            {loadingMappings ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "64px", color: N.textMuted, gap: "10px" }}>
                <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "13px" }}>Loading mappings…</span>
              </div>
            ) : mappings.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px", gap: "12px" }}>
                <div style={{ width: "48px", height: "48px", background: N.navyLight, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GitBranch size={22} color={N.navy} />
                </div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: N.text, margin: 0 }}>No process mappings yet</p>
                <p style={{ fontSize: "12px", color: N.textMuted, margin: 0 }}>Create your first mapping to link processes to workflows.</p>
                <button
                  onClick={openCreate}
                  style={{ marginTop: "4px", padding: "8px 18px", background: N.navy, border: "none", borderRadius: "8px", color: N.white, fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                >
                  + New Mapping
                </button>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: N.headerBg, borderBottom: `1px solid ${N.border}` }}>
                    {["Process Code","Process Name","Workflow","Entity Type","Status","Actions"].map((h, i) => (
                      <th key={h} style={{ padding: "11px 16px", textAlign: i === 5 ? "right" : "left", fontSize: "11px", fontWeight: 700, color: N.textSub, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m, idx) => (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: idx < mappings.length - 1 ? `1px solid ${N.border}` : "none",
                        background: editingId === m.id ? N.navyLight : N.white,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => { if (editingId !== m.id) e.currentTarget.style.background = N.headerBg; }}
                      onMouseLeave={e => { e.currentTarget.style.background = editingId === m.id ? N.navyLight : N.white; }}
                    >
                      {/* Process Code */}
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 700, color: N.navy, background: N.navyLight, padding: "3px 8px", borderRadius: "6px", letterSpacing: "0.04em" }}>
                          {m.processCode}
                        </span>
                      </td>
                      {/* Process Name */}
                      <td style={{ padding: "13px 16px" }}>
                        <p style={{ margin: 0, fontWeight: 600, color: N.text }}>{m.processName}</p>
                        {m.description && <p style={{ margin: "2px 0 0", fontSize: "11px", color: N.textMuted, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.description}</p>}
                      </td>
                      {/* Workflow */}
                      <td style={{ padding: "13px 16px" }}>
                        <p style={{ margin: 0, fontWeight: 600, color: N.text }}>{m.workflowName ?? `#${m.workflowMasterId}`}</p>
                      </td>
                      {/* Entity Type */}
                      <td style={{ padding: "13px 16px", fontSize: "12px", color: N.textSub }}>
                        {m.entityType || <span style={{ color: N.textMuted }}>—</span>}
                      </td>
                      {/* Status */}
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "5px",
                          padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
                          background: m.isActive ? N.greenBg : N.headerBg,
                          color: m.isActive ? N.green : N.textMuted,
                          border: `1px solid ${m.isActive ? N.greenBorder : N.border}`,
                        }}>
                          <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: m.isActive ? N.green : N.textMuted }} />
                          {m.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {/* Actions */}
                      <td style={{ padding: "13px 16px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px" }}>
                          <button
                            onClick={() => openEdit(m)}
                            title="Edit"
                            style={{ padding: "6px", borderRadius: "6px", border: "none", background: "transparent", color: N.textMuted, cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.12s" }}
                            onMouseEnter={e => { e.currentTarget.style.background = N.navyLight; e.currentTarget.style.color = N.navy; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = N.textMuted; }}
                          >
                            <Pencil size={14} />
                          </button>
                          {confirmDeleteId === m.id ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <button
                                onClick={() => handleDelete(m.id)}
                                disabled={deletingId === m.id}
                                style={{ padding: "4px 10px", borderRadius: "6px", border: "none", background: N.red, color: N.white, fontSize: "11px", fontWeight: 700, cursor: "pointer", opacity: deletingId === m.id ? 0.6 : 1 }}
                              >
                                {deletingId === m.id ? "…" : "Confirm"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                style={{ padding: "4px 10px", borderRadius: "6px", border: `1px solid ${N.border}`, background: N.white, color: N.textSub, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(m.id)}
                              title="Delete"
                              style={{ padding: "6px", borderRadius: "6px", border: "none", background: "transparent", color: N.textMuted, cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.12s" }}
                              onMouseEnter={e => { e.currentTarget.style.background = N.redBg; e.currentTarget.style.color = N.red; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = N.textMuted; }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Table footer */}
            {mappings.length > 0 && (
              <div style={{ padding: "10px 16px", background: N.headerBg, borderTop: `1px solid ${N.border}`, display: "flex", alignItems: "center", gap: "16px", fontSize: "11px", color: N.textMuted, fontFamily: "monospace" }}>
                <span>{mappings.length} mapping{mappings.length !== 1 ? "s" : ""}</span>
                <span>{mappings.filter(m => m.isActive).length} active</span>
              </div>
            )}
          </div>
        </main>

      {/* ── Modal overlay ── */}
      {formMode && (
        <div
          onClick={closePanel}
          style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" }}
        >
          {/* Modal card — stop propagation so clicking inside doesn't close */}
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "560px", background: N.white, borderRadius: "14px", border: `1px solid ${N.border}`, overflow: "hidden", boxShadow: "0 20px 60px rgba(15,23,42,0.25)" }}
          >
            {/* Modal header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: N.headerBg, borderBottom: `1px solid ${N.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", background: N.navy, borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <GitBranch size={14} color="#fff" />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: N.navy }}>
                    {formMode === "create" ? "New Process Mapping" : "Edit Process Mapping"}
                  </p>
                  <p style={{ margin: 0, fontSize: "11px", color: N.textMuted }}>
                    {formMode === "create" ? "Link a process code to a workflow definition" : `Editing mapping #${editingId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={closePanel}
                style={{ padding: "6px", borderRadius: "7px", border: "none", background: "transparent", color: N.textMuted, cursor: "pointer", display: "flex" }}
                onMouseEnter={e => { e.currentTarget.style.background = N.border; e.currentTarget.style.color = N.text; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = N.textMuted; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form body — 2-column grid */}
            <form onSubmit={handleSubmit}>
              <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>

                {/* Process Code */}
                <div>
                  <label style={labelStyle}>Process Code <span style={{ color: N.red }}>*</span></label>
                  <input
                    type="text"
                    value={form.processCode}
                    onChange={e => setField("processCode", e.target.value.toUpperCase())}
                    placeholder="e.g. LEAVE_APPLY"
                    style={{ ...inputBase, fontFamily: "monospace", borderColor: formErrors.processCode ? N.red : N.border }}
                    onFocus={e => (e.target.style.borderColor = formErrors.processCode ? N.red : N.navy)}
                    onBlur={e => (e.target.style.borderColor = formErrors.processCode ? N.red : N.border)}
                  />
                  {formErrors.processCode && <p style={{ fontSize: "11px", color: N.red, margin: "4px 0 0" }}>{formErrors.processCode}</p>}
                </div>

                {/* Process Name */}
                <div>
                  <label style={labelStyle}>Process Name <span style={{ color: N.red }}>*</span></label>
                  <input
                    type="text"
                    value={form.processName}
                    onChange={e => setField("processName", e.target.value)}
                    placeholder="e.g. Leave Application"
                    style={{ ...inputBase, borderColor: formErrors.processName ? N.red : N.border }}
                    onFocus={e => (e.target.style.borderColor = formErrors.processName ? N.red : N.navy)}
                    onBlur={e => (e.target.style.borderColor = formErrors.processName ? N.red : N.border)}
                  />
                  {formErrors.processName && <p style={{ fontSize: "11px", color: N.red, margin: "4px 0 0" }}>{formErrors.processName}</p>}
                </div>

                {/* Workflow — full width */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Workflow <span style={{ color: N.red }}>*</span></label>
                  <select
                    value={form.workflowMasterId || ""}
                    onChange={e => setField("workflowMasterId", Number(e.target.value))}
                    style={{ ...inputBase, borderColor: formErrors.workflowMasterId ? N.red : N.border, cursor: "pointer" }}
                    onFocus={e => (e.target.style.borderColor = formErrors.workflowMasterId ? N.red : N.navy)}
                    onBlur={e => (e.target.style.borderColor = formErrors.workflowMasterId ? N.red : N.border)}
                  >
                    <option value="">— Select a workflow —</option>
                    {workflows.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.workflowName}
                      </option>
                    ))}
                  </select>
                  {formErrors.workflowMasterId && <p style={{ fontSize: "11px", color: N.red, margin: "4px 0 0" }}>{formErrors.workflowMasterId}</p>}
                  {workflows.length === 0 && !formErrors.workflowMasterId && (
                    <p style={{ fontSize: "11px", color: N.textMuted, margin: "4px 0 0" }}>No workflows found — create one in the Workflow Designer first.</p>
                  )}
                </div>

                {/* Entity Type */}
                <div>
                  <label style={labelStyle}>Entity Type</label>
                  <input
                    type="text"
                    value={form.entityType}
                    onChange={e => setField("entityType", e.target.value)}
                    placeholder="Optional"
                    style={{ ...inputBase }}
                    onFocus={e => (e.target.style.borderColor = N.navy)}
                    onBlur={e => (e.target.style.borderColor = N.border)}
                  />
                </div>

                {/* Business Key Prefix */}
                <div>
                  <label style={labelStyle}>Business Key Prefix</label>
                  <input
                    type="text"
                    value={form.businessKeyPrefix}
                    onChange={e => setField("businessKeyPrefix", e.target.value)}
                    placeholder="Optional"
                    style={{ ...inputBase, fontFamily: "monospace" }}
                    onFocus={e => (e.target.style.borderColor = N.navy)}
                    onBlur={e => (e.target.style.borderColor = N.border)}
                  />
                </div>

                {/* Description — full width */}
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={e => setField("description", e.target.value)}
                    placeholder="Optional short description"
                    style={{ ...inputBase }}
                    onFocus={e => (e.target.style.borderColor = N.navy)}
                    onBlur={e => (e.target.style.borderColor = N.border)}
                  />
                </div>

                {/* Active toggle — full width */}
                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: N.headerBg, borderRadius: "8px", border: `1px solid ${N.border}` }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: N.textSub }}>Active</p>
                    <p style={{ margin: "1px 0 0", fontSize: "11px", color: N.textMuted }}>{form.isActive ? "Mapping is enabled and usable" : "Mapping is disabled"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setField("isActive", !form.isActive)}
                    style={{ position: "relative", width: "42px", height: "23px", borderRadius: "12px", border: "none", cursor: "pointer", background: form.isActive ? N.navy : N.border, transition: "background 0.2s", flexShrink: 0 }}
                  >
                    <span style={{ position: "absolute", top: "3px", left: form.isActive ? "21px" : "3px", width: "17px", height: "17px", borderRadius: "50%", background: N.white, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </button>
                </div>
              </div>

              {/* Modal footer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", padding: "14px 20px", background: N.headerBg, borderTop: `1px solid ${N.border}` }}>
                <button
                  type="button"
                  onClick={closePanel}
                  style={{ padding: "8px 18px", background: N.white, border: `1px solid ${N.border}`, borderRadius: "8px", color: N.textSub, fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = N.border)}
                  onMouseLeave={e => (e.currentTarget.style.background = N.white)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: "8px 20px", background: submitting ? N.textMuted : N.navy, border: "none", borderRadius: "8px", color: N.white, fontSize: "13px", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", boxShadow: "0 2px 8px rgba(30,58,95,0.2)", transition: "background 0.15s" }}
                  onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = N.navyHover; }}
                  onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = N.navy; }}
                >
                  {submitting ? "Saving…" : formMode === "create" ? "Create Mapping" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
