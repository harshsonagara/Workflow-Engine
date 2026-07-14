"use client";

import React, { useEffect, useState } from "react";
import Navbar from "../../components/Navbar";
import { workflowApi } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Plus, Trash2, RefreshCw, Users } from "lucide-react";

interface RoleRow {
  id: string;
  label: string;
  type: "role" | "user";
}

const TYPE_OPTIONS: Array<"role" | "user"> = ["role", "user"];

export default function RolesPage() {
  const { toast } = useToast();

  // ── Existing roles ───────────────────────────────────────────────────────
  const [existingRoles, setExistingRoles] = useState<
    Array<{ id: string; label: string; type: string }>
  >([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);

  // ── Sync form ────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<RoleRow[]>([
    { id: "", label: "", type: "role" },
  ]);
  const [syncing, setSyncing] = useState(false);

  // ── Load existing roles ──────────────────────────────────────────────────
  const fetchRoles = React.useCallback(async () => {
    setLoadingRoles(true);
    try {
      const data = await workflowApi.getRoles();
      setExistingRoles(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load roles";
      toast(message, "error");
    } finally {
      setLoadingRoles(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ── Row helpers ──────────────────────────────────────────────────────────
  function addRow() {
    setRows((prev) => [...prev, { id: "", label: "", type: "role" }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof RoleRow, value: string) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleDeleteRole(roleId: string) {
    setDeletingRoleId(roleId);
    try {
      await workflowApi.deleteRole(roleId);
      toast(`Role "${roleId}" deleted.`, "success");
      fetchRoles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Delete failed.";
      toast(message, "error");
    } finally {
      setDeletingRoleId(null);
    }
  }

  async function handleSync(e: React.FormEvent) {
    e.preventDefault();
    const valid = rows.filter((r) => r.id.trim() && r.label.trim());
    if (valid.length === 0) {
      toast("Add at least one role with ID and label.", "error");
      return;
    }
    setSyncing(true);
    try {
      await workflowApi.syncRoles(valid);
      toast(
        `Synced ${valid.length} role${valid.length !== 1 ? "s" : ""}.`,
        "success"
      );
      setRows([{ id: "", label: "", type: "role" }]);
      fetchRoles();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed.";
      toast(message, "error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50/50 text-zinc-900 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Roles Registry</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Register roles and users from external systems so they appear in
            workflow assignment dropdowns.
          </p>
        </div>

        {/* Sync Form */}
        <section className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-zinc-800 mb-4">
            Sync Roles from External Source
          </h2>
          <form onSubmit={handleSync} className="space-y-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs font-semibold text-zinc-500 border-b border-zinc-200">
                    <th className="pb-2 pr-3 w-1/3">Role ID</th>
                    <th className="pb-2 pr-3 w-1/3">Label</th>
                    <th className="pb-2 pr-3 w-1/5">Type</th>
                    <th className="pb-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          placeholder="ID"
                          value={row.id}
                          onChange={(e) => updateRow(i, "id", e.target.value)}
                          className="w-full border border-zinc-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          placeholder="Label"
                          value={row.label}
                          onChange={(e) =>
                            updateRow(i, "label", e.target.value)
                          }
                          className="w-full border border-zinc-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <select
                          value={row.type}
                          onChange={(e) =>
                            updateRow(i, "type", e.target.value)
                          }
                          className="w-full border border-zinc-300 rounded-md px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          {TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          disabled={rows.length === 1}
                          className="p-1.5 text-zinc-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                <Plus size={15} /> Add Row
              </button>
              <button
                type="submit"
                disabled={syncing}
                className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {syncing ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} />
                )}
                Sync Roles
              </button>
            </div>
          </form>
        </section>

        {/* Existing roles */}
        <section className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-zinc-800 flex items-center gap-2">
              <Users size={16} className="text-zinc-500" />
              All Registered Roles
            </h2>
            <button
              onClick={fetchRoles}
              disabled={loadingRoles}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 border border-zinc-200 rounded-md px-3 py-1.5 transition-colors"
            >
              <RefreshCw
                size={12}
                className={loadingRoles ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>

          {loadingRoles ? (
            <div className="text-sm text-zinc-400 py-6 text-center">
              Loading…
            </div>
          ) : existingRoles.length === 0 ? (
            <div className="text-sm text-zinc-400 py-6 text-center">
              No roles registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-xs font-semibold text-zinc-500 border-b border-zinc-200">
                    <th className="pb-2 pr-4">ID</th>
                    <th className="pb-2 pr-4">Label</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {existingRoles.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-2 pr-4 font-mono text-xs text-zinc-700">
                        {r.id}
                      </td>
                      <td className="py-2 pr-4 text-zinc-800">{r.label}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            r.type === "user"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-brand-100 text-brand-700"
                          }`}
                        >
                          {r.type ?? "role"}
                        </span>
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteRole(r.id)}
                          disabled={deletingRoleId === r.id}
                          className="p-1.5 text-zinc-400 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors"
                          title="Delete role"
                        >
                          {deletingRoleId === r.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
