import { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";

type LocalStorageSettings = {
    url: string;
    model: string;
    darkMode: boolean;
};

type StateSettings = {
    settingsModal: boolean;
};

type Settings = LocalStorageSettings & StateSettings;

const defaultSettingsData: LocalStorageSettings = {
    "url": "http://localhost:11434",
    "model": "gemma3:12b",
    "darkMode": window.matchMedia("(prefers-color-scheme: dark)").matches
};

const SettingsValueContext = createContext<Settings>({ ...defaultSettingsData, settingsModal: false });
const SettingsUpdateContext = createContext({
    toggleDarkMode: () => { },
    setModel: (model: string) => { },
    setUrl: (url: string) => { },
    toggleSettingsModal: () => { }
});

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settingsModal, setSettingsModal] = useState<boolean>(false);
    const [settings, setSettings] = useState<LocalStorageSettings>(() => {
        try {
            const storedSettings = localStorage.getItem('ollama_chat_settings');
            return storedSettings ? JSON.parse(storedSettings) : defaultSettingsData;
        } catch (error) {
            console.error("Error reading from local storage:", error);
            return defaultSettingsData;
        }
    });

    useEffect(() => {
        localStorage.setItem('ollama_chat_settings', JSON.stringify(settings));
    }, [settings])

    useEffect(() => {
        const root = typeof document !== 'undefined' ? document.documentElement : null;
        if (!root) return;
        if (settings.darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
    }, [settings.darkMode]);

    const actions = useMemo(() => ({
        toggleDarkMode: () => setSettings(s => ({ ...s, darkMode: !s.darkMode })),
        setModel: (model: string) => setSettings(s => ({ ...s, model: model })),
        setUrl: (url: string) => setSettings(s => ({ ...s, url: url })),
        toggleSettingsModal: () => setSettingsModal(v => !v)
    }), []);

    return (
        <SettingsValueContext.Provider value={({ ...settings, settingsModal: settingsModal })}>
            <SettingsUpdateContext.Provider value={actions}>
                {children}
            </SettingsUpdateContext.Provider>
        </SettingsValueContext.Provider>
    );
}

export const useSettings = () => useContext(SettingsValueContext);
export const useSettingsActions = () => useContext(SettingsUpdateContext);