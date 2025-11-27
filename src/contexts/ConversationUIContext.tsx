import {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { Message, useConversations } from "./ConversationsContext";
import { useSettings } from "./SettingsContext";
import { assertOllamaChatResponseChunk, assertOllamaChatResponseFinishedChunk, isOllamaChatResponseStreamChunk } from "../api/Ollama";

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
    currentChatId,
    updateCurrentChat
  } = useConversations();

  const [input, setInput] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Refs to hold latest values so callbacks can be stable and not capture stale closures
  const conversationsRef = useRef(conversations);
  const currentChatIdRef = useRef(currentChatId);
  const abortControllerRef = useRef<AbortController | null>(abortController);

  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { currentChatIdRef.current = currentChatId; }, [currentChatId]);
  useEffect(() => { abortControllerRef.current = abortController; }, [abortController]);

  const stopGeneration = useCallback(() => {
    const controller = abortControllerRef.current;
    if (controller) {
      controller.abort();
      // keep state in sync
      setAbortController(null);
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }, []);

  const streamResponse = useCallback(async (systemPrompt: string, chatHistory: Message[], modelOverride: string | null = null) => {
    const cid = currentChatIdRef.current;
    if (!cid) return;
    setIsGenerating(true);
    const controller = new AbortController();
    setAbortController(controller);
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${url}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelOverride || model,
          messages: [{ role: 'system', message: systemPrompt }, ...chatHistory],
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
            const parsed = JSON.parse(line);
            assertOllamaChatResponseChunk(parsed);
            if (isOllamaChatResponseStreamChunk(parsed)) {
              botMessageContent += parsed.message.content;
              updateCurrentChat(chat => {
                const msgs = [...chat.messages];
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: botMessageContent };
                return { ...chat, messages: msgs };
              });
            } else {
              assertOllamaChatResponseFinishedChunk(parsed);
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
      abortControllerRef.current = null;
    }
  }, [url, model, updateCurrentChat]);

  const sendMessage = useCallback(async () => {
    const cid = currentChatIdRef.current;
    if (!input.trim() || !cid) return;

    const newMessage: Message = { role: 'user', content: input, id: Date.now() };
    const currentChat = conversationsRef.current[cid];

    updateCurrentChat(chat => {
      const wasEmpty = chat.messages.length === 0;
      return {
        ...chat,
        messages: [...chat.messages, newMessage],
        ...(wasEmpty ? { title: input.slice(0, 30) } : {}),
      };
    });
    setInput('');

    await streamResponse(currentChat.systemPrompt, [...(currentChat?.messages || []), newMessage]);
  }, [input, streamResponse, updateCurrentChat]);

  const saveEditFromIndex = useCallback((index: number, newContent: string) => {
    const cid = currentChatIdRef.current;
    if (!cid) return;

    updateCurrentChat(chat => {
      const msgs = [...chat.messages];
      if (msgs[index]) {
        msgs[index] = { ...msgs[index], content: newContent };
      }
      return { ...chat, messages: msgs };
    });
  }, [updateCurrentChat]);

  const regenerateFromIndex = useCallback(async (index: number, newContent: (string | null) = null) => {
    const cid = currentChatIdRef.current;
    if (!cid) return;
    stopGeneration();

    const chat = conversationsRef.current[cid];
    if (!chat) return;

    let newMessages = chat.messages.slice(0, index + 1);

    if (newContent !== null) {
      newMessages[index] = { ...newMessages[index], content: newContent };
    }

    const targetMsg = chat.messages[index];
    if (targetMsg && targetMsg.role === 'assistant') {
      newMessages = chat.messages.slice(0, index);
    }

    updateCurrentChat(chat => ({ ...chat, messages: newMessages }));
    await streamResponse(chat.systemPrompt, newMessages);
  }, [stopGeneration, streamResponse, updateCurrentChat]);

  const actions = useMemo<ConversationUIActions>(() => ({
    setInput,
    sendMessage,
    stopGeneration,
    saveEditFromIndex,
    regenerateFromIndex,
  }), [setInput, sendMessage, stopGeneration, saveEditFromIndex, regenerateFromIndex]);

  const state: ConversationUIState = useMemo(() => ({
    input,
    isGenerating,
    inputRef,
  }), [input, isGenerating, inputRef]);

  return (
    <ConversationUIContext.Provider value={state}>
      <ConversationUIActionsContext.Provider value={actions}>
        {children}
      </ConversationUIActionsContext.Provider>
    </ConversationUIContext.Provider>
  );
}

export const useConversationUI = () => useContext(ConversationUIContext);
export const useConversationUIActions = () =>
  useContext(ConversationUIActionsContext);
