import { Plus, MessageSquare, Trash2, Settings } from 'lucide-react';
import { useConversations } from '../contexts/ConversationsContext';
import { useSettingsActions } from '../contexts/SettingsContext';

const Sidebar = ({ }) => {
  const { toggleSettingsModal } = useSettingsActions();

  const {
    conversations,
    currentChatId,
    createNewChat,
    setCurrentChatId,
    deleteChat
  } = useConversations();

  const askDeleteChat = (id: string, e: any) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      deleteChat(id);
    }
  };

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-950">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={createNewChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition-all shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">New Chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {Object.values(conversations)
          .sort((a, b) => b.createdAt - a.createdAt)
          .map(chat => (
            <div
              key={chat.id}
              onClick={() => setCurrentChatId(chat.id)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${currentChatId === chat.id
                ? 'bg-white dark:bg-gray-800 shadow-sm'
                : 'hover:bg-gray-200 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400'
                }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm font-medium">{chat.title || 'Empty Chat'}</span>
              </div>
              <button
                onClick={(e) => askDeleteChat(chat.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-950">
        <button
          onClick={toggleSettingsModal}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors w-full"
        >
          <Settings className="w-4 h-4" />
          <span>Connection Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;