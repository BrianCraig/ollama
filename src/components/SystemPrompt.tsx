import { ChevronDown } from 'lucide-react';
import { useConversations } from '../contexts/ConversationsContext';

const SystemPrompt = () => {
  const {
    conversations,
    currentChatId,
    updateCurrentChat
  } = useConversations();
  
  if (currentChatId == null) return null;

  return (
    <div className="max-w-6xl mx-auto w-full mb-8">
      <details className="group bg-gray-100 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <summary className="flex items-center justify-between p-3 cursor-pointer select-none text-xs font-semibold uppercase text-gray-500">
          <span>System Prompt</span>
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="p-3 pt-0">
          <textarea
            className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-300 resize-none outline-none min-h-[80px]"
            value={conversations[currentChatId].systemPrompt}
            onChange={(e) => {
              updateCurrentChat(c => ({ ...c, systemPrompt: e.target.value }));
            }}
            placeholder="Define how the AI should behave..."
          />
        </div>
      </details>
    </div>
  );
};

export default SystemPrompt;