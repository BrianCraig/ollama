import React, { useState, useEffect, useRef } from 'react';
import { Send, StopCircle, Terminal, Sun, Moon } from 'lucide-react';
import { CryptoUtils } from './utils/crypto';

// Components
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import SettingsModal from './components/SettingsModal';
import SystemPrompt from './components/SystemPrompt';
import MessageItem from './components/MessageItem';
import { useSettings, useSettingsActions } from './contexts/SettingsContext';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [conversations, setConversations] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);
  
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [showSettings, setShowSettings] = useState(false);

  const {url, darkMode, model} = useSettings();
  const {toggleDarkMode} = useSettingsActions();

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const hasData = localStorage.getItem('ollama_secure_data');
    if (!hasData) setIsAuthenticated(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, currentChatId]);

  const handleLogin = async (e) => {
    e.preventDefault();
    const encryptedData = localStorage.getItem('ollama_secure_data');
    if (!encryptedData) {
      setConversations({});
      setIsAuthenticated(true);
      saveData({}, password);
    } else {
      const decrypted = await CryptoUtils.decrypt(encryptedData, password);
      if (decrypted) {
        setConversations(decrypted);
        setIsAuthenticated(true);
      } else {
        alert("Incorrect password or corrupted data.");
      }
    }
  };

  const saveData = async (data, pwd = password) => {
    const encrypted = await CryptoUtils.encrypt(data, pwd);
    if (encrypted) {
      localStorage.setItem('ollama_secure_data', encrypted);
    }
  };

  const createNewChat = () => {
    const id = Date.now().toString();
    const newChat = {
      id,
      title: 'New Conversation',
      messages: [],
      systemPrompt: 'You are a helpful AI assistant.',
      createdAt: Date.now()
    };
    const updated = { ...conversations, [id]: newChat };
    setConversations(updated);
    setCurrentChatId(id);
    setSystemPrompt(newChat.systemPrompt);
    saveData(updated);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const updateCurrentChat = (updater) => {
    if (!currentChatId) return;
    setConversations(prev => {
      const chat = prev[currentChatId];
      const updatedChat = updater(chat);
      const newConversations = { ...prev, [currentChatId]: updatedChat };
      saveData(newConversations);
      return newConversations;
    });
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      const updated = { ...conversations };
      delete updated[id];
      setConversations(updated);
      saveData(updated);
      if (currentChatId === id) setCurrentChatId(null);
    }
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsGenerating(false);
    }
  };

  const streamResponse = async (chatHistory, modelOverride = null) => {
    if (!currentChatId) return;
    setIsGenerating(true);
    const controller = new AbortController();
    setAbortController(controller);

    try {
      let fullPrompt = `System: ${systemPrompt}\n\n`;
      chatHistory.forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      fullPrompt += `Assistant: `;

      const response = await fetch(`${url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelOverride || model,
          prompt: fullPrompt,
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error('Ollama connection failed. Check URL/CORS.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botMessageContent = '';

      updateCurrentChat(chat => ({
        ...chat,
        messages: [...chat.messages, { role: 'assistant', content: '', id: Date.now() }]
      }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            if (json.response) {
              botMessageContent += json.response;
              updateCurrentChat(chat => {
                const msgs = [...chat.messages];
                msgs[msgs.length - 1].content = botMessageContent;
                return { ...chat, messages: msgs };
              });
            }
            if (json.done) {
              setIsGenerating(false);
            }
          } catch (e) { console.error("Parse error", e); }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Handled
      } else {
        alert(`Error: ${err.message}. Ensure Ollama is running with OLLAMA_ORIGINS="*"`);
      }
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentChatId) return;
    
    const newMessage = { role: 'user', content: input, id: Date.now() };
    const currentChat = conversations[currentChatId];
    
    updateCurrentChat(chat => ({
      ...chat,
      messages: [...chat.messages, newMessage]
    }));
    setInput('');

    if (currentChat.messages.length === 0) {
      updateCurrentChat(chat => ({ ...chat, title: input.slice(0, 30) }));
    }

    await streamResponse([...currentChat.messages, newMessage]);
  };
  
  const saveEditFromIndex = (index, newContent) => {
    if (!currentChatId || newContent === null) return;
    
    updateCurrentChat(chat => {
      const msgs = [...chat.messages];
      if (msgs[index]) {
          msgs[index].content = newContent;
      }
      return { ...chat, messages: msgs };
    });
  };

  const regenerateFromIndex = async (index, newContent = null) => {
    if (!currentChatId) return;
    stopGeneration();
    
    const chat = conversations[currentChatId];
    let newMessages = chat.messages.slice(0, index + 1);
    
    if (newContent !== null) {
      newMessages[index].content = newContent;
    }

    const targetMsg = chat.messages[index];
    if (targetMsg.role === 'assistant') {
       newMessages = chat.messages.slice(0, index);
    }

    updateCurrentChat(chat => ({ ...chat, messages: newMessages }));
    await streamResponse(newMessages);
  };

  if (!isAuthenticated) {
    return <LoginScreen password={password} setPassword={setPassword} handleLogin={handleLogin} />;
  }

  return (
    <div className={`flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200 ${darkMode ? 'dark' : ''}`}>
      
      <Sidebar 
        conversations={conversations}
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        setSystemPrompt={setSystemPrompt}
        deleteChat={deleteChat}
        createNewChat={createNewChat}
        setShowSettings={setShowSettings}
      />

      <div className="flex-1 flex flex-col relative min-w-0">
        
        <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-900">
           <h2 className="font-semibold text-lg truncate max-w-xl">
             {conversations[currentChatId]?.title || 'Select or create a chat'}
           </h2>
           <div className="flex items-center gap-2">
             <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                {darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
             </button>
           </div>
        </div>

        {showSettings && <SettingsModal />}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {!currentChatId ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
              <Terminal className="w-16 h-16 mb-4" />
              <p>Select a conversation to start</p>
            </div>
          ) : (
            <>
              <SystemPrompt 
                systemPrompt={systemPrompt} 
                setSystemPrompt={setSystemPrompt} 
                updateCurrentChat={updateCurrentChat} 
              />

              {conversations[currentChatId].messages.map((msg, idx) => (
                <MessageItem 
                  key={msg.id || idx} 
                  msg={msg} 
                  idx={idx} 
                  onRegenerate={regenerateFromIndex}
                  onSaveEdit={saveEditFromIndex}
                  isUser={msg.role === 'user'}
                />
              ))}
              
              {isGenerating && (
                 <div className="max-w-6xl mx-auto w-full flex justify-start animate-pulse">
                    <div className="bg-gray-200 dark:bg-gray-800 rounded-lg p-4 flex items-center gap-2">
                       <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                       <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                       <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

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
                  ref={inputRef}
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
      </div>
    </div>
  );
}