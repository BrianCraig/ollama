import { useEffect, useRef } from 'react';
import { Terminal, Sun, Moon } from 'lucide-react';

import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import SettingsModal from './components/SettingsModal';
import SystemPrompt from './components/SystemPrompt';
import MessageItem from './components/MessageItem';
import SendMessage from './components/SendMessage';
import { useSettings } from './contexts/SettingsContext';
import { useConversations } from './contexts/ConversationsContext';
import { useConversationUI } from './contexts/ConversationUIContext';
import { useGlobalRef } from './stores/GlobalRefStore';

export default function App() {
  const { messagesRef } = useGlobalRef();
  const {
    conversations,
    currentChatId,
    isAuthenticated
  } = useConversations();
  const isGenerating = useConversationUI(s => s.isGenerating);

  const { settings: { darkMode }, toggleDarkMode } = useSettings();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200`}>

      <Sidebar />
      <SettingsModal />

      <div className="flex-1 flex flex-col relative min-w-0">

        <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-900">
          <h2 className="font-semibold text-lg truncate max-w-xl">
            {conversations[currentChatId!]?.title || 'Select or create a chat'}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        

        <div className="flex-1 overflow-y-auto p-4 md:p-8" ref={messagesRef}>
          {!currentChatId ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
              <Terminal className="w-16 h-16 mb-4" />
              <p>Select a conversation to start</p>
            </div>
          ) : (
            <>
              <SystemPrompt />

              {conversations[currentChatId].messages.map((msg, idx) => (
                <MessageItem
                  key={msg.id || idx}
                  msg={msg}
                  idx={idx}
                />
              ))}
            </>
          )}
        </div>

        <SendMessage />
      </div>
    </div>
  );
}