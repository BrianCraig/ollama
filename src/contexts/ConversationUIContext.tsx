import {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
  useRef,
} from "react";

type ConversationUIState = {
  currentChatId: string | null;
  input: string;
  isGenerating: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
};

type ConversationUIActions = {
  setInput: (v: string) => void;
  setCurrentChatId: (id: string | null) => void;
  sendMessage: () => void;
  stopGeneration: () => void;
};

const defaultState: ConversationUIState = {
  currentChatId: null,
  input: "",
  isGenerating: false,
  inputRef: {current: null},
};

const ConversationUIContext = createContext<ConversationUIState>(defaultState);
const ConversationUIActionsContext = createContext<ConversationUIActions>({
  setInput: () => { },
  setCurrentChatId: () => { },
  sendMessage: () => { },
  stopGeneration: () => { },
});

export function ConversationUIProvider({ children }: { children: ReactNode }) {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const actions = useMemo<ConversationUIActions>(() => ({
    setInput,
    setCurrentChatId,

    sendMessage: () => {
      if (!currentChatId || !input.trim()) return;

      setIsGenerating(true);

      setTimeout(() => {
        setIsGenerating(false);
      }, 800);
    },

    stopGeneration: () => {
      setIsGenerating(false);
    },
  }), [currentChatId, input]);

  const state: ConversationUIState = {
    currentChatId,
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
