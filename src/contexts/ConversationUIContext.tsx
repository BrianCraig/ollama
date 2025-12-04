import { create } from "zustand";
import { v7 as UUID } from 'uuid';
import { Message, useConversations } from "./ConversationsContext";
import { useSettings } from "./SettingsContext";
import {
  assertOllamaChatResponseChunk,
  assertOllamaChatResponseFinishedChunk,
  isOllamaChatResponseStreamChunk
} from "../api/Ollama";
import { useGlobalRef } from "../stores/GlobalRefStore";
import { autoscroll, scrollToBottom } from "../utils/scrolling";

type ConversationUIState = {
  input: string;
  isGenerating: boolean;
  abortController: AbortController | null;
};

type ConversationUIActions = {
  setInput: (v: string) => void;
  sendMessage: () => void;
  stopGeneration: () => void;
  saveEditFromIndex: (index: number, newContent: string) => void;
  regenerateFromIndex: (index: number, newContent: string | null) => void;
};

export const useConversationUI = create<ConversationUIState & ConversationUIActions>((set, get) => {
  const { chatInputRef, messagesRef } = useGlobalRef();

  const conversationsStore = useConversations.getState();
  const settingsStore = useSettings.getState();

  const updateConvStore = useConversations.getState().updateCurrentChat;

  // Keep currentConversation + settings always updated via subscriptions
  useConversations.subscribe(() => {
    Object.assign(conversationsStore, useConversations.getState());
  });

  useSettings.subscribe(() => {
    Object.assign(settingsStore, useSettings.getState());
  });

  const streamResponse = async (
    chatHistory: Message[],
    modelOverride: string | null = null
  ) => {
    scrollToBottom(messagesRef);
    // also on the next frame to ensure scroll after new message added
    requestAnimationFrame(() => scrollToBottom(messagesRef));

    const { currentChatId } = conversationsStore;
    if (!currentChatId) return;

    const { url, model } = settingsStore.settings;
    const controller = new AbortController();

    set({ abortController: controller, isGenerating: true });

    try {
      const response = await fetch(`${url}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: modelOverride || model,
          messages: chatHistory,
          stream: true
        }),
        signal: controller.signal
      });

      if (!response.ok) throw new Error("Ollama connection failed");
      if (!response.body) throw new Error("Null response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let botMessageContent = "";

      updateConvStore(chat => ({
        ...chat,
        messages: [
          ...chat.messages,
          { role: "assistant", content: "", id: UUID(), createdAt: Date.now(), model: modelOverride || settingsStore.settings.model }
        ]
      }));

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);
            assertOllamaChatResponseChunk(parsed);

            if (isOllamaChatResponseStreamChunk(parsed)) {
              botMessageContent += parsed.message.content;

              updateConvStore(chat => {
                const msgs = [...chat.messages];
                msgs[msgs.length - 1] = {
                  ...msgs[msgs.length - 1],
                  content: botMessageContent
                };
                return { ...chat, messages: msgs };
              });

            } else {
              assertOllamaChatResponseFinishedChunk(parsed);
              set({ isGenerating: false });
            }

            autoscroll(messagesRef);
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        // fine
      } else {
        alert(
          `Error: ${err.message}. Ensure Ollama is running with OLLAMA_ORIGINS="*"`
        );
      }
    } finally {
      set({ isGenerating: false, abortController: null });
      chatInputRef.current?.focus();
    }
  };

  return {
    input: "",
    isGenerating: false,
    abortController: null,

    setInput: v => set({ input: v }),

    stopGeneration: () => {
      const controller = get().abortController;
      if (controller) controller.abort();
      set({ abortController: null, isGenerating: false });
    },

    sendMessage: async () => {
      const { input } = get();
      const { currentChatId, conversations } = conversationsStore;
      if (!input.trim() || !currentChatId) return;

      const newMessage: Message = {
        role: "user",
        content: input,
        id: UUID(),
        createdAt: Date.now(),
      };

      const currentChat = conversations[currentChatId];

      updateConvStore(chat => {
        const empty = chat.messages.length === 0;
        return {
          ...chat,
          messages: [...chat.messages, newMessage],
          ...(empty ? { title: input.slice(0, 30) } : {})
        };
      });

      set({ input: "" });

      await streamResponse(
        [...(currentChat.messages || []), newMessage]
      );
    },

    saveEditFromIndex: (i, newContent) => {
      const { currentChatId } = conversationsStore;
      if (!currentChatId) return;

      updateConvStore(chat => {
        const msgs = [...chat.messages];
        if (msgs[i]) msgs[i] = { ...msgs[i], content: newContent };
        return { ...chat, messages: msgs };
      });
    },

    regenerateFromIndex: async (i, newContent = null) => {
      const { currentChatId, conversations } = conversationsStore;
      if (!currentChatId) return;

      get().stopGeneration();

      const chat = conversations[currentChatId];
      if (!chat) return;

      let newMessages = chat.messages.slice(0, i + 1);

      if (newContent !== null) {
        newMessages[i] = { ...newMessages[i], content: newContent };
      }

      const msg = chat.messages[i];
      if (msg && msg.role === "assistant") {
        newMessages = chat.messages.slice(0, i);
      }

      updateConvStore(chat => ({ ...chat, messages: newMessages }));

      await streamResponse(newMessages);
    }
  };
});
