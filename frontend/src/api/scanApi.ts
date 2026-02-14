export type ScanResolveResponse =
  | {
      kind: "sample";
      sample: {
        id: string;
        sku: string;
        model?: string | null;
        family?: string | null;
        series?: string | null;
        location_code?: string | null;
        is_loaned?: boolean;
      };
    }
  | { kind: "location"; location_code: string }
  | { kind: "unknown" };

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  return res.json();
}

export async function resolveScan(code: string) {
  return apiFetch(`/scan/${encodeURIComponent(code)}`) as Promise<ScanResolveResponse>;
}

export async function moveSample(sampleId: string, location_code: string) {
  return apiFetch(`/samples/${sampleId}/move`, {
    method: "POST",
    body: JSON.stringify({ location_code }),
  });
}

export async function quickReturnSample(sampleId: string, location_code?: string) {
  return apiFetch(`/samples/${sampleId}/quick-return`, {
    method: "POST",
    body: JSON.stringify(location_code ? { location_code } : {}),
  });
}
