import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ScanEntry() {
  const [code, setCode] = useState("");
  const nav = useNavigate();

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold">Scan</div>
        <div className="mt-2 text-sm text-zinc-600">
          Scan a QR code. If your scanner opens a URL like <span className="font-mono">/scan/SG0001</span>,
          it will resolve automatically. You can also paste a code here.
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="SG0001 or LAB-C1-R2"
            className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <button
            className="shrink-0 rounded-2xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white"
            onClick={() => {
              const v = code.trim();
              if (!v) return;
              nav(`/scan/${encodeURIComponent(v)}`);
            }}
          >
            Go
          </button>
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="text-sm font-semibold">Tip</div>
        <div className="mt-2 text-sm text-zinc-600">
          Workflow: scan one or more <b>samples</b> → they go to the <b>Tray</b> → scan a <b>location</b> to batch
          quick-return or move.
        </div>
      </div>
    </div>
  );
}
