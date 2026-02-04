// src/api/client.ts
export class ApiError extends Error {
  status: number;
  payload?: any;

  constructor(message: string, status: number, payload?: any) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

type Json = Record<string, any>;

async function request<T>(
  url: string,
  options: RequestInit & { json?: Json } = {}
): Promise<T> {
  const headers: HeadersInit = {
    ...(options.headers || {}),
  };

  let body: BodyInit | undefined = options.body;

  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body,
    credentials: "include", // IMPORTANT: cookie-based auth
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(
      payload?.detail || payload?.message || "Request failed",
      res.status,
      payload
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url, { method: "GET" }),
  post: <T>(url: string, json?: Json) =>
    request<T>(url, { method: "POST", json }),
};
