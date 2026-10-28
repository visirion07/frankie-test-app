// Knobs for testing how Frankie copes with a slow or failing API, plus a log
// of every mocked call so you can see exactly which actions the agent ran.

export type ForcedStatus = 0 | 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 503;

export interface Scenario {
  latencyMs: number;
  /** 0 = respond normally. */
  failWith: ForcedStatus;
  /** Only force the failure on writes (POST/PATCH/DELETE). */
  failWritesOnly: boolean;
}

export interface LogEntry {
  id: number;
  at: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  requestBody?: unknown;
}

export const SCENARIO_CHANGED = "acme:scenario-changed";
export const LOG_CHANGED = "acme:log-changed";
const STORAGE_KEY = "acme.mock.scenario.v1";
const DEFAULT: Scenario = { latencyMs: 0, failWith: 0, failWritesOnly: false };

let scenario: Scenario = (() => {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return DEFAULT;
  }
})();

export function getScenario(): Scenario {
  return scenario;
}

export function setScenario(next: Partial<Scenario>): void {
  scenario = { ...scenario, ...next };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario));
  } catch {
    // Storage blocked: the setting lasts until reload.
  }
  window.dispatchEvent(new Event(SCENARIO_CHANGED));
}

const log: LogEntry[] = [];
let nextLogId = 1;

export function getLog(): readonly LogEntry[] {
  return log;
}

export function logRequest(entry: Omit<LogEntry, "id" | "at">): void {
  log.unshift({ ...entry, id: nextLogId++, at: new Date().toISOString() });
  log.length = Math.min(log.length, 100);
  window.dispatchEvent(new Event(LOG_CHANGED));
}

export function clearLog(): void {
  log.length = 0;
  window.dispatchEvent(new Event(LOG_CHANGED));
}
