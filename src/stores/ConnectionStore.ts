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
   - connecting: true                  => Connecting.
   - connecting: false + error: null   => Connected correctly.
   - connecting: false + error: Error  => Waiting for user to try to reconnect.
*/
type ConnectionStore = {
  connecting: boolean; /* connecting: whether an active connection attempt is in progress */
  error: ErrorRecord | null;/* error: non-null when the last attempt failed; null when no error present */

  version: string | null;
  models: OllamaTagModel[];
  currentModel: OllamaTagModel | null;

  setCurrentModel: (m: OllamaTagModel | null) => void;
  refreshModels: () => Promise<void>;

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
        currentModel: null,
      });
    } catch (e: unknown) {
      const record = makeErrorRecord(e, versionUrl);
      set({
        connecting: false,
        version: null,
        models: [],
        error: record,
        currentModel: null,
      });
    }
  };

  const setCurrentModel = (m: OllamaTagModel | null) => {
    set({ currentModel: m });
  };

  const refreshModels = async () => {
    const settingsUrl = useSettings.getState().settings.url.replace(/\/+$/, "");
    const tagsUrl = `${settingsUrl}/api/tags`;
    try {
      const tagsRaw = await fetchJsonWithTimeout(tagsUrl, 5000);
      assertOllamaTagsResponse(tagsRaw);
      const newModels = tagsRaw.models ?? [];
      // preserve currentModel if a model with same digest exists in new list
      const prev = get().currentModel;
      const found = prev ? newModels.find((m: OllamaTagModel) => m.digest === prev.digest) ?? null : null;
      set({
        models: newModels,
        currentModel: found,
      });
    } catch (e: unknown) {
      const record = makeErrorRecord(e, tagsUrl);
      set({
        connecting: false,
        models: [],
        error: record,
        currentModel: null,
      });
    }
  };

  set({
    connecting: true,
    version: null,
    error: null,
    models: [],
    currentModel: null,
    setCurrentModel,
    refreshModels,
    reconnect,
  } as ConnectionStore);

  // kick off initial connection attempt
  setTimeout(() => {
    get().reconnect();
  }, 0);

  return get() as ConnectionStore;
});