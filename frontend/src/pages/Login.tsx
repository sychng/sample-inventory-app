import React, { useMemo, useState } from "react";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Login() {
  const { login, state } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return e.length > 3 && e.includes("@") && password.length > 0 && !busy;
  }, [email, password, busy]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Login failed");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-dvh bg-zinc-50">
      <div className="mx-auto max-w-md px-4 pt-16 pb-10">
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <div className="text-xl font-semibold tracking-tight">Sign in</div>
            <div className="mt-1 text-sm text-zinc-500">
              Login is required to access the sample inventory.
            </div>
          </div>

          {err && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {err}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-800">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
                autoComplete="email"
                placeholder="name@company.com"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-zinc-800">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-2xl border px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                canSubmit
                  ? "bg-zinc-900 text-white hover:bg-zinc-800"
                  : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
              )}
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>

            <div className="text-xs text-zinc-500">
              {state.status === "loading"
                ? "Checking session…"
                : "Uses secure cookie session (no tokens stored on device)."}
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-zinc-400">
          Internal tool · Access controlled
        </div>
      </div>
    </div>
  );
}
