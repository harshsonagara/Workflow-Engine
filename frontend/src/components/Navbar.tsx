"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Workflow, Plus, Users, GitBranch, ChevronDown, Trash2, BookOpen, LogIn, LogOut, UserCircle, Sliders } from "lucide-react";
import { workflowApi } from "../lib/api";
import { clearAuth, subscribeAuth, type AuthUser } from "../lib/auth";
import { useEffect, useRef, useState } from "react";
import { useToast } from "../context/ToastContext";

interface NavbarProps {
  designerActions?: {
    workflowName: string;
    versionName?: string;
    currentMasterId: number | null;
    currentVersionId?: number | null;
    isMasterActive?: boolean;
    allVersions?: Array<{ id: number; versionName: string; isActive: boolean }>;
    handleSaveToDatabase: () => Promise<void>;
    handleReset: () => void;
    handleValidate: () => Promise<void>;
    handleNewVersion?: () => Promise<void>;
    handleCreateNewWorkflow?: () => void;
    handleDeleteWorkflow?: () => Promise<void>;
    handleDeleteVersion?: () => Promise<void>;
    handleToggleMasterStatus?: () => Promise<void>;
    handleActivateVersion?: (versionId: number) => Promise<void>;
  };
}

export default function Navbar({ designerActions }: NavbarProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const prevOffline = useRef<boolean | null>(null);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeAuth(setAuthUser), []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsVersionDropdownOpen(false);
      }
    }

    if (isVersionDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isVersionDropdownOpen]);

  useEffect(() => {
    return workflowApi.subscribeOffline((status) => {
      if (prevOffline.current === null) {
        prevOffline.current = status;
        if (status) toast("Workflow Engine is offline. Ensure the Java backend is running on port 8080.", "warning");
        return;
      }
      if (status && !prevOffline.current) {
        toast("Workflow Engine is offline. Ensure the Java backend is running on port 8080.", "warning");
      } else if (!status && prevOffline.current) {
        toast("Workflow Engine is back online.", "success");
      }
      prevOffline.current = status;
    });
  }, [toast]);

  const tabs = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/designer", label: "Workflow Designer", icon: Workflow },
    { href: "/mappings", label: "Process Mappings", icon: GitBranch },
    { href: "/roles", label: "Roles Registry", icon: Users },
    { href: "/presets", label: "Action Presets", icon: Sliders },
    { href: "/docs", label: "Docs", icon: BookOpen },
    { href: "/integration", label: "Third Party Integration", icon: Users },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 bg-white/80 backdrop-blur-xl dark:border-zinc-800/60 dark:bg-slate-950/80 shrink-0 shadow-sm dark:shadow-none">
        <div className="w-full flex h-16 items-center justify-between px-6">
          {/* Left Section: Brand Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center cursor-pointer group">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-all">
                  <Workflow size={16} className="text-white" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-400 dark:to-brand-300 bg-clip-text text-transparent tracking-tight group-hover:from-brand-700 group-hover:to-brand-800 transition-all">
                  Workflow Engine
                </span>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="flex space-x-1" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${isActive
                      ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-md shadow-brand-500/30 dark:shadow-brand-500/20"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/50 dark:hover:text-zinc-100"
                      }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Designer Actions or Page Info */}
          <div className="flex items-center gap-2">

            {designerActions ? (
              <>

                {/* Action Buttons */}

                <button
                  onClick={designerActions.handleValidate}
                  className="rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-amber-600 hover:to-amber-700 active:scale-95 shadow-md shadow-amber-500/30 hover:shadow-lg transition-all"
                >
                  Validate
                </button>
                <button
                  onClick={designerActions.handleSaveToDatabase}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:from-emerald-600 hover:to-emerald-700 active:scale-95 shadow-md shadow-emerald-500/30 hover:shadow-lg transition-all"
                >
                  Save
                </button>

                <button
                  onClick={designerActions.handleReset}
                  className="rounded-lg border border-zinc-300/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/30 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 active:scale-95 transition-all shadow-sm hover:shadow-md"
                >
                  Reset
                </button>

                {/* Version Dropdown */}
                {designerActions.allVersions && designerActions.allVersions.length > 0 && (
                  <div ref={dropdownRef} className="relative">
                    <button
                      onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                      className="rounded-lg border border-zinc-300/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/30 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 active:scale-95 transition-all shadow-sm hover:shadow-md flex items-center gap-1"
                    >
                      <span>{designerActions.versionName || "v1"}</span>
                      <ChevronDown size={12} className={`transition-transform ${isVersionDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isVersionDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/95 shadow-lg z-40">
                        <div className="max-h-60 overflow-y-auto">
                          {designerActions.allVersions.map((version) => (
                            <div key={version.id} className="flex items-center gap-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800/50 last:border-b-0 group">
                              <div className="flex-1 min-w-0">
                                <button
                                  onClick={async () => {
                                    if (version.id !== designerActions.currentVersionId && designerActions.handleActivateVersion) {
                                      await designerActions.handleActivateVersion(version.id);
                                    }
                                    setIsVersionDropdownOpen(false);
                                  }}
                                  className="text-left w-full text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 truncate"
                                >
                                  {version.versionName}
                                </button>
                              </div>
                              {version.isActive && (
                                <span className="text-[8px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded whitespace-nowrap">
                                  ACTIVE
                                </span>
                              )}
                              {designerActions.currentVersionId === version.id && designerActions.handleDeleteVersion && !version.isActive && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmAction({
                                      message: `Delete version "${version.versionName}"?`,
                                      onConfirm: () => { designerActions.handleDeleteVersion?.(); },
                                    });
                                  }}
                                  className="p-1 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Delete version"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <span className="rounded-full bg-gradient-to-r from-brand-500/20 to-brand-600/20 dark:from-brand-500/10 dark:to-brand-600/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/50">
                v1.0
              </span>
            )}

            {/* Auth chip — sign-in is optional (auth not enforced) */}
            {authUser ? (
              <div className="flex items-center gap-1.5 ml-2 pl-3 border-l border-zinc-200 dark:border-zinc-800">
                <UserCircle size={16} className="text-brand-600" />
                <span className="hidden md:inline text-xs font-semibold text-zinc-700 dark:text-zinc-300 max-w-[140px] truncate" title={authUser.email}>
                  {authUser.fullName}
                </span>
                <button
                  onClick={() => { clearAuth(); toast("Signed out.", "info"); }}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                  title="Sign out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 ml-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-all"
              >
                <LogIn size={14} />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{confirmAction.message}</p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-xl border border-zinc-300 dark:border-zinc-700 px-4 py-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
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
    </>
  );
}
