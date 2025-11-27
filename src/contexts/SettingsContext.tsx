import { create } from "zustand";

type LocalStorageSettings = {
  url: string;
  model: string;
  darkMode: boolean;
};

const STORAGE_KEY = "ollama_chat_settings";

const defaultSettingsData: LocalStorageSettings = {
  url: "http://localhost:11434",
  model: "gemma3:12b",
  darkMode: window.matchMedia("(prefers-color-scheme: dark)").matches,
};

type SettingsStore = {
  settings: LocalStorageSettings;
  settingsModal: boolean;

  toggleDarkMode: () => void;
  setModel: (model: string) => void;
  setUrl: (url: string) => void;
  toggleSettingsModal: () => void;
};

// Keep the <html> dark class in sync
function applyDarkMode(dark: boolean) {
  const root = document.documentElement;
  if (!root) return;
  root.classList.toggle("dark", dark);
}

// Load from localStorage
function loadSettings(): LocalStorageSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : defaultSettingsData;
  } catch (e) {
    console.error("Error reading storage:", e);
    return defaultSettingsData;
  }
}

// Save to localStorage
function saveSettings(data: LocalStorageSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  applyDarkMode(data.darkMode);
}

export const useSettings = create<SettingsStore>((set, get) => {
  const loaded = loadSettings();
  applyDarkMode(loaded.darkMode);

  return {
    settings: loaded,
    settingsModal: false,

    toggleDarkMode: () => {
      const updated = { ...get().settings, darkMode: !get().settings.darkMode };
      set({ settings: updated });
      saveSettings(updated);
    },

    setModel: (model) => {
      const updated = { ...get().settings, model };
      set({ settings: updated });
      saveSettings(updated);
    },

    setUrl: (url) => {
      const updated = { ...get().settings, url };
      set({ settings: updated });
      saveSettings(updated);
    },

    toggleSettingsModal: () =>
      set({ settingsModal: !get().settingsModal }),
  };
});
