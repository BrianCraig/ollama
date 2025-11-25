import React from 'react';

const SettingsModal = ({ settings, setSettings }) => {
  return (
    <div className="absolute top-16 left-0 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-20 shadow-xl animate-in slide-in-from-top-2">
      <div className="max-w-4xl mx-auto grid gap-6 md:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Ollama Host</label>
          <input 
            className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm"
            value={settings.url}
            onChange={e => setSettings({...settings, url: e.target.value})}
            placeholder="http://localhost:11434"
          />
          <p className="text-xs text-yellow-600 mt-1">Requires `OLLAMA_ORIGINS="*"` env var on server.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-2">Model Name</label>
          <input 
            className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded p-2 text-sm"
            value={settings.model}
            onChange={e => setSettings({...settings, model: e.target.value})}
            placeholder="llama3.2, mistral, etc."
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;