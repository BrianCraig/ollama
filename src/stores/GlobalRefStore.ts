const GlobalRefs = {
    messagesRef: { current: null as HTMLDivElement | null },
    chatInputRef: { current: null as HTMLTextAreaElement | null },
}

export const useGlobalRef = () => GlobalRefs;