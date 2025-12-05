import { create } from "zustand";
import { v7 as UUID } from 'uuid';
import { CryptoUtils } from "../utils/crypto";
import { useGlobalRef } from "../stores/GlobalRefStore";
import { scrollToBottom } from "../utils/scrolling";

export type Role = "user" | "assistant" | "system";

export type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  model?: string;
};

export type Chat = {
  id: string;
  title: string;
  messages: Message[];
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
  setCurrentChatId: (id: string | null) => void; 
  updateCurrentChat: (fn: (chat: Chat) => Chat) => void;

  createChat(title?: string): string;   // returns new chat ID
  deleteChat(id: string): void;
  setCurrentChat(id: string | null): void;

  addMessage(msg: Partial<Message> & { role: Role; content: string }): Message;
  updateMessage(id: string, patch: Partial<Message>): void;
  deleteMessage(id: string): void;

  updateChat(patch: Partial<Chat>): void;
  renameChat(title: string): void;
};

const STORAGE_KEY = "ollama_secure_data";

const { messagesRef, chatInputRef } = useGlobalRef();

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
    chatInputRef.current?.focus();
    
    const id = UUID();
    const newChat: Chat = {
      id,
      title: "New Conversation",
      messages: [],
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

  setCurrentChatId: (id) => {
    set({ currentChatId: id });
    window.requestAnimationFrame(() => { scrollToBottom(messagesRef); });
    chatInputRef.current?.focus();
    window.requestAnimationFrame(() => { chatInputRef.current?.focus(); });
  },

  updateCurrentChat: (updater) => {
    const id = get().currentChatId;
    if (!id) return;

    const conversations = { ...get().conversations };
    const chat = conversations[id];

    conversations[id] = updater(chat);

    set({ conversations });
    save(conversations, get().password);
  },

  createChat: (title = "New Conversation") => {
    const id = UUID();
    const newChat: Chat = {
      id,
      title,
      messages: [],
      createdAt: Date.now(),
    };

    const conversations = { ...get().conversations, [id]: newChat };
    set({ conversations, currentChatId: id });
    save(conversations, get().password);

    window.requestAnimationFrame(() => { scrollToBottom(messagesRef); });
    chatInputRef.current?.focus();

    return id;
  },

  setCurrentChat: (id: string | null) => {
    set({ currentChatId: id });
    window.requestAnimationFrame(() => { scrollToBottom(messagesRef); });
    chatInputRef.current?.focus();
    window.requestAnimationFrame(() => { chatInputRef.current?.focus(); });
  },

  addMessage: (msg) => {
    let cid = get().currentChatId;
    const conversations = { ...get().conversations };

    if (!cid) {
      cid = UUID();
      const newChat: Chat = {
        id: cid,
        title: "New Conversation",
        messages: [],
        createdAt: Date.now(),
      };
      conversations[cid] = newChat;
      set({ conversations, currentChatId: cid });
    }

    const message: Message = {
      id: UUID(),
      role: msg.role,
      content: msg.content,
      createdAt: Date.now(),
      model: msg.model,
    };

    conversations[cid].messages = [...conversations[cid].messages, message];

    set({ conversations, currentChatId: cid });
    save(conversations, get().password);

    window.requestAnimationFrame(() => { scrollToBottom(messagesRef); });
    chatInputRef.current?.focus();

    return message;
  },

  updateMessage: (id, patch) => {
    const conversations = { ...get().conversations };
    for (const cid in conversations) {
      const msgs = conversations[cid].messages;
      const idx = msgs.findIndex(m => m.id === id);
      if (idx !== -1) {
        const updatedMsgs = [...msgs];
        updatedMsgs[idx] = { ...updatedMsgs[idx], ...patch };
        conversations[cid] = { ...conversations[cid], messages: updatedMsgs };
        set({ conversations });
        save(conversations, get().password);
        return;
      }
    }
  },

  deleteMessage: (id) => {
    const conversations = { ...get().conversations };
    for (const cid in conversations) {
      const msgs = conversations[cid].messages;
      const idx = msgs.findIndex(m => m.id === id);
      if (idx !== -1) {
        const updatedMsgs = [...msgs];
        updatedMsgs.splice(idx, 1);
        conversations[cid] = { ...conversations[cid], messages: updatedMsgs };
        set({ conversations });
        save(conversations, get().password);
        return;
      }
    }
  },

  updateChat: (patch) => {
    const id = get().currentChatId;
    if (!id) return;
    const conversations = { ...get().conversations };
    const chat = conversations[id];
    conversations[id] = { ...chat, ...patch };
    set({ conversations });
    save(conversations, get().password);
  },

  renameChat: (title) => {
    get().updateCurrentChat((chat) => ({ ...chat, title }));
  },
}));

async function save(data: any, password: string) {
  const encrypted = await CryptoUtils.encrypt(data, password);
  localStorage.setItem(STORAGE_KEY, encrypted as string);
}