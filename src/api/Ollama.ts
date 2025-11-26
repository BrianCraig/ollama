type OllamaChatResponseBase = {
    model: string,
    created_at: string,
    message: {
        role: "assistant",
        content: string 
    },
}

type OllamaChatResponseFinishedData = {
    done_reason: string,
    total_duration: number,
    load_duration: number,
    prompt_eval_count: number,
    prompt_eval_duration: number,
    eval_count: number,
    eval_duration: number
}

export type OllamaChatResponseStreamChunk = OllamaChatResponseBase & { done: false };
export type OllamaChatResponseFinishedChunk = OllamaChatResponseBase & OllamaChatResponseFinishedData & { done: true };

export type OllamaChatResponseChunk = OllamaChatResponseStreamChunk | OllamaChatResponseFinishedChunk;

export const assertOllamaChatResponseChunk: (val: unknown) => asserts val is OllamaChatResponseChunk = (val) => {
    if (typeof val !== "object" || val === null) {
        throw new Error(`Response is not OllamaChatResponseChunk type: ${JSON.stringify(val)}`);
    }
    const v = val as OllamaChatResponseChunk;
    if (
        typeof v.model !== "string" ||
        typeof v.created_at !== "string" ||
        typeof v.message !== "object" ||
        v.message === null ||
        v.message.role !== "assistant" ||
        typeof v.message.content !== "string"
    ) {
        throw new Error(`Response is not OllamaChatResponseChunk type: ${JSON.stringify(val)}`);
    }
};

export const isOllamaChatResponseFinishedChunk = (val: OllamaChatResponseChunk): val is OllamaChatResponseFinishedChunk => {
    return (val as OllamaChatResponseFinishedChunk).done === true;
}

export const isOllamaChatResponseStreamChunk = (val: OllamaChatResponseChunk): val is OllamaChatResponseStreamChunk => {
    return (val as OllamaChatResponseStreamChunk).done === false;
}

export const assertOllamaChatResponseFinishedChunk: (val: unknown) => asserts val is OllamaChatResponseFinishedChunk = (val) => {
    assertOllamaChatResponseChunk(val);
    const v = val as OllamaChatResponseFinishedChunk;
    if (
        v.done !== true ||
        typeof v.done_reason !== "string" ||
        typeof v.total_duration !== "number" ||
        typeof v.load_duration !== "number" ||
        typeof v.prompt_eval_count !== "number" ||
        typeof v.prompt_eval_duration !== "number" ||
        typeof v.eval_count !== "number" ||
        typeof v.eval_duration !== "number"
    ) {
        throw new Error(`Response is not OllamaChatResponseFinishedChunk type: ${JSON.stringify(val)}`);
    }
};