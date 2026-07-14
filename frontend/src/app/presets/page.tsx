"use client";

import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../../components/Navbar";
import { workflowApi, ActionPresetAdmin } from "../../lib/api";
import { useToast } from "../../context/ToastContext";
import { Save, RefreshCw, Sliders, Plus } from "lucide-react";

type DraftPreset = ActionPresetAdmin & { dirty: boolean; saving: boolean };

const EMPTY_NEW = { label: "", resultStatus: "", requiresRemarks: false, remarksMandatory: false, sortOrder: 0, active: true };

export default function PresetsPage() {
  const { toast } = useToast();
  const [presets, setPresets] = useState<DraftPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPreset, setNewPreset] = useState(EMPTY_NEW);
  const [adding, setAdding] = useState(false);

  const fetchPresets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workflowApi.getAllActionPresets();
      setPresets(data.map((p) => ({ ...p, dirty: false, saving: false })));
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to load presets", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchPresets(); }, [fetchPresets]);

  function patch(id: number, field: keyof ActionPresetAdmin, value: unknown) {
    setPresets((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value, dirty: true } : p))
    );
  }

  async function save(preset: DraftPreset) {
    setPresets((prev) => prev.map((p) => (p.id === preset.id ? { ...p, saving: true } : p)));
    try {
      const updated = await workflowApi.updateActionPreset(preset.id, {
        label: preset.label,
        resultStatus: preset.resultStatus ?? undefined,
        requiresRemarks: preset.requiresRemarks,
        remarksMandatory: preset.remarksMandatory,
        sortOrder: preset.sortOrder,
        active: preset.active,
      });
      setPresets((prev) =>
        prev.map((p) => (p.id === preset.id ? { ...updated, dirty: false, saving: false } : p))
      );
      toast(`"${preset.label}" saved`, "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Save failed", "error");
      setPresets((prev) => prev.map((p) => (p.id === preset.id ? { ...p, saving: false } : p)));
    }
  }

  async function addPreset() {
    if (!newPreset.label.trim()) { toast("Label is required", "error"); return; }
    setAdding(true);
    try {
      const created = await workflowApi.createActionPreset(newPreset);
      setPresets((prev) => [...prev, { ...created, dirty: false, saving: false }]);
      setNewPreset(EMPTY_NEW);
      toast(`"${created.label}" created`, "success");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Create failed", "error");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/30">
              <Sliders size={20} className="text-brand-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Action Presets</h1>
              <p className="text-sm text-zinc-500">
                Configure the quick-add buttons shown in approval node configuration.
              </p>
            </div>
          </div>
          <button
            onClick={fetchPresets}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {loading && presets.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
              Loading presets…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Action Key</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Label</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">Result Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">Req. Remarks</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">Mandatory</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">Order</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">Active</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {presets.map((preset) => (
                  <tr
                    key={preset.id}
                    className={`transition-colors ${
                      preset.dirty ? "bg-amber-50/60 dark:bg-amber-900/10" : ""
                    } ${!preset.active ? "opacity-50" : ""}`}
                  >
                    {/* Action key — readonly */}
                    <td className="px-4 py-3">
                      <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                        {preset.action}
                      </code>
                    </td>

                    {/* Label */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={preset.label}
                        onChange={(e) => patch(preset.id, "label", e.target.value)}
                        className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                    </td>

                    {/* Result Status */}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={preset.resultStatus ?? ""}
                        onChange={(e) => patch(preset.id, "resultStatus", e.target.value || null)}
                        className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                    </td>

                    {/* Requires Remarks */}
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        value={preset.requiresRemarks}
                        onChange={(v) => patch(preset.id, "requiresRemarks", v)}
                      />
                    </td>

                    {/* Remarks Mandatory */}
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        value={preset.remarksMandatory}
                        onChange={(v) => patch(preset.id, "remarksMandatory", v)}
                      />
                    </td>

                    {/* Sort Order */}
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        value={preset.sortOrder}
                        onChange={(e) => patch(preset.id, "sortOrder", Number(e.target.value))}
                        className="w-16 rounded-md border border-zinc-200 bg-white px-2 py-1 text-center text-sm text-zinc-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
                      />
                    </td>

                    {/* Active */}
                    <td className="px-4 py-3 text-center">
                      <Toggle
                        value={preset.active}
                        onChange={(v) => patch(preset.id, "active", v)}
                        colorWhenOn="green"
                      />
                    </td>

                    {/* Save */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => save(preset)}
                        disabled={!preset.dirty || preset.saving}
                        className="flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                      >
                        <Save size={12} />
                        {preset.saving ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
                {/* ── Add new row ── */}
                <tr className="bg-zinc-50 dark:bg-zinc-800/40">
                  <td className="px-4 py-3">
                    <span className="text-xs text-zinc-400 italic">auto-generated</span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Label *"
                      value={newPreset.label}
                      onChange={(e) => setNewPreset((p) => ({ ...p, label: e.target.value }))}
                      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-white"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      placeholder="Result status"
                      value={newPreset.resultStatus}
                      onChange={(e) => setNewPreset((p) => ({ ...p, resultStatus: e.target.value }))}
                      className="w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-white"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Toggle value={newPreset.requiresRemarks} onChange={(v) => setNewPreset((p) => ({ ...p, requiresRemarks: v }))} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Toggle value={newPreset.remarksMandatory} onChange={(v) => setNewPreset((p) => ({ ...p, remarksMandatory: v }))} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      value={newPreset.sortOrder}
                      onChange={(e) => setNewPreset((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                      className="w-16 rounded-md border border-zinc-200 bg-white px-2 py-1 text-center text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-white"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Toggle value={newPreset.active} onChange={(v) => setNewPreset((p) => ({ ...p, active: v }))} colorWhenOn="green" />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={addPreset}
                      disabled={adding}
                      className="flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
                    >
                      <Plus size={12} />
                      {adding ? "Adding…" : "Add"}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-4 text-xs text-zinc-400">
          Changes take effect immediately — the workflow designer loads presets fresh on each open.
          Set <strong>Active = off</strong> to hide a preset without deleting it.
        </p>
      </main>
    </div>
  );
}

function Toggle({
  value,
  onChange,
  colorWhenOn = "brand",
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  colorWhenOn?: "brand" | "green";
}) {
  const on = colorWhenOn === "green"
    ? "bg-green-500"
    : "bg-brand-500";

  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        value ? on : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
          value ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
