import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Settings, Plus, Trash2, StopCircle, RefreshCw, 
  Edit2, Save, X, Lock, Key, MessageSquare, Terminal, 
  ChevronDown, ChevronRight, Moon, Sun
} from 'lucide-react';

/**
 * UTILITIES: CRYPTO & OLLAMA
 */

// Simple Crypto Wrapper using Web Crypto API
const CryptoUtils = {
  deriveKey: async (password, salt) => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(salt),
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  encrypt: async (data, password) => {
    try {
      const salt = "ollama-secure-salt"; // In prod, random salt per user is better
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const key = await CryptoUtils.deriveKey(password, salt);
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encodedData
      );

      // Combine IV and encrypted data for storage
      const ivArray = Array.from(iv);
      const encryptedArray = Array.from(new Uint8Array(encrypted));
      return JSON.stringify({ iv: ivArray, data: encryptedArray });
    } catch (e) {
      console.error("Encryption failed", e);
      return null;
    }
  },

  decrypt: async (encryptedPkg, password) => {
    try {
      const { iv, data } = JSON.parse(encryptedPkg);
      const salt = "ollama-secure-salt";
      const key = await CryptoUtils.deriveKey(password, salt);
      
      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(iv) },
        key,
        new Uint8Array(data)
      );

      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
      console.error("Decryption failed", e);
      return null;
    }
  }
};

