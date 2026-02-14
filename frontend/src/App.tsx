import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/AuthProvider";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Samples from "./pages/Samples";
import MyLoans from "./pages/MyLoans";
import ScanEntry from "./pages/ScanEntry";
import ScanResolve from "./pages/ScanResolve";
import Tray from "./pages/Tray";
import TrayBatch from "./pages/TrayBatch";


function FullscreenLoader() {
  return (
    <div className="min-h-dvh grid place-items-center bg-zinc-50">
      <div className="text-sm text-zinc-500">Loading…</div>
    </div>
  );
}

function DebugBar() {
  const { state } = useAuth();
  const loc = useLocation();
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-md px-4 py-1 text-[11px] text-zinc-500 bg-white/80 backdrop-blur border-b">
        state: <span className="font-medium">{state.status}</span> · path:{" "}
        <span className="font-medium">{loc.pathname}</span>
      </div>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  if (state.status === "loading") return <FullscreenLoader />;
  if (state.status === "anon") return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LoginRoute() {
  const { state } = useAuth();
  if (state.status === "loading") return <FullscreenLoader />;
  if (state.status === "authed") return <Navigate to="/scan" replace />;
  return <Login />;
}

export default function App() {
  return (
    <>
      <DebugBar />

      <div className="pt-7">
        <Routes>
          <Route path="/" element={<Navigate to="/scan" replace />} />
          <Route path="/login" element={<LoginRoute />} />

          <Route
            path="/samples"
            element={
              <Protected>
                <Layout title="Samples">
                  <Samples />
                </Layout>
              </Protected>
            }
          />

          <Route
            path="/my-loans"
            element={
              <Protected>
                <Layout title="My Loans">
                  <MyLoans />
                </Layout>
              </Protected>
            }
          />
          <Route
            path="/scan"
            element={
              <Protected>
                <Layout title="Scan">
                  <ScanEntry />
                </Layout>
              </Protected>
            }
          />

          <Route
            path="/scan/:code"
            element={
              <Protected>
                <Layout title="Scan">
                  <ScanResolve />
                </Layout>
              </Protected>
            }
          />

          <Route
            path="/tray"
            element={
              <Protected>
                <Layout title="Tray">
                  <Tray />
                </Layout>
              </Protected>
            }
          />

          <Route
            path="/tray/batch"
            element={
              <Protected>
                <Layout title="Batch">
                  <TrayBatch />
                </Layout>
              </Protected>
            }
          />

          {/* Visible fallback (no silent blank) */}
          <Route
            path="*"
            element={
              <div className="min-h-dvh bg-zinc-50 p-6">
                <div className="mx-auto max-w-md rounded-3xl border bg-white p-5 shadow-sm">
                  <div className="text-sm font-semibold">Route not found</div>
                  <div className="mt-2 text-sm text-zinc-600">
                    This page doesn’t exist.
                  </div>
                  <div className="mt-4 flex gap-2">
                    <a
                      href="/samples"
                      className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Go to Samples
                    </a>
                    <a
                      href="/login"
                      className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900"
                    >
                      Go to Login
                    </a>
                  </div>
                </div>
              </div>
            }
          />
        </Routes>
      </div>
    </>
  );
}
