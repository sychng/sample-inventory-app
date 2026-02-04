import React from "react";
import { useAuth } from "./auth/AuthProvider";
import Login from "./pages/Login";

export default function App() {
  const { state, logout } = useAuth();

  if (state.status === "loading") {
    return (
      <div className="min-h-dvh grid place-items-center bg-zinc-50">
        <div className="text-sm text-zinc-500">Loading…</div>
      </div>
    );
  }

  if (state.status === "anon") {
    return <Login />;
  }

  // Temporary "logged in" screen (we'll replace with Samples page next)
  return (
    <div className="min-h-dvh bg-zinc-50">
      <div className="mx-auto max-w-md px-4 py-6 space-y-4">
        <div className="rounded-3xl border bg-white p-5 shadow-sm">
          <div className="text-lg font-semibold">You are logged in</div>
          <div className="mt-1 text-sm text-zinc-500">{state.user.email}</div>

          <button
            onClick={logout}
            className="mt-4 w-full rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Logout
          </button>
        </div>

        <div className="text-xs text-zinc-500">
          Next: we’ll build Samples + My Loans pages and navigation.
        </div>
      </div>
    </div>
  );
}
