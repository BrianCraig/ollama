export const defaultSettings = {
    url: 'http://localhost:11434',
    model: 'gemini3:1b', 
    darkMode: true
};

export const getInitialSettings = () => {
    try {
        const saved = localStorage.getItem('ollama_chat_settings');
        if (saved) {
            return { ...defaultSettings, ...JSON.parse(saved) };
        }
    } catch (e) {
        console.error("Could not parse settings from storage", e);
    }
    return defaultSettings;
};