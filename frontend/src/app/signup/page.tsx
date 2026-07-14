"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Workflow, Mail, Lock, User, UserPlus } from "lucide-react";
import { workflowApi } from "../../lib/api";
import { setAuth } from "../../lib/auth";
import { useToast } from "../../context/ToastContext";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await workflowApi.signup(email.trim(), fullName.trim(), password);
      setAuth(res.token, {
        userId: res.userId,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
      });
      toast(`Account created. Welcome, ${res.fullName}!`, "success");
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all";

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Workflow size={22} className="text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 tracking-tight">Create your account</h1>
          <p className="mt-1 text-sm text-zinc-500">Start designing workflows in minutes</p>
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
            <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Full name</span>
            <div className="mt-1.5 relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                required
                minLength={2}
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Sharma"
                className={inputClass}
              />
            </div>
          </label>

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
                className={inputClass}
              />
            </div>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Password</span>
              <div className="mt-1.5 relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  className={inputClass}
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Confirm</span>
              <div className="mt-1.5 relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat"
                  className={inputClass}
                />
              </div>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-500/30 hover:from-brand-600 hover:to-brand-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <UserPlus size={16} />
            {submitting ? "Creating account..." : "Create account"}
          </button>

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-400">
          Sign-up is optional for now — all pages remain accessible without an account.
        </p>
      </div>
    </main>
  );
}
