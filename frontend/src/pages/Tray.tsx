import { Link } from "react-router-dom";
import { useScanTray } from "../state/scanTray";

export default function Tray() {
  const tray = useScanTray();

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Tray</div>
          <Link to="/scan" className="text-sm font-semibold text-zinc-900 underline">
            Scan
          </Link>
        </div>

        <div className="mt-2 text-sm text-zinc-600">{tray.items.length} item(s)</div>

        {tray.items.length === 0 ? (
          <div className="mt-4 text-sm text-zinc-500">
            Empty tray. Scan a sample QR (SGxxxx) to start.
          </div>
        ) : (
          <>
            <div className="mt-4 space-y-2">
              {tray.items.map((it) => (
                <div key={it.sampleId} className="rounded-2xl border bg-white px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{it.sku}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {it.family ?? ""}
                        {it.series ? ` • ${it.series}` : ""}
                        {it.model ? ` • ${it.model}` : ""}
                      </div>
                      {it.locationCode && (
                        <div className="mt-1 text-xs text-zinc-500">Loc: {it.locationCode}</div>
                      )}
                    </div>

                    <button
                      className="text-xs font-semibold text-zinc-700 underline"
                      onClick={() => tray.remove(it.sampleId)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Link
                to="/tray/batch"
                className="flex-1 rounded-2xl bg-zinc-900 px-4 py-3 text-center text-sm font-semibold text-white"
              >
                Batch actions
              </Link>
              <button
                className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-900"
                onClick={() => tray.clear()}
              >
                Clear
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
