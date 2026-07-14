"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Workflow, Mail, Lock, LogIn } from "lucide-react";
import { workflowApi } from "../../lib/api";
import { setAuth } from "../../lib/auth";
import { useToast } from "../../context/ToastContext";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await workflowApi.login(email.trim(), password);
      setAuth(res.token, {
        userId: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
      });
      toast(`Welcome back, ${res.fullName}!`, "success");
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Workflow size={22} className="text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to the Workflow Engine</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/90 backdrop-blur rounded-2xl border border-zinc-200/80 shadow-xl shadow-brand-500/5 p-8 space-y-5"
        >
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Email</span>
            <div className="mt-1.5 relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full rounded-xl border border-zinc-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Password</span>
            <div className="mt-1.5 relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-zinc-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 hover:from-brand-600 hover:to-brand-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <LogIn size={16} />
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <p className="text-center text-sm text-zinc-500">
            No account yet?{" "}
            <Link href="/signup" className="font-semibold text-brand-600 hover:text-brand-700">
              Create one
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Sign-in is optional for now — all pages remain accessible without an account.
        </p>
      </div>
    </main>
  );
}
