import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resolveScan } from "../api/scanApi";
import { useScanTray } from "../state/scanTray";

export default function ScanResolve() {
  const { code } = useParams<{ code: string }>();
  const nav = useNavigate();
  const tray = useScanTray();
  const [status, setStatus] = useState("Resolving…");

  useEffect(() => {
    if (!code) return;

    (async () => {
      try {
        const res = await resolveScan(code);

        if (res.kind === "sample") {
          const s = res.sample;
          tray.add({
            sampleId: s.id,
            sku: s.sku,
            model: s.model ?? null,
            family: s.family ?? null,
            series: s.series ?? null,
            locationCode: s.location_code ?? null,
            isLoaned: s.is_loaned ?? false,
          });
          nav("/tray", { replace: true });
          return;
        }

        if (res.kind === "location") {
          nav(`/tray/batch?loc=${encodeURIComponent(res.location_code)}`, {
            replace: true,
          });
          return;
        }

        setStatus("Unknown code. Redirecting…");
        setTimeout(() => nav("/scan", { replace: true }), 700);
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to resolve scan. Redirecting…");
        setTimeout(() => nav("/scan", { replace: true }), 900);
      }
    })();
  }, [code, nav, tray]);

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="text-xs text-zinc-500">Code</div>
      <div className="mt-1 font-mono text-sm break-all">{code}</div>
      <div className="mt-3 text-sm text-zinc-600">{status}</div>
    </div>
  );
}
