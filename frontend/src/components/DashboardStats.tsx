"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Layers, Eye, Trash2, ChevronDown, GitBranch } from "lucide-react";
import { workflowApi } from "../lib/api";
import { useToast } from "../context/ToastContext";
import { N } from "../lib/theme";

interface WorkflowVersion { id: number; versionName: string; active?: boolean; isActive?: boolean; }
interface WorkflowMaster  { id: number; workflowName: string; active?: boolean; isActive?: boolean; versions?: WorkflowVersion[]; workflowVersions?: WorkflowVersion[]; activeVersion?: WorkflowVersion; }

export default function DashboardStats() {
  const { toast } = useToast();
  const [masters,     setMasters]     = useState<WorkflowMaster[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [expanded,    setExpanded]    = useState<number | null>(null);
  const [confirmDel,  setConfirmDel]  = useState<{ type: "master" | "version"; id: number } | null>(null);
  const [detailCache, setDetailCache] = useState<Record<number, WorkflowMaster>>({});
  const [loadingVers, setLoadingVers] = useState<number | null>(null);

  const load = async (preserveCache = false) => {
    if (!preserveCache) setLoading(true);
    try {
      const mastersData = await workflowApi.getAllWorkflowMastersWithVersions();
      setMasters((mastersData as any) ?? []);
      if (!preserveCache) {
        setDetailCache({});           // invalidate cached version lists on full reload
      }
    } catch { /* silent */ }
    finally { if (!preserveCache) setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleExpand = async (flowId: number) => {
    if (expanded === flowId) { setExpanded(null); return; }
    setExpanded(flowId);
    if (detailCache[flowId]) return;   // already cached
    setLoadingVers(flowId);
    try {
      const detail = await workflowApi.getWorkflowMasterById(flowId);
      if (detail) setDetailCache(prev => ({ ...prev, [flowId]: detail }));
    } catch { /* silent */ }
    finally { setLoadingVers(null); }
  };

  const refreshDetail = async (masterId: number) => {
    try {
      const detail = await workflowApi.getWorkflowMasterById(masterId);
      if (detail) setDetailCache(prev => ({ ...prev, [masterId]: detail }));
    } catch { /* silent */ }
  };

  const handleToggle = async (id: number) => {
    try { await workflowApi.toggleWorkflowMasterStatus(id); toast("Status updated", "success"); load(true); }
    catch (e: any) { toast(e.message || "Failed", "error"); }
  };

  const handleDeleteMaster = async (id: number) => {
    try { await workflowApi.deleteWorkflowMaster(id); toast("Workflow deleted", "success"); setConfirmDel(null); load(true); }
    catch (e: any) { toast(e.message || "Failed", "error"); }
  };

  const handleActivate = async (versionId: number, masterId: number) => {
    try { 
      await workflowApi.activateWorkflowVersion(versionId); 
      toast("Version activated", "success"); 
      await refreshDetail(masterId); 
      load(true); 
    }
    catch (e: any) { toast(e.message || "Failed", "error"); }
  };

  const handleDeleteVersion = async (id: number, masterId: number) => {
    try { 
      await workflowApi.deleteWorkflowVersion(id); 
      toast("Version deleted", "success"); 
      setConfirmDel(null); 
      await refreshDetail(masterId); 
      load(true); 
    }
    catch (e: any) { toast(e.message || "Failed", "error"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", paddingBottom: "40px" }}>

      {/* ── Workflows card ── */}
      <div style={{ background: N.white, border: `1px solid ${N.border}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>

        {/* Card header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: N.headerBg, borderBottom: `1px solid ${N.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "28px", height: "28px", background: N.navy, borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GitBranch size={14} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: N.navy }}>Workflows</h2>
              {!loading && <p style={{ margin: 0, fontSize: "11px", color: N.textMuted }}>{masters.length} workflow{masters.length !== 1 ? "s" : ""} · {masters.filter(m => m.isActive ?? m.active ?? true).length} active</p>}
            </div>
          </div>
          <Link
            href="/designer"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: N.navy, borderRadius: "8px", color: N.white, fontSize: "12px", fontWeight: 700, textDecoration: "none", boxShadow: "0 2px 8px rgba(30,58,95,0.2)" }}
            onMouseEnter={e => (e.currentTarget.style.background = N.navyHover)}
            onMouseLeave={e => (e.currentTarget.style.background = N.navy)}
          >
            <Plus size={13} /> New Workflow
          </Link>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ padding: "0" }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${N.border}`, gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "36px", height: "20px", borderRadius: "10px", background: N.border, animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ width: "140px", height: "14px", borderRadius: "6px", background: N.border, animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div style={{ width: "80px", height: "30px", borderRadius: "7px", background: N.border, animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ width: "60px", height: "30px", borderRadius: "7px", background: N.border, animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
              </div>
            ))}
          </div>
        ) : masters.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: "12px" }}>
            <div style={{ width: "44px", height: "44px", background: N.navyLight, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GitBranch size={20} color={N.navy} />
            </div>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: N.text }}>No workflows yet</p>
            <p style={{ margin: 0, fontSize: "12px", color: N.textMuted, textAlign: "center", maxWidth: "280px" }}>Create your first workflow in the visual designer to get started.</p>
            <Link href="/designer" style={{ marginTop: "8px", display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 18px", background: N.navy, borderRadius: "8px", color: N.white, fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
              <Plus size={13} /> Open Designer
            </Link>
          </div>
        ) : (
          masters.map((flow, idx) => {
            const detail     = detailCache[flow.id];
            const versions   = detail?.workflowVersions || flow.workflowVersions || flow.versions || (flow.activeVersion ? [flow.activeVersion] : []);
            const isActive   = flow.isActive ?? flow.active ?? true;
            const isExpanded = expanded === flow.id;
            const isFetchingVersions = loadingVers === flow.id;
            const activeVer  = versions.find((v: any) => v.active || v.isActive) || versions[0];
            const versionQuery = activeVer ? `&versionId=${activeVer.id}` : "";

            return (
              <div key={flow.id} style={{ borderBottom: idx < masters.length - 1 ? `1px solid ${N.border}` : "none" }}>
                {/* Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", gap: "12px", background: isExpanded ? N.navyLight : N.white, transition: "background 0.15s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggle(flow.id)}
                      title={isActive ? "Deactivate" : "Activate"}
                      style={{ position: "relative", width: "38px", height: "21px", borderRadius: "11px", border: "none", cursor: "pointer", background: isActive ? N.navy : N.border, transition: "background 0.2s", flexShrink: 0 }}
                    >
                      <span style={{ position: "absolute", top: "2px", left: isActive ? "19px" : "2px", width: "17px", height: "17px", borderRadius: "50%", background: N.white, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </button>

                    {/* Name + meta */}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: N.navy, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{flow.workflowName}</p>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "3px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "1px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700, background: isActive ? N.greenBg : N.headerBg, color: isActive ? N.green : N.textMuted, border: `1px solid ${isActive ? N.greenBorder : N.border}` }}>
                          <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: isActive ? N.green : N.textMuted }} />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                        <span style={{ fontSize: "11px", color: N.textMuted }}>{versions.length} version{versions.length !== 1 ? "s" : ""}{isFetchingVersions ? "…" : ""}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => handleExpand(flow.id)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 11px", borderRadius: "7px", border: `1px solid ${isExpanded ? N.navy : N.border}`, background: isExpanded ? N.navyLight : N.white, color: isExpanded ? N.navy : N.textSub, fontSize: "12px", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}
                    >
                      <Layers size={13} />
                      Versions
                      <ChevronDown size={12} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                    </button>

                    <Link
                      href={`/designer?loadId=${flow.id}${versionQuery}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "6px 11px", borderRadius: "7px", border: `1px solid ${N.border}`, background: N.white, color: N.textSub, fontSize: "12px", fontWeight: 600, textDecoration: "none", transition: "all 0.15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = N.headerBg; e.currentTarget.style.color = N.navy; }}
                      onMouseLeave={e => { e.currentTarget.style.background = N.white; e.currentTarget.style.color = N.textSub; }}
                    >
                      <Eye size={13} /> View
                    </Link>

                    <div style={{ width: "1px", height: "24px", background: N.border }} />

                    {confirmDel?.type === "master" && confirmDel.id === flow.id ? (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <button onClick={() => handleDeleteMaster(flow.id)} style={{ padding: "5px 10px", borderRadius: "6px", border: "none", background: N.red, color: N.white, fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Confirm</button>
                        <button onClick={() => setConfirmDel(null)} style={{ padding: "5px 10px", borderRadius: "6px", border: `1px solid ${N.border}`, background: N.white, color: N.textSub, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmDel({ type: "master", id: flow.id })}
                        title="Delete"
                        style={{ padding: "6px", borderRadius: "7px", border: "none", background: "transparent", color: N.textMuted, cursor: "pointer", display: "flex", alignItems: "center", transition: "all 0.12s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = N.redBg; e.currentTarget.style.color = N.red; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = N.textMuted; }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Versions panel */}
                <div style={{ display: "grid", gridTemplateRows: isExpanded ? "1fr" : "0fr", transition: "grid-template-rows 0.25s ease" }}>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ background: N.headerBg, borderTop: `1px solid ${N.border}`, padding: "12px 20px", display: "flex", flexDirection: "column", gap: "0" }}>
                      {/* Versions header */}
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                        <Link
                          href={`/designer?loadId=${flow.id}${versionQuery}&action=newVersion`}
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "7px", background: N.navy, border: "none", color: N.white, fontSize: "11px", fontWeight: 700, textDecoration: "none" }}
                          onMouseEnter={e => (e.currentTarget.style.background = N.navyHover)}
                          onMouseLeave={e => (e.currentTarget.style.background = N.navy)}
                        >
                          <Plus size={12} /> New Version
                        </Link>
                      </div>

                      {isFetchingVersions ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {[1,2].map(i => (
                            <div key={i} style={{ height: "44px", borderRadius: "8px", background: N.border, animation: "pulse 1.5s ease-in-out infinite" }} />
                          ))}
                        </div>
                      ) : versions.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", background: N.white, borderRadius: "8px", border: `1px dashed ${N.border}` }}>
                          <p style={{ margin: 0, fontSize: "12px", color: N.textMuted }}>No versions yet</p>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {versions.map((ver, vi) => {
                            const isVerActive = ver.active ?? ver.isActive ?? false;
                            return (
                              <div key={ver.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: N.white, borderRadius: "8px", border: `1px solid ${isVerActive ? N.greenBorder : N.border}`, gap: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: isVerActive ? N.greenBg : N.headerBg, border: `1px solid ${isVerActive ? N.greenBorder : N.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 800, color: isVerActive ? N.green : N.textMuted, fontFamily: "monospace" }}>
                                    v{versions.length - vi}
                                  </div>
                                  <div>
                                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: N.text }}>{ver.versionName}</p>
                                    {isVerActive && <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, color: N.green, textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</p>}
                                  </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  {!isVerActive && (
                                    <button
                                      onClick={() => handleActivate(ver.id, flow.id)}
                                      style={{ padding: "4px 10px", borderRadius: "6px", border: `1px solid ${N.border}`, background: N.white, color: N.textSub, fontSize: "11px", fontWeight: 600, cursor: "pointer", transition: "all 0.12s" }}
                                      onMouseEnter={e => { e.currentTarget.style.background = N.navyLight; e.currentTarget.style.color = N.navy; e.currentTarget.style.borderColor = N.navy; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = N.white; e.currentTarget.style.color = N.textSub; e.currentTarget.style.borderColor = N.border; }}
                                    >
                                      Make Active
                                    </button>
                                  )}
                                  <Link
                                    href={`/designer?loadId=${flow.id}&versionId=${ver.id}`}
                                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "6px", border: `1px solid ${N.border}`, background: N.white, color: N.textSub, fontSize: "11px", fontWeight: 600, textDecoration: "none", transition: "all 0.12s" }}
                                    onMouseEnter={e => { e.currentTarget.style.background = N.navyLight; e.currentTarget.style.color = N.navy; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = N.white; e.currentTarget.style.color = N.textSub; }}
                                  >
                                    <Eye size={12} /> View
                                  </Link>

                                  {confirmDel?.type === "version" && confirmDel.id === ver.id ? (
                                    <span style={{ display: "flex", gap: "4px" }}>
                                      <button onClick={() => handleDeleteVersion(ver.id, flow.id)} style={{ padding: "4px 8px", borderRadius: "6px", border: "none", background: N.red, color: N.white, fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>Confirm</button>
                                      <button onClick={() => setConfirmDel(null)} style={{ padding: "4px 8px", borderRadius: "6px", border: `1px solid ${N.border}`, background: N.white, color: N.textSub, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => setConfirmDel({ type: "version", id: ver.id })}
                                      style={{ padding: "4px", borderRadius: "6px", border: "none", background: "transparent", color: N.textMuted, cursor: "pointer", display: "flex", transition: "all 0.12s" }}
                                      onMouseEnter={e => { e.currentTarget.style.background = N.redBg; e.currentTarget.style.color = N.red; }}
                                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = N.textMuted; }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
