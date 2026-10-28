import type { ApiError } from "./api";

export function Status({ loading, error, data }: { loading: boolean; error?: ApiError; data?: unknown }) {
  if (error) return <p className="error">Error {error.status}: {error.message}</p>;
  if (loading && data === undefined) return <p className="muted">Loading…</p>;
  return null;
}

export function Badge({ value }: { value: string }) {
  return <span className={`badge badge-${value}`}>{value}</span>;
}
