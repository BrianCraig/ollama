const GlobalRefs = {
    messagesRef: { current: null as HTMLDivElement | null },
    chatInputRef: { current: null as HTMLTextAreaElement | null },
    modelSelectRef: { current: null as HTMLButtonElement | null },
}

export const useGlobalRef = () => GlobalRefs;