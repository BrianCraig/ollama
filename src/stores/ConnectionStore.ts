import { create } from "zustand";
import { useSettings } from "../contexts/SettingsContext";
import {
  OllamaTagModel,
  assertOllamaTagsResponse,
  assertOllamaVersion,
} from "../api/Ollama";

export type ConnectionStatus = "Offline" | "Connecting" | "Connected";

type ConnectionStore = {
  status: ConnectionStatus;
  version: string | null;
  error: string | null;
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
  set({
    status: "Offline",
    version: null,
    error: null,
    models: [],
    reconnect: async () => {
      set({ status: "Connecting", error: null });
      const settingsUrl = useSettings.getState().settings.url.replace(/\/+$/, "");
      try {
        const versionRaw = await fetchJsonWithTimeout(`${settingsUrl}/api/version`, 5000);
        assertOllamaVersion(versionRaw);
        const tagsRaw = await fetchJsonWithTimeout(`${settingsUrl}/api/tags`, 5000);
        assertOllamaTagsResponse(tagsRaw);

        set({
          status: "Connected",
          version: versionRaw.version,
          models: tagsRaw.models ?? [],
          error: null,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        set({
          status: "Offline",
          version: null,
          models: [],
          error: msg,
        });
      }
    },
  } as ConnectionStore);

  setTimeout(() => {
    get().reconnect();
  }, 0);

  return get() as ConnectionStore;
});