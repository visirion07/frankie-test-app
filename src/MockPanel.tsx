import { useState, useSyncExternalStore } from "react";
import { resetDb } from "./mocks/db";
import {
  clearLog,
  getLog,
  getScenario,
  LOG_CHANGED,
  SCENARIO_CHANGED,
  setScenario,
  type ForcedStatus,
} from "./mocks/scenario";

const LATENCIES = [0, 300, 1500, 5000, 20000];
const STATUSES: ForcedStatus[] = [0, 400, 401, 403, 404, 409, 422, 429, 500, 503];

function useEvent<T>(event: string, read: () => T): T {
  return useSyncExternalStore((onChange) => {
    window.addEventListener(event, onChange);
    return () => window.removeEventListener(event, onChange);
  }, read);
}

// getLog() returns the same array, mutated in place; snapshot by length + newest id.
let logSnapshot: { key: string; entries: ReturnType<typeof getLog>[number][] } = { key: "", entries: [] };
function readLog() {
  const log = getLog();
  const key = `${log.length}:${log[0]?.id ?? 0}`;
  if (key !== logSnapshot.key) logSnapshot = { key, entries: [...log] };
  return logSnapshot.entries;
}

/** Bottom-left drawer for steering the mock API while you chat with Frankie. */
export function MockPanel() {
  const [open, setOpen] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const scenario = useEvent(SCENARIO_CHANGED, getScenario);
  const log = useEvent(LOG_CHANGED, readLog);
  const degraded = scenario.latencyMs > 0 || scenario.failWith !== 0;

  if (!open) {
    return (
      <button className={degraded ? "mock-toggle degraded" : "mock-toggle"} onClick={() => setOpen(true)}>
        Mock API{degraded ? " · altered" : ""} ({log.length})
      </button>
    );
  }

  return (
    <aside className="mock-panel">
      <header>
        <strong>Mock API</strong>
        <button className="link" onClick={() => setOpen(false)}>Close</button>
      </header>
      <label>
        Latency
        <select value={scenario.latencyMs} onChange={(e) => setScenario({ latencyMs: Number(e.target.value) })}>
          {LATENCIES.map((ms) => <option key={ms} value={ms}>{ms ? `${ms} ms` : "none"}</option>)}
        </select>
      </label>
      <label>
        Force response
        <select value={scenario.failWith} onChange={(e) => setScenario({ failWith: Number(e.target.value) as ForcedStatus })}>
          {STATUSES.map((s) => <option key={s} value={s}>{s || "normal"}</option>)}
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={scenario.failWritesOnly} onChange={(e) => setScenario({ failWritesOnly: e.target.checked })} />
        Only on writes
      </label>
      <div className="row">
        {/* Two clicks instead of window.confirm, so a browser dialog never blocks automation. */}
        <button
          onClick={() => {
            if (!resetArmed) return setResetArmed(true);
            resetDb();
            setResetArmed(false);
          }}
          onBlur={() => setResetArmed(false)}
        >
          {resetArmed ? "Click again to reset" : "Reset data"}
        </button>
        <button onClick={clearLog}>Clear log</button>
      </div>
      <ol className="log">
        {log.map((entry) => (
          <li key={entry.id} title={entry.requestBody ? JSON.stringify(entry.requestBody, null, 2) : undefined}>
            <span className={entry.status >= 400 ? "error" : "ok"}>{entry.status}</span> <b>{entry.method}</b> {entry.path}{" "}
            <span className="muted">{entry.ms} ms</span>
          </li>
        ))}
        {!log.length && <li className="muted">No API calls yet.</li>}
      </ol>
    </aside>
  );
}
