import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { moveSample, quickReturnSample } from "../api/scanApi";
import { useScanTray } from "../state/scanTray";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function TrayBatch() {
  const tray = useScanTray();
  const q = useQuery();
  const nav = useNavigate();

  const [loc, setLoc] = useState(q.get("loc") ?? "");
  const [busy, setBusy] = useState(false);
  const [busyIds, setBusyIds] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const total = tray.items.length;

  async function run(kind: "move" | "quickReturn") {
    setErr(null);

    if (total === 0) {
      setErr("Tray is empty.");
      return;
    }
    if (!loc.trim()) {
      setErr("Please scan/enter a location code first.");
      return;
    }

    setBusy(true);

    for (const it of tray.items) {
      setBusyIds((p) => ({ ...p, [it.sampleId]: kind === "move" ? "Moving…" : "Returning…" }));
      try {
        if (kind === "move") await moveSample(it.sampleId, loc.trim());
        else await quickReturnSample(it.sampleId, loc.trim());
      } catch (e: any) {
        setErr((prev) => (prev ? `${prev}\n` : "") + `${it.sku}: ${e?.message ?? "Failed"}`);
      } finally {
        setBusyIds((p) => {
          const c = { ...p };
          delete c[it.sampleId];
          return c;
        });
      }
    }

    setBusy(false);
    tray.clear();
    nav("/tray", { replace: true });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Batch actions</div>
          <Link to="/scan" className="text-sm font-semibold text-zinc-900 underline">
            Scan
          </Link>
        </div>

        <div className="mt-3 text-xs text-zinc-500">Target location</div>
        <div className="mt-2 flex gap-2">
          <input
            value={loc}
            onChange={(e) => setLoc(e.target.value)}
            placeholder="LAB-C1-R2"
            className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <Link
            to="/scan"
            className="shrink-0 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900"
            title="Scan a location QR"
          >
            Scan
          </Link>
        </div>

        <div className="mt-4 text-sm text-zinc-600">{tray.items.length} item(s)</div>

        <div className="mt-3 space-y-2">
          {tray.items.map((it) => (
            <div key={it.sampleId} className="rounded-2xl border bg-white px-4 py-3">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{it.sku}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {it.family ?? ""}
                    {it.series ? ` • ${it.series}` : ""}
                    {it.model ? ` • ${it.model}` : ""}
                  </div>
                </div>
                <div className="text-xs text-zinc-500">{busyIds[it.sampleId] ?? ""}</div>
              </div>
            </div>
          ))}
        </div>

        {err && (
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {err}
          </pre>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            disabled={busy}
            className="rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            onClick={() => run("move")}
          >
            Move all
          </button>
          <button
            disabled={busy}
            className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900 disabled:opacity-60"
            onClick={() => run("quickReturn")}
          >
            Quick return all
          </button>
        </div>

        <div className="mt-4 flex justify-between text-sm">
          <Link to="/tray" className="font-semibold underline text-zinc-900">
            Back
          </Link>
          <button className="font-semibold underline text-zinc-700" onClick={() => tray.clear()}>
            Clear tray
          </button>
        </div>
      </div>
    </div>
  );
}
