import { create } from "zustand";
import { CryptoUtils } from "../utils/crypto";

type Role = "user" | "assistant";

export type Message = {
  id: number;
  role: Role;
  content: string;
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt: string;
  createdAt: number;
};

type ConversationsState = {
  conversations: Record<string, Chat>;
  currentChatId: string | null;
  isAuthenticated: boolean;
  password: string;

  setPassword: (pwd: string) => void;
  login: () => Promise<boolean>;
  createNewChat: () => void;
  deleteChat: (id: string) => void;
  setCurrentChatId: (id: string | null) => void;
  updateCurrentChat: (fn: (chat: Chat) => Chat) => void;
};

const STORAGE_KEY = "ollama_secure_data";

export const useConversations = create<ConversationsState>((set, get) => ({
  conversations: {},
  currentChatId: null,
  isAuthenticated: false,
  password: "",

  setPassword: (pwd) => set({ password: pwd }),

  login: async () => {
    const pwd = get().password;
    const encrypted = localStorage.getItem(STORAGE_KEY);

    if (!encrypted) {
      // First-time use
      const empty = {};
      localStorage.setItem(
        STORAGE_KEY,
        await CryptoUtils.encrypt(empty, pwd) as string
      );
      set({ conversations: empty, isAuthenticated: true });
      return true;
    }

    const data = await CryptoUtils.decrypt(encrypted, pwd);
    if (!data) return false;

    set({ conversations: data, isAuthenticated: true });
    return true;
  },

  createNewChat: () => {
    const id = Date.now().toString();
    const newChat: Chat = {
      id,
      title: "New Conversation",
      messages: [],
      systemPrompt: "You are a helpful AI assistant.",
      createdAt: Date.now(),
    };

    const conversations = { ...get().conversations, [id]: newChat };

    set({ conversations, currentChatId: id });
    save(conversations, get().password);
  },

  deleteChat: (id) => {
    const { conversations, currentChatId } = get();
    const updated = { ...conversations };
    delete updated[id];

    set({
      conversations: updated,
      currentChatId: currentChatId === id ? null : currentChatId,
    });

    save(updated, get().password);
  },

  setCurrentChatId: (id) => set({ currentChatId: id }),

  updateCurrentChat: (updater) => {
    const id = get().currentChatId;
    if (!id) return;

    const conversations = { ...get().conversations };
    const chat = conversations[id];

    conversations[id] = updater(chat);

    set({ conversations });
    save(conversations, get().password);
  },
}));

async function save(data: any, password: string) {
  const encrypted = await CryptoUtils.encrypt(data, password);
  localStorage.setItem(STORAGE_KEY, encrypted as string);
}