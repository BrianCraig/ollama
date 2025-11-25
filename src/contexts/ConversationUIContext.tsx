import {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
  useRef,
} from "react";
import { Message, useConversations, useConversationsActions } from "./ConversationsContext";
import { useSettings } from "./SettingsContext";

type ConversationUIState = {
  input: string;
  isGenerating: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
};

type ConversationUIActions = {
  setInput: (v: string) => void;
  sendMessage: () => void;
  stopGeneration: () => void;
  saveEditFromIndex: (index: number, newContent: string) => void;
  regenerateFromIndex: (index: number, newContent: (string | null)) => void;
};

const defaultState: ConversationUIState = {
  input: "",
  isGenerating: false,
  inputRef: { current: null },
};

const ConversationUIContext = createContext<ConversationUIState>(defaultState);
const ConversationUIActionsContext = createContext<ConversationUIActions>({
  setInput: () => { },
  sendMessage: () => { },
  stopGeneration: () => { },
  saveEditFromIndex: () => { },
  regenerateFromIndex: () => { },
});

export function ConversationUIProvider({ children }: { children: ReactNode }) {
  const { url, model } = useSettings();
  const {
    conversations,
    currentChatId
  } = useConversations();
  const {
    updateCurrentChat,
  } = useConversationsActions();

  const [input, setInput] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const stopGeneration = () => {
      if (abortController) {
        abortController.abort();
        setAbortController(null);
        setIsGenerating(false);
      }
    };

  const streamResponse = async (systemPrompt: string, chatHistory: Message[], modelOverride = null) => {
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
      if (response.body == null) throw new Error('Null body response');

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
      if ((err as Error).name === 'AbortError') {
        // Aborted manually, ok
      } else {
        alert(`Error: ${(err as Error).message}. Ensure Ollama is running with OLLAMA_ORIGINS="*"`);
      }
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentChatId) return;
    
    const newMessage: Message = { role: 'user', content: input, id: Date.now() };
    const currentChat = conversations[currentChatId];
    
    updateCurrentChat(chat => ({
      ...chat,
      messages: [...chat.messages, newMessage]
    }));
    setInput('');

    if (currentChat.messages.length === 0) {
      updateCurrentChat(chat => ({ ...chat, title: input.slice(0, 30) }));
    }

    await streamResponse(currentChat.systemPrompt, [...currentChat.messages, newMessage]);
  };
  
  const saveEditFromIndex = (index:number, newContent:string) => {
    if (!currentChatId || newContent === null) return;
    
    updateCurrentChat(chat => {
      const msgs = [...chat.messages];
      if (msgs[index]) {
          msgs[index].content = newContent;
      }
      return { ...chat, messages: msgs };
    });
  };

  const regenerateFromIndex = async (index:number, newContent:(string | null) = null) => {
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
    await streamResponse(chat.systemPrompt, newMessages);
  };

  const actions = useMemo<ConversationUIActions>(() => ({
    setInput,
    sendMessage,
    stopGeneration,
    saveEditFromIndex,
    regenerateFromIndex,
  }), [currentChatId, input]);

  const state: ConversationUIState = {
    input,
    isGenerating,
    inputRef,
  };

  return (
    <ConversationUIContext.Provider value={state}>
      <ConversationUIActionsContext.Provider value={actions}>
        {children}
      </ConversationUIActionsContext.Provider>
    </ConversationUIContext.Provider>
  );
}

// hooks
export const useConversationUI = () => useContext(ConversationUIContext);
export const useConversationUIActions = () =>
  useContext(ConversationUIActionsContext);
