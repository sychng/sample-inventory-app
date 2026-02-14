import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type TrayItem = {
  sampleId: string; // UUID string
  sku: string;
  model?: string | null;
  family?: string | null;
  series?: string | null;
  locationCode?: string | null;
  isLoaned?: boolean;
};

type ScanTrayState = {
  items: TrayItem[];
  add: (item: TrayItem) => void;
  addMany: (items: TrayItem[]) => void;
  remove: (sampleId: string) => void;
  clear: () => void;
  has: (sampleId: string) => boolean;
};

const STORAGE_KEY = "scanTray:v1";
const Ctx = createContext<ScanTrayState | null>(null);

function dedupe(items: TrayItem[]) {
  const map = new Map<string, TrayItem>();
  for (const it of items) {
    map.set(it.sampleId, it);
  }
  return Array.from(map.values());
}

function persist(next: TrayItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function ScanTrayProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = useState<TrayItem[]>([]);

  // Load once on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setItems(dedupe(parsed));
      }
    } catch {
      // ignore bad storage
    }
  }, []);

  const api = useMemo<ScanTrayState>(() => {
    return {
      items,

      add: (item) =>
        setItems((prev) => {
          const next = dedupe([item, ...prev]);
          return persist(next);
        }),

      addMany: (newItems) =>
        setItems((prev) => {
          const next = dedupe([...newItems, ...prev]);
          return persist(next);
        }),

      remove: (sampleId) =>
        setItems((prev) => {
          const next = prev.filter((x) => x.sampleId !== sampleId);
          return persist(next);
        }),

      clear: () =>
        setItems(() => {
          return persist([]);
        }),

      has: (sampleId) =>
        items.some((x) => x.sampleId === sampleId),
    };
  }, [items]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useScanTray() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useScanTray must be used within ScanTrayProvider");
  }
  return ctx;
}
