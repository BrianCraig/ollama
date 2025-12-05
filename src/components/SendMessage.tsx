import { Send, StopCircle } from 'lucide-react';
import { useConversationUI } from '../contexts/ConversationUIContext';
import { useConversations } from '../contexts/ConversationsContext';
import { useGlobalRef } from '../stores/GlobalRefStore';
import { useConnection } from '../stores/ConnectionStore';

export default ({ }) => {
  const { modelSelectRef } = useGlobalRef();
  const { currentModel } = useConnection();
  const { currentChatId } = useConversations();
  const {
    input,
    isGenerating,
    setInput,
    sendMessage: _sendMessage,
    stopGeneration
  } = useConversationUI();

  const { chatInputRef } = useGlobalRef();
  const sendMessage = () => {
    if (currentModel === null) {
      modelSelectRef?.current?.focus();
      return;
    }
    _sendMessage();
  }

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto relative flex gap-2">
        {isGenerating ? (
          <button
            onClick={stopGeneration}
            className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-700 text-white rounded-xl p-4 font-semibold shadow-lg transition-transform active:scale-95"
          >
            <StopCircle className="w-5 h-5" /> Stop Generation
          </button>
        ) : (
          <>
            <textarea
              ref={chatInputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={!currentChatId}
              placeholder="Type a message..."
              className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-4 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800 outline-none resize-none h-[60px] max-h-[200px] shadow-inner transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !currentChatId}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white p-4 rounded-xl shadow-lg transition-all disabled:cursor-not-allowed transform active:scale-90"
            >
              <Send className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
      <div className="text-center mt-2 text-xs text-gray-400">
        Ollama Local • Encrypted Storage
      </div>
    </div>
  )
}