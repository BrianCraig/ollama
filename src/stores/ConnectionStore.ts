import { create } from "zustand";
import { useSettings } from "../contexts/SettingsContext";
import {
  OllamaTagModel,
  assertOllamaTagsResponse,
  assertOllamaVersion,
} from "../api/Ollama";

/**
 * ConnectionStore records a lightweight status and a rich error record
 * so the UI can present a clear diagnostic flow.
 *
 * reconnect(light?: boolean)
 *  - light = true: only checks /api/version (fast, for quick tests)
 *  - light = false: full reconnect (version + tags)
 */

export type ConnectionStatus = "idle" | "connecting" | "failed" | "ok";

export type ErrorRecord = {
  name: string;
  message: string;
  code?: string | number;
  stack?: string;
  timestamp: string;
  urlAttempted: string;
};

type ConnectionStore = {
  connectionStatus: ConnectionStatus;
  version: string | null;
  errorRecord: ErrorRecord | null;
  models: OllamaTagModel[];

  // trigger a reconnect; accepts optional light flag for just version check
  reconnect: (light?: boolean) => Promise<void>;
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

  const reconnect = async (light = false) => {
    set({ connectionStatus: "connecting", errorRecord: null });
    const settingsUrl = useSettings.getState().settings.url.replace(/\/+$/, "");
    const versionUrl = `${settingsUrl}/api/version`;
    try {
      const versionRaw = await fetchJsonWithTimeout(versionUrl, 5000);
      assertOllamaVersion(versionRaw);

      if (light) {
        // lightweight success; record ok and version but don't fetch tags
        set({ connectionStatus: "ok", version: versionRaw.version, errorRecord: null });
        console.debug("[ConnectionStore] reconnect (light) ok", { version: versionRaw.version, url: versionUrl });
        return;
      }

      const tagsRaw = await fetchJsonWithTimeout(`${settingsUrl}/api/tags`, 5000);
      assertOllamaTagsResponse(tagsRaw);

      set({
        connectionStatus: "ok",
        version: versionRaw.version,
        models: tagsRaw.models ?? [],
        errorRecord: null,
      });
      console.debug("[ConnectionStore] reconnect ok", { version: versionRaw.version });
    } catch (e: unknown) {
      const record = makeErrorRecord(e, versionUrl);
      console.debug("[ConnectionStore] reconnect failed", record);
      set({
        connectionStatus: "failed",
        version: null,
        models: [],
        errorRecord: record,
      });
    }
  };

  // initial state
  set({
    connectionStatus: "idle",
    version: null,
    errorRecord: null,
    models: [],
    reconnect,
  } as ConnectionStore);

  // run an initial lightweight check immediately
  setTimeout(() => {
    get().reconnect(true);
  }, 0);

  return get() as ConnectionStore;
});