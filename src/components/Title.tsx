import { Moon, Sun } from "lucide-react";
import { OllamaTagModel } from "../api/Ollama";
import { useConversations } from "../contexts/ConversationsContext";
import { useSettings } from "../contexts/SettingsContext";
import { useGlobalRef } from "../stores/GlobalRefStore";
import { useConnection } from "../stores/ConnectionStore";
import { Dropdown } from "./Dropdown";

const Title = () => {
  const { modelSelectRef } = useGlobalRef();
  const { models, currentModel, setCurrentModel } = useConnection();
  const { conversations, currentChatId } = useConversations();
  const { settings: { darkMode }, toggleDarkMode } = useSettings();

  const renderModelItem = (m: OllamaTagModel) => (
    <div className="flex flex-col leading-tight">
      <span className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
        {m.model}
      </span>
      <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
        {m.details.parameter_size} · {m.details.quantization_level}
      </span>
    </div>
  );

  return (
    <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-900">
      
      <div className="flex items-center gap-4">
        <Dropdown<OllamaTagModel>
          triggerRef={modelSelectRef}
          options={models}
          selected={currentModel}
          onSelect={setCurrentModel}
          keyExtractor={(m) => m.digest}
          placeholder="Select a model"
          renderItem={renderModelItem}
        />

        <h2 className="font-semibold text-lg truncate max-w-xl text-gray-800 dark:text-gray-100">
          {conversations[currentChatId!]?.title || "Select or create a chat"}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
        >
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};

export default Title;