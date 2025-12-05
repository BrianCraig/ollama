import { Terminal } from 'lucide-react';

import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import SettingsModal from './components/SettingsModal';
import MessageItem from './components/MessageItem';
import SendMessage from './components/SendMessage';
import Title from './components/Title';

import { useConversations } from './contexts/ConversationsContext';
import { useGlobalRef } from './stores/GlobalRefStore';

export default function App() {
  const { messagesRef } = useGlobalRef();
  const {
    conversations,
    currentChatId,
    isAuthenticated
  } = useConversations();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200`}>
      <Sidebar />
      <SettingsModal />
      <div className="flex-1 flex flex-col relative min-w-0">
        <Title />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-0 md:pt-0" ref={messagesRef}>
          {!currentChatId ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
              <Terminal className="w-16 h-16 mb-4" />
              <p>Select a conversation to start</p>
            </div>
          ) : conversations[currentChatId].messages.map((msg, idx) => (
            <MessageItem
              key={msg.id || idx}
              msg={msg}
              idx={idx}
            />
          ))}
        </div>

        <SendMessage />
      </div>
    </div>
  );
}