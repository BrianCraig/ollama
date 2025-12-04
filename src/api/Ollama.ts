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

// POST /api/chat
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

// GET /api/version
export type OllamaVersion = {
    version: string,
}

export const assertOllamaVersion: (val: unknown) => asserts val is OllamaVersion = (val) => {
    if (typeof val !== "object" || val === null) {
        throw new Error(`Response is not OllamaVersion: ${JSON.stringify(val)}`);
    }
    const v = val as OllamaVersion;
    if (typeof v.version !== "string") {
        throw new Error(`Response is not OllamaVersion: ${JSON.stringify(val)}`);
    }
};

export type OllamaModelDetails = {
    parent_model: string,
    format: string,
    family: string,
    families: string[],
    parameter_size: string,
    quantization_level: string,
}

export type OllamaTagModel = {
    name: string,
    model: string,
    modified_at: string,
    size: number,
    digest: string,
    details: OllamaModelDetails,
}

// GET /api/tags
export type OllamaTagsResponse = {
    models: OllamaTagModel[],
}

export const assertOllamaTagsResponse: (val: unknown) => asserts val is OllamaTagsResponse = (val) => {
    if (typeof val !== "object" || val === null) {
        throw new Error(`Response is not OllamaTagsResponse: ${JSON.stringify(val)}`);
    }
    const v = val as OllamaTagsResponse;
    if (!Array.isArray(v.models)) {
        throw new Error(`Response is not OllamaTagsResponse: ${JSON.stringify(val)}`);
    }
    for (const m of v.models) {
        if (typeof m !== "object" || m === null) {
            throw new Error(`Invalid model in OllamaTagsResponse: ${JSON.stringify(m)}`);
        }
        if (
            typeof m.name !== "string" ||
            typeof m.model !== "string" ||
            typeof m.modified_at !== "string" ||
            typeof m.size !== "number" ||
            typeof m.digest !== "string" ||
            typeof m.details !== "object" ||
            m.details === null ||
            typeof m.details.parent_model !== "string" ||
            typeof m.details.format !== "string" ||
            typeof m.details.family !== "string" ||
            !Array.isArray(m.details.families) ||
            typeof m.details.parameter_size !== "string" ||
            typeof m.details.quantization_level !== "string"
        ) {
            throw new Error(`Invalid model in OllamaTagsResponse: ${JSON.stringify(m)}`);
        }
    }
};


export type OllamaPSModel = {
    name: string,
    model: string,
    size: number,
    digest: string,
    details: OllamaModelDetails,
    expires_at: string,
    size_vram: number,
    context_length: number,
}

// GET /api/ps
export type OllamaPSResponse = {
    models: OllamaPSModel[],
}

export const assertOllamaPSResponse: (val: unknown) => asserts val is OllamaPSResponse = (val) => {
    if (typeof val !== "object" || val === null) {
        throw new Error(`Response is not OllamaPSResponse: ${JSON.stringify(val)}`);
    }
    const v = val as OllamaPSResponse;
    if (!Array.isArray(v.models)) {
        throw new Error(`Response is not OllamaPSResponse: ${JSON.stringify(val)}`);
    }
    for (const m of v.models) {
        if (typeof m !== "object" || m === null) {
            throw new Error(`Invalid model in OllamaPSResponse: ${JSON.stringify(m)}`);
        }
        if (
            typeof m.name !== "string" ||
            typeof m.model !== "string" ||
            typeof m.size !== "number" ||
            typeof m.digest !== "string" ||
            typeof m.details !== "object" ||
            m.details === null ||
            typeof m.details.parent_model !== "string" ||
            typeof m.details.format !== "string" ||
            typeof m.details.family !== "string" ||
            !Array.isArray(m.details.families) ||
            typeof m.details.parameter_size !== "string" ||
            typeof m.details.quantization_level !== "string" ||
            typeof m.expires_at !== "string" ||
            typeof m.size_vram !== "number" ||
            typeof m.context_length !== "number"
        ) {
            throw new Error(`Invalid model in OllamaPSResponse: ${JSON.stringify(m)}`);
        }
    }
};