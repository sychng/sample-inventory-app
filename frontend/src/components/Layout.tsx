import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function Layout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { state, logout } = useAuth();

  return (
    <div className="min-h-dvh bg-zinc-50 flex flex-col">
      {/* Header */}
     <header className="sticky top-0 z-10 bg-black text-white">


        <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-8">
            <img src="/omron-logo.png" alt="OMRON" className="h-5 w-auto" />
            <div>
                <div className="text-sm font-semibold tracking-tight text-white">
                {title}
                </div>
                {state.status === "authed" && (
                <div className="text-xs text-white/80">{state.user.email}</div>
                )}
            </div>
            </div>


          <button
            onClick={logout}
            className="text-sm font-medium text-white hover:text-white/80"

          >
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 mx-auto max-w-md w-full px-4 py-4">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 border-t bg-white">
        <div className="mx-auto max-w-md grid grid-cols-2 gap-2 p-2">
          <Tab to="/samples" label="Samples" />
          <Tab to="/my-loans" label="My Loans" />
        </div>
      </nav>
    </div>
  );
}

function Tab({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-xl px-3 py-2 text-sm font-medium text-center",
            isActive
            ? "bg-zinc-900 text-white"
            : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"


        )
      }
    >
      {label}
    </NavLink>
  );
}
