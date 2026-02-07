import { useEffect, useMemo, useState } from "react";
import { ApiError } from "../api/client";
import { endpoints } from "../api/endpoints";
import type { Sample } from "../api/endpoints";

function cn(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

type Filter = "all" | "available" | "loaned" | "mine";

export default function Samples() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [items, setItems] = useState<Sample[]>([]);

  // page-level busy (loading list / searching)
  const [busy, setBusy] = useState(false);

  // per-sample busy (loan / return buttons)
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});

  const [err, setErr] = useState<string | null>(null);

  const setRowBusy = (id: string, v: boolean) => {
    setBusyMap((prev) => ({ ...prev, [id]: v }));
  };

  const load = async (query: string) => {
    setErr(null);
    setBusy(true);
    try {
      const data = await endpoints.listSamples(query);
      setItems(data);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to load samples");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const filtered = useMemo(() => {
    return items.filter((s) => {
      const loaned = !!s.is_loaned;
      const mine = !!s.is_loaned_by_me;
      if (filter === "available") return !loaned;
      if (filter === "loaned") return loaned;
      if (filter === "mine") return mine;
      return true;
    });
  }, [items, filter]);

  const onLoan = async (s: Sample) => {
    if (s.is_loaned || busyMap[s.id]) return;

    setErr(null);
    setRowBusy(s.id, true);

    setItems((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, is_loaned: true } : x))
    );

    try {
      const loan = await endpoints.createLoan(s.id);
      setItems((prev) =>
        prev.map((x) =>
          x.id === s.id
            ? {
                ...x,
                is_loaned: true,
                is_loaned_by_me: true,
                current_loan_id: loan.id,
              }
            : x
        )
      );
    } catch (e) {
      setItems((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, is_loaned: false } : x))
      );
      setErr(e instanceof ApiError ? e.message : "Loan failed");
    } finally {
      setRowBusy(s.id, false);
    }
  };

  const onReturn = async (s: Sample) => {
    if (!s.current_loan_id || busyMap[s.id]) return;

    setErr(null);
    setRowBusy(s.id, true);

    const loanId = s.current_loan_id;

    setItems((prev) =>
      prev.map((x) =>
        x.id === s.id
          ? {
              ...x,
              is_loaned: false,
              is_loaned_by_me: false,
              current_loan_id: null,
            }
          : x
      )
    );

    try {
      await endpoints.returnLoan(loanId);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Return failed");
      load(q);
    } finally {
      setRowBusy(s.id, false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, SKU, lot, category…"
        className="w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900/20"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        <Chip label="All" active={filter === "all"} onClick={() => setFilter("all")} />
        <Chip label="Available" active={filter === "available"} onClick={() => setFilter("available")} />
        <Chip label="Loaned" active={filter === "loaned"} onClick={() => setFilter("loaned")} />
        <Chip label="Mine" active={filter === "mine"} onClick={() => setFilter("mine")} />
      </div>

      {err && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      )}

      <div className="text-xs text-zinc-500 flex items-center justify-between">
        <div>{busy ? "Loading…" : `${filtered.length} item(s)`}</div>
      </div>

      <div className="space-y-3">
        {filtered.map((s) => (
          <SampleCard
            key={s.id}
            s={s}
            busy={!!busyMap[s.id]}
            onLoan={() => onLoan(s)}
            onReturn={() => onReturn(s)}
          />
        ))}

        {!busy && filtered.length === 0 && (
          <div className="rounded-3xl border bg-white p-6 text-center text-sm text-zinc-500">
            No samples found.
          </div>
        )}
      </div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-2 text-xs font-medium",
        active ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800 hover:bg-zinc-200"
      )}
    >
      {label}
    </button>
  );
}

function Badge({ kind, text }: { kind: "ok" | "warn" | "mine"; text: string }) {
  const cls =
    kind === "ok"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : kind === "mine"
      ? "bg-zinc-900 text-white border-zinc-900"
      : "bg-amber-50 text-amber-800 border-amber-200";

  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium", cls)}>
      {text}
    </span>
  );
}

function SampleCard({
  s,
  busy,
  onLoan,
  onReturn,
}: {
  s: Sample;
  busy: boolean;
  onLoan: () => void;
  onReturn: () => void;
}) {
  const loaned = !!s.is_loaned;
  const mine = !!s.is_loaned_by_me;

  return (
    <div className="rounded-3xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold tracking-tight truncate">{s.name}</div>
          <div className="mt-1 text-xs text-zinc-500 flex flex-wrap gap-x-3 gap-y-1">
            {s.sku && <Meta k="SKU" v={s.sku} />}
            {s.lot_id && <Meta k="Lot" v={s.lot_id} />}
            {s.category && <Meta k="Category" v={s.category} />}
            {s.location && <Meta k="Loc" v={s.location} />}
          </div>
        </div>

        <div className="shrink-0 flex gap-2">
          {!loaned && <Badge kind="ok" text="Available" />}
          {loaned && mine && <Badge kind="mine" text="Loaned (Me)" />}
          {loaned && !mine && <Badge kind="warn" text="Loaned" />}
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {!loaned && (
          <button
            onClick={onLoan}
            disabled={busy}
            className={cn(
              "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold",
              busy
                ? "bg-zinc-700 text-white/70 cursor-wait"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
            )}
          >
            {busy ? "Loaning…" : "Loan"}
          </button>
        )}

        {loaned && mine && (
          <button
            onClick={onReturn}
            disabled={busy}
            className={cn(
              "flex-1 rounded-2xl px-4 py-3 text-sm font-semibold",
              busy
                ? "bg-zinc-200 text-zinc-500 cursor-wait"
                : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
            )}
          >
            {busy ? "Returning…" : "Return"}
          </button>
        )}

        {loaned && !mine && (
          <button
            disabled
            className="flex-1 rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-400 cursor-not-allowed"
          >
            Unavailable
          </button>
        )}
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-zinc-400">{k}:</span>
      <span className="text-zinc-600">{v}</span>
    </span>
  );
}
