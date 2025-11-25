import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode
} from "react";
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
};

type ConversationsActions = {
  setPassword: (pwd: string) => void;
  login: () => Promise<boolean>;
  createNewChat: () => void;
  deleteChat: (id: string) => void;
  setCurrentChatId: (id: string | null) => void;
  updateCurrentChat: (fn: (chat: Chat) => Chat) => void;
};

const defaultState: ConversationsState = {
  conversations: {},
  currentChatId: null,
  isAuthenticated: false,
  password: ""
};

const ConversationsContext = createContext<ConversationsState>(defaultState);
const ConversationsActionsContext = createContext<ConversationsActions>({
  setPassword: () => {},
  login: async () => false,
  createNewChat: () => {},
  deleteChat: () => {},
  setCurrentChatId: () => {},
  updateCurrentChat: () => {},
});

export function ConversationsProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Record<string, Chat>>({});
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");

  const login = useCallback(async (): Promise<boolean> => {
    const encrypted = localStorage.getItem("ollama_secure_data");

    if (!encrypted) {
      setIsAuthenticated(true);
      setConversations({});
      await saveVault({});
      return true;
    }

    const decrypted = await CryptoUtils.decrypt(encrypted, password);
    if (!decrypted) return false;

    setConversations(decrypted);
    setIsAuthenticated(true);
    return true;
  }, [password]);

  const saveVault = useCallback(
    async (data?: Record<string, Chat>) => {
      const d = data ?? conversations;
      const encrypted = await CryptoUtils.encrypt(d, password);
      if (encrypted) {
        localStorage.setItem("ollama_secure_data", encrypted);
      }
    },
    [conversations, password]
  );

  const createNewChat = useCallback(() => {
    const id = Date.now().toString();
    const chat: Chat = {
      id,
      title: "New Conversation",
      messages: [],
      systemPrompt: "You are a helpful AI assistant.",
      createdAt: Date.now()
    };

    const next = { ...conversations, [id]: chat };
    setConversations(next);
    setCurrentChatId(id);
    saveVault(next);
  }, [conversations, saveVault]);

  const deleteChat = useCallback(
    (id: string) => {
      const next = { ...conversations };
      delete next[id];
      setConversations(next);
      saveVault(next);

      if (currentChatId === id) setCurrentChatId(null);
    },
    [conversations, currentChatId, saveVault]
  );

  const updateCurrentChat = useCallback(
    (fn: (chat: Chat) => Chat) => {
      if (!currentChatId) return;
      setConversations(prev => {
        const updated = fn(prev[currentChatId]);
        const next = { ...prev, [currentChatId]: updated };
        saveVault(next);
        return next;
      });
    },
    [currentChatId, saveVault]
  );

  const state: ConversationsState = {
    conversations,
    currentChatId,
    isAuthenticated,
    password
  };

  const actions: ConversationsActions = {
    setPassword,
    login,
    createNewChat,
    deleteChat,
    setCurrentChatId,
    updateCurrentChat
  };

  return (
    <ConversationsContext.Provider value={state}>
      <ConversationsActionsContext.Provider value={actions}>
        {children}
      </ConversationsActionsContext.Provider>
    </ConversationsContext.Provider>
  );
}

export const useConversations = () => useContext(ConversationsContext);
export const useConversationsActions = () =>
  useContext(ConversationsActionsContext);
