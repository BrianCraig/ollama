import { create } from "zustand";
import { useSettings } from "../contexts/SettingsContext";
import {
  OllamaTagModel,
  assertOllamaTagsResponse,
  assertOllamaVersion,
} from "../api/Ollama";

export type ErrorRecord = {
  name: string;
  message: string;
  code?: string | number;
  stack?: string;
  timestamp: string;
  urlAttempted: string;
};

/* Connection state (combine `connecting` + `error` to derive four states):
   - connecting: true  + error: null   => Connecting for first time.
   - connecting: true  + error: Error  => Reconnecting from error.
   - connecting: false + error: null   => Connected correctly.
   - connecting: false + error: Error  => Waiting for user to try to reconnect.
*/
type ConnectionStore = {
  connecting: boolean; /* connecting: whether an active connection attempt is in progress */
  error: ErrorRecord | null;/* error: non-null when the last attempt failed; null when no error present */

  version: string | null;
  models: OllamaTagModel[];

  reconnect: () => Promise<void>;
};

async function fetchJsonWithTimeout(input: RequestInfo, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export const useConnection = create<ConnectionStore>((set, get) => {
  const makeErrorRecord = (e: unknown, urlAttempted: string): ErrorRecord => {
    if (e instanceof Error) {
      return {
        name: e.name,
        message: e.message,
        stack: e.stack,
        timestamp: new Date().toISOString(),
        urlAttempted,
      };
    }
    return {
      name: "Error",
      message: String(e),
      timestamp: new Date().toISOString(),
      urlAttempted,
    };
  };

  const reconnect = async () => {
    // when starting reconnect attempt, mark connecting true and clear transient error
    set({ connecting: true, error: null });
    const settingsUrl = useSettings.getState().settings.url.replace(/\/+$/, "");
    const versionUrl = `${settingsUrl}/api/version`;
    try {
      const versionRaw = await fetchJsonWithTimeout(versionUrl, 5000);
      assertOllamaVersion(versionRaw);

      const tagsRaw = await fetchJsonWithTimeout(`${settingsUrl}/api/tags`, 5000);
      assertOllamaTagsResponse(tagsRaw);

      set({
        connecting: false,
        version: versionRaw.version,
        models: tagsRaw.models ?? [],
        error: null,
      });
    } catch (e: unknown) {
      const record = makeErrorRecord(e, versionUrl);
      set({
        connecting: false,
        version: null,
        models: [],
        error: record,
      });
    }
  };

  set({
    connecting: true,
    version: null,
    error: null,
    models: [],
    reconnect,
  } as ConnectionStore);

  // kick off initial connection attempt
  setTimeout(() => {
    get().reconnect();
  }, 0);

  return get() as ConnectionStore;
});