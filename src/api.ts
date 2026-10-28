import { useCallback, useEffect, useState } from "react";
import { DB_CHANGED } from "./mocks/db";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? "GET",
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error?.message ?? `Request failed (${res.status})`, res.status);
  return data as T;
}

/** GETs `path` and refetches whenever the mock data changes (including changes Frankie makes). */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch<T>(path)
      .then((result) => {
        setData(result);
        setError(undefined);
      })
      .catch((err: ApiError) => setError(err))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    load();
    window.addEventListener(DB_CHANGED, load);
    return () => window.removeEventListener(DB_CHANGED, load);
  }, [load]);

  return { data, error, loading, reload: load };
}

export const money = (n: number) => n.toLocaleString(undefined, { style: "currency", currency: "AUD" });
export const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