// Markdown-ish Parser for simple rendering without heavy libs
const MarkdownRenderer = ({ content }) => {
  if (!content) return null;
  
  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return (
    <div className="text-sm leading-relaxed space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          const content = part.slice(3, -3).replace(/^[a-z]+\n/, '');
          const lang = part.match(/```([a-z]*)\n/)?.[1] || 'text';
          return (
            <div key={i} className="bg-gray-900 rounded-md p-3 overflow-x-auto my-2 border border-gray-700">
              <div className="text-xs text-gray-400 mb-1 select-none font-mono uppercase">{lang}</div>
              <pre className="font-mono text-gray-100 whitespace-pre-wrap">{content.trim()}</pre>
            </div>
          );
        }
        // Basic inline formatting: **bold**, `code`
        return (
          <p key={i} className="whitespace-pre-wrap">
            {part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).map((seg, j) => {
              if (seg.startsWith('`') && seg.endsWith('`')) {
                return <code key={j} className="bg-gray-200 dark:bg-gray-700 px-1 rounded font-mono text-red-500 dark:text-red-300">{seg.slice(1, -1)}</code>;
              }
              if (seg.startsWith('**') && seg.endsWith('**')) {
                return <strong key={j}>{seg.slice(2, -2)}</strong>;
              }
              return seg;
            })}
          </p>
        );
      })}
    </div>
  );
};

export default function App() {
  // Global State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [conversations, setConversations] = useState({});
  const [currentChatId, setCurrentChatId] = useState(null);
  const [settings, setSettings] = useState({
    url: 'http://localhost:11434',
    model: 'llama3.2', 
    darkMode: true
  });
  
  // Chat State
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant.');
  const [showSettings, setShowSettings] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load encrypted data on mount (check if exists)
  useEffect(() => {
    const hasData = localStorage.getItem('ollama_secure_data');
    if (!hasData) setIsAuthenticated(true); // New user, no password needed yet
  }, []);

  useEffect(() => {
    if (settings.darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [settings.darkMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversations, currentChatId]);

  // --- AUTHENTICATION ---
  const handleLogin = async (e) => {
    e.preventDefault();
    const encryptedData = localStorage.getItem('ollama_secure_data');
    if (!encryptedData) {
      // First time setup
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

  // --- CHAT LOGIC ---

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
      // Construct prompt for /api/generate
      // We manually build the dialogue history using a simple User/Assistant prefix
      let fullPrompt = `System: ${systemPrompt}\n\n`;
      chatHistory.forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
      });
      fullPrompt += `Assistant: `;

      const response = await fetch(`${settings.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelOverride || settings.model,
          prompt: fullPrompt,
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error('Ollama connection failed. Check URL/CORS.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botMessageContent = '';

      // Add placeholder bot message
      updateCurrentChat(chat => ({
        ...chat,
        messages: [...chat.messages, { role: 'assistant', content: '', id: Date.now() }]
      }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Parse JSON objects from stream (can be multiple per chunk)
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const json = JSON.parse(line);
            
            // Handle /api/generate format: { response: "text", done: false }
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
        // Handled by stop button
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
    
    // Optimistic update
    updateCurrentChat(chat => ({
      ...chat,
      messages: [...chat.messages, newMessage]
    }));
    setInput('');

    // Update title if it's the first message
    if (currentChat.messages.length === 0) {
      updateCurrentChat(chat => ({ ...chat, title: input.slice(0, 30) }));
    }

    await streamResponse([...currentChat.messages, newMessage]);
  };
  
  // New function to save edits without regenerating
  const saveEditFromIndex = (index, newContent) => {
    if (!currentChatId || newContent === null) return;
    
    updateCurrentChat(chat => {
      const msgs = [...chat.messages];
      
      // Ensure the index is valid and update content
      if (msgs[index]) {
          msgs[index].content = newContent;
      }

      return { ...chat, messages: msgs };
    });
    // Do NOT call streamResponse here
  };

  const regenerateFromIndex = async (index, newContent = null) => {
    if (!currentChatId) return;
    stopGeneration();
    
    const chat = conversations[currentChatId];
    let newMessages = chat.messages.slice(0, index + 1);
    
    if (newContent !== null) {
      // We are editing a user message and saving/regenerating it
      newMessages[index].content = newContent;
    }

    // Logic for regeneration: 
    // If we are at a User message, we want to regenerate the Assistant response that follows.
    // If we are at an Assistant message, we want to clear it and regenerate it.
    
    const targetMsg = chat.messages[index];
    
    if (targetMsg.role === 'assistant') {
       newMessages = chat.messages.slice(0, index); // Remove the assistant message to regenerate
    }

    updateCurrentChat(chat => ({ ...chat, messages: newMessages }));
    await streamResponse(newMessages);
  };

  // --- RENDER HELPERS ---

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-full">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">Secure Local Chat</h1>
          <p className="text-gray-400 text-center mb-6 text-sm">
            Enter your vault password. If this is your first time, this password will be used to encrypt your local storage.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Vault Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                  autoFocus
                />
                <Key className="absolute right-3 top-3.5 text-gray-500 w-5 h-5" />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Unlock Vault
            </button>
          </form>
          {localStorage.getItem('ollama_secure_data') && (
            <p className="mt-4 text-xs text-red-400 text-center">
              Warning: If you lost your password, your previous chats cannot be recovered. Clear browser data to reset.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      
      {/* SIDEBAR */}
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
              onClick={() => { setCurrentChatId(chat.id); setSystemPrompt(chat.systemPrompt || ''); }}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                currentChatId === chat.id 
                  ? 'bg-white dark:bg-gray-800 shadow-sm' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-400'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="truncate text-sm font-medium">{chat.title || 'Empty Chat'}</span>
              </div>
              <button 
                onClick={(e) => deleteChat(chat.id, e)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-950">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors w-full"
          >
            <Settings className="w-4 h-4" />
            <span>Connection Settings</span>
          </button>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative min-w-0">
        
        {/* HEADER */}
        <div className="h-16 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 bg-white dark:bg-gray-900">
           <h2 className="font-semibold text-lg truncate max-w-xl">
             {conversations[currentChatId]?.title || 'Select or create a chat'}
           </h2>
           <div className="flex items-center gap-2">
             <button onClick={() => setSettings(s => ({...s, darkMode: !s.darkMode}))} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                {settings.darkMode ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
             </button>
           </div>
        </div>

        {/* SETTINGS OVERLAY */}
        {showSettings && (
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
        )}

        {/* MESSAGES LIST */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {!currentChatId ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
              <Terminal className="w-16 h-16 mb-4" />
              <p>Select a conversation to start</p>
            </div>
          ) : (
            <>
              {/* System Prompt Accordion */}
              <div className="max-w-6xl mx-auto w-full mb-8">
                 <details className="group bg-gray-100 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <summary className="flex items-center justify-between p-3 cursor-pointer select-none text-xs font-semibold uppercase text-gray-500">
                      <span>System Prompt</span>
                      <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="p-3 pt-0">
                      <textarea
                        className="w-full bg-transparent text-sm text-gray-600 dark:text-gray-300 resize-none outline-none min-h-[80px]"
                        value={systemPrompt}
                        onChange={(e) => {
                          setSystemPrompt(e.target.value);
                          updateCurrentChat(c => ({...c, systemPrompt: e.target.value}));
                        }}
                        placeholder="Define how the AI should behave..."
                      />
                    </div>
                 </details>
              </div>

              {conversations[currentChatId].messages.map((msg, idx) => (
                <MessageItem 
                  key={msg.id || idx} 
                  msg={msg} 
                  idx={idx} 
                  onRegenerate={regenerateFromIndex}
                  onSaveEdit={saveEditFromIndex} // Pass the new save function
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

        {/* INPUT AREA */}
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

// Sub-component for individual messages
const MessageItem = ({ msg, idx, onRegenerate, onSaveEdit, isUser }) => { // Added onSaveEdit
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(msg.content);

  const handleSaveEdit = (regenerate = false) => {
    setIsEditing(false);
    if (regenerate) {
      // Used by User message "Save & Regenerate"
      onRegenerate(idx, editContent);
    } else {
      // Used by User message "Save" and Assistant message "Save"
      onSaveEdit(idx, editContent);
    }
  };

  return (
    // Increased max-w for better readability on wider screens
    <div className={`max-w-6xl mx-auto w-full flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`relative group max-w-[90%] rounded-2xl p-5 shadow-sm 
          ${isUser 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-none'
          }`}
      >
        {/* EDIT MODE */}
        {isEditing ? (
          <div className="flex flex-col gap-2 min-w-[500px]"> {/* Increased min-width */}
             <textarea 
               value={editContent} 
               onChange={e => setEditContent(e.target.value)}
               className="w-full bg-black/10 dark:bg-black/30 p-2 rounded text-sm outline-none resize-none min-h-[150px]" // Increased min-height
             />
             <div className="flex justify-end gap-2">
               <button 
                onClick={() => setIsEditing(false)}
                className="p-1 px-3 text-xs rounded bg-gray-500/20 hover:bg-gray-500/40"
               >
                 Cancel
               </button>
               
               {/* New Save button (no regenerate) */}
               <button 
                onClick={() => handleSaveEdit(false)}
                className="p-1 px-3 text-xs rounded bg-white/20 hover:bg-white/30 font-semibold flex items-center gap-1"
               >
                 <Save className="w-3 h-3" /> Save
               </button>

               {/* Save and Regenerate button (Only for User messages) */}
               {isUser && (
                 <button 
                  onClick={() => handleSaveEdit(true)}
                  className="p-1 px-3 text-xs rounded bg-blue-700 hover:bg-blue-800 font-semibold text-white flex items-center gap-1"
                 >
                   <RefreshCw className="w-3 h-3" /> Save & Regenerate
                 </button>
               )}
             </div>
          </div>
        ) : (
          /* VIEW MODE */
          <>
            <div className="prose prose-invert max-w-none">
              {isUser ? (
                 <p className="whitespace-pre-wrap">{msg.content}</p>
              ) : (
                 <MarkdownRenderer content={msg.content} />
              )}
            </div>

            {/* CONTROLS (Hover) */}
            <div className={`absolute -bottom-8 ${isUser ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1`}>
              {/* Edit Button (Now available for both User and Assistant) */}
              <button 
                onClick={() => { setEditContent(msg.content); setIsEditing(true); }}
                className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-600"
                title="Edit Message"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              
              {/* Regenerate Button (For Assistant messages, or User message followed by Assistant) */}
              {!isUser && (
                <button 
                  onClick={() => onRegenerate(idx)}
                  className="p-1.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 hover:text-blue-600"
                  title="Regenerate from here"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};